import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useSetupStatus() {
  const [isSetupConfigured, setIsSetupConfigured] = useState<boolean | null>(null);
  const [isSetupStatusLoading, setIsSetupStatusLoading] = useState(true);

  const CACHE_KEY = "mordred_setup_configured";
  const CACHE_TS_KEY = "mordred_setup_configured_ts";
  const TTL_MS = 1000 * 60 * 5; // 5 minutes

  const refreshSetupStatus = useCallback(async (force = false) => {
    setIsSetupStatusLoading(true);

    try {
      if (!force) {
        const cachedTs = Number(localStorage.getItem(CACHE_TS_KEY) || "0");
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached && Date.now() - cachedTs < TTL_MS) {
          setIsSetupConfigured(cached === "true");
          setIsSetupStatusLoading(false);
          return;
        }
      }

      const response = await api.get("/setup/status");
      const configured = Boolean(response.data?.configured);
      setIsSetupConfigured(configured);
      try {
        localStorage.setItem(CACHE_KEY, configured ? "true" : "false");
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch (e) {
        // ignore storage errors
      }
    } catch (err) {
      // fallback to cached value if available
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached != null) setIsSetupConfigured(cached === "true");
      else setIsSetupConfigured(false);
    } finally {
      setIsSetupStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSetupStatus();
  }, [refreshSetupStatus]);

  return { isSetupConfigured, isSetupStatusLoading, refreshSetupStatus };
}
