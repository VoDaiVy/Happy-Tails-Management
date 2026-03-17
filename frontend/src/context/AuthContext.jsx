import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { extractAuthData, googleLoginApi, loginApi, logoutApi } from '../api/authApi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('accessToken'));

  const isAuthenticated = !!token && !!user;

  const persistAuthSession = useCallback((result) => {
    const { user: userData, accessToken } = extractAuthData(result);

    if (!userData || !accessToken) {
      throw new Error('Invalid authentication response from server');
    }

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await loginApi(email, password);
    persistAuthSession(result);

    return result;
  }, [persistAuthSession]);

  const loginWithGoogle = useCallback(async (idToken, device = {}) => {
    const result = await googleLoginApi(idToken, device);
    persistAuthSession(result);

    return result;
  }, [persistAuthSession]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // ignore logout API errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // Allow updating user data (e.g. after profile edit)
  const updateUser = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'accessToken') {
        setToken(e.newValue);
      }
      if (e.key === 'user') {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, loginWithGoogle, logout, updateUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
