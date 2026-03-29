"""
GET /api/recipes/<id>/similar
──────────────────────────────
Returns 3 similar recipes using TF-IDF cosine similarity.

Response:
{
  "similar_recipes": [
    {"id": 123, "name": "Chicken Pasta", "image_url": "...",
     "avg_rating": 4.5, "review_count": 312, "description": "..."},
    ...
  ]
}
"""

from flask import Blueprint, jsonify
from services.similar_service import similar_service
from services.search_service import SearchService

similar_bp = Blueprint("similar", __name__)

# Reuse singleton (already warm from app startup)
_search_engine = SearchService()


@similar_bp.route("/recipes/<recipe_id>/similar", methods=["GET"])
def get_similar(recipe_id):
    try:
        rid = int(recipe_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid recipe_id"}), 400

    # IR: cosine similarity on TF-IDF matrix
    similar_ids = similar_service.get_similar_ids(rid, top_k=3)

    if not similar_ids:
        return jsonify({"similar_recipes": []})

    # Hydrate with ES (name, image, description…)
    _search_engine._ensure_connected()
    recipes = _search_engine.get_by_ids(similar_ids)

    # Restore similarity order (ES mgets may reorder)
    order_map = {str(r): i for i, r in enumerate(similar_ids)}
    recipes.sort(key=lambda r: order_map.get(str(r.get("id", "")), 99))

    return jsonify({"similar_recipes": recipes})
