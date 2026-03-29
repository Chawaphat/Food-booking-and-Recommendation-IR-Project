from flask import Blueprint, request, jsonify
from config.extensions import db
from models.folder import Folder
from models.bookmark import Bookmark

folders_bp = Blueprint("folders", __name__)


def get_current_user_id():
    """Read user ID from the X-User-Id header set by the frontend after login."""
    raw = request.headers.get("X-User-Id", "").strip()
    if raw.isdigit():
        return int(raw)
    return None


def require_auth():
    if get_current_user_id() is None:
        return jsonify({"error": "Authentication required. Please log in."}), 401
    return None


@folders_bp.route("", methods=["POST"])
def create_folder():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Folder name is required"}), 400

    new_folder = Folder(user_id=get_current_user_id(), name=name)
    db.session.add(new_folder)
    db.session.commit()

    return jsonify({"id": new_folder.id, "name": new_folder.name}), 201


@folders_bp.route("", methods=["GET"])
def get_folders():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    folders = Folder.query.filter_by(user_id=get_current_user_id()).all()
    return jsonify([{"id": f.id, "name": f.name} for f in folders]), 200


@folders_bp.route("/<int:folder_id>", methods=["DELETE"])
def delete_folder(folder_id):
    auth_err = require_auth()
    if auth_err:
        return auth_err

    folder = Folder.query.filter_by(id=folder_id, user_id=get_current_user_id()).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    db.session.delete(folder)
    db.session.commit()
    return jsonify({"message": "Folder deleted successfully"}), 200


@folders_bp.route("/<int:folder_id>/bookmarks", methods=["GET"])
def get_folder_bookmarks(folder_id):
    auth_err = require_auth()
    if auth_err:
        return auth_err

    folder = Folder.query.filter_by(id=folder_id, user_id=get_current_user_id()).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    bookmarks = (
        Bookmark.query.filter_by(folder_id=folder.id)
        .order_by(Bookmark.rating.desc())
        .all()
    )

    results = [
        {
            "id": b.id,
            "recipe_id": b.recipe_id,
            "rating": b.rating,
            "folder_name": folder.name,
            "folder_id": folder.id,
        }
        for b in bookmarks
    ]
    return jsonify(results), 200


from services.search_service import SearchService
search_engine = SearchService()


@folders_bp.route("/<int:folder_id>/recipes", methods=["GET"])
def get_folder_recipes(folder_id):
    auth_err = require_auth()
    if auth_err:
        return auth_err

    sort_by = request.args.get("sort", "rating")
    limit_val = request.args.get("limit", type=int)

    folder = Folder.query.filter_by(id=folder_id, user_id=get_current_user_id()).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    query = Bookmark.query.filter_by(folder_id=folder.id)
    if sort_by == "recent":
        query = query.order_by(Bookmark.created_at.desc())
    else:
        query = query.order_by(Bookmark.rating.desc().nullslast())

    if limit_val:
        query = query.limit(limit_val)

    bookmarks = query.all()

    if not bookmarks:
        return jsonify([]), 200

    recipe_ids = [b.recipe_id for b in bookmarks]
    recipes = search_engine.get_by_ids(recipe_ids)

    bookmark_map = {
        b.recipe_id: {"bookmark_id": b.id, "rating": b.rating, "created_at": b.created_at}
        for b in bookmarks
    }

    merged_recipes = []
    for r in recipes:
        r_id = r.get("id")
        b_info = bookmark_map.get(r_id)
        if b_info is None:
            b_info = bookmark_map.get(
                int(r_id) if str(r_id).isdigit() else r_id,
                {"bookmark_id": None, "rating": 0, "created_at": None},
            )
        r["bookmark_id"] = b_info["bookmark_id"]
        r["rating"] = b_info["rating"]
        r["created_at"] = b_info["created_at"].isoformat() if b_info.get("created_at") else None
        r["folder_id"] = folder.id
        r["folder_name"] = folder.name
        merged_recipes.append(r)

    if sort_by == "recent":
        merged_recipes.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    else:
        merged_recipes.sort(key=lambda x: x.get("rating") or 0, reverse=True)

    return jsonify(merged_recipes), 200
