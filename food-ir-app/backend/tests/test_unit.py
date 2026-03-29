"""
tests/test_unit.py
──────────────────
Unit tests for core IR and authentication logic.
Tests run in isolation without the full Flask app or database.

Run:
    pytest tests/test_unit.py -v
"""

import sys, os

# Make the app package importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

import pytest


# Test 1: TF-IDF Cosine Similarity (IR Core)

class TestSimilarityFunction:
    """
    Validates the SimilarRecipeService that powers the 'Similar Recipes' feature.
    Reuses existing tfidf_matrix.pkl and recipe_ids.pkl without rebuilding.
    """

    @pytest.fixture(scope="class")
    def service(self):
        from services.similar_service import SimilarRecipeService
        svc = SimilarRecipeService()
        svc.load()
        return svc

    def test_returns_results(self, service):
        """Similarity search must return a non-empty list."""
        recipe_id = 38   # first recipe in the corpus
        results = service.get_similar_ids(recipe_id, top_k=3)
        assert len(results) > 0, "Should return at least one similar recipe"

    def test_returns_correct_count(self, service):
        """Should return exactly top_k results when enough neighbours exist."""
        results = service.get_similar_ids(38, top_k=3)
        assert len(results) == 3

    def test_does_not_include_self(self, service):
        """The query recipe must not appear in its own similarity results."""
        recipe_id = 38
        results = service.get_similar_ids(recipe_id, top_k=3)
        assert recipe_id not in results, "Self-similarity result must be excluded"

    def test_unknown_recipe_returns_empty(self, service):
        """An unknown recipe_id should return [] gracefully (no crash)."""
        results = service.get_similar_ids(recipe_id=999_999_999, top_k=3)
        assert results == []


# Test 2: Search Service (IR — BM25 / Elasticsearch)

class TestSearchService:
    """
    Validates that the SearchService correctly queries Elasticsearch
    and returns enriched recipe documents.
    """

    @pytest.fixture(scope="class")
    def service(self):
        from services.search_service import SearchService
        svc = SearchService()
        svc.load()
        return svc

    def test_search_returns_results(self, service):
        """A normal food query must return at least one result."""
        results = service.search("chicken", top_k=5)
        assert len(results) > 0, "Search for 'chicken' should return results"

    def test_result_has_required_fields(self, service):
        """Every result must contain id, name, and image_url."""
        results = service.search("pasta", top_k=3)
        assert len(results) > 0
        for r in results:
            assert "id"        in r, "Result missing 'id'"
            assert "name"      in r, "Result missing 'name'"
            assert "image_url" in r, "Result missing 'image_url'"

    def test_result_includes_avg_rating(self, service):
        """avg_rating and review_count must be injected from recipe_meta.csv."""
        results = service.search("chicken", top_k=3)
        assert len(results) > 0
        first = results[0]
        assert "avg_rating"    in first
        assert "review_count"  in first
        assert isinstance(first["avg_rating"],   float)
        assert isinstance(first["review_count"], int)
