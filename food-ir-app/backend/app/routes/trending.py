from flask import Blueprint, request, jsonify
from services.trending_service import trending_service
from services.search_service import SearchService

trending_bp = Blueprint("trending", __name__)

_search_engine = SearchService()


@trending_bp.route("/trending", methods=["GET"])
def get_trending():
    """Return trending keywords and optional keyword recipe results."""
    keyword = request.args.get("keyword", "").strip().lower()

    keywords = trending_service.get_keywords()
    keywords_meta = trending_service.get_keyword_meta()

    results_by_keyword = {}

    if keyword:
        recipe_ids = trending_service.get_recipes_for_keyword(keyword)
        if recipe_ids:
            _search_engine._ensure_connected()
            recipes = _search_engine.get_by_ids(recipe_ids)

            order_map = {str(rid): i for i, rid in enumerate(recipe_ids)}
            recipes.sort(key=lambda r: order_map.get(str(r.get("id", "")), 999))

            results_by_keyword[keyword] = recipes
        else:
            results_by_keyword[keyword] = []

    return jsonify(
        {
            "keywords": keywords,
            "keywords_meta": keywords_meta,
            "results_by_keyword": results_by_keyword,
        }
    )
