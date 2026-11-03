import mongoose, { Schema, Document } from "mongoose";

// Admin opt-in chat transparency (locked design point 7): an admin who
// enables their own chat/DMs also makes their system-level actions/tasks
// VISIBLE to other admins (mutual oversight). Students cannot @-mention an
// admin unless that admin has chat enabled (design point 10).
export interface IDmChatSetting extends Document {
  user: mongoose.Types.ObjectId;
  chatEnabled: boolean;
}

const DmChatSettingSchema = new Schema<IDmChatSetting>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    chatEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DmChatSettingSchema.index({ user: 1 }, { unique: true });

export default mongoose.model<IDmChatSetting>("DmChatSetting", DmChatSettingSchema);
