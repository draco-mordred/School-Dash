import { Router } from "express";
import { protect } from "../middleware/auth";
import { Notification } from "../models/notification";
import { addSSEClient } from "../utils/sse";
// import { User } from "../models/user";

const router = Router();

// GET /notifications — get paginated notifications for current user
router.get("/", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: user._id }),
    ]);

    res.json({ notifications, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// GET /notifications/unread-count — count unread for current user
router.get("/unread-count", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const count = await Notification.countDocuments({ userId: user._id, isRead: false });
    res.json({ count });
  } catch (err) {
    console.error("GET /notifications/unread-count error:", err);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// GET /notifications/system — recent notifications across the system
router.get("/system", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit)) || 100));

    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Deduplicate by a key composed of type + createdAt ISO string
    const seen = new Map<string, any>();
    for (const n of notifications) {
      const key = `${n.type}:${new Date(n.createdAt).toISOString()}`;
      if (!seen.has(key)) {
        seen.set(key, n);
      }
    }

    const deduped = Array.from(seen.values()).map((n: any) => ({
      ...n,
      unreadForUser: String(n.userId) === String(user._id) && n.isRead === false,
    }));

    res.json({ notifications: deduped });
  } catch (err) {
    console.error("GET /notifications/system error:", err);
    res.status(500).json({ error: "Failed to fetch system notifications" });
  }
});

// PATCH /notifications/:id/read — mark a single notification as read
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: user._id },
      { isRead: true },
      // { new: true }
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ error: "Notification not found" });
    res.json({ notification: updated });
  } catch (err) {
    console.error("PATCH /notifications/:id/read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// PATCH /notifications/read-all — mark all as read for current user
router.patch("/read-all", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await Notification.updateMany({ userId: user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /notifications/read-all error:", err);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// DELETE /notifications/:id — delete a notification
router.delete("/:id", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    // Admins may delete any notification (system-wide); regular users only their own
    let deleted;
    if (user.role === "admin" || user.role === "teacher") {
      deleted = await Notification.findOneAndDelete({ _id: req.params.id });
    } else {
      deleted = await Notification.findOneAndDelete({ _id: req.params.id, userId: user._id });
    }

    if (!deleted) return res.status(404).json({ error: "Notification not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /notifications/:id error:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// GET /notifications/stream — Server-Sent Events stream for notifications
router.get('/stream', protect, async (req, res) => {
  try {
    addSSEClient(req, res);
    // Keep the connection open — addSSEClient handles initial handshake
  } catch (err) {
    console.error('Failed to add SSE client', err);
    try { res.status(500).end(); } catch {}
  }
});

export default router;

