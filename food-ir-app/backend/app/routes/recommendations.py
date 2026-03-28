from flask import Blueprint, request, jsonify
from collections import defaultdict, Counter
from config.extensions import db
from models.bookmark import Bookmark
from models.folder import Folder
from services.search_service import SearchService

recommendations_bp = Blueprint("recommendations", __name__)
search_engine = SearchService()

SECTION_LIMIT = 10


def get_current_user_id():
    raw = request.headers.get("X-User-Id", "").strip()
    if raw.isdigit():
        return int(raw)
    return None


def _extract_signals(recipes, max_keywords=10, max_ingredients=10):
    keywords = []
    ingredients = []
    for recipe in recipes:
        kws = recipe.get("keywords", [])
        if isinstance(kws, list):
            keywords.extend(kws)
        elif isinstance(kws, str):
            keywords.append(kws)

        for ing in recipe.get("ingredients", []):
            if isinstance(ing, dict):
                name = ing.get("name", "")
            else:
                name = str(ing)
            if name:
                ingredients.append(name)

    seen = set()
    unique_keywords = []
    for k in keywords:
        if k and k not in seen:
            seen.add(k)
            unique_keywords.append(k)

    seen = set()
    unique_ingredients = []
    for i in ingredients:
        if i and i not in seen:
            seen.add(i)
            unique_ingredients.append(i)

    return {
        "keywords": unique_keywords[:max_keywords],
        "ingredients": unique_ingredients[:max_ingredients],
    }


@recommendations_bp.route("/recommendations", methods=["GET"])
def get_recommendations():
    user_id = get_current_user_id()

    # ── Always return a random "Discover" section (public) ───────────────────
    # For_you and from_folder are empty when not logged in; the frontend
    # will hide those sections based on isLoggedIn state.
    if user_id is None:
        random_section = search_engine.popular_random(exclude_ids=set(), top_k=SECTION_LIMIT)
        return jsonify({
            "for_you": [],
            "from_folder": [],
            "folder_name": None,
            "random": random_section,
        }), 200

    # ── 1. Load all bookmarks for this user ───────────────────────────────────
    all_bookmarks = Bookmark.query.filter_by(user_id=user_id).all()
    bookmarked_ids = {str(b.recipe_id) for b in all_bookmarks}

    # ── 2. Identify liked bookmarks (rating >= 4) ─────────────────────────────
    liked_bookmarks = [b for b in all_bookmarks if b.rating and b.rating >= 4]
    signal_source = liked_bookmarks if liked_bookmarks else all_bookmarks

    # ── 3. Pick FOCUS FOLDER: highest average rating ──────────────────────────
    focus_folder_id = None
    focus_folder_name = None

    if signal_source:
        folder_ratings = defaultdict(list)
        for b in all_bookmarks:
            if b.rating is not None:
                folder_ratings[b.folder_id].append(b.rating)

        if folder_ratings:
            best_folder_id = max(
                folder_ratings,
                key=lambda fid: sum(folder_ratings[fid]) / len(folder_ratings[fid]),
            )
            focus_folder_id = best_folder_id
        else:
            counts = Counter(b.folder_id for b in all_bookmarks)
            if counts:
                focus_folder_id = counts.most_common(1)[0][0]

        if focus_folder_id:
            folder_obj = Folder.query.get(focus_folder_id)
            focus_folder_name = folder_obj.name if folder_obj else None

    # ── 4. Fetch recipe details for liked bookmarks ───────────────────────────
    liked_ids = list({b.recipe_id for b in signal_source})
    liked_recipes = search_engine.get_by_ids(liked_ids) if liked_ids else []

    focus_liked_ids = (
        {b.recipe_id for b in signal_source if b.folder_id == focus_folder_id}
        if focus_folder_id else set()
    )
    focus_liked_recipes = [
        r for r in liked_recipes
        if r.get("id") in focus_liked_ids
        or str(r.get("id")) in {str(i) for i in focus_liked_ids}
    ]

    # ── 5. Section 1: Recommended for you ────────────────────────────────────
    signals_all = _extract_signals(liked_recipes)
    for_you = search_engine.recommend(signals_all, exclude_ids=bookmarked_ids, top_k=SECTION_LIMIT)

    seen_ids = {str(r.get("id")) for r in for_you} | bookmarked_ids

    # ── 6. Section 2: Based on focus folder ───────────────────────────────────
    signals_folder = _extract_signals(focus_liked_recipes)
    from_folder = search_engine.recommend(signals_folder, exclude_ids=seen_ids, top_k=SECTION_LIMIT)

    seen_ids |= {str(r.get("id")) for r in from_folder}

    # ── 7. Section 3: Discover something new ─────────────────────────────────
    random_section = search_engine.popular_random(exclude_ids=seen_ids, top_k=SECTION_LIMIT)

    return jsonify({
        "for_you": for_you,
        "from_folder": from_folder,
        "folder_name": focus_folder_name,
        "random": random_section,
    }), 200