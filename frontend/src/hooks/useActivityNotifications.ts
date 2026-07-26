import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import {
  checkAndSendDueNotifications,
  getPendingNotifications,
  requestNotificationPermission,
  type ActivityNotification,
} from "@/lib/notifications";

interface UseActivityNotificationsOptions {
  autoRequest?: boolean;
  checkInterval?: number; // milliseconds
  enabled?: boolean;
}

/**
 * Hook for managing activity notifications and reminders
 * Periodically checks for and sends due notifications (lectures, clinical, etc)
 */
export function useActivityNotifications(options: UseActivityNotificationsOptions = {}) {
  const { autoRequest = true, checkInterval = 60000, enabled = true } = options;
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [isPermitted, setIsPermitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const checkIntervalRef = useRef<number | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (!enabled || !autoRequest) return;

    const requestPermission = async () => {
      const permitted = await requestNotificationPermission();
      setIsPermitted(permitted);
    };

    requestPermission();
  }, [enabled, autoRequest]);

  // Fetch initial pending notifications
  useEffect(() => {
    if (!enabled || !user) return;

    const fetchPending = async () => {
      setIsLoading(true);
      try {
        const pending = await getPendingNotifications(user.id);
        setNotifications(pending);
      } catch (err) {
        console.error("Failed to fetch pending notifications:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPending();
  }, [enabled, user]);

  // Set up periodic check for due notifications
  useEffect(() => {
    if (!enabled || !user || !isPermitted) return;

    const checkNotifications = async () => {
      const dueNotifications = await checkAndSendDueNotifications(user.id);
      if (dueNotifications.length > 0) {
        // Update state to reflect sent notifications
        const pending = await getPendingNotifications(user.id);
        setNotifications(pending);
      }
    };

    checkIntervalRef.current = window.setInterval(checkNotifications, checkInterval);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [enabled, user, isPermitted, checkInterval]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return {
    notifications,
    isPermitted,
    isLoading,
    pendingCount: notifications.filter((n) => n.status === "pending").length,
  };
}
