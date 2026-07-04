import mongoose, { Schema } from "mongoose";
const MordredLogSchema = new Schema({
    logType: { type: String, enum: ["API_FAILURE", "SYSTEM_METRIC"], required: true },
    message: { type: String, required: true },
    details: { type: String, required: true },
    resolved: { type: Boolean, default: false }
}, { timestamps: true });
export default mongoose.model("MordredLog", MordredLogSchema);
