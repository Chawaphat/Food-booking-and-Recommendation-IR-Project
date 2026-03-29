
from __future__ import annotations

import os
import pickle
import re
from typing import Dict, List, Optional

import numpy as np

_DATA_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "data", "processed"
)
_MATRIX_PATH = os.path.join(_DATA_DIR, "tfidf_matrix.pkl")
_IDS_PATH    = os.path.join(_DATA_DIR, "recipe_ids.pkl")

_RAW_CSV = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "data", "raw", "recipes.csv"
)


def extract_image_url(images_field) -> Optional[str]:
    
    if not isinstance(images_field, str):
        return None

    raw = images_field.strip()
    if raw.lower() == "character(0)":
        return None

    urls = re.findall(r'"(.*?)"', raw)
    if not urls:
        if raw.startswith("http"):
            return raw
        return None

    for url in urls:
        url = url.strip()
        if url.startswith("http"):
            return url

    return None


def _has_valid_image(image_val) -> bool:
    return isinstance(image_val, str) and image_val.startswith("http")



class ImageFallbackService:
    
    def __init__(self):
        self._tfidf_matrix = None   # scipy sparse (N, D)
        self._recipe_ids: List[str] = []  # length N, str recipe_ids
        self._id_to_idx: Dict[str, int] = {}

        # Maps recipe_id_str → image_url (populated from CSV + ES hits)
        self._image_map: Dict[str, str] = {}

        # Compact bool array parallel to _recipe_ids: True = has valid image
        # Populated after CSV load; used for fast index-based lookups.
        self._has_image_arr: Optional[np.ndarray] = None  # shape (N,), dtype bool

        # Cache: recipe_id_str → fallback image URL | None
        self._fallback_cache: Dict[str, Optional[str]] = {}

        self._loaded = False


    def _load_tfidf(self):
        if self._loaded:
            return
        try:
            with open(_MATRIX_PATH, "rb") as f:
                self._tfidf_matrix = pickle.load(f)
            with open(_IDS_PATH, "rb") as f:
                self._recipe_ids = [str(rid) for rid in pickle.load(f)]
            self._id_to_idx = {rid: i for i, rid in enumerate(self._recipe_ids)}


            self._prefill_image_map_from_csv()

            self._loaded = True
            has_count = int(self._has_image_arr.sum()) if self._has_image_arr is not None else 0
            print(
                f"[ImageFallbackService] Loaded TF-IDF matrix "
                f"{self._tfidf_matrix.shape}; "
                f"{has_count:,} recipes with valid images available for fallback."
            )
        except Exception as e:
            print(f"[ImageFallbackService] Failed to load artifacts: {e}")
            self._loaded = False

    def _prefill_image_map_from_csv(self):
        try:
            import pandas as _pd
            df = _pd.read_csv(
                _RAW_CSV,
                usecols=["RecipeId", "Images"],
                dtype={"RecipeId": str},
            )
            df["_url"] = df["Images"].apply(extract_image_url).fillna("")

            for rid, url in zip(df["RecipeId"], df["_url"]):
                if rid not in self._image_map or not self._image_map[rid]:
                    self._image_map[rid] = url

            self._has_image_arr = np.array(
                [bool(self._image_map.get(rid, "")) for rid in self._recipe_ids],
                dtype=bool,
            )
            print(f"[ImageFallbackService] Pre-filled image map from CSV ({len(df):,} rows).")
        except Exception as e:
            print(f"[ImageFallbackService] Could not pre-fill image map from CSV: {e}")
            self._has_image_arr = None

    # ── public API ────────────────────────────────────────────────────────────

    def register_image(self, recipe_id, image_url: Optional[str]):
       
        key = str(recipe_id)
        if key not in self._image_map or not self._image_map[key]:
            self._image_map[key] = image_url or ""

    def get_fallback_image(self, recipe_id) -> Optional[str]:
        
        key = str(recipe_id)

        if key in self._fallback_cache:
            return self._fallback_cache[key]

        self._load_tfidf()
        if not self._loaded or self._tfidf_matrix is None:
            self._fallback_cache[key] = None
            return None

        idx = self._id_to_idx.get(key)
        if idx is None:
            self._fallback_cache[key] = None
            return None

       
        row = self._tfidf_matrix[idx]          # sparse (1, D)
        sims = (self._tfidf_matrix @ row.T)    # sparse (N, 1)
        sims_arr = np.asarray(sims.todense()).ravel()  # dense (N,)

        sims_arr[idx] = -1.0

        if self._has_image_arr is not None:
            masked = sims_arr.copy()
            masked[~self._has_image_arr] = -1.0
            ranked = np.argsort(masked)[::-1]
        else:
            ranked = np.argsort(sims_arr)[::-1]

        result = None
        for candidate_idx in ranked:
            candidate_id = self._recipe_ids[candidate_idx]
            img = self._image_map.get(candidate_id, "")
            if _has_valid_image(img):
                result = img
                break

        self._fallback_cache[key] = result
        return result

    def resolve_image(self, recipe_id, current_image) -> Optional[str]:
        
        self.register_image(recipe_id, current_image if _has_valid_image(current_image) else None)

        if _has_valid_image(current_image):
            return current_image

        return self.get_fallback_image(recipe_id)


image_fallback_service = ImageFallbackService()
