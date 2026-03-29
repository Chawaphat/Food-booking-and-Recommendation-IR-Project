import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, Star, Flame } from "lucide-react";
import api from "../services/client";

export default function TrendingDropdown({
  visible,
  onKeywordClick,
  containerRef,
}) {
  const [keywords, setKeywords] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [rect, setRect] = useState(null); // bounding rect of the search form
  const fetchedRef = useRef(false);

  // Fetch keywords once, cache in component state
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    api
      .get("/trending")
      .then((res) => {
        setKeywords(res.data.keywords ?? []);
        const m = {};
        (res.data.keywords_meta ?? []).forEach((item) => {
          m[item.keyword] = item;
        });
        setMeta(m);
      })
      .catch((err) => console.error("Trending fetch failed", err))
      .finally(() => setLoading(false));
  }, []);

  // Recompute position whenever visible or the container resizes / scrolls
  useEffect(() => {
    if (!visible || !containerRef?.current) return;

    const update = () => {
      const r = containerRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    };

    update();

    const obs = new ResizeObserver(update);
    obs.observe(containerRef.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [visible, containerRef]);

  if (!visible || !rect) return null;

  // Portal renders at <body> level — completely escapes any stacking context
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      }}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50 bg-gradient-to-r from-orange-50 to-red-50">
        <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-800 tracking-tight">
          Popular Now
        </span>

      </div>

      {/* Chips */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {[80, 110, 70, 95, 85, 100, 75, 90].map((w, i) => (
              <div
                key={i}
                className="h-8 rounded-full bg-gray-100 animate-pulse"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
        ) : keywords.length === 0 ? (
          <p className="text-sm text-gray-400 py-2 text-center">
            No trending data yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => {
              const m = meta[kw];
              return (
                <button
                  key={kw}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep input focused until navigation
                    onKeywordClick(kw);
                  }}
                  className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold
                             bg-orange-50 text-orange-700 border border-orange-100
                             hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-500
                             hover:text-white hover:border-transparent hover:shadow-sm
                             transition-all duration-150 capitalize"
                >
                  <Flame className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  {kw}
                  {m && (
                    <span className="flex items-center gap-0.5 text-[10px] opacity-60 group-hover:opacity-80">
                      <Star className="w-2.5 h-2.5" />
                      {m.avg_rating.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>,
    document.body   // ← portal target: escapes all parent stacking contexts
  );
}
