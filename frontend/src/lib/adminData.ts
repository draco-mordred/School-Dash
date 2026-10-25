import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { AxiosResponse } from "axios";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type ResourceSnapshot<T> = {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  updatedAt: number;
};

type ResourceEntry<T> = {
  snapshot: ResourceSnapshot<T>;
  listeners: Set<() => void>;
  loader: () => Promise<T>;
  tags: string[];
  promise?: Promise<void>;
  pendingInvalidation?: boolean;
};

const entries = new Map<string, ResourceEntry<unknown>>();
const STALE_TIME_MS = 30_000;

const resourceTagsForUrl = (url: string): string[] => {
  const path = url.split("?")[0];
  if (/\/courses\/departments(?:\/|$)/.test(path)) return ["departments", "courses"];
  if (/\/classes(?:\/|$)/.test(path)) return ["classes"];
  if (/\/academic-clocks(?:\/|$)/.test(path)) return ["academic-clocks"];
  if (/\/academic-years(?:\/|$)/.test(path)) return ["academic-years"];
  if (/\/courses(?:\/|$)/.test(path)) return ["courses"];
  if (/\/users(?:\/|$)/.test(path)) return ["users"];
  if (/\/rotation-schedules(?:\/|$)/.test(path)) return ["rotation-schedules"];
  if (/\/clinical-schedules(?:\/|$)/.test(path)) return ["clinical-schedules"];
  if (/\/timetables?(?:\/|$)/.test(path)) return ["timetables"];
  if (/\/clinical-attendance(?:\/|$)/.test(path)) return ["clinical-attendance"];
  if (/\/hospital-data(?:\/|$)/.test(path)) return ["hospital-data"];
  if (/\/exams?(?:\/|$)/.test(path)) return ["exams"];
  if (/\/subjects?(?:\/|$)/.test(path)) return ["subjects"];
  if (/\/departments?(?:\/|$)/.test(path)) return ["departments"];
  if (/\/units?(?:\/|$)/.test(path)) return ["units"];
  if (/\/study-materials?(?:\/|$)/.test(path)) return ["study-materials"];
  return [];
};

const publish = <T,>(entry: ResourceEntry<T>) => {
  entry.listeners.forEach((listener) => listener());
};

