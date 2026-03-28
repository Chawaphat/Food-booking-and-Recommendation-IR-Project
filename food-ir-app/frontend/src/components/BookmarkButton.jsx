import { useState } from 'react';
import { Bookmark, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bookmarkRecipe } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BookmarkButton({ recipeId, initialRating = 0, onBookmark }) {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [rating, setRating] = useState(initialRating);
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();

    const handleBookmark = async () => {
        if (!isLoggedIn) {
            alert("Please login first to bookmark recipes.");
            navigate("/login");
            return;
        }
        try {
            await bookmarkRecipe(recipeId, rating);
            setIsBookmarked(true);
            if (onBookmark) onBookmark();
        } catch (error) {
            console.error("Failed to bookmark", error);
            alert("Failed to save bookmark. Please try again.");
        }
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        onClick={() => setRating(star)}
                        className={`w-6 h-6 cursor-pointer transition-colors ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            } hover:fill-yellow-300`}
                    />
                ))}
            </div>

            <button
                onClick={handleBookmark}
                disabled={isBookmarked || rating === 0}
                className={`px-4 py-2 rounded-2xl flex items-center gap-2 font-medium transition-all ${isBookmarked
                        ? 'bg-green-100 text-green-700'
                        : rating === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-black text-white hover:bg-gray-800 hover:shadow-soft'
                    }`}
            >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Saved' : 'Save'}
            </button>
        </div>
    );
}
