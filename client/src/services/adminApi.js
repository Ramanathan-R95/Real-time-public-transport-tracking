import axios from 'axios';
import { API_URL } from '../config';

const adminApi = axios.create({
  baseURL: `${API_URL}/api/admin`,
  timeout: 20000,
  withCredentials: false,
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