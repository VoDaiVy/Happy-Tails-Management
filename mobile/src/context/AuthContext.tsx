import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAccessToken, setAccessToken } from "../api/axiosClient";
import { getMe, login as loginApi, logout as logoutApi } from "../api/modules/authApi";
import type { AuthUser } from "../types/auth";

const TOKEN_KEY = "@happytails:accessToken";
const USER_KEY = "@happytails:user";

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (input: LoginInput) => Promise<void>;
  setAuthFromRegister: (payload: { user: AuthUser; token: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const persistAuth = useCallback(async (nextUser: AuthUser, nextToken: string) => {
    setAccessToken(nextToken);
    setUser(nextUser);
    setToken(nextToken);

    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, nextToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const clearAuth = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    setToken(null);

    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (!storedToken || !storedUser) {
          setIsBootstrapping(false);
          return;
        }

        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setAccessToken(storedToken);
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        await clearAuth();
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [clearAuth]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await loginApi(input);
    await persistAuth(result.user, result.tokens.accessToken);
  }, [persistAuth]);

  const setAuthFromRegister = useCallback(async (payload: { user: AuthUser; token: string }) => {
    await persistAuth(payload.user, payload.token);
  }, [persistAuth]);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await logoutApi();
      }
    } finally {
      await clearAuth();
    }
  }, [clearAuth]);

  const refreshProfile = useCallback(async () => {
    const profile = await getMe();
    setUser(profile);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isBootstrapping,
      isAuthenticated: Boolean(token && user),
      user,
      token,
      login,
      setAuthFromRegister,
      logout,
      refreshProfile,
    }),
    [isBootstrapping, token, user, login, setAuthFromRegister, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
