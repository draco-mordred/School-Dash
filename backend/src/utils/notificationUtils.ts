import mongoose from "mongoose";
import { Notification } from "../models/notification";

export type NotificationRole = "admin" | "teacher" | "student" | "parent" | "unitconsultant" | "unitresident";
export type NotificationType = "info" | "warning" | "success" | "error" | "attendance" | "timetable" | "system";

export interface CreateNotificationPayload {
  userId: mongoose.Types.ObjectId;
  role: NotificationRole;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
  actorName?: string;
  actorRole?: NotificationRole;
}

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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

export const createNotificationIfUnique = async (payload: CreateNotificationPayload) => {
  const now = new Date();
  const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_MS);
  const search = {
    userId: payload.userId,
    title: payload.title,
    message: payload.message,
    type: payload.type ?? "system",
    createdAt: { $gte: duplicateSince },
  } as any;

  const existing = await Notification.findOne(search);
  if (existing) {
    return existing;
  }

  return Notification.create({
    userId: payload.userId,
    role: payload.role,
    title: payload.title,
    message: payload.message,
    type: payload.type ?? "system",
    isRead: false,
    link: payload.link,
    metadata: payload.metadata,
    actorName: payload.actorName,
    actorRole: payload.actorRole,
  });
};
