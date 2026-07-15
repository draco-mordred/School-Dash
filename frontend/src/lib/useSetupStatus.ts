import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useSetupStatus() {
  const [isSetupConfigured, setIsSetupConfigured] = useState<boolean | null>(null);
  const [isSetupStatusLoading, setIsSetupStatusLoading] = useState(true);

  const refreshSetupStatus = useCallback(async () => {
    setIsSetupStatusLoading(true);
    try {
      const response = await api.get("/setup/status");
      setIsSetupConfigured(Boolean(response.data?.configured));
    } catch {
      setIsSetupConfigured(false);
    } finally {
      setIsSetupStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSetupStatus();
  }, [refreshSetupStatus]);

  return { isSetupConfigured, isSetupStatusLoading, refreshSetupStatus };
}
