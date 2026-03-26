import random as _random
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

    def _ensure_connected(self):
        if not self.es:
            self.load()

    def _clean_hit(self, hit):
        source = hit["_source"]
        source.pop("combined_text", None)
        if "id" not in source:
            source["id"] = hit["_id"]
        source["score"] = hit.get("_score", 0)
        return source

    # ── Standard text search ──────────────────────────────────────────────────
    def search(self, query, top_k=10):
        self._ensure_connected()
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
            return [self._clean_hit(h) for h in response["hits"]["hits"]]
        except Exception as e:
            print(f"Error searching Elasticsearch: {e}")
            return []

    # ── Fetch by IDs ──────────────────────────────────────────────────────────
    def get_by_ids(self, recipe_ids):
        self._ensure_connected()
        if not recipe_ids:
            return []
        print(f"Querying Elasticsearch for IDs: {recipe_ids}")
        try:
            string_ids = [str(rid) for rid in recipe_ids]
            response = self.es.search(
                index="recipes",
                size=len(recipe_ids),
                query={"terms": {"id": string_ids}}
            )
            results = [self._clean_hit(h) for h in response["hits"]["hits"]]
            print(f"Elasticsearch returned {len(results)} recipes for {len(recipe_ids)} requested IDs")
            return results
        except Exception as e:
            print(f"Error executing terms query in Elasticsearch: {e}")
            return []

    # ── Personalised recommendations with reviewCount boost ───────────────────
    def recommend(self, signals, exclude_ids=None, top_k=10):
        """
        signals: {"keywords": [...str], "ingredients": [...str]}
        Searches using those signals and boosts results by log(1 + reviewCount).
        Returns up to top_k results that are NOT in exclude_ids.
        """
        self._ensure_connected()
        exclude_ids = set(str(i) for i in (exclude_ids or []))

        keywords_text = " ".join(signals.get("keywords", []))
        ingredients_text = " ".join(signals.get("ingredients", []))
        query_text = f"{keywords_text} {ingredients_text}".strip()

        if not query_text:
            return []

        # Over-fetch so we can filter out bookmarked IDs
        fetch_size = max(top_k * 4, 40)
        try:
            response = self.es.search(
                index="recipes",
                size=fetch_size,
                query={
                    "function_score": {
                        "query": {
                            "multi_match": {
                                "query": query_text,
                                "fields": ["name^3", "keywords^2", "description"],
                                "fuzziness": "AUTO",
                                "operator": "or"
                            }
                        },
                        "functions": [
                            {
                                "field_value_factor": {
                                    "field": "reviewCount",
                                    "modifier": "log1p",
                                    "factor": 0.3,
                                    "missing": 0
                                }
                            }
                        ],
                        "score_mode": "sum",
                        "boost_mode": "sum"
                    }
                }
            )
            results = []
            for hit in response["hits"]["hits"]:
                doc = self._clean_hit(hit)
                if str(doc.get("id")) not in exclude_ids:
                    results.append(doc)
                if len(results) >= top_k:
                    break
            return results
        except Exception as e:
            print(f"Error in recommend(): {e}")
            return []

    # ── Popularity-biased random (for "Discover") ─────────────────────────────
    def popular_random(self, exclude_ids=None, top_k=10):
        """
        Fetches the top 500 recipes by reviewCount DESC, then randomly samples
        top_k from them. This gives "discover" results that skew popular but
        are still unpredictable on each page load.
        """
        self._ensure_connected()
        exclude_ids = set(str(i) for i in (exclude_ids or []))
        candidate_pool = 500

        try:
            response = self.es.search(
                index="recipes",
                size=candidate_pool,
                query={"match_all": {}},
                sort=[{"reviewCount": {"order": "desc"}}]
            )
            candidates = [
                self._clean_hit(h)
                for h in response["hits"]["hits"]
                if str(h["_source"].get("id", h["_id"])) not in exclude_ids
            ]
            # Random sample from candidates
            sample_size = min(top_k, len(candidates))
            return _random.sample(candidates, sample_size)
        except Exception as e:
            print(f"Error in popular_random(): {e}")
            return []


