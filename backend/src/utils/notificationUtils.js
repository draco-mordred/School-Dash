import { Notification } from "../models/notification";
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const createNotificationIfUnique = async (payload) => {
    const now = new Date();
    const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_MS);
    const search = {
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type ?? "system",
        createdAt: { $gte: duplicateSince },
    };
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
