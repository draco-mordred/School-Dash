import mongoose, { Schema, Document } from "mongoose";

export interface IMordredLog extends Document {
  logType: "API_FAILURE" | "SYSTEM_METRIC";
  message: string;
  details: string;
  resolved: boolean;
}

const MordredLogSchema: Schema<IMordredLog> = new Schema({
  logType: { type: String, enum: ["API_FAILURE", "SYSTEM_METRIC"], required: true },
  message: { type: String, required: true },
  details: { type: String, required: true },
  resolved: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IMordredLog>("MordredLog", MordredLogSchema);
