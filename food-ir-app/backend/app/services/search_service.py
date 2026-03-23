import pickle
import numpy as np

class SearchService:
    def __init__(self):
        self.bm25 = None
        self.df = None

    def load(self):
        with open("data/processed/bm25.pkl", "rb") as f:
            self.bm25 = pickle.load(f)

        with open("data/processed/data.pkl", "rb") as f:
            self.df = pickle.load(f)

    def search(self, query, top_k=10):
        scores = self.bm25.search(query)

        idx = np.argsort(scores)[::-1][:top_k]

        results = self.df.iloc[idx].copy()
        results["score"] = scores[idx]

        return results[[
            "RecipeId",
            "Name",
            "Images",
            "RecipeIngredientParts",
            "RecipeInstructions",
            "score"
        ]].to_dict(orient="records")