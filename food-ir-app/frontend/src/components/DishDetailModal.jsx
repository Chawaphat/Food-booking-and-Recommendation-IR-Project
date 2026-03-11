import { X } from 'lucide-react';
import BookmarkButton from './BookmarkButton';

export default function DishDetailModal({ recipe, onClose }) {
    if (!recipe) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-soft-lg overflow-hidden flex flex-col transform transition-all">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white text-gray-600 transition-colors shadow-sm"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="w-full h-64 sm:h-72 shrink-0">
                    <img
                        src={recipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
                        alt={recipe.name}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="overflow-y-auto p-6 sm:p-8 no-scrollbar">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                            {recipe.name}
                        </h2>
                        <BookmarkButton recipeId={recipe.id} />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
                        <div className="sm:col-span-1 border-gray-100 sm:border-r border-b sm:border-b-0 pb-8 sm:pb-0 sm:pr-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                Ingredients
                            </h3>
                            <ul className="space-y-3">
                                {recipe.ingredients.map((ing, idx) => (
                                    <li key={idx} className="text-gray-600 flex items-start gap-2 text-sm leading-snug hover:text-gray-900 transition-colors">
                                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-gray-300 shrink-0" />
                                        {ing}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="sm:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Instructions
                                </h3>
                                <div className="space-y-6">
                                    {recipe.steps.map((step, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-2xl bg-gray-50 flex items-center justify-center font-medium text-gray-400 border border-gray-100 shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <p className="text-gray-600 mt-1 leading-relaxed text-sm sm:text-base">
                                                {step}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
