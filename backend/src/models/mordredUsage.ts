import mongoose, { Schema, Document } from "mongoose";

export interface IMordredUsage extends Document {
  user: mongoose.Types.ObjectId;
  // UTC YYYY-MM-DD usage day key
  date: string;
  messages: number;
  toolCalls: number;
}

const MordredUsageSchema = new Schema<IMordredUsage>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true },
    messages: { type: Number, default: 0 },
    toolCalls: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One usage counter per user per day.
MordredUsageSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model<IMordredUsage>("MordredUsage", MordredUsageSchema);