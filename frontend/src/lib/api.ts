import axios from "axios";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache, queueOfflineMutation } from "@/lib/offlineMode";

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

const apiBaseUrl = import.meta.env.DEV
  ? "/api"
  : normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || "/api");

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = (response.config?.method ?? "get").toLowerCase();
    const url = response.config?.url;

    if (method === "get" && url && response.status >= 200 && response.status < 300) {
      writeOfflineCache(buildOfflineCacheKey(method, url, response.config?.params), response.data);
    }

    return response;
  },
  (error) => {
    const config = error?.config ?? {};
    const method = (config.method ?? "get").toLowerCase();
    const url = config.url;
    const requestKey = buildOfflineCacheKey(method, url, config.params);

    if (!navigator.onLine) {
      if (method === "get") {
        const cached = readOfflineCache(requestKey);
        if (cached !== null) {
          return Promise.resolve({
            data: cached,
            status: 200,
            statusText: "OK",
            headers: {},
            config,
          });
        }

        return Promise.reject(error);
      }

      queueOfflineMutation({
        url,
        method,
        params: config.params,
        data: config.data,
        headers: config.headers as Record<string, string>,
      });

      return Promise.resolve({
        data: { queued: true, offline: true },
        status: 202,
        statusText: "Accepted",
        headers: {},
        config,
      });
    }

    return Promise.reject(error);
  },
);
 