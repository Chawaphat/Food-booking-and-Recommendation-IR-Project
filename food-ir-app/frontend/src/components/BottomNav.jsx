import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Simple colored avatar circle for the nav
function NavAvatar({ username }) {
  const colors = [
    "bg-orange-500",
    "bg-purple-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-amber-500",
    "bg-green-500",
  ];
  const idx =
    (username || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    colors.length;
  const initials = (username || "?").slice(0, 1).toUpperCase();
  return (
    <div
      className={`w-6 h-6 rounded-full ${colors[idx]} flex items-center justify-center`}
    >
      <span className="text-[10px] font-bold text-white leading-none">
        {initials}
      </span>
    </div>
  );
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user } = useAuth();

  const isHome =
    location.pathname === "/" || location.pathname.startsWith("/search");
  const isBookmark = location.pathname.startsWith("/bookmarks");
  const isProfile = location.pathname === "/profile";

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex h-16 max-w-md mx-auto px-6">
        {/* Home */}
        <button
          id="nav-home"
          onClick={() => navigate("/")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
            isHome ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Home className={`w-6 h-6 ${isHome ? "fill-current" : ""}`} />
          <span className="text-[10px] font-bold tracking-widest">HOME</span>
        </button>

        {/* Bookmark */}
        <button
          id="nav-bookmarks"
          onClick={() => navigate("/bookmarks")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
            isBookmark ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Bookmark className={`w-6 h-6 ${isBookmark ? "fill-current" : ""}`} />
          <span className="text-[10px] font-bold tracking-widest">
            BOOKMARK
          </span>
        </button>

        {/* Auth: Login or Profile */}
        {isLoggedIn ? (
          <button
            id="nav-profile"
            onClick={() => navigate("/profile")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              isProfile ? "text-red-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <NavAvatar username={user?.username} />
            <span
              className="text-[10px] font-bold tracking-widest truncate max-w-[4.5rem]"
              title={user?.username}
            >
              {user?.username?.toUpperCase() ?? "ME"}
            </span>
          </button>
        ) : (
          <button
            id="nav-login"
            onClick={() => navigate("/login")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              location.pathname === "/login" ||
              location.pathname === "/register"
                ? "text-red-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <LogIn className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-widest">LOGIN</span>
          </button>
        )}
      </div>
    </div>
  );
}
