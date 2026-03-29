"""
trending_service.py
───────────────────
IR-powered "Trending Categories" feature.

How it works
────────────
1. KEYWORD EXTRACTION (TF-IDF)
   Sum each term's TF-IDF weight across the entire corpus.
   Terms with high corpus-wide weight are semantically important AND frequent –
   i.e. genuinely "popular" food themes, not just stop words.
   We apply a food-domain whitelist filter to keep results meaningful.

2. POPULARITY RANKING (recipe_meta)
   For each trending keyword, retrieve the top recipes matching that keyword
   from the tfidf_matrix (via BM25-style scoring: idf × tf per doc).
   Rank those recipes by a popularity + quality combined score:

       trending_score = 0.7 * log1p(review_count) + 0.3 * avg_rating

   This is intentionally DIFFERENT from search (which uses relevance).

3.CACHING
   Keywords and per-keyword top-recipes are computed once at startup and
   cached forever (food corpus is static).

Artifacts used (no rebuilding):
   • data/processed/tfidf.pkl          – fitted TfidfVectorizer
   • data/processed/tfidf_matrix.pkl   – sparse (N, D) matrix
   • data/processed/recipe_ids.pkl     – parallel recipe ID list
   • data/processed/recipe_meta.csv    – avg_rating, review_count
"""

from __future__ import annotations

import os
import pickle
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

_DATA_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "data", "processed"
)

# ── Curated food-domain whitelist ─────────────────────────────────────────────
# We only surface terms that are obviously food/ingredient/cuisine words.
# This avoids surfacing cooking verbs ("add", "mix", "cook") or numbers.
_FOOD_WHITELIST = {
    "chicken", "beef", "pork", "lamb", "turkey", "salmon", "shrimp", "tuna",
    "tofu", "eggs", "cheese", "butter", "cream", "milk",
    "pasta", "rice", "bread", "pizza", "soup", "salad", "cake", "cookies",
    "chocolate", "vanilla", "lemon", "garlic", "onion", "tomatoes", "mushroom",
    "spinach", "broccoli", "potatoes", "carrots", "avocado", "corn", "beans",
    "quinoa", "oats", "bacon", "sausage", "ham", "steak",
    "vegan", "vegetarian", "gluten", "spicy", "sweet", "savory",
    "mexican", "italian", "asian", "indian", "thai", "greek", "french",
    "breakfast", "dinner", "dessert", "snack", "appetizer",
    "sauce", "ginger", "cinnamon", "honey", "maple", "coconut",
    "strawberry", "blueberry", "banana", "mango", "apple", "orange",
}

# How many trending keywords to surface
_TOP_K_KEYWORDS  = 20
# Top recipes to return per keyword
_TOP_RECIPES_PER_KEYWORD = 20


