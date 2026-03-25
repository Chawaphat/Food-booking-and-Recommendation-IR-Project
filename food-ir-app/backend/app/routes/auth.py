from flask import Blueprint, request, jsonify
from config.extensions import db
from models.user import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password") # In a real app we'd hash this

    if not username or not password:
        return jsonify({"error": "Missing credentials"}), 400

    user = User.query.filter_by(username=username).first()
    if user:
        return jsonify({"error": "User already exists"}), 400

    new_user = User(username=username, password_hash=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully", "user_id": new_user.id}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    
    user = User.query.filter_by(username=username).first()
    if not user:
        # Mocking for now, if user doesn't exist just use user_id = 1
        return jsonify({"message": "Logged in mocked", "user_id": 1}), 200
        
    return jsonify({"message": "Logged in", "user_id": user.id}), 200
