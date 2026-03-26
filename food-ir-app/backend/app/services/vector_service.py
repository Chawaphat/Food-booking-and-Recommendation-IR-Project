"""
vector_service.py
─────────────────
Loads pre-built TF-IDF artifacts at import time and exposes a single method
to query the `recipes_vector` Elasticsearch index using script_score cosine
similarity combined with popularity signals.
"""

import os
import pickle
import numpy as np
from config.elasticsearch import get_es_client

INDEX_NAME = "recipes_vector"
VECTOR_DIMS = 4096

_DATA_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "data", "processed"
)


class VectorService:
    def __init__(self):
        self.es = None
        self._tfidf_matrix = None   # scipy sparse matrix
        self._recipe_ids = None     # list[int|str]
        self._id_to_idx = None      # dict: recipe_id_str → row index

    # ── Setup ─────────────────────────────────────────────────────────────────

    def load(self):
        """Load Elasticsearch client and TF-IDF artifacts."""
        self.es = get_es_client()

        matrix_path = os.path.join(_DATA_DIR, "tfidf_matrix.pkl")
        ids_path    = os.path.join(_DATA_DIR, "recipe_ids.pkl")

        with open(matrix_path, "rb") as f:
            self._tfidf_matrix = pickle.load(f)
        with open(ids_path, "rb") as f:
            self._recipe_ids = pickle.load(f)

        self._id_to_idx = {str(rid): i for i, rid in enumerate(self._recipe_ids)}
        print(f"[VectorService] Loaded {len(self._recipe_ids)} TF-IDF vectors "
              f"(dims={self._tfidf_matrix.shape[1]})")

    def _ensure_loaded(self):
        if self.es is None:
            self.load()

    # ── Public API ────────────────────────────────────────────────────────────

    def get_vector(self, recipe_id):
        """Return the TF-IDF dense vector (list[float]) for a recipe, or None."""
        self._ensure_loaded()
        idx = self._id_to_idx.get(str(recipe_id))
        if idx is None:
            return None
        return self._tfidf_matrix[idx].toarray()[0].tolist()[:VECTOR_DIMS]

    def recommend_for_folder(self, folder_recipe_ids, exclude_ids=None, top_k=10):
        """
        Compute folder profile (average TF-IDF vector of bookmarked recipes)
        and return top_k similar recipes from Elasticsearch, excluding
        already-bookmarked ones.

        score = cosineSimilarity(query_vector, embedding)
            + 0.2 * avg_rating
            + 0.1 * log(1 + review_count)

        Returns list of dicts: {recipe_id, score}
        """
        self._ensure_loaded()

        # Build folder profile vector
        vecs = []
        for rid in folder_recipe_ids:
            idx = self._id_to_idx.get(str(rid))
            if idx is not None:
                row = self._tfidf_matrix[idx].toarray()[0]
                vecs.append(row[:VECTOR_DIMS])

        if not vecs:
            return []

        profile = np.mean(vecs, axis=0).tolist()

        # Exclude IDs filter
        exclude_ids = [str(i) for i in (exclude_ids or [])]

        query = {
            "script_score": {
                "query": {
                    "bool": {
                        "must_not": [
                            {"terms": {"recipe_id": exclude_ids}}
                        ] if exclude_ids else []
                    }
                },
                "script": {
                    "source": """
                        double cosine = cosineSimilarity(params.query_vector, 'embedding') + 1.0;
                        double rating_boost = 0.2 * doc['avg_rating'].value;
                        double pop_boost = 0.1 * Math.log(1 + doc['review_count'].value);
                        return cosine + rating_boost + pop_boost;
                    """,
                    "params": {"query_vector": profile}
                }
            }
        }
        try:
            response = self.es.search(
                index=INDEX_NAME,
                size=top_k,
                query=query,
                _source=["recipe_id", "avg_rating", "review_count"],
                request_timeout=90,
            )
            results = []
            for hit in response["hits"]["hits"]:
                results.append({
                    "recipe_id": hit["_source"]["recipe_id"],
                    "score": hit["_score"],
                })
            return results
        except Exception as e:
            print(f"[VectorService] Error querying ES: {e}")
            return []


# Singleton instance (loaded lazily on first request)
vector_service = VectorService()
