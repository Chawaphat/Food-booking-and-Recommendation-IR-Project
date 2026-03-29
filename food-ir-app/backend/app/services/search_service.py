import os
import random as _random
import pandas as pd
from config.elasticsearch import get_es_client
from services.image_fallback_service import image_fallback_service

_DATA_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "data", "processed"
)

def _load_meta_map():
    """Load recipe_meta.csv → {recipe_id_str: (avg_rating, review_count)}."""
    path = os.path.join(_DATA_DIR, "recipe_meta.csv")
    try:
        df = pd.read_csv(path, dtype={"RecipeId": str})
        return {
            row["RecipeId"]: (float(row["avg_rating"]), float(row["review_count"]))
            for _, row in df.iterrows()
        }
    except Exception as e:
        print(f"[SearchService] Could not load recipe_meta.csv: {e}")
        return {}

_META_MAP = _load_meta_map()

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

        # ── Image fallback ───────────────────────────────────────────────────
        recipe_id  = source.get("id", hit["_id"])
        raw_image  = source.get("image", "")
        source["image_url"] = image_fallback_service.resolve_image(recipe_id, raw_image)

        # ── Rating metadata (from recipe_meta.csv) ───────────────────────────
        avg_r, rev_cnt = _META_MAP.get(str(recipe_id), (0.0, 0.0))
        source["avg_rating"]    = round(avg_r, 2)
        source["review_count"] = int(rev_cnt)

        return source

    # ── Standard text search ──────────────────────────────────────────────────
    def search(self, query, top_k=20):
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

    # ── Search with spell suggestions ─────────────────────────────────────────
    def search_with_suggestions(self, query, top_k=20):
        """
        Run search + ES term-suggester in one request.

        Returns:
            {
              "results":         [...recipe dicts],
              "suggestions":     ["corrected word1", ...],
              "corrected_query": "full corrected query string" or None,
            }

        Logic:
          - Each token is checked against 'name' and 'ingredients.name' fields.
          - If a word has no options in 'name', we fall back to 'ingredients'.
          - corrected_query is None when no words needed correction (no banner).
        """
        self._ensure_connected()

        suggest_body = {
            "name_suggest": {
                "text": query,
                "term": {
                    "field": "name",
                    "suggest_mode": "missing",
                    "min_word_length": 3,
                    "prefix_length": 1,
                    "max_edits": 2,
                    "size": 3,
                },
            },
            "ingr_suggest": {
                "text": query,
                "term": {
                    "field": "ingredients.name",
                    "suggest_mode": "missing",
                    "min_word_length": 3,
                    "prefix_length": 1,
                    "max_edits": 2,
                    "size": 3,
                },
            },
        }

        try:
            response = self.es.search(
                index="recipes",
                body={
                    "size": top_k,
                    "query": {
                        "multi_match": {
                            "query": query,
                            "fields": [
                                "name^3",
                                "ingredients.name^2",
                                "steps",
                                "description",
                                "keywords",
                                "combined_text",
                            ],
                            "fuzziness": "AUTO",
                            "operator": "or",
                        }
                    },
                    "suggest": suggest_body,
                },
            )
        except Exception as e:
            print(f"Error in search_with_suggestions: {e}")
            return {"results": [], "suggestions": [], "corrected_query": None}

        results = [self._clean_hit(h) for h in response["hits"]["hits"]]

        # ── Parse per-token corrections ───────────────────────────────────────
        name_tokens = response["suggest"].get("name_suggest", [])
        ingr_tokens = response["suggest"].get("ingr_suggest", [])

        corrected_tokens = []
        any_corrected = False

        for i, token in enumerate(name_tokens):
            original = token["text"]
            options = token.get("options", [])
            if not options and i < len(ingr_tokens):
                options = ingr_tokens[i].get("options", [])

            if options:
                best = max(options, key=lambda o: o.get("freq", 0))
                corrected_tokens.append(best["text"])
                any_corrected = True
            else:
                corrected_tokens.append(original)

        corrected_query = " ".join(corrected_tokens) if any_corrected else None

        # ── Collect unique alternative suggestions ────────────────────────────
        suggestions = []
        seen = set()
        for i, token in enumerate(name_tokens):
            opts = token.get("options", [])
            if not opts and i < len(ingr_tokens):
                opts = ingr_tokens[i].get("options", [])
            for opt in opts[:2]:
                w = opt["text"]
                if w not in seen:
                    seen.add(w)
                    suggestions.append(w)

        return {
            "results": results,
            "suggestions": suggestions[:5],
            "corrected_query": corrected_query,
        }

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


