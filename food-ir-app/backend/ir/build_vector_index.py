import sys
import os

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pickle
import pandas as pd
import numpy as np
from elasticsearch import helpers
from app.config.elasticsearch import get_es_client

INDEX_NAME = "recipes_vector"
VECTOR_DIMS = 4096

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "processed")


def setup_index(es):
    if es.indices.exists(index=INDEX_NAME):
        print(f"Deleting existing index: {INDEX_NAME}")
        es.indices.delete(index=INDEX_NAME)

    mapping = {
        "mappings": {
            "properties": {
                "recipe_id":    {"type": "keyword"},
                "embedding":    {"type": "dense_vector", "dims": VECTOR_DIMS},
                "avg_rating":   {"type": "float"},
                "review_count": {"type": "integer"},
            }
        }
    }
    es.indices.create(index=INDEX_NAME, body=mapping)
    print(f"Created index: {INDEX_NAME}  (dims={VECTOR_DIMS})")


def generate_docs(tfidf_matrix, recipe_ids, meta_df):
    meta_lookup = meta_df.set_index("RecipeId").to_dict("index")

    for idx, recipe_id in enumerate(recipe_ids):
        vec = tfidf_matrix[idx].toarray()[0].tolist()[:VECTOR_DIMS]

        meta = meta_lookup.get(recipe_id, {})
        avg_rating   = float(meta.get("avg_rating",   0) or 0)
        review_count = int(meta.get("review_count", 0) or 0)

        yield {
            "_index": INDEX_NAME,
            "_id":    str(recipe_id),
            "_source": {
                "recipe_id":    str(recipe_id),
                "embedding":    vec,
                "avg_rating":   avg_rating,
                "review_count": review_count,
            },
        }


def main():
    print("Loading TF-IDF artifacts …")
    with open(os.path.join(DATA_DIR, "tfidf_matrix.pkl"), "rb") as f:
        tfidf_matrix = pickle.load(f)
    with open(os.path.join(DATA_DIR, "recipe_ids.pkl"), "rb") as f:
        recipe_ids = pickle.load(f)
    meta_df = pd.read_csv(os.path.join(DATA_DIR, "recipe_meta.csv"))

    actual_dims = tfidf_matrix.shape[1]
    if actual_dims < VECTOR_DIMS:
        raise ValueError(
            f"TF-IDF matrix has {actual_dims} dims but VECTOR_DIMS={VECTOR_DIMS}. "
            "Rebuild TF-IDF with at least VECTOR_DIMS features."
        )
    if actual_dims > VECTOR_DIMS:
        print(
            f"Warning: TF-IDF matrix has {actual_dims} dims; truncating to {VECTOR_DIMS} "
            "for Elasticsearch indexing."
        )

    print(f"Matrix shape: {tfidf_matrix.shape}  |  recipes: {len(recipe_ids)}")

    es = get_es_client()
    setup_index(es)

    print("Bulk-indexing vectors …")
    success, failed = helpers.bulk(
        es,
        generate_docs(tfidf_matrix, recipe_ids, meta_df),
        stats_only=True,
        chunk_size=500,
    )
    print(f"Done. Indexed: {success}   Failed: {failed}")


if __name__ == "__main__":
    main()
