import { Clock, Users, Bookmark, Edit2, Star, Folder } from "lucide-react";
import { useState } from "react";
import BookmarkModal from "./BookmarkModal";
import { deleteBookmark } from "../services/api";

export default function RecipeCard({ recipe, onClick, onRefresh }) {
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const isBookmarked = !!recipe.bookmark_id;

  const handleBookmarkClick = async (e) => {
    e.stopPropagation();
    if (isBookmarked) {
      if (window.confirm("Remove this bookmark?")) {
        try {
          await deleteBookmark(recipe.bookmark_id);
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

  return (
    <>
      <div
        onClick={() => onClick && onClick(recipe)}
        className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:-translate-y-1 relative"
      >
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={handleBookmarkClick}
            className={`bg-white/80 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-sm transition-colors ${isBookmarked ? "text-yellow-500 hover:text-red-500" : "text-gray-600 hover:text-red-500"}`}
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
            {recipe.rating > 0 ? (
              <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                {recipe.rating}
              </div>
            ) : (
              <div className="text-xs text-transparent">No rating</div>
            )}
            {recipe.folder_name && (
              <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                <Folder className="w-3 h-3 flex-shrink-0" />
                <span>{recipe.folder_name}</span>
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
          recipe={recipe}
          onClose={() => setShowBookmarkModal(false)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
