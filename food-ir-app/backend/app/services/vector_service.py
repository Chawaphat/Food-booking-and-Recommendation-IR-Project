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

_CANDIDATE_K = 50


class VectorService:
    def __init__(self):
        self._tfidf_matrix = None          # scipy sparse (N, D)
        self._recipe_ids: List[str] = []
        self._id_to_idx: Dict[str, int] = {}

        self._avg_rating: Optional[np.ndarray]    = None  # (N,)
        self._review_count: Optional[np.ndarray]  = None  # (N,)

        self._lgbm_model = None   # lightgbm.Booster or None
        self._loaded = False

    def load(self):
        """Load recommendation artifacts from disk."""
        with open(os.path.join(_DATA_DIR, "tfidf_matrix.pkl"), "rb") as f:
            self._tfidf_matrix = pickle.load(f)

        with open(os.path.join(_DATA_DIR, "recipe_ids.pkl"), "rb") as f:
            raw_ids = pickle.load(f)
        self._recipe_ids = [str(r) for r in raw_ids]
        self._id_to_idx  = {rid: i for i, rid in enumerate(self._recipe_ids)}

        meta = pd.read_csv(
            os.path.join(_DATA_DIR, "recipe_meta.csv"),
            dtype={"RecipeId": str},
        )
        meta_map = {
            row["RecipeId"]: (float(row["avg_rating"]), float(row["review_count"]))
            for _, row in meta.iterrows()
        }
        self._avg_rating   = np.array(
            [meta_map.get(rid, (0.0, 0.0))[0] for rid in self._recipe_ids],
            dtype=np.float32,
        )
        self._review_count = np.array(
            [meta_map.get(rid, (0.0, 0.0))[1] for rid in self._recipe_ids],
            dtype=np.float32,
        )

        lgbm_path = os.path.join(_DATA_DIR, "lightgbm_model.txt")
        if os.path.exists(lgbm_path):
            try:
                import lightgbm as lgb
                self._lgbm_model = lgb.Booster(model_file=lgbm_path)
                print("[VectorService] LightGBM re-ranker loaded ✓")
            except Exception as e:
                print(f"[VectorService] LightGBM load failed ({e}); using TF-IDF fallback")
                self._lgbm_model = None
        else:
            print("[VectorService] lightgbm_model.txt not found; using TF-IDF fallback")

        self._loaded = True
        print(
            f"[VectorService] Ready — {len(self._recipe_ids):,} recipes, "
            f"TF-IDF {self._tfidf_matrix.shape}, "
            f"LightGBM={'ON' if self._lgbm_model else 'OFF (fallback)'}."
        )

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    def _build_profile(self, recipe_ids_in_folder: List) -> Optional[np.ndarray]:
        """Build a normalized folder profile vector."""
        from scipy.sparse import vstack
        rows = []
        for rid in recipe_ids_in_folder:
            idx = self._id_to_idx.get(str(rid))
            if idx is not None:
                rows.append(self._tfidf_matrix[idx])
        if not rows:
            return None
        profile = np.asarray(vstack(rows).mean(axis=0)).ravel()
        norm = np.linalg.norm(profile)
        return profile / norm if norm > 0 else None

    def _tfidf_top_candidates(
        self,
        profile: np.ndarray,
        exclude_set: set,
        k: int,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Return top-k candidate indices and cosine similarity scores."""
        sims = (self._tfidf_matrix @ profile).ravel()  # (N,)

        # Zero-out excluded recipes
        for rid in exclude_set:
            idx = self._id_to_idx.get(rid)
            if idx is not None:
                sims[idx] = -np.inf

        actual_k = min(k, len(sims))
        part = np.argpartition(sims, -actual_k)[-actual_k:]
        top_indices = part[np.argsort(sims[part])[::-1]]
        return top_indices, sims[top_indices]

    def get_vector(self, recipe_id) -> Optional[List[float]]:
        """Return dense TF-IDF vector for a recipe, or None."""
        self._ensure_loaded()
        idx = self._id_to_idx.get(str(recipe_id))
        if idx is None:
            return None
        return self._tfidf_matrix[idx].toarray()[0].tolist()

    def recommend_for_folder(
        self,
        folder_recipe_ids: List,
        exclude_ids: Optional[List] = None,
        top_k: int = 10,
    ) -> List[Dict]:
        """Return top-k recommendations for a folder."""
        self._ensure_loaded()

        profile = self._build_profile(folder_recipe_ids)
        if profile is None:
            return []

        exclude_set = {str(i) for i in (exclude_ids or [])}

        top_indices, top_sims = self._tfidf_top_candidates(
            profile, exclude_set, k=_CANDIDATE_K
        )

        # Filter out -inf (excluded) entries
        valid_mask  = top_sims > -np.inf
        top_indices = top_indices[valid_mask]
        top_sims    = top_sims[valid_mask]

        if len(top_indices) == 0:
            return []

        avg_r  = self._avg_rating[top_indices]       # (k,)
        log_rc = np.log1p(self._review_count[top_indices])  # (k,)

        features = np.column_stack([top_sims, avg_r, log_rc]).astype(np.float32)

        if self._lgbm_model is not None:
            scores = self._lgbm_model.predict(features)  # (k,)
        else:
            scores = top_sims + 0.2 * avg_r + 0.1 * log_rc

        ranked = np.argsort(scores)[::-1][:top_k]

        return [
            {
                "recipe_id": self._recipe_ids[top_indices[i]],
                "score":     float(scores[i]),
            }
            for i in ranked
        ]

vector_service = VectorService()
