import { api } from "@/lib/api";

export type NotificationType = "lecture" | "clinical" | "tutorial" | "duty" | "call";

export interface ActivityNotification {
  id: string;
  userId: string;
  activityId: string;
  activityType: NotificationType;
  activityTitle: string;
  scheduledTime: Date;
  notificationTime: Date;
  status: "pending" | "sent" | "dismissed";
  message: string;
  createdAt: Date;
}

export interface ScheduledActivity {
  id: string;
  title: string;
  type: NotificationType;
  startTime: Date;
  endTime: Date;
  classId?: string;
  instructorId?: string;
  location?: string;
}

// Notification lead times (in minutes)
const NOTIFICATION_LEAD_TIMES: Record<NotificationType, number> = {
  lecture: 15,
  clinical: 20,
  tutorial: 20,
  duty: 20,
  call: 20,
};

/**
 * Calculate when notification should be sent based on activity type
 */
export function calculateNotificationTime(activityStart: Date, type: NotificationType): Date {
  const leadTime = NOTIFICATION_LEAD_TIMES[type] || 15;
  const notificationTime = new Date(activityStart);
  notificationTime.setMinutes(notificationTime.getMinutes() - leadTime);
  return notificationTime;
}

/**
 * Send browser notification (if permitted)
 */
export async function sendBrowserNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notifications");
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, options);
  } else if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification(title, options);
    }
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Get notification status
 */
export function getNotificationStatus(): NotificationPermission | null {
  if (!("Notification" in window)) {
    return null;
  }
  return Notification.permission;
}

/**
 * Create notification record in database
 */
export async function createNotificationRecord(
  userId: string,
  activity: ScheduledActivity,
  notificationTime: Date
): Promise<ActivityNotification | null> {
  try {
    const leadTime = NOTIFICATION_LEAD_TIMES[activity.type] || 15;
    const response = await api.post("/activity-notifications", {
      userId,
      activityId: activity.id,
      activityType: activity.type,
      activityTitle: activity.title,
      scheduledTime: activity.startTime.toISOString(),
      notificationTime: notificationTime.toISOString(),
      leadTimeMinutes: leadTime,
      message: `Reminder: ${activity.title} starts in ${leadTime} minutes`,
    });

    return response.data?.notification || null;
  } catch (err) {
    console.error("Failed to create notification record:", err);
    return null;
  }
}

/**
 * Fetch pending notifications for user
 */
export async function getPendingNotifications(userId: string): Promise<ActivityNotification[]> {
  try {
    const response = await api.get(`/activity-notifications/pending/${userId}`);
    return Array.isArray(response.data?.notifications) ? response.data.notifications : [];
  } catch (err) {
    console.error("Failed to fetch pending notifications:", err);
    return [];
  }
}

/**
 * Mark notification as sent
 */
export async function markNotificationSent(notificationId: string): Promise<boolean> {
  try {
    await api.patch(`/activity-notifications/${notificationId}`, { status: "sent" });
    return true;
  } catch (err) {
    console.error("Failed to mark notification as sent:", err);
    return false;
  }
}

/**
 * Dismiss notification
 */
export async function dismissNotification(notificationId: string): Promise<boolean> {
  try {
    await api.patch(`/activity-notifications/${notificationId}`, { status: "dismissed" });
    return true;
  } catch (err) {
    console.error("Failed to dismiss notification:", err);
    return false;
  }
}

/**
 * Check and send due notifications
 */
export async function checkAndSendDueNotifications(userId: string): Promise<ActivityNotification[]> {
  try {
    const now = new Date();
    const pending = await getPendingNotifications(userId);

    const dueNotifications = pending.filter((notif) => {
      const notifTime = new Date(notif.notificationTime);
      return notifTime <= now && notif.status === "pending";
    });

    for (const notif of dueNotifications) {
      const leadTime = NOTIFICATION_LEAD_TIMES[notif.activityType] || 15;
      await sendBrowserNotification(`${notif.activityTitle} Reminder`, {
        body: `Your ${notif.activityType} starts in ${leadTime} minutes`,
        tag: notif.id,
        requireInteraction: false,
      });

      await markNotificationSent(notif.id);
    }

    return dueNotifications;
  } catch (err) {
    console.error("Failed to check and send notifications:", err);
    return [];
  }
}
