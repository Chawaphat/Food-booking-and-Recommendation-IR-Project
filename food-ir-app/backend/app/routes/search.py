from flask import Blueprint, request, jsonify
from services.search_service import search_recipes, get_recipe_by_id
from services.mock_data import recipes

search_bp = Blueprint("search", __name__)

@search_bp.route("/search/", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query", "").lower()

    results = []

    for r in recipes:
        text = f"{r['name']} {r['ingredients']} {r['steps']}".lower()

        if query in text:
            r_copy = r.copy()
            r_copy["score"] = len(query)  # fake score
            results.append(r_copy)

    return jsonify(results)


@search_bp.route("/search/<id>", methods=["GET"])
def get_recipe(id):
    recipe = get_recipe_by_id(id)

    if recipe:
        return jsonify(recipe)
    return jsonify({"error": "not found"}), 404