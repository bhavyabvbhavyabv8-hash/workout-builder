import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { accountApi, authApi, clearAuthToken, getAuthToken, saveAuthToken, setUnauthorizedHandler } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [authError, setAuthError] = useState('');

  const clearSession = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setAuthError('');
    setStatus('anonymous');
  }, []);

  const refreshProfile = useCallback(async () => {
    setStatus('loading');
    setAuthError('');
    try {
      const { user: profile } = await authApi.me();
      setUser(profile);
      setStatus('authenticated');
      return profile;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setAuthError(error.message);
        setStatus('unavailable');
      }
      throw error;
    }
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    let active = true;

    try {
      if (!getAuthToken()) {
        setStatus('anonymous');
        return () => {
          active = false;
          setUnauthorizedHandler(null);
        };
      }
    } catch (error) {
      setAuthError(error.message);
      setStatus('unavailable');
      return () => {
        active = false;
        setUnauthorizedHandler(null);
      };
    }

    authApi.me()
      .then(({ user: profile }) => {
        if (!active) return;
        setUser(profile);
        setStatus('authenticated');
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          clearSession();
        } else {
          setAuthError(error.message);
          setStatus('unavailable');
        }
      });

    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  const register = useCallback((body) => authApi.register(body), []);

  const login = useCallback(async (body) => {
    const result = await authApi.login(body);
    saveAuthToken(result.token);
    setUser(result.user);
    setAuthError('');
    setStatus('authenticated');
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    let logoutError;
    try {
      if (getAuthToken()) await authApi.logout();
    } catch (error) {
      logoutError = error;
    } finally {
      clearSession();
    }
    if (logoutError) throw logoutError;
  }, [clearSession]);

  const updateProfile = useCallback(async (body) => {
    const { user: updatedUser } = await accountApi.update(body);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const changePassword = useCallback(async (body) => {
    const result = await accountApi.changePassword(body);
    clearSession();
    return result;
  }, [clearSession]);

  const deleteAccount = useCallback(async (body) => {
    const result = await accountApi.delete(body);
    clearSession();
    return result;
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      authError,
      register,
      login,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
      refreshProfile
    }),
    [
      user,
      status,
      authError,
      register,
      login,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
      refreshProfile
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
