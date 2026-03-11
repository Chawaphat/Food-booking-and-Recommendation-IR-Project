import { Clock, Users } from 'lucide-react';

export default function RecipeCard({ recipe, onClick }) {
    return (
        <div
            onClick={() => onClick(recipe)}
            className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:-translate-y-1"
        >
            <div className="relative aspect-video overflow-hidden">
                <img
                    src={recipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
                    alt={recipe.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <div className="p-5">
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
    );
}
