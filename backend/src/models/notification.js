import mongoose, { Schema } from "mongoose";
const NotificationSchema = new Schema({
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
}, { timestamps: true });
// Compound index for efficient per-user unread queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
export const Notification = mongoose.model("Notification", NotificationSchema);
