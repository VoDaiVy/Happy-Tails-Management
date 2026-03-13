import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, logoutApi } from '../api/authApi';

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

  const login = useCallback(async (email, password) => {
    const result = await loginApi(email, password);
    const { user: userData, tokens } = result.data;

    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokens.accessToken);
    setUser(userData);

    return result;
  }, []);

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
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, updateUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
