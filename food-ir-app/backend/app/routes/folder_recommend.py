from flask import Blueprint, jsonify
from config.extensions import db
from models.bookmark import Bookmark
from models.folder import Folder
from services.vector_service import vector_service
from services.search_service import SearchService

folder_recommend_bp = Blueprint("folder_recommend", __name__)
search_engine = SearchService()


def get_current_user_id():
    return 1  # mocked


@folder_recommend_bp.route("/folders/<int:folder_id>/suggest", methods=["GET"])
def suggest_for_folder(folder_id):
    """
    GET /api/folders/<folder_id>/suggest

    Returns up to 10 recipe recommendations for a folder based on TF-IDF
    cosine similarity. Excludes recipes already bookmarked in that folder.
    """
    user_id = get_current_user_id()

    # Verify folder belongs to user
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    # Get recipe IDs in this folder
    bookmarks = Bookmark.query.filter_by(folder_id=folder.id).all()
    if not bookmarks:
        return jsonify([]), 200

    folder_recipe_ids = [b.recipe_id for b in bookmarks]

    # Ask VectorService for similar recipes (excluding bookmarked ones)
    similar = vector_service.recommend_for_folder(
        folder_recipe_ids=folder_recipe_ids,
        exclude_ids=folder_recipe_ids,
        top_k=10,
    )

    if not similar:
        return jsonify([]), 200

    # Fetch full recipe details from the main `recipes` index
    result_ids = [r["recipe_id"] for r in similar]
    score_map  = {r["recipe_id"]: r["score"] for r in similar}

    recipes = search_engine.get_by_ids(result_ids)

    # Attach similarity scores and sort by score desc
    for recipe in recipes:
        rid = str(recipe.get("id", ""))
        recipe["similarity_score"] = score_map.get(rid, 0)
    recipes.sort(key=lambda r: r["similarity_score"], reverse=True)

    return jsonify(recipes), 200
