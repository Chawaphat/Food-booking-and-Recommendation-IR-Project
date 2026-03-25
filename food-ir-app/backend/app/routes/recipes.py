from flask import Blueprint, jsonify
from services.csv_loader import load_data
from services.mock_data import recipes


import random

recipes_bp = Blueprint("recipes", __name__)

data = load_data()

# @recipes_bp.route("/recipes/random", methods=["GET"])
# def random_recipes():
#     return jsonify(random.sample(data, 10))


@recipes_bp.route("/recipes/random", methods=["GET"])
def random_recipes():
    return jsonify(random.sample(recipes, min(3, len(recipes))))