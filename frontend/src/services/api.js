import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

// Local dev (docker-compose): nginx proxies /api/ to the backend container
// on the shared network, so a relative path works.
// Cloud Run: frontend and backend are separate services with their own
// URLs, no shared network — VITE_API_URL is baked in at build time via
// `docker build --build-arg VITE_API_URL=https://<backend-url>/api`.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
