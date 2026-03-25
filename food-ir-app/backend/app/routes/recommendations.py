# from flask import Blueprint, jsonify
# from services.mock_data import recipes
# import random

# recommend_bp = Blueprint("recommend", __name__)

# @recommend_bp.route("/recommendations", methods=["GET"])
# def recommendations():
#     return jsonify({
#         "personalized": random.sample(recipes, 2),
#         "from_folder": random.sample(recipes, 2),
#         "random": random.sample(recipes, 2)
#     })