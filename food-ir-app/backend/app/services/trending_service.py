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

_TOP_K_KEYWORDS  = 20
_TOP_RECIPES_PER_KEYWORD = 20


class TrendingService:
    def __init__(self):
        self._tfidf     = None   # TfidfVectorizer
        self._matrix    = None   # sparse (N, D)
        self._ids: List[str] = []
        self._id_to_idx: Dict[str, int] = {}

        self._avg_rating:    Optional[np.ndarray] = None  # (N,)
        self._review_count:  Optional[np.ndarray] = None  # (N,)

        self._top_keywords:   Optional[List[str]]            = None
        self._keyword_scores: Optional[Dict[str, List[str]]] = None  # keyword → [recipe_id]

        self._loaded = False

    def load(self):
        """Load artifacts and pre-compute trending cache."""
        with open(os.path.join(_DATA_DIR, "tfidf.pkl"), "rb") as f:
            self._tfidf = pickle.load(f)
        with open(os.path.join(_DATA_DIR, "tfidf_matrix.pkl"), "rb") as f:
            self._matrix = pickle.load(f)
        with open(os.path.join(_DATA_DIR, "recipe_ids.pkl"), "rb") as f:
            raw_ids = pickle.load(f)

        self._ids = [str(r) for r in raw_ids]
        self._id_to_idx = {rid: i for i, rid in enumerate(self._ids)}

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

        self._compute_trending()

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    def _compute_trending(self):
        """Compute trending keywords and top recipes for each keyword."""
        feature_names = self._tfidf.get_feature_names_out()
        col_sums = np.asarray(self._matrix.sum(axis=0)).ravel()  # (D,)

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

        self._keyword_recipes = {}  # keyword → [recipe_id (str)]

        for kw in keywords:
            term_idx = self._tfidf.vocabulary_.get(kw)
            if term_idx is None:
                continue

            col = np.asarray(self._matrix[:, term_idx].todense()).ravel()  # (N,)

            has_term = col > 0

            pop_score = (
                0.7 * np.log1p(self._review_count)
                + 0.3 * self._avg_rating
            )
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

    def get_keywords(self) -> List[str]:
        """Return the list of trending keyword strings."""
        self._ensure_loaded()
        return self._top_keywords or []

    def get_recipes_for_keyword(self, keyword: str) -> List[str]:
        """Return top recipe IDs for a keyword."""
        self._ensure_loaded()
        kw = keyword.lower().strip()
        return self._keyword_recipes.get(kw, [])

    def get_keyword_meta(self) -> List[Dict]:
        """Return keyword metadata for frontend display."""
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

trending_service = TrendingService()
