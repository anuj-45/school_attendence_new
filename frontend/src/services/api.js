import axios from "axios";

const defaultApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://schoolattendence.onrender.com/api"
    : "http://localhost:5000/api";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || defaultApiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || "").toLowerCase();

    if (status === 401 && message.includes("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
