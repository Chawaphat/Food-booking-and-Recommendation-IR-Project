import sys
import os

# Add project root to sys.path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import re
from elasticsearch import helpers
from app.config.elasticsearch import get_es_client
from ir.preprocess import preprocess, clean_list_field # We might reuse preprocess if we index preprocessed text, 
# but better to use ES analyzers. However, to match logic "closely" and handle specific cleaning tasks, 
# we can reuse some cleaning logic.

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
            "ingredients": {
                "type": "nested",
                "properties": {
                    "name": {"type": "text", "analyzer": "custom_english_analyzer"},
                    "quantity": {"type": "keyword"}
                }
            },
            "steps": {"type": "text", "analyzer": "custom_english_analyzer"}, # Store steps as list of strings? No, text is better for search
            "keywords": {"type": "text", "analyzer": "custom_english_analyzer"},
            "image": {"type": "keyword"},
            "combined_text": {"type": "text", "analyzer": "custom_english_analyzer"} # catch-all field
        }
    }

    es.indices.create(index=INDEX_NAME, body={"settings": settings, "mappings": mappings})
    print(f"Created index: {INDEX_NAME}")

def parse_r_list(text):
    if not isinstance(text, str):
        return []
    # Handle R-style vectors: c("a", "b")
    # Clean up artifacts first? Or regex extract directly
    # This regex looks for content inside double quotes
    return re.findall(r'"(.*?)"', text)

def extract_image(text):
    if not isinstance(text, str):
        return ""
    urls = parse_r_list(text)
    return urls[0] if urls else ""

def generate_docs(df):
    for _, row in df.iterrows():
        # Clean list fields
        ingredients_parts = parse_r_list(row["RecipeIngredientParts"])
        quantities = parse_r_list(row["RecipeIngredientQuantities"])
        steps = parse_r_list(row["RecipeInstructions"])
        image = extract_image(row["Images"])
        keywords = parse_r_list(row["Keywords"])
        
        # Merge ingredients
        ingredients = []
        for i in range(len(ingredients_parts)):
            ingredients.append({
                "name": ingredients_parts[i],
                "quantity": quantities[i] if i < len(quantities) else ""
            })

        # Create a combined text field for search similar to original BM25 logic
        # Original: Name*3 + Ingredients*2 + Instructions + Description + Keywords
        # We can simulate boosting at query time, but indexing text together is simple
        
        name = str(row["Name"]) if pd.notna(row["Name"]) else ""
        desc = str(row["Description"]) if pd.notna(row["Description"]) else ""
        
        combined_text = (
            f"{name} {name} {name} " + 
            " ".join(ingredients_parts) + " " + " ".join(ingredients_parts) + " " +
            " ".join(steps) + " " +
            desc + " " +
            " ".join(keywords)
        )
        
        doc = {
            "_index": INDEX_NAME,
            "_id": str(row["RecipeId"]),
            "_source": {
                "id": str(row["RecipeId"]),
                "name": name,
                "description": desc,
                "ingredients": ingredients,
                "steps": steps, # List of strings, ES handles arrays transparently
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
