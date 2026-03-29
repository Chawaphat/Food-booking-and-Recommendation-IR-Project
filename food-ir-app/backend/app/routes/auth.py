from flask import Blueprint, request, jsonify
from config.extensions import db
from models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken."}), 400

    
    new_user = User(username=username, password_hash=password)
    db.session.add(new_user)
    db.session.commit()

    return (
        jsonify({"message": "Account created successfully!", "user_id": new_user.id}),
        201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "Invalid username or password."}), 401

    if user.password_hash != password:
        return jsonify({"error": "Invalid username or password."}), 401

    return jsonify({"message": "Logged in successfully.", "user_id": user.id}), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    # Stateless prototype: client just clears its local state.
    return jsonify({"message": "Logged out."}), 200
