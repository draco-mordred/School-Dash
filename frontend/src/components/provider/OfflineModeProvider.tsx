import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  readOfflineMutationQueue,
  removeOfflineMutationFromQueue,
  clearOfflineMutationQueue,
} from "@/lib/offlineMode";

interface OfflineModeContextValue {
  isOnline: boolean;
}

type NetworkNotice = {
  status: "offline" | "online";
  id: number;
};

const OfflineModeContext = createContext<OfflineModeContextValue>({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
});

const NETWORK_NOTICE_DURATION_MS = 2800;

const replayOfflineMutations = async () => {
  const queue = readOfflineMutationQueue();

  if (queue.length === 0) {
    return;
  }

  for (const entry of queue) {
    try {
      await api.request({
        url: entry.url,
        method: entry.method ?? "post",
        params: entry.params,
        data: entry.data,
        headers: entry.headers,
      });

      if (typeof entry.queuedAt === "number") {
        removeOfflineMutationFromQueue(entry.queuedAt);
      }
    } catch {
      break;
    }
  }

  const remainingQueue = readOfflineMutationQueue();
  if (remainingQueue.length === 0) {
    toast.success("Offline changes synchronized.");
    clearOfflineMutationQueue();
  }
};

export const OfflineModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [networkNotice, setNetworkNotice] = useState<NetworkNotice | null>(() =>
    typeof navigator !== "undefined" && !navigator.onLine
      ? { status: "offline", id: 0 }
      : null,
  );
  const noticeId = useRef(0);

  useEffect(() => {
    const handleOnlineStatus = () => {
      const nextOnlineState = navigator.onLine;
      setIsOnline(nextOnlineState);
      setNetworkNotice({
        status: nextOnlineState ? "online" : "offline",
        id: ++noticeId.current,
      });

      if (nextOnlineState) {
        void replayOfflineMutations();
      }
    };

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!networkNotice) return;
    const timeout = window.setTimeout(
      () => setNetworkNotice((current) => current?.id === networkNotice.id ? null : current),
      NETWORK_NOTICE_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [networkNotice]);

  const value = useMemo(() => ({ isOnline }), [isOnline]);

  return (
    <OfflineModeContext.Provider value={value}>
      <div className="pointer-events-none fixed right-0 top-4 z-[100] flex justify-end overflow-hidden px-4">
        {networkNotice && (
          <div
            key={networkNotice.id}
            role="status"
            aria-live="polite"
            className={`network-status-notice flex items-center gap-3 rounded-full border bg-background/95 px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
              networkNotice.status === "offline"
                ? "border-destructive/40 text-destructive"
                : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {networkNotice.status === "offline" ? (
              <WifiOff className="network-status-icon h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <Wifi className="network-status-icon h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {networkNotice.status === "offline"
                ? "Connection lost"
                : "Connection restored"}
            </span>
          </div>
        )}
      </div>
      {children}
    </OfflineModeContext.Provider>
  );
};

export const useOfflineMode = () => useContext(OfflineModeContext);
