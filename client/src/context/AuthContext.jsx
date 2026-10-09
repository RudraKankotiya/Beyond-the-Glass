import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api, { AUTH_EXPIRED_EVENT, clearToken, getToken, setToken } from '../api/axios.js';

export const STAFF_ROLES = ['curator', 'admin'];

export const AuthContext = createContext(null);

// Holds the logged-in user for the whole app. Use it through the useAuth() hook.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" if there is a saved token to check; otherwise we already know: logged out
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()));

  // On page load/refresh: if a token was saved, ask the API who it belongs to
  useEffect(() => {
    if (!getToken()) return;

    // Ignore the answer if this effect was cleaned up before it arrived. (In development,
    // StrictMode runs effects twice; without this, a late reply could log the user back
    // in right after they clicked "Log out".)
    let ignore = false;
    api
      .get('/auth/me')
      .then(({ data }) => !ignore && setUser(data.user))
      .catch(() => !ignore && setUser(null)) // an invalid token is removed by the axios interceptor
      .finally(() => !ignore && setIsLoading(false));

    return () => {
      ignore = true;
    };
  }, []);

  // The axios interceptor fires this event when the server rejects the token mid-session
  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  // login/register both return { token, user }: save the token, remember the user
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // After saving/removing a favorite, the API sends the new list of artifact ids
  const setFavorites = useCallback((favorites) => {
    setUser((current) => (current ? { ...current, favorites } : current));
  }, []);

  // useMemo: components using the context only re-render when these values change
  const value = useMemo(
    () => ({
      user,
      isLoading,
      isStaff: STAFF_ROLES.includes(user?.role),
      login,
      register,
      logout,
      setFavorites,
    }),
    [user, isLoading, login, register, logout, setFavorites]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
