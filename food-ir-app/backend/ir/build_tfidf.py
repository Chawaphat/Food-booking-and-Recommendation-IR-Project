import pandas as pd
import numpy as np
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer


recipes = pd.read_csv("data/raw/recipes.csv")
reviews = pd.read_csv("data/raw/reviews.csv")


review_stats = reviews.groupby("RecipeId").agg({
    "Rating": ["mean", "count"]
}).reset_index()

review_stats.columns = ["RecipeId", "avg_rating", "review_count"]

recipes = recipes.merge(review_stats, on="RecipeId", how="left")
recipes["avg_rating"] = recipes["avg_rating"].fillna(0)
recipes["review_count"] = recipes["review_count"].fillna(0)


def safe_str(x):
    return str(x) if pd.notna(x) else ""


recipes["text"] = (
    recipes["Name"].apply(safe_str) + " " +
    recipes["RecipeCategory"].apply(safe_str) + " " +
    recipes["Keywords"].apply(safe_str) + " " +
    recipes["RecipeIngredientParts"].apply(safe_str) + " " +
    recipes["RecipeInstructions"].apply(safe_str)
)


# =========================
# 4. TF-IDF TRAIN
# =========================
tfidf = TfidfVectorizer(
    stop_words="english",
    max_features=4096
)

tfidf_matrix = tfidf.fit_transform(recipes["text"])

 
# =========================
# 5. SAVE FILES
# =========================

# save model
with open("tfidf.pkl", "wb") as f:
    pickle.dump(tfidf, f)

# save matrix
with open("tfidf_matrix.pkl", "wb") as f:
    pickle.dump(tfidf_matrix, f)

# save recipeId mapping (IMPORTANT!)
recipe_ids = recipes["RecipeId"].tolist()

with open("recipe_ids.pkl", "wb") as f:
    pickle.dump(recipe_ids, f)

# save metadata (rating + review_count)
meta = recipes[["RecipeId", "avg_rating", "review_count"]]

meta.to_csv("recipe_meta.csv", index=False)


print("✅ TF-IDF model built and saved successfully!")