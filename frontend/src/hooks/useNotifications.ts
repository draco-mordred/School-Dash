import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Notification } from "@/types";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(page = 1, limit = 20): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get("/notifications", { params: { page, limit } });
      setNotifications(data.notifications ?? []);
      setTotal(data.total ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnreadCount(data.count ?? 0);
    } catch {
      // silently fail — badge is not critical
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => {
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        try {
          window.dispatchEvent(new CustomEvent("notifications:read-all"));
        } catch {}
      }
      try {
        window.dispatchEvent(new CustomEvent("notifications:changed", { detail: { count: next } }));
      } catch {}
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      window.dispatchEvent(new CustomEvent("notifications:read-all"));
    } catch {}
  }, []);

  // Broadcast a global event when all notifications are marked read so other
  // hook instances (e.g., the AppShell) can update their local state.
  useEffect(() => {
    // patch markAllAsRead to dispatch the event after updating the server
    const original = markAllAsRead;
    async function wrappedMarkAll() {
      await original();
      try {
        window.dispatchEvent(new CustomEvent("notifications:read-all"));
      } catch {
        // ignore — event dispatch is best-effort for cross-instance sync
        
      }
    }

    // replace by mutation — consumers call the function reference returned
    // from this hook, so we cannot easily replace it here. Instead we listen
    // for the event below to react to external dispatches.
    return () => {
      // no-op cleanup
    };
  }, [markAllAsRead]);

  // Listen for global "notifications:read-all" events so separate hook
  // instances stay in sync when another component marks notifications read.
  useEffect(() => {
    const onReadAll = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    };
    window.addEventListener("notifications:read-all", onReadAll);
    const onChanged = (e: any) => {
      const c = e?.detail?.count ?? null;
      if (typeof c === "number") setUnreadCount(c);
    };
    window.addEventListener("notifications:changed", onChanged as EventListener);
    return () => {
      window.removeEventListener("notifications:read-all", onReadAll);
      window.removeEventListener("notifications:changed", onChanged as EventListener);
    };
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => {
      const deleted = prev.find((n) => n._id === id);
      if (deleted && !deleted.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n._id !== id);
    });
  }, []);

  useEffect(() => {
    void fetchNotifications();
    void fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Subscribe to server-sent events for real-time notifications
  const { user } = useAuth();
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${api.defaults.baseURL || '/api'}/notifications/stream`);
      es.addEventListener('notification', (ev: any) => {
        try {
          const n = JSON.parse(ev.data);
          setNotifications((prev) => [n, ...(prev || [])].slice(0, 100));
          // increment unread count if relevant
          if (user && String(n.userId) === String(user._id)) {
            setUnreadCount((c) => c + 1);
            try { window.dispatchEvent(new CustomEvent('notifications:changed', { detail: { count: (unreadCount + 1) } })); } catch {}
          }
        } catch (err) {
          console.error('Failed to parse SSE notification', err);
        }
      });
      es.onerror = (e) => {
        // reconnect logic is left to the browser EventSource implementation
        // console.log('SSE error', e);
      };
    } catch (err) {
      // EventSource may not be available in some environments
      // ignore
    }
    return () => {
      if (es) es.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    total,
    page,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    // refetch both the list and the unread count
    refetch: useCallback(async () => {
      await Promise.all([fetchNotifications(), fetchUnreadCount()]);
    }, [fetchNotifications, fetchUnreadCount]),
  };
}
