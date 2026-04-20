import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('driver_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired — clear and redirect
      localStorage.removeItem('driver_token');
      localStorage.removeItem('driver_info');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;