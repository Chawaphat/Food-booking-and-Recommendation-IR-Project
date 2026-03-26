import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Flame, Sparkles, Shuffle } from "lucide-react";
import { getRecommendations } from "../services/api";
import RecipeCard from "../components/RecipeCard";
import DishDetailModal from "../components/DishDetailModal";
import BottomNav from "../components/BottomNav";

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal scrollable section of recipe cards
// ─────────────────────────────────────────────────────────────────────────────
function RecipeRow({ recipes, onCardClick }) {
  const containerRef = useRef(null);
  const pausedRef = useRef(false);
  const resumeTimeoutRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !recipes?.length) return;

    const step = 300;
    const intervalMs = 3500;

    const autoScroll = () => {
      if (pausedRef.current) return;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) return;

      const nextLeft = container.scrollLeft + step;
      if (nextLeft >= maxScrollLeft - 4) {
        container.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      container.scrollTo({ left: nextLeft, behavior: "smooth" });
    };

    const intervalId = setInterval(autoScroll, intervalMs);
    return () => {
      clearInterval(intervalId);
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [recipes?.length]);

  const pauseAutoScroll = () => {
    pausedRef.current = true;
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const resumeAutoScroll = () => {
    pausedRef.current = false;
  };

  const pauseTemporarily = (delayMs = 4000) => {
    pauseAutoScroll();
    resumeTimeoutRef.current = setTimeout(() => {
      pausedRef.current = false;
      resumeTimeoutRef.current = null;
    }, delayMs);
  };

  if (!recipes || recipes.length === 0) return null;
  return (
    <div
      ref={containerRef}
      onMouseEnter={pauseAutoScroll}
      onMouseLeave={resumeAutoScroll}
      onWheel={() => pauseTemporarily(3500)}
      onTouchStart={pauseAutoScroll}
      onTouchEnd={() => pauseTemporarily(2500)}
      className="flex overflow-x-auto pb-4 gap-5 no-scrollbar snap-x snap-mandatory"
    >
      {recipes.map((recipe, idx) => (
        <div
          key={recipe.id ?? `r-${idx}`}
          className="flex-none w-64 snap-start"
        >
          <RecipeCard recipe={recipe} onClick={onCardClick} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state for sections that have no data yet
// ─────────────────────────────────────────────────────────────────────────────
function EmptySection({ message, ctaLabel, onCta }) {
  return (
    <div className="flex items-center gap-4 px-6 py-8 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 text-sm">
      <Sparkles className="w-5 h-5 flex-shrink-0 text-gray-300" />
      <span>{message}</span>
      {ctaLabel && (
        <button
          onClick={onCta}
          className="ml-auto px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs font-medium transition-colors"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper with icon, title, optional subtitle
// ─────────────────────────────────────────────────────────────────────────────
function Section({ icon, title, subtitle, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xl">{icon}</span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading shimmer cards
// ─────────────────────────────────────────────────────────────────────────────
function ShimmerRow() {
  return (
    <div className="flex gap-5 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-none w-64 rounded-3xl bg-gray-200 animate-pulse h-52"
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [query, setQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Recommendation data
  const [forYou, setForYou] = useState([]);
  const [fromFolder, setFromFolder] = useState([]);
  const [folderName, setFolderName] = useState(null);
  const [randomRecs, setRandomRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ── Data loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const recs = await getRecommendations();
        setForYou(recs?.for_you ?? []);
        setFromFolder(recs?.from_folder ?? []);
        setFolderName(recs?.folder_name ?? null);
        setRandomRecs(recs?.random ?? []);
      } catch (e) {
        console.warn("Could not load recommendations:", e.message);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="w-full">
        {/* Hero / search bar */}
        <div className="bg-white px-6 py-12 md:py-16 rounded-b-[3rem] shadow-soft mb-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              What are you craving?
            </h1>
            <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
              Discover your next favorite dish. Personalized just for you.
            </p>
            <form
              onSubmit={handleSearch}
              className="relative max-w-2xl mx-auto transform transition-transform focus-within:scale-[1.02]"
            >
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

        {/* 3 recommendation sections */}
        <div className="px-6 space-y-12 max-w-7xl mx-auto">
          {/* ── Section 1: Recommended for you ──────────────────────────── */}
          <Section
            icon={<Flame className="w-5 h-5 text-orange-500 inline" />}
            title="Recommended for you"
            subtitle="Based on your bookmarks and ratings"
          >
            {loading ? (
              <ShimmerRow />
            ) : forYou.length > 0 ? (
              <RecipeRow recipes={forYou} onCardClick={setSelectedRecipe} />
            ) : (
              <EmptySection
                message="Bookmark and rate recipes to get personalized recommendations."
                ctaLabel="Browse recipes"
                onCta={() => navigate("/search?q=popular")}
              />
            )}
          </Section>

          {/* ── Section 2: Based on folder ───────────────────────────────── */}
          <Section
            icon="🍜"
            title={
              folderName
                ? `Based on your "${folderName}"`
                : "Based on your folders"
            }
            subtitle={
              folderName
                ? `Recipes similar to what's in your ${folderName} folder`
                : undefined
            }
          >
            {loading ? (
              <ShimmerRow />
            ) : fromFolder.length > 0 ? (
              <RecipeRow recipes={fromFolder} onCardClick={setSelectedRecipe} />
            ) : (
              <EmptySection
                message={
                  folderName
                    ? `Add more highly-rated recipes to your "${folderName}" folder.`
                    : "Create folders and bookmark recipes to see folder-based picks."
                }
                ctaLabel="My Bookmarks"
                onCta={() => navigate("/bookmarks")}
              />
            )}
          </Section>

          {/* ── Section 3: Discover something new ───────────────────────── */}
          <Section
            icon={<Shuffle className="w-5 h-5 text-purple-500 inline" />}
            title="Discover something new"
            subtitle="Fresh picks you might enjoy"
          >
            {loading ? (
              <ShimmerRow />
            ) : randomRecs.length > 0 ? (
              <RecipeRow recipes={randomRecs} onCardClick={setSelectedRecipe} />
            ) : (
              <EmptySection message="Could not load suggestions right now." />
            )}
          </Section>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {selectedRecipe && (
        <DishDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {/* ── Bottom Navigation ───────────────────────────────────────────────── */}
      <BottomNav />
    </div>
  );
}
