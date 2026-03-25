import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Folder as FolderIcon } from 'lucide-react';
import { getRandomRecipes, getBookmarks, getFolders, createFolder, getAllBookmarkedRecipes, getFolderRecipes } from '../services/api';
import RecipeCard from '../components/RecipeCard';
import DishDetailModal from '../components/DishDetailModal';

export default function LandingPage() {
    const [query, setQuery] = useState('');
    const [randomRecipes, setRandomRecipes] = useState([]);
    const [bookmarkedRecipes, setBookmarkedRecipes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const navigate = useNavigate();

    const [folderPreviews, setFolderPreviews] = useState([]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const newF = await createFolder(newFolderName);
            setFolders([...folders, newF]);
            setShowCreateFolder(false);
            setNewFolderName('');
            alert("Folder created successfully!");
        } catch (error) {
            console.error("Failed to create folder", error);
            alert("Failed to create folder");
        }
    };

    useEffect(() => {
        async function loadData() {
            // Each section loads independently — a failure in one won't block others

            // 1. Load random recipes for "Discover" section
            try {
                const randoms = await getRandomRecipes();
                setRandomRecipes(Array.isArray(randoms) ? randoms : randoms?.data || []);
            } catch (e) {
                console.warn("Could not load random recipes:", e.message);
            }

            // 2. Load folders + folder recipe previews
            try {
                const foldersData = await getFolders();
                const folderList = foldersData?.data || foldersData || [];
                console.log("Folders:", folderList);
                setFolders(folderList);

                // Fetch recipes for every folder in parallel, then filter/slice
                const allPreviews = await Promise.all(
                    folderList.map(async (folder) => {
                        try {
                            const recipesRes = await getFolderRecipes(folder.id, 5, 'rating');
                            const recipes = Array.isArray(recipesRes) ? recipesRes : recipesRes?.data || [];
                            console.log("Recipes for folder", folder.id, recipes);
                            return { folder, recipes };
                        } catch (e) {
                            console.error(`Failed to load preview for folder ${folder.id}`, e);
                            return { folder, recipes: [] };
                        }
                    })
                );
                const validPreviews = allPreviews.filter(p => Array.isArray(p.recipes) && p.recipes.length > 0);
                setFolderPreviews(validPreviews.slice(0, 3));
            } catch (e) {
                console.error("Could not load folders:", e.message);
            }

            // 3. Load all bookmarks as fallback (only shown when no folder previews)
            try {
                const bmsRecipesRes = await getAllBookmarkedRecipes();
                const bmsRecipes = Array.isArray(bmsRecipesRes) ? bmsRecipesRes : bmsRecipesRes?.data || [];
                setBookmarkedRecipes(bmsRecipes.slice(0, 3));
            } catch (e) {
                console.warn("Could not load bookmarked recipes:", e.message);
            }
        }
        loadData();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="min-h-screen pb-20">
            {/* Header section */}
            <div className="bg-white px-6 py-12 md:py-20 rounded-b-[3rem] shadow-soft mb-12">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
                        What are you craving?
                    </h1>
                    <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
                        Discover your next favorite dish and save it for later. Search thousands of recipes instantly.
                    </p>

                    <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto transform transition-transform focus-within:scale-[1.02]">
                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-gray-50 border-transparent rounded-[2rem] text-lg focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 shadow-sm transition-all outline-none"
                            placeholder="Search for ingredients, dishes..."
                        />
                        <button
                            type="submit"
                            className="absolute inset-y-2 right-2 px-6 bg-black text-white hover:bg-gray-800 rounded-full font-medium transition-colors shadow-soft"
                        >
                            Search
                        </button>
                    </form>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 space-y-16">
                {/* Recommended Section */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Recommended for you</h2>
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">See all</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {randomRecipes.slice(0, 3).map(recipe => (
                            <RecipeCard key={recipe.id} recipe={recipe} onClick={setSelectedRecipe} />
                        ))}
                    </div>
                </section>

                {/* Random Dishes Section */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Discover something new</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {randomRecipes.map((recipe, idx) => (
                            <RecipeCard key={`rand-${idx}`} recipe={recipe} onClick={setSelectedRecipe} />
                        ))}
                    </div>
                </section>

                {/* Bookmarks Section */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">From your bookmarks</h2>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowCreateFolder(true)}
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full"
                            >
                                + Create Folder
                            </button>
                            <button
                                onClick={() => navigate('/bookmarks')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                View All Bookmarks
                            </button>
                        </div>
                    </div>
                    {folderPreviews.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {folderPreviews.map(({ folder, recipes }) => {
                                const images = (Array.isArray(recipes) ? recipes : []).slice(0, 5);
                                return (
                                    <div
                                        key={folder.id}
                                        onClick={() => navigate(`/bookmarks/folder/${folder.id}`)}
                                        className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:-translate-y-1"
                                    >
                                        {/* Image mosaic */}
                                        <div className="relative h-44 bg-gray-100 overflow-hidden">
                                            {images.length === 0 ? (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FolderIcon className="w-12 h-12 text-gray-300" />
                                                </div>
                                            ) : images.length === 1 ? (
                                                <img
                                                    src={images[0].image || images[0].image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
                                                    alt={images[0].name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className={`grid h-full gap-0.5 ${images.length >= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2'}`}>
                                                    {images.slice(0, images.length >= 4 ? 4 : 2).map((recipe, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={recipe.image || recipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
                                                            alt={recipe.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {/* Overlay gradient */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>

                                        {/* Folder info */}
                                        <div className="px-5 py-4 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                <FolderIcon className="w-4 h-4 text-red-500" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{folder.name}</p>
                                                <p className="text-sm text-gray-400">{images.length} recipes</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white p-10 rounded-3xl text-center shadow-soft border border-gray-100 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500 mb-4">You haven't bookmarked anything yet.</p>
                            <button
                                onClick={() => navigate('/bookmarks')}
                                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                            >
                                Go to My Folders
                            </button>
                        </div>
                    )}
                </section>
            </div>

            {selectedRecipe && (
                <DishDetailModal
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                />
            )}

            {showCreateFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Create New Folder</h2>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Enter folder name"
                            className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-gray-100 outline-none mb-6"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                disabled={!newFolderName.trim()}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:bg-blue-300"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
