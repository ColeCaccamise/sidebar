'use client';

import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';

import { useRouter } from 'next/navigation';

const router = useRouter;

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}`,
  withCredentials: true, // enable sending/receiving cookies
});

interface RefreshQueueItem {
  resolve: (value: unknown) => void;
  reject: (error: Error | AxiosError | unknown) => void;
}

let refreshing = false;
let refreshQueue: RefreshQueueItem[] = [];

const processQueue = (error: AxiosError | null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && originalRequest._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      refreshing = true;

      try {
        // backend will set http-only cookie in response
        await api.get('/auth/refresh', {
          withCredentials: true,
        });
        processQueue(null);
        return api(originalRequest);
      } catch (err) {
        processQueue(err as AxiosError);
        router.push('/auth/login');
        return Promise.reject(err);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
