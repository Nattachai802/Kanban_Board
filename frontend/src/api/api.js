import axios from "axios";

const API_BASE = "http://localhost:8000";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
  const raw = localStorage.getItem("auth");
  const access = raw ? JSON.parse(raw).access : null;
  if (access && cfg.headers) cfg.headers.Authorization = `Bearer ${access}`;
  return cfg;
});

let refreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config || {};
    if (err?.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = true;
        try {
          const raw = localStorage.getItem("auth");
          const refresh = raw ? JSON.parse(raw).refresh : null;
          const r = await axios.post(`${API_BASE}/accounts/refresh/`, { refresh });
          const access = r.data.access;
          const auth = raw ? JSON.parse(raw) : {};
          localStorage.setItem("auth", JSON.stringify({ ...auth, access }));
          queue.forEach((cb) => cb(access));
          queue = [];
          refreshing = false;
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${access}`;
          return api(original);
        } catch (error) {
          console.error("Error refreshing token:", error);
          refreshing = false;
          localStorage.removeItem("auth");
          window.location.href = "/login";
        }
      }
      return new Promise((resolve) => {
        queue.push((access) => {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${access}`;
          resolve(api(original));
        });
      });
    }
    return Promise.reject(err);
  }
);
