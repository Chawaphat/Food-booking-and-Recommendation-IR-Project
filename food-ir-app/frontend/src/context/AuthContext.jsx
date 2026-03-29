import { createContext, useContext, useState, useEffect, useCallback } from "react";
import client from "../services/client";

// ─── Context ─────────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

const STORAGE_KEY = "foodir_auth";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(data) {
  if (data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Apply (or clear) the X-User-Id header on the shared axios instance. */
function applyHeader(userData) {
  if (userData?.user_id) {
    client.defaults.headers.common["X-User-Id"] = String(userData.user_id);
  } else {
    delete client.defaults.headers.common["X-User-Id"];
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = loadFromStorage();
    // Eagerly rehydrate axios header so the very first API call is authenticated
    applyHeader(saved);
    return saved;
  });

  // Keep axios header in sync whenever `user` changes
  useEffect(() => {
    applyHeader(user);
  }, [user]);

  /** Persist + set user state in one go. Pass null to clear. */
  const applyUser = useCallback((userData) => {
    setUser(userData);
    saveToStorage(userData);
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (username, password) => {
      const res = await client.post("/auth/login", { username, password });
      const data = res.data; // { message, user_id }
      applyUser({ username, user_id: data.user_id });
      return data;
    },
    [applyUser]
  );

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(
    async (username, email, password) => {
      const res = await client.post("/auth/register", { username, email, password });
      const data = res.data; // { message, user_id }
      applyUser({ username, user_id: data.user_id });
      return data;
    },
    [applyUser]
  );

  // ── logout ─────────────────────────────────────────────────────────────────
  // Clear auth state AND any other per-user cached data lives in components;
  // components watch `isLoggedIn` and reset their own state on change.
  const logout = useCallback(() => {
    applyUser(null);
  }, [applyUser]);

  const isLoggedIn = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        /** Alias for clarity in components */
        isAuthenticated: isLoggedIn,
        /** Alias for clarity in components */
        currentUser: user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
