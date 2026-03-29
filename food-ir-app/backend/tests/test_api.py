import sys, os, json
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

import pytest


# App fixture — in-memory SQLite, mocked ES + heavy services

@pytest.fixture(scope="module")
def app():
    """
    Create a test Flask app backed by an in-memory SQLite database.
    Heavy services (ES, TF-IDF) are patched so tests run in milliseconds.
    """
    # Patch Elasticsearch and heavy IR services BEFORE importing create_app
    es_mock = MagicMock()
    es_mock.ping.return_value = True
    es_mock.search.return_value = {
        "hits": {
            "hits": [
                {
                    "_id": "38",
                    "_score": 15.0,
                    "_source": {
                        "id": "38",
                        "name": "Apple Pie",
                        "description": "Classic apple pie",
                        "ingredients": [{"name": "apple", "quantity": "4"}],
                        "steps": ["Peel apples", "Bake"],
                        "keywords": ["Dessert"],
                        "image": "",
                        "reviewCount": 10,
                    },
                }
            ]
        },
        "suggest": {},
    }
    es_mock.mget.return_value = {"docs": []}

    # Patch get_es_client so no real ES connection is made
    with patch("config.elasticsearch.get_es_client", return_value=es_mock), \
         patch("services.image_fallback_service.ImageFallbackService._load_tfidf"), \
         patch("services.image_fallback_service.ImageFallbackService.resolve_image",
               return_value="https://example.com/img.jpg"), \
         patch("services.similar_service.SimilarRecipeService.load"), \
         patch("services.similar_service.SimilarRecipeService.get_similar_ids",
               return_value=[106715, 149433, 152233]):

        from app import create_app

        test_app = create_app()
        test_app.config.update({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "WTF_CSRF_ENABLED": False,
        })

        # Re-initialise the DB with the in-memory engine
        from config.extensions import db
        with test_app.app_context():
            db.drop_all()
            db.create_all()

        yield test_app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def registered_user(client):
    """Register a fresh user and return their credentials."""
    payload = {"username": "testuser", "email": "test@example.com", "password": "secret123"}
    resp = client.post("/api/auth/register", json=payload)
    # 201 = created, 400 = already exists (re-runs) — both are fine
    assert resp.status_code in (201, 400)
    return payload


# Flow 1: Register → Login → Search → Bookmark

class TestLoginSearchBookmarkFlow:
    """Simulates a complete authenticated user journey."""

    def test_register_success(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "newuser_flow",
            "email": "flow@test.com",
            "password": "pass123",
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert "user_id" in data

    def test_login_success(self, client, registered_user):
        resp = client.post("/api/auth/login", json={
            "username": registered_user["username"],
            "password": registered_user["password"],
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "user_id" in data

    def test_login_wrong_password(self, client, registered_user):
        resp = client.post("/api/auth/login", json={
            "username": registered_user["username"],
            "password": "WRONG_PASSWORD",
        })
        assert resp.status_code == 401

    def test_search_returns_results(self, client, registered_user):
        """Search endpoint returns a results list (ES is mocked)."""
        # Get user_id via login
        login = client.post("/api/auth/login", json={
            "username": registered_user["username"],
            "password": registered_user["password"],
        })
        user_id = login.get_json()["user_id"]

        resp = client.post(
            "/api/search/",
            json={"query": "chicken"},
            headers={"X-User-Id": str(user_id)},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        # Response is either a list (old) or {"results": [...]}
        results = data.get("results", data) if isinstance(data, dict) else data
        assert isinstance(results, list)

    def test_bookmark_after_login(self, client, registered_user):
        """User can bookmark a recipe after creating a folder."""
        login = client.post("/api/auth/login", json={
            "username": registered_user["username"],
            "password": registered_user["password"],
        })
        user_id = login.get_json()["user_id"]
        headers = {"X-User-Id": str(user_id)}

        # Create a folder first
        folder_resp = client.post("/api/folders", json={"name": "Favourites"}, headers=headers)
        assert folder_resp.status_code == 201
        folder_id = folder_resp.get_json()["id"]

        # Bookmark a recipe into that folder
        bm_resp = client.post("/api/bookmarks", json={
            "recipe_id": "38",
            "folder_id": folder_id,
            "rating": 5,
        }, headers=headers)
        assert bm_resp.status_code in (200, 201)


# Flow 2: Unauthorised Access

class TestUnauthorisedAccess:
    """Protected endpoints must reject requests without X-User-Id header."""

    def test_bookmarks_requires_auth(self, client):
        resp = client.get("/api/bookmarks")
        assert resp.status_code == 401

    def test_folders_requires_auth(self, client):
        resp = client.get("/api/folders")
        assert resp.status_code == 401

    def test_create_bookmark_requires_auth(self, client):
        resp = client.post("/api/bookmarks", json={
            "recipe_id": "38", "folder_id": 1, "rating": 4
        })
        assert resp.status_code == 401




