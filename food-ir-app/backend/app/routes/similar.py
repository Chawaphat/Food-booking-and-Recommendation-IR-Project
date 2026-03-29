from flask import Blueprint, jsonify
from services.similar_service import similar_service
from services.search_service import SearchService

similar_bp = Blueprint("similar", __name__)

_search_engine = SearchService()


@similar_bp.route("/recipes/<recipe_id>/similar", methods=["GET"])
def get_similar(recipe_id):
    try:
        rid = int(recipe_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid recipe_id"}), 400

    similar_ids = similar_service.get_similar_ids(rid, top_k=3)

    if not similar_ids:
        return jsonify({"similar_recipes": []})

    _search_engine._ensure_connected()
    recipes = _search_engine.get_by_ids(similar_ids)

    order_map = {str(r): i for i, r in enumerate(similar_ids)}
    recipes.sort(key=lambda r: order_map.get(str(r.get("id", "")), 99))

    return jsonify({"similar_recipes": recipes})
