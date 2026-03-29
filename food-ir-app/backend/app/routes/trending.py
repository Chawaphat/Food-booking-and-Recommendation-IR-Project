"""
GET /api/trending
─────────────────
Returns IR-extracted trending food categories and their top recipes.

Response format:
{
  "keywords": ["chicken", "chocolate", ...],   # TF-IDF ranked food terms
  "keywords_meta": [
    {"keyword": "chicken", "recipe_count": 10, "avg_rating": 4.5}, ...
  ],
  "results_by_keyword": {                       # optional: only when ?keyword=X
    "chicken": [<recipe doc>, ...]              # ranked by popularity, not relevance
  }
}

Query params:
  ?keyword=chicken   → also returns full recipe list for that specific keyword
  (omit)             → returns only keywords + meta (fast, for the search dropdown)
"""

from flask import Blueprint, request, jsonify
from services.trending_service import trending_service
from services.search_service import SearchService

trending_bp = Blueprint("trending", __name__)

# Reuse the existing SearchService singleton to hydrate recipe docs from ES
_search_engine = SearchService()


@trending_bp.route("/trending", methods=["GET"])
def get_trending():
    """
    GET /api/trending
    GET /api/trending?keyword=chicken
    """
    keyword = request.args.get("keyword", "").strip().lower()

    # Always return keywords + lightweight meta
    keywords      = trending_service.get_keywords()
    keywords_meta = trending_service.get_keyword_meta()

    results_by_keyword = {}

    if keyword:
        recipe_ids = trending_service.get_recipes_for_keyword(keyword)
        if recipe_ids:
            # Hydrate recipe docs from Elasticsearch (name, image, description…)
            _search_engine._ensure_connected()
            recipes = _search_engine.get_by_ids(recipe_ids)

            # Restore popularity order (get_by_ids may re-order by ES score)
            order_map = {str(rid): i for i, rid in enumerate(recipe_ids)}
            recipes.sort(key=lambda r: order_map.get(str(r.get("id", "")), 999))

            results_by_keyword[keyword] = recipes
        else:
            results_by_keyword[keyword] = []

    return jsonify({
        "keywords":            keywords,
        "keywords_meta":       keywords_meta,
        "results_by_keyword":  results_by_keyword,
    })
