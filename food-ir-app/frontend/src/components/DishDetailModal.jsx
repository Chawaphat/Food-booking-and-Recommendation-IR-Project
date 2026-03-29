import { useState } from "react";
import { X } from "lucide-react";
import BookmarkModal from "./BookmarkModal";
import SimilarRecipes from "./SimilarRecipes";
import { useBookmarks } from "../context/BookmarkContext";

export default function DishDetailModal({ recipe: initialRecipe, onClose, onRefresh }) {
  const [recipe, setRecipe] = useState(initialRecipe);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const { isRecipeBookmarked, refreshBookmarks } = useBookmarks();

  if (!recipe) return null;

  const isBookmarked = isRecipeBookmarked(recipe.id) || !!recipe.bookmark_id;

  const handleAfterSave = async () => {
    await refreshBookmarks();
    if (onRefresh) onRefresh();
  };

  return (
    <>
      {/*
        Layout:
        - Backdrop covers full screen
        - Card is fixed with explicit insets:
            top: 16px, left: 16px, right: 16px
            bottom: 84px  (64px nav + 20px gap)
          On sm+ screens: centred with auto margins + max-h-[90vh]
        - Inside the card:
            hero image  → shrink-0 (fixed height)
            body        → flex-1 min-h-0 overflow-y-auto  ← scrolls ALL content
              (ingredients, instructions, similar recipes are ALL inside the scroll area)
      */}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card — explicitly positioned above the bottom nav */}
      <div
        className="
          fixed z-50 bg-white rounded-3xl shadow-2xl
          flex flex-col overflow-hidden
          inset-x-4 top-4
          sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-8 sm:w-full sm:max-w-2xl sm:max-h-[85vh]
        "
        style={{ bottom: "84px" }}   /* 64px nav + 20px gap — most reliable cross-browser */
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white text-gray-600 transition-colors shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero image — fixed height, never scrolls */}
        <div className="w-full h-52 sm:h-64 shrink-0">
          <img
            src={
              recipe.image_url ||
              recipe.image ||
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800"
            }
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/*
          Scrollable body — flex-1 + min-h-0 = critical for overflow-y-auto to engage.
          SimilarRecipes is INSIDE here so it scrolls with everything else.
          pb-6 gives breathing room at the bottom of the scroll area.
        */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-8 sm:px-8 sm:pt-6 no-scrollbar">
          {/* Title + bookmark */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              {recipe.name}
            </h2>

            <button
              onClick={() => setShowBookmarkModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all shrink-0 shadow-sm ${
                isBookmarked
                  ? "bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`w-4 h-4 ${isBookmarked ? "fill-current" : "stroke-current fill-none"}`}
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 3h14a1 1 0 011 1v17l-8-4-8 4V4a1 1 0 011-1z"
                />
              </svg>
              {isBookmarked ? "Edit Bookmark" : "Save to Bookmark"}
            </button>
          </div>

          {/* Ingredients + Steps */}
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-10">
            <div className="sm:col-span-1 border-gray-100 sm:border-r border-b sm:border-b-0 pb-6 sm:pb-0 sm:pr-8">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Ingredients</h3>
              <ul className="space-y-2.5">
                {(recipe.ingredients || []).map((ing, idx) => (
                  <li
                    key={idx}
                    className="text-gray-600 flex items-start gap-2 text-sm leading-snug"
                  >
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-gray-300 shrink-0" />
                    {ing.quantity} {ing.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="sm:col-span-2 space-y-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Instructions</h3>
              <div className="space-y-5">
                {(recipe.steps || []).map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center font-medium text-gray-400 border border-gray-100 text-sm">
                      {idx + 1}
                    </div>
                    <p className="text-gray-600 mt-0.5 leading-relaxed text-sm">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Similar Recipes — inside scroll area so it scrolls with everything ── */}
          <SimilarRecipes
            recipeId={recipe.id}
            onSelect={(similar) => {
              setRecipe(similar);
              setShowBookmarkModal(false);
            }}
          />
        </div>
      </div>

      {/* BookmarkModal */}
      {showBookmarkModal && (
        <BookmarkModal
          recipe={recipe}
          onClose={() => setShowBookmarkModal(false)}
          onRefresh={handleAfterSave}
        />
      )}
    </>
  );
}
