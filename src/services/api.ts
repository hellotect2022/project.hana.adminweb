import axios from 'axios';

// admin services/api.js 의 패턴을 TS로 (JWT 인터셉터). baseURL=/api → vite 프록시 → 백엔드.
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
