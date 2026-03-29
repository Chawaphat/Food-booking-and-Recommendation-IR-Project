import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getSimilarRecipes } from "../services/search";

/**
 * SimilarRecipes
 * ──────────────
 * Displays up to 3 similar recipes using TF-IDF cosine similarity (IR).
 *
 * Props:
 *   recipeId   – number | string, the recipe whose similar items to fetch
 *   onSelect   – (recipe) => void, called when user clicks a card
 */
export default function SimilarRecipes({ recipeId, onSelect }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setRecipes([]);

    getSimilarRecipes(recipeId)
      .then((data) => {
        if (!cancelled) setRecipes(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recipeId]); // re-fetch whenever recipe changes (recursive exploration)

  if (!loading && recipes.length === 0 && !error) return null;

  return (
    <div className="mt-10 pt-8 border-t border-gray-100">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-bold text-gray-800">Similar Recipes</h3>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden bg-gray-100 animate-pulse"
            >
              <div className="aspect-video bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400">Could not load similar recipes.</p>
      )}

      {/* Cards */}
      {!loading && recipes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {recipes.map((recipe) => (
            <SimilarCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => onSelect && onSelect(recipe)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual similar recipe card ─────────────────────────────────────────*/
function SimilarCard({ recipe, onClick }) {
  const [imgError, setImgError] = useState(false);

  const imgSrc =
    !imgError && (recipe.image_url || recipe.image)
      ? recipe.image_url || recipe.image
      : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400";

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl overflow-hidden bg-white border border-gray-100
                 hover:border-purple-200 hover:shadow-md transition-all duration-200
                 focus:outline-none focus:ring-2 focus:ring-purple-300"
    >
      {/* Image container — fixed-height div with absolute-fill image avoids white gaps */}
      <div className="relative h-28 overflow-hidden bg-gray-100">
        <img
          src={imgSrc}
          alt={recipe.name}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover transform-gpu
                     transition-transform duration-300 group-hover:scale-105"
        />
        {/* pointer-events-none stops the overlay from intercepting hover and causing flicker */}
        <div
          className="pointer-events-none absolute inset-0
                     bg-gradient-to-t from-black/40 to-transparent
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
      </div>

      {/* Info */}
      <div className="p-2.5">
        {recipe.avg_rating > 0 && (
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <span className="text-[10px] font-bold text-yellow-500">
              {recipe.avg_rating.toFixed(1)}
            </span>
            {recipe.review_count > 0 && (
              <span className="text-[10px] text-gray-400 ml-0.5">
                ({recipe.review_count.toLocaleString()})
              </span>
            )}
          </div>
        )}
        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-purple-700 transition-colors">
          {recipe.name}
        </p>
      </div>
    </button>
  );
}
