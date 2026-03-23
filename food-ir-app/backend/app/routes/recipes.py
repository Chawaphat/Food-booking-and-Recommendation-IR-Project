from flask import Blueprint, request, jsonify
from services.search_service import search_recipes

search_bp = Blueprint("search", __name__)

@search_bp.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query")

    results = search_recipes(query)

    return jsonify(results)