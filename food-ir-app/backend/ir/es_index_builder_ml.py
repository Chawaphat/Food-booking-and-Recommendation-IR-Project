from elasticsearch import Elasticsearch
import pickle

es = Elasticsearch("http://localhost:9200")

tfidf_matrix = pickle.load(open("tfidf_matrix.pkl", "rb"))
recipe_ids = pickle.load(open("recipe_ids.pkl", "rb"))

import pandas as pd
meta = pd.read_csv("recipe_meta.csv")

for i, rid in enumerate(recipe_ids):
    vector = tfidf_matrix[i].toarray()[0].tolist()

    row = meta[meta["RecipeId"] == rid].iloc[0]

    doc = {
        "RecipeId": str(rid),
        "embedding": vector,
        "avg_rating": float(row["avg_rating"]),
        "review_count": int(row["review_count"])
    }

    es.index(index="recipes_vector", id=rid, document=doc)

print("✅ Indexed all recipes")