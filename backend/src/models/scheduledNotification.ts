import mongoose, { Schema } from "mongoose";

const ScheduledNotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    sendAt: { type: Date, required: true },
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("ScheduledNotification", ScheduledNotificationSchema);
