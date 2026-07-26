import { useEffect, useState } from "react";
import { X, Bell } from "lucide-react";
import type { ActivityNotification } from "@/lib/notifications";

interface NotificationToastProps {
  notification: ActivityNotification;
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss(notification.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in">
      <div className="rounded-lg border border-border bg-card shadow-lg p-4 max-w-sm space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">{notification.activityTitle}</p>
              <p className="text-xs text-muted-foreground">{notification.message}</p>
            </div>
          </div>
          <button
            onClick={() => onDismiss(notification.id)}
            className="rounded-md p-1 hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface NotificationContainerProps {
  notifications: ActivityNotification[];
  onDismiss: (id: string) => void;
}

/**
 * Container for displaying multiple notification toasts
 */
export function NotificationContainer({ notifications, onDismiss }: NotificationContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notif) => (
        <div key={notif.id} className="pointer-events-auto">
          <NotificationToast notification={notif} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
