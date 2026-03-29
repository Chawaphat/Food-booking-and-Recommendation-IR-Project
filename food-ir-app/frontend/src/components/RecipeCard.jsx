import { Clock, Users, Bookmark, Edit2, Star, Folder } from "lucide-react";
import { useState } from "react";
import BookmarkModal from "./BookmarkModal";
import { deleteBookmark } from "../services/api";
import { useBookmarks } from "../context/BookmarkContext";

export default function RecipeCard({ recipe, onClick, onRefresh }) {
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const { isRecipeBookmarked, getBookmarkInfo, refreshBookmarks } =
    useBookmarks();

  // Use global bookmark map — covers Landing, Search AND Bookmarks pages
  const bookmarkInfo = getBookmarkInfo(recipe.id);
  const isBookmarked = bookmarkInfo ? true : !!recipe.bookmark_id; // fallback for BookmarksPage (already has bookmark_id in doc)

  // Merge bookmark info from context (global) or from the recipe doc (BookmarksPage)
  const effectiveRecipe = bookmarkInfo
    ? {
        ...recipe,
        bookmark_id: bookmarkInfo.bookmark_id,
        rating: bookmarkInfo.rating,
        folder_id: bookmarkInfo.folder_id,
        folder_name: bookmarkInfo.folder_name,
      }
    : recipe;

  const handleBookmarkClick = async (e) => {
    e.stopPropagation();
    if (isBookmarked) {
      if (window.confirm("Remove this bookmark?")) {
        try {
          const bmId = bookmarkInfo?.bookmark_id ?? recipe.bookmark_id;
          await deleteBookmark(bmId);
          await refreshBookmarks(); // update global map
          if (onRefresh) onRefresh();
        } catch (error) {
          console.error("Failed to delete bookmark", error);
        }
      }
    } else {
      setShowBookmarkModal(true);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setShowBookmarkModal(true);
  };

  const handleAfterSave = async () => {
    await refreshBookmarks(); // sync global map immediately
    if (onRefresh) onRefresh();
  };

  return (
    <>
      <div
        onClick={() => onClick && onClick(effectiveRecipe)}
        className="group cursor-pointer rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:-translate-y-1 relative bg-white"
      >
        {/* Bookmark / edit buttons */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={handleBookmarkClick}
            className={`backdrop-blur-sm p-2 rounded-full shadow-sm transition-colors ${
              isBookmarked
                ? "bg-yellow-400/90 hover:bg-red-500 text-white"
                : "bg-white/80 hover:bg-white text-gray-600 hover:text-red-500"
            }`}
          >
            <Bookmark className="w-5 h-5 fill-current" />
          </button>
          {isBookmarked && (
            <button
              onClick={handleEditClick}
              className="bg-white/80 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-sm text-gray-600 hover:text-blue-500 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative aspect-video overflow-hidden">
          <img
            src={
              recipe.image_url ||
              recipe.image ||
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800"
            }
            alt={recipe.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            {/* avg_rating from recipe_meta (backend enrichment) */}
            {recipe.avg_rating > 0 || recipe.rating > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 text-xs font-bold text-yellow-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {recipe.avg_rating > 0
                    ? recipe.avg_rating.toFixed(1)
                    : recipe.rating}
                </div>
                {recipe.review_count > 0 && (
                  <span className="text-[10px] text-gray-400 font-medium">
                    ({recipe.review_count.toLocaleString()})
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-transparent">—</div>
            )}

            {/* Folder badge (BookmarksPage) */}
            {effectiveRecipe.folder_name && (
              <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                <Folder className="w-3 h-3 flex-shrink-0" />
                <span>{effectiveRecipe.folder_name}</span>
              </div>
            )}
          </div>

          <h3 className="font-semibold text-lg text-gray-900 mb-2 truncate">
            {recipe.name}
          </h3>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>30m</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>2-4</span>
            </div>
          </div>
        </div>
      </div>

      {showBookmarkModal && (
        <BookmarkModal
          recipe={effectiveRecipe}
          onClose={() => setShowBookmarkModal(false)}
          onRefresh={handleAfterSave}
        />
      )}
    </>
  );
}
