import mongoose, { Schema, Document } from "mongoose";
import { DM_RETENTION_DAYS } from "../utils/dmModeration";

export interface IDmMessage extends Document {
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  text: string;
  // delivered | soft_flagged (delivered + logged) | blocked (never delivered)
  verdict: "delivered" | "soft_flagged" | "blocked";
  rules: string[];
  // Preservation whitelist beats the 7-day TTL (flagged/escalation evidence).
  preserved: boolean;
  caseId: mongoose.Types.ObjectId | null;
  expiresAt: Date | null;
}

const DmMessageSchema = new Schema<IDmMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true },
    verdict: {
      type: String,
      enum: ["delivered", "soft_flagged", "blocked"],
      default: "delivered",
    },
    rules: { type: [String], default: [] },
    preserved: { type: Boolean, default: false },
    caseId: { type: Schema.Types.ObjectId, ref: "DmCase", default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Weekly auto-clear: un-preserved DMs expire after 7 days. Flagged messages
// (soft_flagged/blocked) get expiresAt = null so the whitelist beats the TTL.
DmMessageSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const defaultExpiry = () => new Date(Date.now() + DM_RETENTION_DAYS * 24 * 60 * 60 * 1000);
DmMessageSchema.pre("save", async function () {
  if (this.isNew && this.expiresAt === null && !this.preserved) {
    (this as any).expiresAt = defaultExpiry();
  }
});

export default mongoose.model<IDmMessage>("DmMessage", DmMessageSchema);
