import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  createActivityNotification,
  getPendingNotifications,
  getDueNotifications,
  updateNotificationStatus,
  deleteActivityNotification,
  getPendingNotificationCount,
} from "../controllers/activityNotification";

const router = Router();

/**
 * POST /activity-notifications
 * Create an activity notification
 * Body: { userId, activityId, activityType, activityTitle, classId?, instructorId?, location?, scheduledTime, leadTimeMinutes, message }
 */
router.post("/", createActivityNotification);

/**
 * GET /activity-notifications/pending/:userId
 * Get all pending notifications for a user
 */
router.get("/pending/:userId", protect, getPendingNotifications);

/**
 * GET /activity-notifications/due/:userId
 * Get notifications that are due to be sent (notificationTime <= now)
 */
router.get("/due/:userId", protect, getDueNotifications);

/**
 * GET /activity-notifications/count/:userId
 * Get count of pending notifications for a user
 */
router.get("/count/:userId", protect, getPendingNotificationCount);

/**
 * PATCH /activity-notifications/:id
 * Update notification status
 * Body: { status: "pending" | "sent" | "dismissed", browserNotificationSent?: boolean }
 */
router.patch("/:id", protect, updateNotificationStatus);

/**
 * DELETE /activity-notifications/:id
 * Delete a notification
 */
router.delete("/:id", protect, deleteActivityNotification);

export default router;
