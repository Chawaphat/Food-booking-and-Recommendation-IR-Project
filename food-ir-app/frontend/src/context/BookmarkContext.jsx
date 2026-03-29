import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getBookmarks } from "../services/bookmark";
import { useAuth } from "./AuthContext";

export const BookmarkContext = createContext(null);

export function BookmarkProvider({ children }) {
  const [bookmarkMap, setBookmarkMap] = useState(new Map());
  const { isLoggedIn } = useAuth();
  const fetchingRef = useRef(false);

  const refreshBookmarks = useCallback(async () => {
    if (!isLoggedIn || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await getBookmarks();
      const map = new Map();
      data.forEach((b) => {
        map.set(String(b.recipe_id), {
          bookmark_id: b.id,
          rating: b.rating,
          folder_id: b.folder_id,
          folder_name: b.folder_name,
        });
      });
      setBookmarkMap(map);
    } catch (err) {
      console.warn("[BookmarkContext] fetch failed:", err.message);
    } finally {
      fetchingRef.current = false;
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshBookmarks();
    } else {
      setBookmarkMap(new Map());
    }
  }, [isLoggedIn, refreshBookmarks]);

  const isRecipeBookmarked = useCallback(
    (recipeId) => bookmarkMap.has(String(recipeId)),
    [bookmarkMap],
  );

  const getBookmarkInfo = useCallback(
    (recipeId) => bookmarkMap.get(String(recipeId)),
    [bookmarkMap],
  );

  return (
    <BookmarkContext.Provider
      value={{
        bookmarkMap,
        isRecipeBookmarked,
        getBookmarkInfo,
        refreshBookmarks,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx)
    throw new Error("useBookmarks must be used inside <BookmarkProvider>");
  return ctx;
}
