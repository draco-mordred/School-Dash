import { Request, Response } from "express";
import { ActivityNotification } from "../models/activityNotification";
import { Notification } from "../models/notification";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: any;
}

/**
 * POST /activity-notifications
 * Create an activity notification reminder
 */
export const createActivityNotification = async (req: AuthRequest, res: Response) => {
  try {
    const {
      userId,
      activityId,
      activityType,
      activityTitle,
      classId,
      instructorId,
      location,
      scheduledTime,
      leadTimeMinutes,
      message,
    } = req.body;

    // Validate required fields
    if (!userId || !activityId || !activityType || !activityTitle || !scheduledTime || leadTimeMinutes === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate activityType
    const validTypes = ["lecture", "clinical", "tutorial", "duty", "call", "posting"];
    if (!validTypes.includes(activityType)) {
      return res.status(400).json({ error: `Invalid activityType. Must be one of: ${validTypes.join(", ")}` });
    }

    // Calculate notification time
    const scheduledDate = new Date(scheduledTime);
    const notificationTime = new Date(scheduledDate.getTime() - leadTimeMinutes * 60000);

    // Create the activity notification
    const activityNotification = await ActivityNotification.create({
      userId: new mongoose.Types.ObjectId(userId),
      activityId,
      activityType,
      activityTitle,
      classId,
      instructorId: instructorId ? new mongoose.Types.ObjectId(instructorId) : undefined,
      location,
      scheduledTime: scheduledDate,
      notificationTime,
      leadTimeMinutes,
      message,
      status: "pending",
      browserNotificationSent: false,
    });

    res.status(201).json({
      success: true,
      notification: activityNotification.toObject(),
    });
  } catch (err) {
    console.error("POST /activity-notifications error:", err);
    res.status(500).json({ error: "Failed to create activity notification" });
  }
};

/**
 * GET /activity-notifications/pending/:userId
 * Get all pending activity notifications for a user
 */
export const getPendingNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify user is authorized to view these notifications
    if (req.user && String(req.user._id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const notifications = await ActivityNotification.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: "pending",
    })
      .sort({ notificationTime: 1 })
      .lean();

    res.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (err) {
    console.error("GET /activity-notifications/pending/:userId error:", err);
    res.status(500).json({ error: "Failed to fetch pending notifications" });
  }
};

/**
 * GET /activity-notifications/due/:userId
 * Get notifications that are due to be sent (current time >= notificationTime and status === pending)
 */
export const getDueNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    // Verify user is authorized
    if (req.user && String(req.user._id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const notifications = await ActivityNotification.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: "pending",
      notificationTime: { $lte: now },
    })
      .sort({ notificationTime: 1 })
      .lean();

    res.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (err) {
    console.error("GET /activity-notifications/due/:userId error:", err);
    res.status(500).json({ error: "Failed to fetch due notifications" });
  }
};

/**
 * PATCH /activity-notifications/:id
 * Update notification status (mark as sent, dismissed, etc.)
 */
export const updateNotificationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, browserNotificationSent } = req.body;

    // Validate status
    const validStatuses = ["pending", "sent", "dismissed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const updateData: any = { status };
    if (browserNotificationSent !== undefined) {
      updateData.browserNotificationSent = browserNotificationSent;
    }

    const updated = await ActivityNotification.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
    });

    if (!updated) {
      return res.status(404).json({ error: "Activity notification not found" });
    }

    res.json({
      success: true,
      notification: updated.toObject(),
    });
  } catch (err) {
    console.error("PATCH /activity-notifications/:id error:", err);
    res.status(500).json({ error: "Failed to update activity notification" });
  }
};

/**
 * DELETE /activity-notifications/:id
 * Delete an activity notification
 */
export const deleteActivityNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await ActivityNotification.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Activity notification not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /activity-notifications/:id error:", err);
    res.status(500).json({ error: "Failed to delete activity notification" });
  }
};

/**
 * GET /activity-notifications/count/:userId
 * Get count of pending notifications for a user
 */
export const getPendingNotificationCount = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify user is authorized
    if (req.user && String(req.user._id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const count = await ActivityNotification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: "pending",
    });

    res.json({
      success: true,
      count,
    });
  } catch (err) {
    console.error("GET /activity-notifications/count/:userId error:", err);
    res.status(500).json({ error: "Failed to fetch notification count" });
  }
};
