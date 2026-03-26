import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import re
from elasticsearch import helpers
from app.config.elasticsearch import get_es_client
from ir.preprocess import preprocess, clean_list_field 


INDEX_NAME = "recipes"

def setup_index(es):
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)

    settings = {
        "analysis": {
            "analyzer": {
                "custom_english_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "english_stop",
                        "porter_stem"
                    ]
                }
            },
            "filter": {
                "english_stop": {
                    "type": "stop",
                    "stopwords": "_english_"
                },
                "porter_stem": {
                    "type": "stemmer",
                    "language": "porter"
                }
            }
        }
    }

    mappings = {
        "properties": {
            "id": {"type": "keyword"},
            "name": {"type": "text", "analyzer": "custom_english_analyzer"},
            "description": {"type": "text", "analyzer": "custom_english_analyzer"},
            "reviewCount": {"type": "integer"},
            "ingredients": {
                "type": "nested",
                "properties": {
                    "name": {"type": "text", "analyzer": "custom_english_analyzer"},
                    "quantity": {"type": "keyword"}
                }
            },
            "steps": {"type": "text", "analyzer": "custom_english_analyzer"},
            "keywords": {"type": "text", "analyzer": "custom_english_analyzer"},
            "image": {"type": "keyword"},
            "combined_text": {"type": "text", "analyzer": "custom_english_analyzer"}
        }
    }

    es.indices.create(index=INDEX_NAME, body={"settings": settings, "mappings": mappings})
    print(f"Created index: {INDEX_NAME}")

def parse_r_list(text):
    if not isinstance(text, str):
        return []
    return re.findall(r'"(.*?)"', text)

def extract_image(text):
    if not isinstance(text, str):
        return ""
    urls = parse_r_list(text)
    return urls[0] if urls else ""

def generate_docs(df):
    for _, row in df.iterrows():
        ingredients_parts = parse_r_list(row["RecipeIngredientParts"])
        quantities = parse_r_list(row["RecipeIngredientQuantities"])
        steps = parse_r_list(row["RecipeInstructions"])
        image = extract_image(row["Images"])
        keywords = parse_r_list(row["Keywords"])
        
        ingredients = []
        for i in range(len(ingredients_parts)):
            ingredients.append({
                "name": ingredients_parts[i],
                "quantity": quantities[i] if i < len(quantities) else ""
            })
        
        name = str(row["Name"]) if pd.notna(row["Name"]) else ""
        desc = str(row["Description"]) if pd.notna(row["Description"]) else ""
        
        combined_text = (
            f"{name} {name} {name} " + 
            " ".join(ingredients_parts) + " " + " ".join(ingredients_parts) + " " +
            " ".join(steps) + " " +
            desc + " " +
            " ".join(keywords)
        )
        
        try:
            review_count = int(row["ReviewCount"]) if pd.notna(row["ReviewCount"]) else 0
        except (ValueError, TypeError):
            review_count = 0

        doc = {
            "_index": INDEX_NAME,
            "_id": str(row["RecipeId"]),
            "_source": {
                "id": str(row["RecipeId"]),
                "name": name,
                "description": desc,
                "reviewCount": review_count,
                "ingredients": ingredients,
                "steps": steps,
                "keywords": keywords,
                "image": image,
                "combined_text": combined_text
            }
        }
        yield doc

def main():
    es = get_es_client()
    setup_index(es)
    
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data/raw/recipes.csv")
    print(f"Reading from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    print("Indexing documents...")
    success, failed = helpers.bulk(es, generate_docs(df), stats_only=True)
    print(f"Indexed {success} documents. Failed: {failed}")

if __name__ == "__main__":
    main()
