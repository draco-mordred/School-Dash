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

// Content normalizer for near-duplicate detection: collapses the volatile
// parts of a notification — embedded dates, times, counts — so a recurring
// job that embeds a changing timestamp or count cannot evade the
// exact-content dedupe below. "Session starts at 10:00" and "Session starts
// at 10:05" normalize to the same key.
export const normalizeNotificationContent = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/[^a-z#]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export const createNotificationIfUnique = async (payload: CreateNotificationPayload) => {
  // Three-tier dedupe — applies to EVERY notification type, content, and
  // user, i.e. students, teachers, staff, and admins alike:
  //
  // Tier 1 — signature dedupe: callers that tag notifications with a stable
  // metadata.dedupeKey keep at most ONE notification per user per key.
  // Tier 2 — exact-content dedupe: remove ALL existing notifications for
  // this user with the same title + message, regardless of age.
  // Tier 3 — near-content dedupe within a 24h window: recurring jobs that
  // embed a changing date/time/count in the title or message used to bypass
  // the exact tier and flood the feed; the normalized match removes those
  // near-dupes. Bounded to 24h so genuinely new events on later days are
  // kept. Skipped when the sender marks metadata.repeatAllowed — deliberate
  // recurring reminders keep their cadence.
  const allowRepeats = payload.metadata?.repeatAllowed === true;
  const dedupeKey = payload.metadata?.dedupeKey ? String(payload.metadata.dedupeKey) : null;
  if (dedupeKey) {
    await Notification.deleteMany({
      userId: payload.userId,
      "metadata.dedupeKey": dedupeKey,
    });
  }

  await Notification.deleteMany({
    userId: payload.userId,
    title: payload.title,
    message: payload.message,
  });

  if (!allowRepeats) {
    const normalizedTitle = normalizeNotificationContent(payload.title);
    const normalizedMessage = normalizeNotificationContent(payload.message);
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await Notification.find({
      userId: payload.userId,
      createdAt: { $gte: recentCutoff },
    })
      .select("_id title message")
      .lean();
    const staleIds = (recent as any[])
      .filter(
        (n: any) =>
          normalizeNotificationContent(n.title) === normalizedTitle &&
          normalizeNotificationContent(n.message) === normalizedMessage,
      )
      .map((n: any) => n._id);
    if (staleIds.length > 0) {
      await Notification.deleteMany({ _id: { $in: staleIds } });
    }
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
