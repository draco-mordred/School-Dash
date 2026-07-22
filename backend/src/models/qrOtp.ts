import mongoose from "mongoose";

const QrOtpSchema = new mongoose.Schema(
  {
    otp: { type: String, required: true, index: true, unique: true },
    payload: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

export default mongoose.models.QrOtp || mongoose.model("QrOtp", QrOtpSchema);
