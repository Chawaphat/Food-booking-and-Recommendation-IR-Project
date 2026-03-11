import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getRandomRecipes, getBookmarks } from '../services/api';
import RecipeCard from '../components/RecipeCard';
import DishDetailModal from '../components/DishDetailModal';

export default function LandingPage() {
    const [query, setQuery] = useState('');
    const [randomRecipes, setRandomRecipes] = useState([]);
    const [bookmarkedRecipes, setBookmarkedRecipes] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadData() {
            try {
                const randoms = await getRandomRecipes();
                setRandomRecipes(randoms);

                // Load bookmarks (for now just returning raw records, ideally API should return full recipe objects too)
                const bms = await getBookmarks();
                // Just mock some bookmarked recipes if the API doesn't return joined info yet
                setBookmarkedRecipes(randoms.slice(0, 1));
            } catch (error) {
                console.error("Failed to load data", error);
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
                    </div>
                    {bookmarkedRecipes.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            {bookmarkedRecipes.map((recipe, idx) => (
                                <RecipeCard key={`bm-${idx}`} recipe={recipe} onClick={setSelectedRecipe} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white p-10 rounded-3xl text-center shadow-soft border border-gray-100">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500">You haven't bookmarked anything yet.</p>
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
        </div>
    );
}
