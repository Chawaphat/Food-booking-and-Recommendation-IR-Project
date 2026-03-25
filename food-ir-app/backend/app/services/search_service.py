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
