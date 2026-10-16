import mongoose from "mongoose";

const QrOtpSchema = new mongoose.Schema(
  {
    otp: { type: String, required: true, index: true, unique: true },
    payload: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: () => new Date() },
    approvalStatus: { type: String, enum: ["available", "processing", "consumed"], default: "available", index: true },
    claimedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvalResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: false }
);

export default mongoose.models.QrOtp || mongoose.model("QrOtp", QrOtpSchema);
