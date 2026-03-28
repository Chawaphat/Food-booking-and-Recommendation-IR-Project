import { createContext, useContext, useState, useCallback } from "react";
import client from "../services/client";

// ─── Shape ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

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

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadFromStorage());

  // Attach user_id header to every request so backend knows who's calling
  const applyUser = useCallback((userData) => {
    setUser(userData);
    saveToStorage(userData);
    if (userData?.user_id) {
      client.defaults.headers.common["X-User-Id"] = String(userData.user_id);
    } else {
      delete client.defaults.headers.common["X-User-Id"];
    }
  }, []);

  // Restore header on mount if we already have a saved user
  useState(() => {
    if (user?.user_id) {
      client.defaults.headers.common["X-User-Id"] = String(user.user_id);
    }
  });

  // ── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const res = await client.post("/auth/login", { username, password });
    const data = res.data; // { message, user_id }
    applyUser({ username, user_id: data.user_id });
    return data;
  }, [applyUser]);

  // ── register ─────────────────────────────────────────────────────────────
  const register = useCallback(async (username, email, password) => {
    const res = await client.post("/auth/register", { username, email, password });
    const data = res.data; // { message, user_id }
    // Auto-login after register
    applyUser({ username, user_id: data.user_id });
    return data;
  }, [applyUser]);

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    applyUser(null);
  }, [applyUser]);

  const isLoggedIn = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, register, logout }}>
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
