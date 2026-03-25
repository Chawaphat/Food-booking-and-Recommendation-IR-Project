from config.elasticsearch import get_es_client

class SearchService:
    def __init__(self):
        self.es = None

    def load(self):
        self.es = get_es_client()
        if self.es.ping():
            print("Connected to Elasticsearch")
        else:
            print("Could not connect to Elasticsearch")

    def search(self, query, top_k=10):
        if not self.es:
            self.load()
            
        try:
            response = self.es.search(
                index="recipes",
                size=top_k,
                query={
                    "multi_match": {
                        "query": query,
                        "fields": [
                            "name^3", 
                            "ingredients.name^2", 
                            "steps", 
                            "description", 
                            "keywords", 
                            "combined_text"
                        ],
                        "fuzziness": "AUTO",
                        "operator": "or"
                    }
                }
            )
            
            results = []
            for hit in response["hits"]["hits"]:
                source = hit["_source"]
                if "combined_text" in source:
                    del source["combined_text"]
                source["score"] = hit["_score"]
                results.append(source)
                
            return results
        except Exception as e:
            print(f"Error searching Elasticsearch: {e}")
            return []

    def get_by_ids(self, recipe_ids):
        if not self.es:
            self.load()
            
        if not recipe_ids:
            print("No recipe_ids provided to get_by_ids")
            return []

        print(f"Querying Elasticsearch for IDs: {recipe_ids}")
        try:
            # Query elastic search using a terms query
            # Cast inputs to string just in case 'id' is mapped as keyword or string
            string_ids = [str(rid) for rid in recipe_ids]
            response = self.es.search(
                index="recipes",
                size=len(recipe_ids),
                query={
                    "terms": {
                        "id": string_ids
                    }
                }
            )
            
            results = []
            for hit in response["hits"]["hits"]:
                source = hit["_source"]
                if "combined_text" in source:
                    del source["combined_text"]
                # In case elasticsearch 'id' differs from '_id'
                if "id" not in source:
                    # just in case
                    source["id"] = hit["_id"]
                results.append(source)
            
            print(f"Elasticsearch returned {len(results)} recipes for {len(recipe_ids)} requested IDs")
            return results
        except Exception as e:
            print(f"Error executing terms query in Elasticsearch: {e}")
            return []