export const invalidateAdminData = (...tags: string[]) => {
  const requestedTags = new Set(tags);
  for (const entry of entries.values()) {
    if (requestedTags.size && !entry.tags.some((tag) => requestedTags.has(tag))) continue;
    entry.snapshot = { ...entry.snapshot, updatedAt: 0 };
    publish(entry);
    if (!entry.listeners.size) continue;
    if (entry.promise) {
      entry.pendingInvalidation = true;
    } else {
      void loadEntry(entry);
    }
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("app:mutation", ((event: CustomEvent<{ url?: string }>) => {
    const tags = event.detail?.url ? resourceTagsForUrl(event.detail.url) : [];
    if (tags.length) invalidateAdminData(...tags);
  }) as EventListener);
}

const getEntry = <T,>(
  key: string,
  loader: () => Promise<T>,
  tags: string[],
): ResourceEntry<T> => {
  const existing = entries.get(key) as ResourceEntry<T> | undefined;
  if (existing) {
    existing.loader = loader;
    existing.tags = tags;
    return existing;
  }

  const entry: ResourceEntry<T> = {
    snapshot: { data: undefined, error: null, isLoading: true, updatedAt: 0 },
    listeners: new Set(),
    loader,
    tags,
  };
  entries.set(key, entry as ResourceEntry<unknown>);
  return entry;
};

const loadEntry = async <T,>(entry: ResourceEntry<T>, force = false): Promise<void> => {
  if (entry.promise) {
    // A load is already in flight. Without force we piggyback on it; with
    // force we wait for it to settle and then fetch again so callers always
    // observe data written after their mutation (e.g. class clock phase saves).
    if (!force) return entry.promise;
    await entry.promise;
  }
  entry.snapshot = { ...entry.snapshot, isLoading: entry.snapshot.data === undefined, error: null };
  publish(entry);
  entry.promise = entry.loader()
    .then((data) => {
      entry.snapshot = { data, error: null, isLoading: false, updatedAt: Date.now() };
    })
    .catch((error: unknown) => {
      entry.snapshot = { ...entry.snapshot, error, isLoading: false };
    })
    .finally(() => {
      entry.promise = undefined;
      publish(entry);
      if (entry.pendingInvalidation) {
        entry.pendingInvalidation = false;
        if (entry.listeners.size) void loadEntry(entry);
      }
    });
  return entry.promise;
};

export const useAdminResource = <T,>(
  key: string,
  loader: () => Promise<T>,
  tags: string[],
  enabled = true,
  refreshIntervalMs?: number,
) => {
  const { user } = useAuth();
  const authScope = `${user?._id ?? user?.id ?? "anonymous"}:${user?.role ?? "anonymous"}`;
  const entry = getEntry(`${authScope}:${key}`, loader, tags);
  const snapshot = useSyncExternalStore(
    (listener) => {
      entry.listeners.add(listener);
      return () => entry.listeners.delete(listener);
    },
    () => entry.snapshot,
    () => entry.snapshot,
  );

  useEffect(() => {
    if (!enabled || Date.now() - entry.snapshot.updatedAt < STALE_TIME_MS) return;
    void loadEntry(entry);
  }, [enabled, entry]);

  useEffect(() => {
    if (!enabled || !refreshIntervalMs) return;
    const timer = window.setInterval(() => void loadEntry(entry), refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, entry, refreshIntervalMs]);

  const refetch = useCallback(async () => {
    await loadEntry(entry, true);
    return entry.snapshot;
  }, [entry]);

  return {
    ...snapshot,
    refetch,
  };
};

type ClassOption = {
  _id: string;
  name: string;
  academicYearId?: string;
  academicYear?: string | { _id?: string; name?: string };
};

const normalizeCollection = <T,>(response: AxiosResponse, field: string): T[] => {
  const data = response.data;
  if (Array.isArray(data)) return data as T[];
  const collection = data?.[field] ?? data?.data;
  return Array.isArray(collection) ? collection as T[] : [];
};

export const useAdminClassOptions = (enabled = true) =>
  useAdminResource<ClassOption[]>(
    "admin:class-options",
    async () => {
      const response = await api.get("/classes?page=1&limit=500");
      return normalizeCollection<ClassOption>(response, "classes").map((item) => ({
        ...item,
        academicYearId: item.academicYearId ??
          (typeof item.academicYear === "string" ? item.academicYear : item.academicYear?._id),
      }));
    },
    ["classes"],
    enabled,
  );

export const useAdminClassDetails = (classId: string | null | undefined, enabled = true) =>
  useAdminResource<Record<string, unknown> | null>(
    `admin:class-details:${classId ?? "none"}`,
    async () => {
      if (!classId) return null;
      const { data } = await api.get(`/classes/${classId}`);
      return data as Record<string, unknown>;
    },
    ["classes", "academic-years"],
    enabled && Boolean(classId),
  );

export const useAdminVisibleClasses = (enabled = true) =>
  useAdminCollection<Record<string, unknown>>(
    "admin:visible-classes",
    "/users/visible-classes",
    "classes",
    ["classes", "users"],
    enabled,
  );

export const useAdminUnitOptions = (enabled = true) =>
  useAdminCollection<Record<string, unknown>>(
    "admin:hospital-unit-options",
    "/hospital-data/units?limit=200",
    "units",
    ["hospital-data", "units"],
    enabled,
  );

export const useAdminDepartmentList = (enabled = true) =>
  useAdminCollection<Record<string, unknown>>(
    "admin:departments",
    "/courses/departments",
    "departments",
    ["departments", "courses"],
    enabled,
  );

export const useAdminDepartmentConstants = (enabled = true) =>
  useAdminResource<Record<string, unknown> | null>(
    "admin:department-constants",
    async () => {
      const { data } = await api.get("/courses/department-constants");
      return data as Record<string, unknown>;
    },
    ["departments", "courses"],
    enabled,
  );

export const useAdminClinicalSessions = (enabled = true) =>
  useAdminCollection<Record<string, unknown>>(
    "admin:clinical-sessions",
    "/clinical-attendance/sessions",
    "data",
    ["clinical-attendance"],
    enabled,
  );

export type ActiveClassClock = {
  _id: string;
  classId: string | { _id?: string; name?: string; academicYear?: string };
  academicYearId: string;
  clockStartDate: string | null;
  clockPausedAt: string | null;
  clockIsPaused: boolean;
  storedClockPhase: string | null;
  classLevel?: string | null;
  phaseConfig?: Record<string, Record<string, unknown>>;
  activePhase: {
    id: string;
    name: string;
    duration: number;
    startsAt: string | null;
    endsAt: string | null;
    config: Record<string, unknown>;
  } | null;
};

export const useAdminClassClock = (
  classId: string | null | undefined,
  academicYearId?: string | null,
  enabled = true,
) =>
  useAdminResource<ActiveClassClock | null>(
    `admin:class-clock:${classId ?? "none"}:${academicYearId ?? "current"}`,
    async () => {
      if (!classId) return null;
      const params = new URLSearchParams();
      if (academicYearId) params.set("academicYearId", academicYearId);
      const { data } = await api.get(
        `/academic-clocks/class/${classId}/active-phase${params.size ? `?${params}` : ""}`,
      );
      return data as ActiveClassClock;
    },
    ["academic-clocks", "classes", "academic-years"],
    enabled && Boolean(classId),
    30_000,
  );

export const useAdminCollection = <T,>(
  key: string,
  url: string,
  field: string,
  tags: string[],
  enabled = true,
) =>
  useAdminResource<T[]>(
    key,
    async () => normalizeCollection<T>(await api.get(url), field),
    tags,
    enabled,
  );

export const useAdminRotationSchedules = (
  classId?: string | null,
  limit = 100,
  enabled = true,
) => {
  const params = new URLSearchParams({ page: "1", limit: String(limit) });
  if (classId) params.set("classId", classId);
  const query = params.toString();
  return useAdminCollection<Record<string, unknown>>(
    `admin:rotation-schedules:${query}`,
    `/rotation-schedules?${query}`,
    "schedules",
    ["rotation-schedules"],
    enabled,
  );
};

export const useAdminActivePhasePosting = (
  classId: string | null | undefined,
  enabled = true,
) =>
  useAdminResource<Record<string, unknown> | null>(
    `admin:active-phase-posting:${classId ?? "none"}`,
    async () => {
      if (!classId) return null;
      const { data } = await api.get(`/rotation-schedules/class/${classId}/active-phase`);
      return data as Record<string, unknown>;
    },
    ["rotation-schedules", "academic-clocks", "classes", "courses"],
    enabled && Boolean(classId),
    30_000,
  );

export const useAdminTimetable = (classId: string | null | undefined, enabled = true) =>
  useAdminResource<Record<string, unknown> | null>(
    `admin:timetable:${classId ?? "none"}`,
    async () => {
      if (!classId) return null;
      const { data } = await api.get(`/timetables/${classId}`);
      return data as Record<string, unknown>;
    },
    ["timetables", "academic-clocks", "classes"],
    enabled && Boolean(classId),
  );

export const useAdminRotationEvents = (
  classId: string | null | undefined,
  start: Date | null,
  end: Date | null,
  enabled = true,
) => {
  const params = new URLSearchParams();
  if (classId) params.set("classId", classId);
  if (start) params.set("start", start.toISOString());
  if (end) params.set("end", end.toISOString());
  const query = params.toString();
  return useAdminCollection<Record<string, unknown>>(
    `admin:rotation-events:${query}`,
    `/rotation-schedules/events?${query}`,
    "events",
    ["rotation-schedules"],
    enabled && Boolean(classId && start && end),
  );
};
