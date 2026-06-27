import mongoose, { Schema, Document } from "mongoose";

export interface IMordredMessage extends Document {
  user_id: mongoose.Types.ObjectId; 
  chat_token: string | null;
  sender: "student" | "mordred_ai" | "staff";
  text: string;
  is_saved: boolean;
  expires_at: Date | null;
}

const MordredMessageSchema: Schema<IMordredMessage> = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  chat_token: { type: String, default: null },
  sender: { type: String, enum: ["student", "mordred_ai", "staff"], required: true },
  text: { type: String, required: true },
  is_saved: { type: Boolean, default: false },
  expires_at: { type: Date, default: () => new Date(Date.now() + 12 * 60 * 60 * 1000) } // 12 Hours from now
}, { timestamps: true });

// CRITICAL: This index automatically drops documents when current time hits expires_at
MordredMessageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const MordredMessage = mongoose.model<IMordredMessage>("MordredMessage", MordredMessageSchema);
export default MordredMessage;
