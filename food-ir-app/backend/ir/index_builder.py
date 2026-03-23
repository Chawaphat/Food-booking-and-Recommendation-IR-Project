import pandas as pd
import pickle
from ir.preprocess import preprocess, clean_list_field
from ir.bm25 import BM25

df = pd.read_csv("data/raw/recipes.csv")

df["RecipeIngredientParts"] = df["RecipeIngredientParts"].apply(clean_list_field)
df["RecipeInstructions"] = df["RecipeInstructions"].apply(clean_list_field)
df["Keywords"] = df["Keywords"].apply(clean_list_field)

df["text"] = (
    df["Name"].fillna("")*3 + " " +
    df["RecipeIngredientParts"].fillna("")*2 + " " +
    df["RecipeInstructions"].fillna("") + " " +
    df["Description"].fillna("") + " " +
    df["Keywords"].fillna("")
)

df["text"] = df["text"].apply(preprocess)

bm25 = BM25()
bm25.fit(df["text"])

# save
with open("data/processed/bm25.pkl", "wb") as f:
    pickle.dump(bm25, f)

with open("data/processed/data.pkl", "wb") as f:
    pickle.dump(df, f)