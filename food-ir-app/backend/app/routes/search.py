from flask import Blueprint, request, jsonify
from services.search_service import SearchService

search_bp = Blueprint("search", __name__)

search_engine = SearchService()
search_engine.load()

@search_bp.route("/search/", methods=["POST", "OPTIONS"], strict_slashes=False)
def search():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
        
    data = request.get_json()
    query = data.get("query", "")

    results = search_engine.search(query)

    return jsonify(results)

    