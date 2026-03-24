import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAccessToken, setAccessToken, setAuthInvalidHandler, setRefreshToken } from "../api/axiosClient";
import { getMe, login as loginApi, loginWithGoogle as loginWithGoogleApi, logout as logoutApi } from "../api/modules/authApi";
import type { AuthUser } from "../types/auth";

const TOKEN_KEY = "@happytails:accessToken";
const REFRESH_TOKEN_KEY = "@happytails:refreshToken";
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
  refreshToken: string | null;
  login: (input: LoginInput) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  setAuthFromRegister: (payload: { user: AuthUser; token: string }) => Promise<void>;
  updateSessionTokens: (payload: { user: AuthUser; accessToken: string; refreshToken?: string | null }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenState, setRefreshTokenState] = useState<string | null>(null);

  const persistAuth = useCallback(async (nextUser: AuthUser, nextToken: string, nextRefreshToken?: string | null) => {
    setAccessToken(nextToken);
    setRefreshToken(nextRefreshToken ?? null);
    setUser(nextUser);
    setToken(nextToken);
    setRefreshTokenState(nextRefreshToken ?? null);

    const storageWrites = [
      AsyncStorage.setItem(TOKEN_KEY, nextToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
    ];

    if (nextRefreshToken) {
      storageWrites.push(AsyncStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken));
    } else {
      storageWrites.push(AsyncStorage.removeItem(REFRESH_TOKEN_KEY));
    }

    await Promise.all(storageWrites);
  }, []);

  const clearAuth = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setToken(null);
    setRefreshTokenState(null);

    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }, []);

  useEffect(() => {
    setAuthInvalidHandler(() => {
      void clearAuth();
    });

    return () => {
      setAuthInvalidHandler(null);
    };
  }, [clearAuth]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [storedToken, storedRefreshToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(REFRESH_TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (!storedToken || !storedUser) {
          setIsBootstrapping(false);
          return;
        }

        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setAccessToken(storedToken);
        setRefreshToken(storedRefreshToken || null);
        setToken(storedToken);
        setRefreshTokenState(storedRefreshToken || null);

        // Always sync profile from backend to avoid stale role/permission in local storage.
        try {
          const freshUser = await getMe();
          setUser(freshUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        } catch {
          // If profile refresh fails (expired token, revoked user...), fallback to stored user.
          setUser(parsedUser);
        }
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
    await persistAuth(result.user, result.tokens.accessToken, result.tokens.refreshToken);
  }, [persistAuth]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await loginWithGoogleApi(idToken);
    await persistAuth(result.user, result.tokens.accessToken, result.tokens.refreshToken);
  }, [persistAuth]);

  const setAuthFromRegister = useCallback(async (payload: { user: AuthUser; token: string }) => {
    await persistAuth(payload.user, payload.token);
  }, [persistAuth]);

  const updateSessionTokens = useCallback(async (payload: { user: AuthUser; accessToken: string; refreshToken?: string | null }) => {
    await persistAuth(payload.user, payload.accessToken, payload.refreshToken ?? refreshTokenState);
  }, [persistAuth, refreshTokenState]);

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
      refreshToken: refreshTokenState,
      login,
      loginWithGoogle,
      setAuthFromRegister,
      updateSessionTokens,
      logout,
      refreshProfile,
    }),
    [isBootstrapping, token, user, refreshTokenState, login, loginWithGoogle, setAuthFromRegister, updateSessionTokens, logout, refreshProfile],
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
