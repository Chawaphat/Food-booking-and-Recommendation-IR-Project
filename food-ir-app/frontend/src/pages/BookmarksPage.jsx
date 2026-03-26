import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Folder as FolderIcon,
  Star,
  Grid,
  LayoutList,
} from "lucide-react";
import {
  getFolders,
  getFolderRecipes,
  getAllBookmarkedRecipes,
} from "../services/api";
import RecipeCard from "../components/RecipeCard";
import DishDetailModal from "../components/DishDetailModal";
import BottomNav from "../components/BottomNav";

function FolderCard({ folder, previewRecipes, onClick }) {
  // Extract up to 3 images from preview recipes
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
        <p className="text-xs text-gray-400 mt-1">Folder</p>
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("recipes"); // "recipes" or "categories"
  const [folders, setFolders] = useState([]);
  const [folderPreviews, setFolderPreviews] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    fetchData();
  }, [folderId, sort, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (folderId) {
        // Viewing a specific folder's recipes
        const foldersData = await getFolders();
        setFolders(foldersData);

        const folderRecipesData = await getFolderRecipes(folderId, null, sort);
        setRecipes(folderRecipesData);
      } else {
        if (activeTab === "recipes") {
          // Fetch all bookmarks
          const allRecipesData = await getAllBookmarkedRecipes(sort);
          setRecipes(allRecipesData);
        } else if (activeTab === "categories") {
          // Fetch folders and their previews
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
              {folderId ? currentFolderName : "My Bookmark"}
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

          {/* Filter Dropdown (hidden if in Categories tab) */}
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
                {folders.length > 0 ? (
                  folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      previewRecipes={folderPreviews[folder.id] || []}
                      onClick={() => navigate(`/bookmarks/folder/${folder.id}`)}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center flex flex-col items-center justify-center">
                    <FolderIcon className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No categories yet
                    </h3>
                    <p className="text-gray-500 max-w-sm">
                      Create folders to organize your bookmarks.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* View: Recipes (All Recipes tab OR specific Folder view) */}
            {(folderId || activeTab === "recipes") &&
              (recipes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 masonry-like">
                  {recipes.map((recipe, idx) => (
                    <div key={idx} className="relative group">
                      <RecipeCard recipe={recipe} onClick={setSelectedRecipe} />
                      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm border border-gray-100/50 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                        {recipe.rating || "New"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-4xl border border-dashed border-gray-200 mt-4">
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
