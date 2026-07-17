import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useInstitution() {
  const [institution, setInstitution] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const CACHE_KEY = "mordred_institution";
  const CACHE_TS_KEY = "mordred_institution_ts";
  const TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

  const refreshInstitution = useCallback(async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const cachedTs = Number(localStorage.getItem(CACHE_TS_KEY) || "0");
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached && Date.now() - cachedTs < TTL_MS) {
          try {
            const parsed = JSON.parse(cached);
            // If parsed is a non-null institution object, use it. If it's explicitly null, treat as a cache miss.
            if (parsed !== null) {
              setInstitution(parsed);
              setLoading(false);
              return;
            }
          } catch {
            // ignore parse errors and continue to fetch
          }
        }
      }

      const res = await api.get("/setup/status");
      const data = res.data?.institution ?? null;
      setInstitution(data);
      try {
        if (data) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        } else {
          // remove cached nulls so we don't short-circuit future fetches
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_TS_KEY);
        }
      } catch (e) {
        // ignore storage errors
      }
    } catch (err) {
      // fallback to cached or alternative portal caches
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setInstitution(parsed ?? null);
          setLoading(false);
          return;
        } catch {
          // continue to alt caches
        }
      }

      const altKeys = [
        "adminPortalInstitutionCache",
        "staffPortalInstitutionCache",
        "studentPortalInstitutionCache",
        "teacherPortalInstitutionCache",
      ];
      for (const k of altKeys) {
        const v = localStorage.getItem(k);
        if (v) {
          try {
            const parsed = JSON.parse(v);
            if (parsed) {
              setInstitution(parsed as any);
              setLoading(false);
              return;
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      setInstitution(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshInstitution();
  }, [refreshInstitution]);

  return { institution, loading, refreshInstitution };
}
