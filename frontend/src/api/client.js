import axios from "axios";
import { apiBaseUrl } from "../lib/apiOrigin.js";

const api = axios.create({ baseURL: apiBaseUrl() });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = String(err.config?.url || "");
    const isLoginAttempt = url.includes("/auth/login");
    if (err.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
