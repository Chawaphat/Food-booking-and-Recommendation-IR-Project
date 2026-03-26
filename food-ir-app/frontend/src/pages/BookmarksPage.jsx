import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Folder as FolderIcon,
  Star,
  Grid,
  LayoutList,
  Sparkles,
} from "lucide-react";
import {
  getFolders,
  getFolderRecipes,
  getAllBookmarkedRecipes,
  getFolderSuggestions,
  createFolder,
} from "../services/api";
import RecipeCard from "../components/RecipeCard";
import DishDetailModal from "../components/DishDetailModal";
import BottomNav from "../components/BottomNav";

// ─── Horizontal auto-scrolling recipe row (reused from LandingPage) ──────────
function RecipeRow({ recipes, onCardClick, onRefresh }) {
  const containerRef = useRef(null);
  const pausedRef = useRef(false);
  const resumeTimeoutRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !recipes?.length) return;
    const step = 300;
    const intervalMs = 3500;
    const autoScroll = () => {
      if (pausedRef.current) return;
      const max = container.scrollWidth - container.clientWidth;
      if (max <= 0) return;
      const next = container.scrollLeft + step;
      container.scrollTo({
        left: next >= max - 4 ? 0 : next,
        behavior: "smooth",
      });
    };
    const id = setInterval(autoScroll, intervalMs);
    return () => {
      clearInterval(id);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [recipes?.length]);

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };
  const resume = () => {
    pausedRef.current = false;
  };
  const pauseFor = (ms = 4000) => {
    pause();
    resumeTimeoutRef.current = setTimeout(() => {
      pausedRef.current = false;
      resumeTimeoutRef.current = null;
    }, ms);
  };

  if (!recipes || recipes.length === 0) return null;
  return (
    <div
      ref={containerRef}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onWheel={() => pauseFor(3500)}
      onTouchStart={pause}
      onTouchEnd={() => pauseFor(2500)}
      className="flex overflow-x-auto pb-4 gap-5 no-scrollbar snap-x snap-mandatory"
    >
      {recipes.map((recipe, idx) => (
        <div
          key={recipe.id ?? `r-${idx}`}
          className="flex-none w-64 snap-start"
        >
          <RecipeCard
            recipe={recipe}
            onClick={onCardClick}
            onRefresh={onRefresh}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
function ShimmerRow() {
  return (
    <div className="flex gap-5 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-none w-64 rounded-3xl bg-gray-200 animate-pulse h-52"
        />
      ))}
    </div>
  );
}

// ─── Folder card with mosaic image preview ────────────────────────────────────
function FolderCard({ folder, previewRecipes, onClick }) {
  const images = previewRecipes
    .slice(0, 3)
    .map((r) => r.image)
    .filter(Boolean);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-56"
    >
      <div className="flex-1 bg-gray-50 p-2 relative">
        {images.length > 0 ? (
          <div className="absolute inset-2 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
            <div className="col-span-1 h-full bg-gray-200">
              <img
                src={images[0]}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
            <div className="col-span-1 grid grid-rows-2 gap-1 h-full">
              {images[1] ? (
                <div className="bg-gray-200 h-full">
                  <img
                    src={images[1]}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
              ) : (
                <div className="bg-gray-100 h-full" />
              )}
              {images[2] ? (
                <div className="bg-gray-200 h-full">
                  <img
                    src={images[2]}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
              ) : (
                <div className="bg-gray-100 h-full" />
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <FolderIcon className="w-12 h-12" />
          </div>
        )}
      </div>
      <div className="p-4 border-t border-gray-100">
        <h3 className="font-bold text-gray-900 group-hover:text-red-500 transition-colors truncate">
          {folder.name}
        </h3>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BookmarksPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("recipes");
  const [folders, setFolders] = useState([]);
  const [folderPreviews, setFolderPreviews] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [sort, setSort] = useState("rating");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName);
      setNewFolderName("");
      setIsCreatingFolder(false);
      fetchData();
    } catch (error) {
      console.error("Failed to create folder", error);
      alert("Failed to create folder");
    }
  };

  // UC-008: folder suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [folderId, sort, activeTab]);

  // Load TF-IDF suggestions whenever a folder is opened
  useEffect(() => {
    if (!folderId) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    getSuggestions(folderId);
  }, [folderId]);

  const getSuggestions = async (id) => {
    try {
      const data = await getFolderSuggestions(id);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Could not load folder suggestions:", e.message);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (folderId) {
        const foldersData = await getFolders();
        setFolders(foldersData);

        const folderRecipesData = await getFolderRecipes(folderId, null, sort);
        setRecipes(folderRecipesData);
      } else {
        if (activeTab === "recipes") {
          const allRecipesData = await getAllBookmarkedRecipes(sort);
          setRecipes(allRecipesData);
        } else if (activeTab === "categories") {
          const foldersData = await getFolders();
          setFolders(foldersData);

          const previews = {};
          await Promise.all(
            foldersData.map(async (folder) => {
              try {
                const res = await getFolderRecipes(folder.id, 3, "rating");
                previews[folder.id] = Array.isArray(res)
                  ? res
                  : (res?.data ?? []);
              } catch {
                previews[folder.id] = [];
              }
            }),
          );
          setFolderPreviews(previews);
        }
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const currentFolderName = folderId
    ? folders.find((f) => f.id.toString() === folderId)?.name
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white px-6 py-6 sticky top-0 z-40 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          {/* Header Title / Back Button */}
          <div className="flex items-center gap-3">
            {folderId && (
              <button
                onClick={() => navigate("/bookmarks")}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {folderId ? currentFolderName || "Folder" : "My Bookmark"}
            </h1>
          </div>

          {/* Top Tabs (hidden if viewing a specific folder) */}
          {!folderId && (
            <div className="flex p-1 bg-gray-100 rounded-full self-start md:self-auto md:justify-self-center">
              <button
                onClick={() => setActiveTab("recipes")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "recipes"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Grid className="w-4 h-4" />
                All Recipes
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "categories"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutList className="w-4 h-4" />
                Categories
              </button>
            </div>
          )}

          {/* Filter Dropdown */}
          {folderId || activeTab === "recipes" ? (
            <div className="relative self-start md:self-auto md:justify-self-end">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-5 pr-10 rounded-full text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 cursor-pointer transition-all hover:border-gray-300"
              >
                <option value="rating">Top Rated</option>
                <option value="recent">Recently Added</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          ) : (
            <div
              className="hidden md:block md:justify-self-end md:w-44"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="p-6 max-w-7xl mx-auto">
        {loading ? (
          <p className="text-gray-500 font-medium">Loading...</p>
        ) : (
          <>
            {/* View: Categories Tab */}
            {!folderId && activeTab === "categories" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div
                  className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-dashed border-gray-300 flex flex-col h-56 justify-center items-center relative"
                  onClick={() => !isCreatingFolder && setIsCreatingFolder(true)}
                >
                  {isCreatingFolder ? (
                    <div
                      className="p-4 w-full h-full flex flex-col justify-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder Name"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-red-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateFolder(e);
                          if (e.key === "Escape") setIsCreatingFolder(false);
                        }}
                      />
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={handleCreateFolder}
                          className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsCreatingFolder(false)}
                          className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-red-500 group-hover:bg-red-50 transition-colors mb-3">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <span className="font-bold text-gray-500 group-hover:text-red-500 transition-colors">
                        New Category
                      </span>
                    </>
                  )}
                </div>
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    previewRecipes={folderPreviews[folder.id] || []}
                    onClick={() => navigate(`/bookmarks/folder/${folder.id}`)}
                  />
                ))}
              </div>
            )}

            {/* View: Recipes (All Recipes tab OR specific Folder view) */}
            {(folderId || activeTab === "recipes") &&
              (recipes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {recipes.map((recipe, idx) => (
                    <div key={idx} className="relative group">
                      <RecipeCard
                        recipe={recipe}
                        onClick={setSelectedRecipe}
                        onRefresh={fetchData}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200 mt-4">
                  <Star className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No bookmarks found
                  </h3>
                  <p className="text-gray-500 text-center max-w-sm">
                    {folderId
                      ? "This folder is empty."
                      : "Start saving your favorite recipes!"}
                  </p>
                </div>
              ))}

            {/* ── UC-008: Suggestion section (folder view only) ───────────── */}
            {folderId && (
              <div className="mt-12">
                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-400">
                    Suggested for you
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow">
                    <Sparkles className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">
                      Suggested for this folder
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Recipes similar to your bookmarks, ranked by relevance
                      &amp; popularity
                    </p>
                  </div>
                </div>

                {suggestionsLoading ? (
                  <ShimmerRow />
                ) : suggestions.length > 0 ? (
                  <RecipeRow
                    recipes={suggestions}
                    onCardClick={setSelectedRecipe}
                    onRefresh={fetchData}
                  />
                ) : (
                  <div className="flex items-center gap-4 px-6 py-8 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 text-sm">
                    <Sparkles className="w-5 h-5 flex-shrink-0 text-gray-300" />
                    <span>
                      Suggestions appear once the vector index is built and this
                      folder has bookmarks.
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals & Navigation ─────────────────────────────────────────────── */}
      {selectedRecipe && (
        <DishDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