class TrendingService:
    def __init__(self):
        self._tfidf     = None   # TfidfVectorizer
        self._matrix    = None   # sparse (N, D)
        self._ids: List[str] = []
        self._id_to_idx: Dict[str, int] = {}

        self._avg_rating:    Optional[np.ndarray] = None  # (N,)
        self._review_count:  Optional[np.ndarray] = None  # (N,)

        # Cached outputs (computed once)
        self._top_keywords:   Optional[List[str]]            = None
        self._keyword_scores: Optional[Dict[str, List[str]]] = None  # keyword → [recipe_id]

        self._loaded = False

    # ── Loading ───────────────────────────────────────────────────────────────

    def load(self):
        """Load all artifacts and pre-compute trending data (once)."""
        # TF-IDF vectorizer + matrix
        with open(os.path.join(_DATA_DIR, "tfidf.pkl"), "rb") as f:
            self._tfidf = pickle.load(f)
        with open(os.path.join(_DATA_DIR, "tfidf_matrix.pkl"), "rb") as f:
            self._matrix = pickle.load(f)
        with open(os.path.join(_DATA_DIR, "recipe_ids.pkl"), "rb") as f:
            raw_ids = pickle.load(f)

        self._ids = [str(r) for r in raw_ids]
        self._id_to_idx = {rid: i for i, rid in enumerate(self._ids)}

        # Metadata arrays (parallel to self._ids)
        meta = pd.read_csv(
            os.path.join(_DATA_DIR, "recipe_meta.csv"), dtype={"RecipeId": str}
        )
        meta_map = {
            row["RecipeId"]: (float(row["avg_rating"]), float(row["review_count"]))
            for _, row in meta.iterrows()
        }
        self._avg_rating   = np.array(
            [meta_map.get(rid, (0.0, 0.0))[0] for rid in self._ids], dtype=np.float32
        )
        self._review_count = np.array(
            [meta_map.get(rid, (0.0, 0.0))[1] for rid in self._ids], dtype=np.float32
        )

        self._loaded = True
        print(f"[TrendingService] Loaded {len(self._ids):,} recipes, "
              f"matrix {self._matrix.shape}.")

        # Pre-compute keyword list + per-keyword recipe lists
        self._compute_trending()

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    # ── IR Core ───────────────────────────────────────────────────────────────

    def _compute_trending(self):
        """
        Step 1 – Keyword extraction via TF-IDF corpus-sum.

        Sum each column (term) of the TF-IDF matrix across all documents.
        High-sum terms are both frequent AND discriminative – the corpus
        fingerprint of what food people actually care about.

        Filter using the food-domain whitelist then pick top-K.
        """
        feature_names = self._tfidf.get_feature_names_out()
        col_sums = np.asarray(self._matrix.sum(axis=0)).ravel()  # (D,)

        # Apply whitelist filter
        ranked_idx = col_sums.argsort()[::-1]
        keywords = []
        for idx in ranked_idx:
            term = feature_names[idx]
            if term in _FOOD_WHITELIST:
                keywords.append(term)
            if len(keywords) >= _TOP_K_KEYWORDS:
                break

        self._top_keywords = keywords
        print(f"[TrendingService] Top keywords: {keywords}")

        """
        Step 2 – Per-keyword recipe ranking (popularity + quality).

        For each keyword, use the TF-IDF matrix to score all recipes
        (equivalent to a single-term TF-IDF retrieval), then combine with
        review popularity:

          trending_score = 0.7 * log1p(review_count) + 0.3 * avg_rating

        This ranking is intentionally DIFFERENT from search relevance.
        """
        self._keyword_recipes = {}  # keyword → [recipe_id (str)]

        for kw in keywords:
            term_idx = self._tfidf.vocabulary_.get(kw)
            if term_idx is None:
                continue

            # TF-IDF relevance for this term across all docs (sparse column)
            col = np.asarray(self._matrix[:, term_idx].todense()).ravel()  # (N,)

            # Only consider recipes where this keyword actually appears
            has_term = col > 0

            # Popularity-first ranking
            pop_score = (
                0.7 * np.log1p(self._review_count)
                + 0.3 * self._avg_rating
            )
            # Zero out recipes that don't contain the keyword at all
            pop_score[~has_term] = -np.inf

            top_n = min(_TOP_RECIPES_PER_KEYWORD * 3, int(has_term.sum()))
            if top_n == 0:
                continue

            part = np.argpartition(pop_score, -top_n)[-top_n:]
            ranked = part[np.argsort(pop_score[part])[::-1]]

            self._keyword_recipes[kw] = [
                self._ids[i] for i in ranked[:_TOP_RECIPES_PER_KEYWORD]
            ]

        print(f"[TrendingService] Pre-computed recipes for "
              f"{len(self._keyword_recipes)} keywords.")

    # ── Public API ────────────────────────────────────────────────────────────

    def get_keywords(self) -> List[str]:
        """Return the list of trending keyword strings."""
        self._ensure_loaded()
        return self._top_keywords or []

    def get_recipes_for_keyword(self, keyword: str) -> List[str]:
        """
        Return top recipe IDs for a keyword, ranked by popularity + quality.
        Returns [] if keyword not in the trending list.
        """
        self._ensure_loaded()
        kw = keyword.lower().strip()
        return self._keyword_recipes.get(kw, [])

    def get_keyword_meta(self) -> List[Dict]:
        """
        Return keywords with popularity context (recipe count, avg rating)
        for richer frontend display.
        """
        self._ensure_loaded()
        result = []
        for kw in (self._top_keywords or []):
            recipe_ids = self._keyword_recipes.get(kw, [])
            if not recipe_ids:
                continue
            indices = [self._id_to_idx[r] for r in recipe_ids if r in self._id_to_idx]
            avg_r   = float(self._avg_rating[indices].mean()) if indices else 0.0
            result.append({
                "keyword":      kw,
                "recipe_count": len(recipe_ids),
                "avg_rating":   round(avg_r, 2),
            })
        return result


# Singleton – loaded lazily (or eagerly via warmup thread)
trending_service = TrendingService()
