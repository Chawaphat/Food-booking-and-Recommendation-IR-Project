import pickle
import numpy as np

# load index
with open("data/processed/bm25.pkl", "rb") as f:
    bm25 = pickle.load(f)

with open("data/processed/data.pkl", "rb") as f:
    df = pickle.load(f)

query = "chicken pasta"

scores = bm25.search(query)

top_k = 5
idx = np.argsort(scores)[::-1][:top_k]

results = df.iloc[idx]

print(results[["Name", "RecipeIngredientParts"]])