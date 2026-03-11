import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { searchRecipes } from '../services/api';
import RecipeCard from '../components/RecipeCard';
import DishDetailModal from '../components/DishDetailModal';

export default function SearchPage() {
    const [searchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const navigate = useNavigate();

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    useEffect(() => {
        if (initialQuery) {
            performSearch(initialQuery);
        }
    }, [initialQuery]);

    const performSearch = async (searchQuery) => {
        setLoading(true);
        try {
            const data = await searchRecipes(searchQuery);
            setResults(data.results || []);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white px-6 py-8 border-b border-gray-100 shadow-sm sticky top-0 z-40">
                <div className="max-w-6xl mx-auto flex items-center gap-6">
                    <button
                        onClick={() => navigate('/')}
                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <form onSubmit={handleSearch} className="relative flex-1 max-w-2xl">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent rounded-[2rem] focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 transition-all outline-none"
                            placeholder="Search for ingredients, dishes..."
                        />
                    </form>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 mt-12">
                <h2 className="text-xl font-medium text-gray-500 mb-8">
                    {loading ? 'Searching...' : `Found ${results.length} results for "${initialQuery}"`}
                </h2>

                {results.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {results.map((recipe, idx) => (
                            <RecipeCard key={idx} recipe={recipe} onClick={setSelectedRecipe} />
                        ))}
                    </div>
                ) : !loading && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-soft">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No recipes found</h3>
                        <p className="text-gray-500 text-center max-w-sm">
                            We couldn't find anything matching your search. Try using different keywords or ingredients.
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
