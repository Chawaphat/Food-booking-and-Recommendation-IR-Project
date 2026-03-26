import pandas as pd
import numpy as np
import pickle
import re
from sklearn.feature_extraction.text import TfidfVectorizer

from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[2]
processed_dir = BASE_DIR /"backend"/ "data" / "processed"
processed_dir.mkdir(parents=True, exist_ok=True)

recipes = pd.read_csv(BASE_DIR /"backend"/ "data" / "raw" / "recipes.csv")
reviews = pd.read_csv(BASE_DIR /"backend"/ "data" / "raw" / "reviews.csv")


# =========================
# 2. AGGREGATE REVIEW
# =========================
review_stats = reviews.groupby("RecipeId").agg({
    "Rating": ["mean", "count"]
}).reset_index()

review_stats.columns = ["RecipeId", "avg_rating", "review_count"]

recipes = recipes.merge(review_stats, on="RecipeId", how="left")
recipes["avg_rating"] = recipes["avg_rating"].fillna(0)
recipes["review_count"] = recipes["review_count"].fillna(0)


# =========================
# 3. CLEAN FUNCTIONS
# =========================

def clean_text(text):
    if not isinstance(text, str):
        return ""
    
    text = text.lower()
    
    # keep letters + numbers (important for recipes)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    
    # remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()
    
    return text


def clean_list_field(text):
    if not isinstance(text, str):
        return ""
    
    text = text.lower()
    
    # remove c(" ... ")
    text = re.sub(r'^c\(|\)$', '', text)
    text = text.replace('"', '')
    
    # replace comma with space
    text = text.replace(',', ' ')
    
    text = re.sub(r"\s+", " ", text).strip()
    
    return text


# =========================
# 4. BUILD TEXT FEATURE
# =========================

recipes["text"] = (
    (recipes["Name"].apply(clean_text) + " ") * 3 +
    (recipes["Keywords"].apply(clean_list_field) + " ") * 2 +
    (recipes["RecipeIngredientParts"].apply(clean_list_field) + " ") * 2 +
    recipes["RecipeCategory"].apply(clean_list_field) + " " +
    recipes["RecipeInstructions"].apply(clean_list_field)
)


# =========================
# 5. TF-IDF TRAIN
# =========================

tfidf = TfidfVectorizer(
    stop_words="english",
    max_features=5000
)

tfidf_matrix = tfidf.fit_transform(recipes["text"])


# =========================
# 6. SAVE FILES
# =========================

# save model
with open(processed_dir / "tfidf.pkl", "wb") as f:
    pickle.dump(tfidf, f)

# save matrix
with open(processed_dir / "tfidf_matrix.pkl", "wb") as f:
    pickle.dump(tfidf_matrix, f)

# save recipe id mapping
recipe_ids = recipes["RecipeId"].tolist()
with open(processed_dir / "recipe_ids.pkl", "wb") as f:
    pickle.dump(recipe_ids, f)

# save metadata (for ranking later)
meta = recipes[["RecipeId", "avg_rating", "review_count"]]
meta.to_csv(processed_dir / "recipe_meta.csv", index=False)


print("✅ TF-IDF model built successfully!")
print(f"Total recipes: {len(recipes)}")
print(f"TF-IDF shape: {tfidf_matrix.shape}")