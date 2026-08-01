import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

const OfflineModeContext = createContext<OfflineModeContextValue>({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
});

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
    toast.success("Connection restored. Offline changes have been synchronized.");
    clearOfflineMutationQueue();
  }
};

export const OfflineModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const hasShownOfflineToast = useRef(false);
  const hasShownOnlineToast = useRef(false);

  useEffect(() => {
    const handleOnlineStatus = () => {
      const nextOnlineState = navigator.onLine;
      setIsOnline(nextOnlineState);

      if (nextOnlineState) {
        hasShownOfflineToast.current = false;
        if (!hasShownOnlineToast.current) {
          hasShownOnlineToast.current = true;
          void replayOfflineMutations();
          toast.success("Internet connection restored.");
        }
      } else {
        hasShownOnlineToast.current = false;
        if (!hasShownOfflineToast.current) {
          hasShownOfflineToast.current = true;
          toast.error("Internet connection lost.");
        }
      }
    };

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);

  return (
    <OfflineModeContext.Provider value={value}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-4">
        {!isOnline && (
          <div className="rounded-full border border-destructive/40 bg-background/95 px-4 py-2 text-sm font-medium text-destructive shadow-lg backdrop-blur-sm">
            Internet connection lost
          </div>
        )}
      </div>
      {children}
    </OfflineModeContext.Provider>
  );
};

export const useOfflineMode = () => useContext(OfflineModeContext);
