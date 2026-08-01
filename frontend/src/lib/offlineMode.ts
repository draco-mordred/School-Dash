const OFFLINE_CACHE_PREFIX = "school-dash:offline-cache";
const OFFLINE_MUTATION_QUEUE_KEY = "school-dash:offline-mutations";
const AUTH_SNAPSHOT_KEY = "school-dash:auth-snapshot";

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const normalizeCacheKey = (key: string) => `${OFFLINE_CACHE_PREFIX}:${key}`;

export const buildOfflineCacheKey = (
  method: string | undefined,
  url: string | undefined,
  params?: Record<string, unknown>,
) => {
  const normalizedMethod = (method ?? "get").toLowerCase();
  const normalizedUrl = (url ?? "").replace(/\?.*$/, "");
  const normalizedParams = params ? JSON.stringify(params) : "{}";
  return `${normalizedMethod}:${normalizedUrl}:${normalizedParams}`;
};

export const writeOfflineCache = (key: string, data: unknown) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(normalizeCacheKey(key), JSON.stringify({ cachedAt: Date.now(), data }));
};

export const readOfflineCache = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  const cached = safeJsonParse<{ cachedAt: number; data: T }>(localStorage.getItem(normalizeCacheKey(key)));
  return cached?.data ?? null;
};

export const persistAuthSnapshot = (user: unknown, year: unknown) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    AUTH_SNAPSHOT_KEY,
    JSON.stringify({
      user,
      year,
      cachedAt: Date.now(),
    }),
  );
};

export const readAuthSnapshot = () => {
  if (typeof window === "undefined") return null;

  return safeJsonParse<{ user: unknown; year: unknown; cachedAt: number }>(localStorage.getItem(AUTH_SNAPSHOT_KEY));
};

export type OfflineMutationRequest = {
  url?: string;
  method?: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
};

export const queueOfflineMutation = (request: OfflineMutationRequest) => {
  if (typeof window === "undefined") return;

  const queue = readOfflineMutationQueue();
  const next = [
    ...queue,
    {
      ...request,
      queuedAt: Date.now(),
    },
  ];

  localStorage.setItem(OFFLINE_MUTATION_QUEUE_KEY, JSON.stringify(next));
};

export const readOfflineMutationQueue = (): Array<OfflineMutationRequest & { queuedAt?: number }> => {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(OFFLINE_MUTATION_QUEUE_KEY);
  return safeJsonParse<Array<OfflineMutationRequest & { queuedAt?: number }>>(raw) ?? [];
};

export const removeOfflineMutationFromQueue = (queuedAt: number) => {
  if (typeof window === "undefined") return;

  const queue = readOfflineMutationQueue();
  const nextQueue = queue.filter((item) => item.queuedAt !== queuedAt);
  localStorage.setItem(OFFLINE_MUTATION_QUEUE_KEY, JSON.stringify(nextQueue));
};

export const clearOfflineMutationQueue = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(OFFLINE_MUTATION_QUEUE_KEY);
};
