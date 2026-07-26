import mongoose, { Schema, type Document } from "mongoose";

export interface IActivityNotification extends Document {
  userId: mongoose.Types.ObjectId;
  activityId: string;
  activityType: "lecture" | "clinical" | "tutorial" | "duty" | "call" | "posting";
  activityTitle: string;
  classId?: string;
  instructorId?: string;
  location?: string;
  scheduledTime: Date; // When the activity starts
  notificationTime: Date; // When to notify the user (scheduledTime - leadTime)
  leadTimeMinutes: number; // 15 for lectures, 20 for others
  message: string;
  status: "pending" | "sent" | "dismissed"; // pending = not yet notified, sent = notification sent, dismissed = user dismissed it
  browserNotificationSent: boolean; // Whether browser notification was sent
  databaseNotificationId?: mongoose.Types.ObjectId; // Reference to general notification if created
  createdAt: Date;
  updatedAt: Date;
}

const ActivityNotificationSchema = new Schema<IActivityNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    activityId: { type: String, required: true },
    activityType: {
      type: String,
      enum: ["lecture", "clinical", "tutorial", "duty", "call", "posting"],
      required: true,
      index: true,
    },
    activityTitle: { type: String, required: true },
    classId: { type: String },
    instructorId: { type: Schema.Types.ObjectId, ref: "User" },
    location: { type: String },
    scheduledTime: { type: Date, required: true, index: true },
    notificationTime: { type: Date, required: true, index: true },
    leadTimeMinutes: { type: Number, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "dismissed"],
      default: "pending",
      index: true,
    },
    browserNotificationSent: { type: Boolean, default: false },
    databaseNotificationId: { type: Schema.Types.ObjectId, ref: "Notification" },
  },
  { timestamps: true }
);

// Compound index for efficient per-user pending queries
ActivityNotificationSchema.index({ userId: 1, status: 1, notificationTime: 1 });

// Index for finding notifications that are due to be sent (status=pending and notificationTime <= now)
ActivityNotificationSchema.index({ status: 1, notificationTime: 1 });

export const ActivityNotification = mongoose.model<IActivityNotification>(
  "ActivityNotification",
  ActivityNotificationSchema
);
