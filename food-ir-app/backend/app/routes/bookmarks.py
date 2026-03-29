from flask import Blueprint, request, jsonify
from config.extensions import db
from models.folder import Folder
from models.bookmark import Bookmark

bookmarks_bp = Blueprint("bookmarks", __name__)


def get_current_user_id():
    """
    Read the authenticated user's ID from the X-User-Id request header.
    Returns None if the header is absent or non-numeric.
    """
    raw = request.headers.get("X-User-Id", "").strip()
    if raw.isdigit():
        return int(raw)
    return None


def require_auth():
    """Return a 401 response tuple if no valid user header, else None."""
    if get_current_user_id() is None:
        return jsonify({"error": "Authentication required. Please log in."}), 401
    return None


@bookmarks_bp.route("", methods=["POST"])
def add_bookmark():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user_id = get_current_user_id()
    data = request.get_json() or {}
    recipe_id = data.get("recipe_id")
    folder_id = data.get("folder_id")
    rating = data.get("rating")

    if not recipe_id or not folder_id:
        return jsonify({"error": "recipe_id and folder_id are required"}), 400

    # Ensure folder belongs to the authenticated user
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    # Upsert: update rating if bookmark already exists
    existing = Bookmark.query.filter_by(
        user_id=user_id,
        recipe_id=recipe_id,
        folder_id=folder_id,
    ).first()

    if existing:
        if rating is not None:
            existing.rating = rating
        db.session.commit()
        return jsonify({"message": "Bookmark updated", "id": existing.id}), 200

    new_bookmark = Bookmark(
        user_id=user_id,
        recipe_id=recipe_id,
        folder_id=folder_id,
        rating=rating,
    )
    db.session.add(new_bookmark)
    db.session.commit()

    return jsonify({"message": "Bookmark added", "id": new_bookmark.id}), 201


@bookmarks_bp.route("", methods=["GET"])
def get_all_bookmarks():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user_id = get_current_user_id()
    query = (
        db.session.query(Bookmark, Folder.name)
        .join(Folder, Bookmark.folder_id == Folder.id, isouter=True)
        .filter(Bookmark.user_id == user_id)
        .order_by(Bookmark.rating.desc().nullslast())
    )

    results = []
    for bookmark, folder_name in query:
        results.append({
            "id": bookmark.id,
            "recipe_id": bookmark.recipe_id,
            "rating": bookmark.rating,
            "folder_id": bookmark.folder_id,
            "folder_name": folder_name,
        })

    return jsonify(results), 200


@bookmarks_bp.route("/<int:bookmark_id>", methods=["PUT"])
def update_bookmark(bookmark_id):
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user_id = get_current_user_id()
    data = request.get_json() or {}
    rating = data.get("rating")
    folder_id = data.get("folder_id")

    bookmark = Bookmark.query.filter_by(id=bookmark_id, user_id=user_id).first()
    if not bookmark:
        return jsonify({"error": "Bookmark not found"}), 404

    if rating is not None:
        bookmark.rating = rating
    if folder_id is not None:
        folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
        if folder:
            bookmark.folder_id = folder_id
        else:
            return jsonify({"error": "Folder not found"}), 404

    db.session.commit()
    return jsonify({"message": "Bookmark updated"}), 200


@bookmarks_bp.route("/<int:bookmark_id>", methods=["DELETE"])
def delete_bookmark(bookmark_id):
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user_id = get_current_user_id()
    bookmark = Bookmark.query.filter_by(id=bookmark_id, user_id=user_id).first()
    if not bookmark:
        return jsonify({"error": "Bookmark not found"}), 404

    db.session.delete(bookmark)
    db.session.commit()
    return jsonify({"message": "Bookmark deleted successfully"}), 200


from services.search_service import SearchService
search_engine = SearchService()


@bookmarks_bp.route("/recipes", methods=["GET"])
def get_all_bookmarked_recipes():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user_id = get_current_user_id()
    sort_by = request.args.get("sort", "rating")

    query = (
        db.session.query(Bookmark, Folder.name)
        .join(Folder, Bookmark.folder_id == Folder.id, isouter=True)
        .filter(Bookmark.user_id == user_id)
    )

    if sort_by == "recent":
        query = query.order_by(Bookmark.created_at.desc())
    else:
        query = query.order_by(Bookmark.rating.desc().nullslast())

    results = query.all()

    if not results:
        return jsonify([]), 200

    recipe_ids = [bookmark.recipe_id for bookmark, _ in results]
    recipes = search_engine.get_by_ids(recipe_ids)

    bookmark_map = {
        bookmark.recipe_id: {
            "bookmark_id": bookmark.id,
            "rating": bookmark.rating,
            "created_at": bookmark.created_at,
            "folder_name": folder_name,
            "folder_id": bookmark.folder_id,
        }
        for bookmark, folder_name in results
    }

    merged_recipes = []
    for r in recipes:
        r_id = r.get("id")
        b_info = bookmark_map.get(r_id)
        if b_info is None:
            b_info = bookmark_map.get(
                int(r_id) if str(r_id).isdigit() else r_id,
                {"bookmark_id": None, "rating": 0, "created_at": None, "folder_name": None, "folder_id": None},
            )
        r["bookmark_id"] = b_info["bookmark_id"]
        r["rating"] = b_info["rating"]
        r["created_at"] = b_info["created_at"].isoformat() if b_info.get("created_at") else None
        r["folder_id"] = b_info["folder_id"]
        r["folder_name"] = b_info["folder_name"]
        merged_recipes.append(r)

    if sort_by == "recent":
        merged_recipes.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    else:
        merged_recipes.sort(key=lambda x: x.get("rating") or 0, reverse=True)

    return jsonify(merged_recipes), 200