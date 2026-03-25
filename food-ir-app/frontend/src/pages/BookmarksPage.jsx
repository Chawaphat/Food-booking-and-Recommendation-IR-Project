import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Folder as FolderIcon, Star, Trash2 } from "lucide-react";
import { getBookmarks, getFolderBookmarks, getFolders, getRecipeDetail, getFolderRecipes, getAllBookmarkedRecipes, deleteFolder } from "../services/api";
import RecipeCard from "../components/RecipeCard";
import DishDetailModal from "../components/DishDetailModal";

export default function BookmarksPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [folders, setFolders] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    fetchData();
  }, [folderId, sort]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch folders for sidebar
      const foldersData = await getFolders();
      setFolders(foldersData);

      if (folderId) {
        // Use the new endpoint fetching complete recipes via ElasticSearch
        const folderRecipesData = await getFolderRecipes(folderId, null, sort);
        setRecipes(folderRecipesData);
        setBookmarks(folderRecipesData); // keep bookmarks state aligned if needed elsewhere
      } else {
        // Fallback for All Bookmarks
        const allRecipesData = await getAllBookmarkedRecipes(sort);
        setRecipes(allRecipesData);
        setBookmarks(allRecipesData);
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const currentFolderName = folderId
    ? folders.find(f => f.id.toString() === folderId)?.name
    : "All Bookmarks";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-xl">Bookmarks</h2>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => navigate("/bookmarks")}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${!folderId ? "bg-red-50 text-red-600 font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
          >
            <Star className="w-5 h-5" />
            All Bookmarks
          </button>

          <div className="pt-4 pb-2">
            <h3 className="text-xs uppercase text-gray-400 font-bold px-4">Folders</h3>
          </div>

          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => navigate(`/bookmarks/folder/${folder.id}`)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${folderId === folder.id.toString() ? "bg-red-50 text-red-600 font-medium" : "text-gray-600 hover:bg-gray-50"
                }`}
            >
              <div className="flex items-center gap-3">
                <FolderIcon className="w-5 h-5" />
                <span className="truncate">{folder.name}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 pb-20 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentFolderName}
          </h2>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-5 pr-12 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 font-medium cursor-pointer transition-all hover:border-gray-300"
            >
              <option value="rating">Top Rated</option>
              <option value="recent">Recently Added</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading recipes...</p>
        ) : recipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map((recipe, idx) => (
              <div key={idx} className="relative">
                <RecipeCard
                  recipe={recipe}
                  onClick={setSelectedRecipe}
                />
                {/* Overlay rating and folder name */}
                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  {recipe.rating}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-soft">
            <Star className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No bookmarks found</h3>
            <p className="text-gray-500 text-center max-w-sm">
              Start adding recipes to your bookmarks to see them here!
            </p>
          </div>
        )}
      </div>

      {selectedRecipe && (
        <DishDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}
