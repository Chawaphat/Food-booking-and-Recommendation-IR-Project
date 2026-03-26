import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark } from "lucide-react";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/" || location.pathname.startsWith("/search");
  const isBookmark = location.pathname.startsWith("/bookmarks");

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex h-16 max-w-md mx-auto px-6">
        <button
          onClick={() => navigate("/")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
            isHome ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Home className={`w-6 h-6 ${isHome ? "fill-current" : ""}`} />
          <span className="text-[10px] font-bold tracking-widest">HOME</span>
        </button>

        <button
          onClick={() => navigate("/bookmarks")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
            isBookmark ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Bookmark className={`w-6 h-6 ${isBookmark ? "fill-current" : ""}`} />
          <span className="text-[10px] font-bold tracking-widest">MY BOOKMARK</span>
        </button>
      </div>
    </div>
  );
}
