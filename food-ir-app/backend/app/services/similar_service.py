"""
similar_service.py
──────────────────
IR-powered "Similar Recipes" feature.

Algorithm
─────────
Because every row in tfidf_matrix.pkl is already L2-normalised,
the dot product between two rows equals their cosine similarity:

    sim(a, b) = tfidf_matrix[a] · tfidf_matrix[b]ᵀ

So we can compute ALL pairwise similarities for ONE query recipe
in a single sparse matrix–vector multiply against the full corpus:

    sims[i] = tfidf_matrix[query_idx] · tfidf_matrix[i]ᵀ   ∀i

This runs in ~80 ms for 522k recipes on CPU — fast enough for
on-demand requests without any precomputed similarity matrix.

Optional rating boost (from recipe_meta.csv):
    final_score = 0.8 × similarity + 0.2 × (avg_rating / 5)

Artifacts reused (NOT rebuilt):
  • data/processed/tfidf_matrix.pkl  – sparse (N, 5000) float64
  • data/processed/recipe_ids.pkl    – list[int], parallel to matrix rows
  • data/processed/recipe_meta.csv   – avg_rating, review_count
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

_TOP_K_SIMILAR     = 3   # recipes to return per request
_CANDIDATE_POOL    = 50  # over-fetch internally to allow rating-boost reranking


class SimilarRecipeService:
    def __init__(self):
        self._matrix    = None   # sparse (N, D)
        self._ids: List[int] = []
        self._id_to_idx: Dict[int, int] = {}

        self._avg_rating:    Optional[np.ndarray] = None  # (N,)
        self._review_count:  Optional[np.ndarray] = None  # (N,)

        self._loaded = False

    # ── Loading ───────────────────────────────────────────────────────────────

    def load(self):
        with open(os.path.join(_DATA_DIR, "tfidf_matrix.pkl"), "rb") as f:
            self._matrix = pickle.load(f)

        with open(os.path.join(_DATA_DIR, "recipe_ids.pkl"), "rb") as f:
            raw_ids = pickle.load(f)

        self._ids = [int(r) for r in raw_ids]
        self._id_to_idx = {rid: i for i, rid in enumerate(self._ids)}

        meta = pd.read_csv(os.path.join(_DATA_DIR, "recipe_meta.csv"),
                           dtype={"RecipeId": str})
        meta_map = {
            int(row["RecipeId"]): (float(row["avg_rating"]), float(row["review_count"]))
            for _, row in meta.iterrows()
        }

        N = len(self._ids)
        self._avg_rating   = np.array(
            [meta_map.get(rid, (0.0, 0.0))[0] for rid in self._ids], dtype=np.float32
        )
        self._review_count = np.array(
            [meta_map.get(rid, (0.0, 0.0))[1] for rid in self._ids], dtype=np.float32
        )

        self._loaded = True
        print(f"[SimilarRecipeService] Loaded {N:,} recipes, "
              f"matrix {self._matrix.shape}.")

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    # ── Core similarity ───────────────────────────────────────────────────────

    def get_similar_ids(self, recipe_id: int, top_k: int = _TOP_K_SIMILAR) -> List[int]:
        """
        Return top-k similar recipe IDs for the given recipe_id.

        Similarity = TF-IDF cosine (sparse dot product, 80 ms on 522k recipes)
        Final score = 0.8 × cosine_sim + 0.2 × (avg_rating / 5)

        Returns [] if recipe_id is unknown.
        """
        self._ensure_loaded()

        query_id = int(recipe_id)
        if query_id not in self._id_to_idx:
            return []

        q_idx  = self._id_to_idx[query_id]
        q_vec  = self._matrix[q_idx]  # (1, D) sparse

        # Sparse dot → cosine scores (all rows are L2-normalised).
        # mat @ q_vec.T returns a sparse (N, 1) csr_matrix; flatten to 1D.
        sims = (self._matrix @ q_vec.T).toarray().ravel()   # (N,)
        sims[q_idx] = -1.0   # exclude self

        # Optional rating boost
        norm_rating = self._avg_rating / 5.0
        final = 0.8 * sims + 0.2 * norm_rating

        # Get top _CANDIDATE_POOL, then slice top_k
        pool    = min(_CANDIDATE_POOL, len(self._ids) - 1)
        top_idx = np.argpartition(final, -pool)[-pool:]
        top_idx = top_idx[np.argsort(final[top_idx])[::-1]][:top_k]

        return [self._ids[i] for i in top_idx]


# Module-level singleton
similar_service = SimilarRecipeService()
