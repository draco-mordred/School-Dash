import mongoose from "mongoose";
import { Notification } from "../../models/notification";
import User from "../../models/user";
import { emitSystemEvent } from "../../events";
import { createNotificationIfUnique as createUniqueNotification } from "../../utils/notificationUtils";

export type NotificationRole = "admin" | "teacher" | "student" | "parent" | "unitconsultant" | "unitresident";
export type NotificationType = "info" | "warning" | "success" | "error" | "attendance" | "timetable" | "system";

export interface CreateNotificationPayload {
  userId: mongoose.Types.ObjectId;
  role: NotificationRole;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: Record<string, unknown>;
  actorName?: string;
  actorRole?: NotificationRole;
}

export const formatNotificationForRole = (notification: any, role: NotificationRole | string) => {
  const baseNotification = {
    ...(notification ?? {}),
    title: notification?.title ?? "A new update is ready for you",
    message: notification?.message ?? "A new update is available for your student account.",
    type: notification?.type ?? "info",
  };

  if (role !== "student") {
    return baseNotification;
  }

  const combinedText = `${baseNotification.title} ${baseNotification.message}`.toLowerCase();

  if (baseNotification.type === "attendance" || combinedText.includes("attendance")) {
    return {
      ...baseNotification,
      title: "Your attendance update is ready",
      message: baseNotification.message?.trim()
        ? `Your attendance record has been updated: ${baseNotification.message}`
        : "Your attendance record has been updated. Please review it in your student portal.",
      type: "info",
    };
  }

  if (baseNotification.type === "timetable" || combinedText.includes("timetable")) {
    return {
      ...baseNotification,
      title: "Your timetable has been updated",
      message: baseNotification.message?.trim()
        ? `Your timetable has been updated: ${baseNotification.message}`
        : "Your timetable has been updated. Please review it in your student portal.",
      type: "info",
    };
  }

  if (combinedText.includes("class") || combinedText.includes("academic year") || combinedText.includes("academic-year")) {
    return {
      ...baseNotification,
      title: "Your class details have been updated",
      message: baseNotification.message?.trim()
        ? `Your class information has changed: ${baseNotification.message}`
        : "Your class information has changed. Please review the latest details.",
      type: "info",
    };
  }

  if (combinedText.includes("assignment") || combinedText.includes("posting") || combinedText.includes("rotation")) {
    return {
      ...baseNotification,
      title: "A new update is ready for you",
      message: baseNotification.message?.trim()
        ? `There is a new update for your studies: ${baseNotification.message}`
        : "There is a new update for your studies. Please check your student portal.",
      type: "info",
    };
  }

  return {
    ...baseNotification,
    title: baseNotification.title?.trim() ? baseNotification.title : "A new update is ready for you",
    message: baseNotification.message?.trim()
      ? baseNotification.message
      : "A new update is available for your student account.",
    type: "info",
  };
};

// Delegates to the shared utils implementation so the dedupe behavior —
// signature plus exact plus near-content, for ALL types, content, and
// users — can never drift between the two modules.
export const createNotificationIfUnique = async (payload: CreateNotificationPayload) =>
  createUniqueNotification(payload as any);

export const createNotificationAndEmitEvent = async (payload: CreateNotificationPayload) => {
  const notification = await createNotificationIfUnique(payload);

  emitSystemEvent("notification.created", {
    notificationId: notification._id.toString(),
    userId: payload.userId.toString(),
    role: payload.role,
    type: payload.type ?? "system",
    title: payload.title,
  });

  return notification;
};

export interface CreateSystemAlertPayload {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: Record<string, unknown>;
  actorName?: string;
  actorRole?: NotificationRole;
  roles?: NotificationRole[];
}

export const createSystemAlertForAdmins = async (payload: CreateSystemAlertPayload) => {
  const roles = Array.isArray(payload.roles) && payload.roles.length > 0 ? payload.roles : ["admin"];
  const users = await User.find({ role: { $in: roles as any }, isActive: true } as any).select("_id role").lean();
  if (!users || users.length === 0) return [];

  const notifications = await Promise.all(
    users.map((user) =>
      createNotificationAndEmitEvent({
        userId: user._id,
        role: (user.role as NotificationRole) || "admin",
        title: payload.title,
        message: payload.message,
        type: payload.type ?? "warning",
        link: payload.link,
        metadata: payload.metadata,
        actorName: payload.actorName,
        actorRole: payload.actorRole,
      })
    )
  );

  return notifications;
};
