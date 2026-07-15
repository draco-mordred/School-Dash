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
          setInstitution(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }

      const res = await api.get("/institution");
      const data = res.data || null;
      setInstitution(data);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch (e) {
        // ignore storage errors
      }
    } catch (err) {
      // fallback to cached
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setInstitution(JSON.parse(cached));
      else setInstitution(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshInstitution();
  }, [refreshInstitution]);

  return { institution, loading, refreshInstitution };
}
