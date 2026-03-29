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

_TOP_K_SIMILAR     = 3
_CANDIDATE_POOL    = 50


class SimilarRecipeService:
    def __init__(self):
        self._matrix    = None   # sparse (N, D)
        self._ids: List[int] = []
        self._id_to_idx: Dict[int, int] = {}

        self._avg_rating:    Optional[np.ndarray] = None  # (N,)
        self._review_count:  Optional[np.ndarray] = None  # (N,)

        self._loaded = False

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

    def get_similar_ids(self, recipe_id: int, top_k: int = _TOP_K_SIMILAR) -> List[int]:
        """Return top-k similar recipe IDs for the given recipe ID."""
        self._ensure_loaded()

        query_id = int(recipe_id)
        if query_id not in self._id_to_idx:
            return []

        q_idx  = self._id_to_idx[query_id]
        q_vec  = self._matrix[q_idx]  # (1, D) sparse

        sims = (self._matrix @ q_vec.T).toarray().ravel()   # (N,)
        sims[q_idx] = -1.0   # exclude self

        norm_rating = self._avg_rating / 5.0
        final = 0.8 * sims + 0.2 * norm_rating

        pool    = min(_CANDIDATE_POOL, len(self._ids) - 1)
        top_idx = np.argpartition(final, -pool)[-pool:]
        top_idx = top_idx[np.argsort(final[top_idx])[::-1]][:top_k]

        return [self._ids[i] for i in top_idx]

similar_service = SimilarRecipeService()
