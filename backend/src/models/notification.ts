import mongoose, { Schema, type Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  role: "admin" | "teacher" | "student" | "parent" | "unitconsultant" | "unitresident";
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error" | "attendance" | "timetable" | "system";
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: ["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "warning", "success", "error", "attendance", "timetable", "system"],
      default: "info",
    },
    actorName: { type: String, index: true },
    actorRole: {
      type: String,
      enum: ["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"],
      index: true,
    },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Compound index for efficient per-user unread queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
