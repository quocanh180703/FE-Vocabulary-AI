import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { mockAdapter } from '../demo/mockAdapter';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const IS_DEMO = import.meta.env.VITE_DEMO === '1';

export const api = axios.create({ baseURL: API_URL, timeout: 120000 });

// Demo mode: giả lập toàn bộ BE thật bằng mockAdapter (không gọi mạng).
if (IS_DEMO) api.defaults.adapter = mockAdapter;

const getAccess = () => {
  const t = localStorage.getItem('vocab_access') || localStorage.getItem('access_token') || localStorage.getItem('vocabularyai_token');
  return t && t !== 'undefined' && t !== 'null' ? t : null;
};
const getRefresh = () => {
  const t = localStorage.getItem('vocab_refresh') || localStorage.getItem('refresh_token');
  return t && t !== 'undefined' && t !== 'null' ? t : null;
};

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const t = getAccess();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => {
    // BE bọc mọi response thành công trong ApiResponse {success, message, data, timestamp}
    // → bóc lấy `data` để code các trang dùng trực tiếp như cũ
    const body = r.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      r.data = (body as { data: unknown }).data;
    }
    return r;
  },
  async (err: AxiosError) => {
    const orig = err.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const refresh = getRefresh();
    const isAuthErr = err.response?.status === 401 || err.response?.status === 403;

    if (isAuthErr && !orig._retried && refresh) {
      orig._retried = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh', { refreshToken: refresh })
          .then((r) => {
            const token = r.data?.accessToken || r.data?.access_token;
            const newRefresh = r.data?.refreshToken || r.data?.refresh_token;
            if (token) {
              localStorage.setItem('vocab_access', token);
              localStorage.setItem('access_token', token);
              if (newRefresh) {
                localStorage.setItem('vocab_refresh', newRefresh);
                localStorage.setItem('refresh_token', newRefresh);
              }
              return token as string;
            }
            throw new Error('No access token');
          })
          .finally(() => { refreshing = null; });
        const token = await refreshing;
        orig.headers.Authorization = `Bearer ${token}`;
        return api(orig);
      } catch {
        localStorage.removeItem('vocab_access');
        localStorage.removeItem('access_token');
        localStorage.removeItem('vocab_refresh');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('vocab_user');
        window.location.href = IS_DEMO ? '/#/login' : '/login';
      }
    } else if (isAuthErr && !refresh && err.response?.status === 401) {
      localStorage.removeItem('vocab_access');
      localStorage.removeItem('access_token');
      localStorage.removeItem('vocab_user');
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e: unknown, fallback = 'Có lỗi xảy ra, thử lại nhé.') => {
  if (axios.isAxiosError(e)) return (e.response?.data?.message as string) || fallback;
  return fallback;
};
