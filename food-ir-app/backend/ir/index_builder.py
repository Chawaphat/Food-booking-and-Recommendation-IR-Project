import pandas as pd
import pickle
import re
from ir.preprocess import preprocess, clean_list_field
from ir.bm25 import BM25

def parse_r_list(text):
    if not isinstance(text, str):
        return []
    return re.findall(r'"(.*?)"', text)

def extract_image(text):
    if not isinstance(text, str):
        return ""
    urls = parse_r_list(text)
    return urls[0] if urls else ""

df = pd.read_csv("data/raw/recipes.csv")

ingredients = df["RecipeIngredientParts"].apply(parse_r_list)
quantities = df["RecipeIngredientQuantities"].apply(parse_r_list)
steps = df["RecipeInstructions"].apply(parse_r_list)

def merge_ingredients(parts, qtys):
    result = []
    for i in range(len(parts)):
        result.append({
            "name": parts[i],
            "quantity": qtys[i] if i < len(qtys) else ""
        })
    return result

merged_ingredients = [
    merge_ingredients(parts, qtys)
    for parts, qtys in zip(ingredients, quantities)
]

raw_df = pd.DataFrame({
    "id": df["RecipeId"],
    "name": df["Name"],
    "image": df["Images"].apply(extract_image),
    "description": df["Description"].fillna(""),
    "ingredients": merged_ingredients,
    "steps": steps,
})


# df["RecipeIngredientParts"] = df["RecipeIngredientParts"].apply(clean_list_field)
# df["RecipeInstructions"] = df["RecipeInstructions"].apply(clean_list_field)

# df["text"] = (
#     df["Name"].fillna("")*3 + " " +
#     df["RecipeIngredientParts"].fillna("")*2 + " " +
#     df["RecipeInstructions"].fillna("") + " " +
#     df["Description"].fillna("") + " " +
#     df["Keywords"].fillna("")
# )

# df["text"] = df["text"].apply(preprocess)

# bm25 = BM25()
# bm25.fit(df["text"])

# pickle.dump(bm25, open("data/processed/bm25.pkl", "wb"))
# pickle.dump(df, open("data/processed/data_clean.pkl", "wb"))

pickle.dump(raw_df, open("data/processed/data_raw.pkl", "wb"))

print("INDEX BUILD DONE")