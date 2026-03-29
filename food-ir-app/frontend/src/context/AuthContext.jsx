import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import client from "../services/client";

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

function applyHeader(userData) {
  if (userData?.user_id) {
    client.defaults.headers.common["X-User-Id"] = String(userData.user_id);
  } else {
    delete client.defaults.headers.common["X-User-Id"];
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = loadFromStorage();
    applyHeader(saved);
    return saved;
  });

  useEffect(() => {
    applyHeader(user);
  }, [user]);

  const applyUser = useCallback((userData) => {
    setUser(userData);
    saveToStorage(userData);
  }, []);

  const login = useCallback(
    async (username, password) => {
      const res = await client.post("/auth/login", { username, password });
      const data = res.data;
      applyUser({ username, user_id: data.user_id });
      return data;
    },
    [applyUser],
  );

  const register = useCallback(
    async (username, email, password) => {
      const res = await client.post("/auth/register", {
        username,
        email,
        password,
      });
      const data = res.data;
      applyUser({ username, user_id: data.user_id });
      return data;
    },
    [applyUser],
  );

  const logout = useCallback(() => {
    applyUser(null);
  }, [applyUser]);

  const isLoggedIn = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        isAuthenticated: isLoggedIn,
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
