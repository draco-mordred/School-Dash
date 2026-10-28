import { Notification } from "../models/notification";
export const createNotificationIfUnique = async (payload) => {
    // Exact-content dedupe: remove ALL existing notifications for this user
    // with the same title + message (regardless of age), then create a fresh
    // one. One notification per content per user — recurring jobs (ticks,
    // nudges, syncs) can no longer pile up duplicates.
    await Notification.deleteMany({
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
    });
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
