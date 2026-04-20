import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const adminApi = axios.create({
  baseURL: `${BASE}/api/admin`,
  timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_info');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default adminApi;