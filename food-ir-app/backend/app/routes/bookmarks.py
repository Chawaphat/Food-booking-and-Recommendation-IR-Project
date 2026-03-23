from flask import Blueprint, request, jsonify
from services.mock_data import bookmarks


bookmarks_bp = Blueprint("bookmarks", __name__)

BOOKMARKS = []

# @bookmarks_bp.route("/bookmark", methods=["POST"])
# def add_bookmark():
#     data = request.get_json()

#     BOOKMARKS.append({
#         "recipe_id": data["recipe_id"],
#         "rating": data["rating"]
#     })

#     return jsonify({"message": "bookmarked"})


# @bookmarks_bp.route("/bookmarks", methods=["GET"])
# def get_bookmarks():
#     return jsonify(BOOKMARKS)


@bookmarks_bp.route("/bookmark", methods=["POST"])
def add_bookmark():
    data = request.get_json()

    bookmark = {
        "recipe_id": data["recipe_id"],
        "rating": data["rating"]
    }

    bookmarks.append(bookmark)

    return jsonify({"message": "bookmarked", "data": bookmark})


@bookmarks_bp.route("/bookmarks", methods=["GET"])
def get_bookmarks():
    return jsonify(bookmarks)