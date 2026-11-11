import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import {
  clearApiModeOverride,
  getApiMode,
  getStoredAuth,
  setApiMode,
  subscribeApiMode,
} from '../api/client';
import { productsApi } from '../api/products';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth().user);
  const [token, setToken] = useState(() => getStoredAuth().token);
  const [apiMode, setLocalApiMode] = useState(() => getApiMode());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return subscribeApiMode((nextMode) => {
      setLocalApiMode(nextMode);
    });
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password, name }) => {
    setLoading(true);
    try {
      const res = await authApi.register({ email, password, name });
      setUser(res.user);
      setToken(res.token);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const googleLogin = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(payload || {});
      setUser(res.user);
      setToken(res.token);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const retryLiveApi = useCallback(async () => {
    clearApiModeOverride();
    await productsApi.list({ page: 1, page_size: 1 });
    return getApiMode();
  }, []);

  const switchToDemoMode = useCallback(() => {
    setApiMode('demo', true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        loading,
        apiMode,
        login,
        register,
        googleLogin,
        logout,
        retryLiveApi,
        switchToDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

