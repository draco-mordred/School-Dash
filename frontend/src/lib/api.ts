import axios from "axios";

const normalizeBaseUrl = (value?: string) => {
  const rawValue = (value ?? "").trim();

  if (!rawValue) {
    return "/api";
  }

  if (/^https?:\/\//i.test(rawValue)) {
    try {
      const parsedUrl = new URL(rawValue);
      const pathname = parsedUrl.pathname === "/" ? "/api" : parsedUrl.pathname.replace(/\/+$/, "");
      return `${parsedUrl.origin}${pathname}`;
    } catch {
      return rawValue.replace(/\/+$/, "");
    }
  }

  return rawValue.startsWith("/") ? rawValue.replace(/\/+$/, "") : `/${rawValue.replace(/^\/+/, "")}`;
};

export const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL),
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
 