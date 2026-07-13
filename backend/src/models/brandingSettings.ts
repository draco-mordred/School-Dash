import mongoose, { Schema, Document } from "mongoose";

export interface IBrandingSettings extends Document {
  logoUrl: string;
  faviconUrl: string;
  coverImageUrl?: string;
  primaryColor: string;
  accentColor: string;
}

const BrandingSettingsSchema = new Schema<IBrandingSettings>(
  {
    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },
    primaryColor: { type: String, default: "#2563eb" },
    accentColor: { type: String, default: "#4f46e5" },
  },
  { timestamps: true }
);

export default mongoose.model<IBrandingSettings>("BrandingSettings", BrandingSettingsSchema);
