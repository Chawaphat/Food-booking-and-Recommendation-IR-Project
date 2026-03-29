import { useNavigate } from "react-router-dom";
import { LogOut, ChefHat, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";

import profilePic from "../assets/IMG_3413.jpeg";

// Generate a simple avatar background color from the username
function avatarColor(username = "") {
  const palette = [
    "from-orange-400 to-red-500",
    "from-purple-400 to-indigo-500",
    "from-teal-400 to-cyan-500",
    "from-pink-400 to-rose-500",
    "from-amber-400 to-orange-500",
    "from-green-400 to-emerald-500",
  ];
  const idx =
    username
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length;
  return palette[idx];
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  if (!user) {
    // Should not get here if route is protected, but just in case
    return null;
  }

  const initials = user.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?";

  const memberSince = (() => {
    // We don't persist join date, just show a friendly placeholder
    return "Member since today";
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            My Profile
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-lg mx-auto space-y-6">
        {/* Avatar card */}
        <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] p-8 flex flex-col items-center text-center">
          {/* Avatar */}
          <div
            className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${avatarColor(
              user.username
            )} flex items-center justify-center shadow-lg mb-5 overflow-hidden`}
          >
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-extrabold text-white tracking-wider">
                {initials}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
            {user.username}
          </h2>
          <p className="text-sm text-gray-400">{memberSince}</p>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] divide-y divide-gray-100">
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                Username
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {user.username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6 py-4">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                User ID
              </p>
              <p className="text-sm font-semibold text-gray-800">
                #{user.user_id}
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          id="profile-logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-red-100 text-red-500 font-bold rounded-2xl shadow-sm hover:bg-red-50 hover:border-red-200 active:scale-[0.98] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
