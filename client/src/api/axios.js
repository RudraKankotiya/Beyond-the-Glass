import axios from 'axios';

// Base URL of the Express API, from client/.env (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// The server that hosts uploaded files ("http://localhost:5000"), i.e. the API URL without "/api"
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

// Turns a stored file address into a URL the browser can load:
// "/uploads/models/x.glb" (local storage) -> "http://localhost:5000/uploads/models/x.glb";
// a full https:// address (Cloudinary) is used as it is
export const fileUrl = (path) => {
  if (!path) return '';
  return path.startsWith('http://') || path.startsWith('https://') ? path : `${SERVER_URL}${path}`;
};

// --- JWT storage (localStorage keeps the user logged in after a refresh) ---
const TOKEN_KEY = 'token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Name of the browser event fired when the server rejects our token (expired/invalid)
export const AUTH_EXPIRED_EVENT = 'auth:expired';

// One shared axios instance so every request uses the same base URL
const api = axios.create({ baseURL: API_URL });

// Attach the JWT (if the user is logged in) to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server answers 401 while we were sending a token, that token is no longer valid:
// forget it and tell AuthContext (which listens for this event) to log the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

// Readable message for a failed request: the API's { message }, or a network hint
export const getErrorMessage = (error) =>
  error.response?.data?.message ?? 'Could not reach the server. Check that it is running and try again.';

export default api;
