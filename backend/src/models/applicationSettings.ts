import mongoose, { Schema, Document } from "mongoose";

export interface IApplicationSettings extends Document {
  defaultLanguage: string;
  allowPublicRegistration: boolean;
  timezone: string;
  dateFormat: string;
  extra: Record<string, any>;
}

const ApplicationSettingsSchema = new Schema<IApplicationSettings>(
  {
    defaultLanguage: { type: String, default: "en" },
    allowPublicRegistration: { type: Boolean, default: false },
    timezone: { type: String, default: "UTC" },
    dateFormat: { type: String, default: "YYYY-MM-DD" },
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model<IApplicationSettings>("ApplicationSettings", ApplicationSettingsSchema);
