import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}`,
});

let refreshing = false;
let refreshQueue: Array<() => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // prevent infinite retry loops
    if (error.response?.status === 401 && originalRequest._retry) {
      return Promise.reject(error);
    }

    console.log(error);

    if (error.response?.status === 401) {
      if (refreshing) {
        // wait for the existing refresh to complete
        return new Promise((resolve) => {
          refreshQueue.push(() => resolve(api(originalRequest)));
        });
      }

      originalRequest._retry = true;
      refreshing = true;

      try {
        const response = await api.get('/auth/refresh', {
          withCredentials: true,
        });

        // set the new token
        const newToken = response.data.token;
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        // process queue
        refreshQueue.forEach((cb) => cb());
        refreshQueue = [];

        return api(originalRequest);
      } catch (err) {
        // refresh failed - redirect to login
        window.location.href = '/auth/login';
        return Promise.reject(err);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
