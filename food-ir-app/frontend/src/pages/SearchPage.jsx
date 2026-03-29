import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, ArrowLeft, Sparkles, TrendingUp } from "lucide-react";
import { searchRecipes } from "../services/api";
import api from "../services/client";
import RecipeCard from "../components/RecipeCard";
import DishDetailModal from "../components/DishDetailModal";
import TrendingDropdown from "../components/TrendingDropdown";

/* ─── Highlighted suggestion text ───────────────────────────────────────────*/
function HighlightedQuery({ original, corrected }) {
  if (!corrected) return <strong>{corrected}</strong>;
  const origTokens = original.toLowerCase().split(/\s+/);
  const corTokens = corrected.split(/\s+/);
  return (
    <>
      {corTokens
        .map((word, i) => {
          const changed = origTokens[i] && origTokens[i] !== word.toLowerCase();
          return changed ? (
            <strong key={i} className="text-orange-500 font-bold">
              {word}
            </strong>
          ) : (
            <span key={i}>{word}</span>
          );
        })
        .reduce((acc, el, i) => (i === 0 ? [el] : [...acc, " ", el]), [])}
    </>
  );
}

/* ─── Spell banner ───────────────────────────────────────────────────────────*/
function SpellBanner({ originalQuery, correctedQuery, suggestions, onSelect }) {
  if (!correctedQuery && suggestions.length === 0) return null;
  return (
    <div className="max-w-6xl mx-auto px-6 pt-6">
      <div className="flex flex-wrap items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3.5">
        <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
        {correctedQuery ? (
          <span className="text-sm text-gray-600">
            Did you mean:{" "}
            <button
              onClick={() => onSelect(correctedQuery)}
              className="underline decoration-dotted underline-offset-2 hover:text-orange-600 transition-colors font-medium"
            >
              <HighlightedQuery
                original={originalQuery}
                corrected={correctedQuery}
              />
            </button>
            ?
          </span>
        ) : (
          <span className="text-sm text-gray-500">Related searches:</span>
        )}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSelect(s)}
                className="px-3 py-1 text-xs font-semibold rounded-full bg-white border border-orange-200 text-orange-600
                           hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Trending results banner ────────────────────────────────────────────────*/
function TrendingBanner({ keyword }) {
  if (!keyword) return null;
  return (
    <div className="max-w-6xl mx-auto px-6 pt-6">
      <div className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100 rounded-2xl px-5 py-3.5">
        <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-sm">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-gray-800 capitalize">
            {keyword}
          </span>
          <span className="text-sm text-gray-500">
            {" "}
            · Popular recipes ranked by rating &amp; reviews
          </span>
        </div>
        <span className="ml-auto text-[10px] font-bold text-orange-500 uppercase tracking-wider bg-orange-100 px-2 py-0.5 rounded-full">
          Trending
        </span>
      </div>
    </div>
  );
}

/* ─── Main SearchPage ────────────────────────────────────────────────────────*/
export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const trendingKw = searchParams.get("trending") || ""; // ?trending=chicken
  const navigate = useNavigate();

  const [query, setQuery] = useState(initialQuery || trendingKw);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [correctedQuery, setCorrectedQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTrending, setActiveTrending] = useState(trendingKw);

  const lastQueryRef = useRef(initialQuery || trendingKw);
  const searchFormRef = useRef(null); // passed to TrendingDropdown for width sync

  // Run search on URL change
  useEffect(() => {
    if (initialQuery) {
      lastQueryRef.current = initialQuery;
      setActiveTrending("");
      runSearch(initialQuery);
    }
  }, [initialQuery]);

  // Run trending fetch on URL change
  useEffect(() => {
    if (trendingKw) {
      lastQueryRef.current = trendingKw;
      setActiveTrending(trendingKw);
      fetchTrending(trendingKw);
    }
  }, [trendingKw]);

  const runSearch = async (q) => {
    setLoading(true);
    setSuggestions([]);
    setCorrectedQuery(null);
    try {
      const data = await searchRecipes(q);
      setResults(data.results);
      setSuggestions(data.suggestions);
      setCorrectedQuery(data.corrected_query);
    } catch (err) {
      console.error("Search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trending results for a keyword – popularity-ranked, NOT search-ranked
  const fetchTrending = async (kw) => {
    setLoading(true);
    setSuggestions([]);
    setCorrectedQuery(null);
    try {
      const res = await api.get(`/trending?keyword=${encodeURIComponent(kw)}`);
      const recipes = (res.data.results_by_keyword ?? {})[kw] ?? [];
      setResults(recipes);
    } catch (err) {
      console.error("Trending fetch failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    lastQueryRef.current = q;
    setIsFocused(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSuggestionClick = (suggested) => {
    setQuery(suggested);
    lastQueryRef.current = suggested;
    navigate(`/search?q=${encodeURIComponent(suggested)}`);
  };

  // Called when user clicks a trending chip
  const handleTrendingClick = (kw) => {
    setQuery(kw);
    setIsFocused(false);
    navigate(`/search?trending=${encodeURIComponent(kw)}`);
  };

  // Result header text
  const headerText = () => {
    if (loading) return "Searching…";
    if (activeTrending)
      return `${results.length} popular "${activeTrending}" recipes`;
    return `Found ${results.length} result${results.length !== 1 ? "s" : ""} for "${initialQuery}"`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ── Sticky header ────────────────────────────────────────────────────*/}
      <div className="bg-white px-6 py-8 border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <button
            onClick={() => navigate("/")}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Search form with trending dropdown */}
          <form
            ref={searchFormRef}
            onSubmit={handleSearch}
            className="relative flex-1 max-w-2xl"
          >
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveTrending("");
                setIsTyping(true);
              }}
              onFocus={() => {
                setIsFocused(true);
                setIsTyping(false);
              }}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
              className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent rounded-[2rem]
                         focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100
                         transition-all outline-none"
              placeholder="Search for ingredients, dishes…"
            />

            {/* Trending dropdown – visible when input is focused and user hasn't started typing */}
            <TrendingDropdown
              visible={isFocused && !isTyping}
              onKeywordClick={handleTrendingClick}
              containerRef={searchFormRef}
            />
          </form>

          <button
            onClick={() => navigate("/bookmarks")}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium shadow-sm transition-colors"
          >
            My Bookmarks
          </button>
        </div>
      </div>

      {/* ── Trending mode banner ──────────────────────────────────────────────*/}
      {!loading && activeTrending && (
        <TrendingBanner keyword={activeTrending} />
      )}

      {/* ── Spell-correction banner ───────────────────────────────────────────*/}
      {!loading && !activeTrending && (
        <SpellBanner
          originalQuery={lastQueryRef.current}
          correctedQuery={correctedQuery}
          suggestions={suggestions}
          onSelect={handleSuggestionClick}
        />
      )}

      {/* ── Results grid ─────────────────────────────────────────────────────*/}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        <h2 className="text-xl font-medium text-gray-500 mb-8">
          {headerText()}
        </h2>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {results.map((recipe, idx) => (
              <RecipeCard
                key={recipe.id ?? idx}
                recipe={recipe}
                onClick={setSelectedRecipe}
              />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No recipes found
              </h3>
              <p className="text-gray-500 text-center max-w-sm">
                We couldn't find anything matching your search.
                {suggestions.length > 0 && (
                  <> Try one of the suggestions above.</>
                )}
              </p>
            </div>
          )
        )}
      </div>

      {/* ── Detail modal ─────────────────────────────────────────────────────*/}
      {selectedRecipe && (
        <DishDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}
