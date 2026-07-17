import mongoose, { Schema, Document } from "mongoose";

export interface IInstitution extends Document {
  name: string;
  shortName: string;
  type: string;
  country: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  contactEmail: string;
  phone: string;
  website: string;
  description: string;
  academicCalendarType: string;
  timezone: string;
  logoUrl: string;
  backgroundImageUrl: string;
  academicSession: mongoose.Types.ObjectId;
  semesters: mongoose.Types.ObjectId[];
  defaultDepartments: mongoose.Types.ObjectId[];
  defaultUnits: mongoose.Types.ObjectId[];
  attendanceSettings: mongoose.Types.ObjectId;
  assessmentSettings: mongoose.Types.ObjectId;
  brandingSettings: mongoose.Types.ObjectId;
  administratorUser: mongoose.Types.ObjectId;
  applicationSettings: mongoose.Types.ObjectId;
}

const InstitutionSchema = new Schema<IInstitution>(
  {
    name: { type: String, required: [true, "Institution name is required"] },
    shortName: { type: String, required: [true, "Institution short name is required"] },
    type: { type: String, required: [true, "Institution type is required"] },
    country: { type: String, required: [true, "Country is required"] },
    state: { type: String, required: [true, "State is required"] },
    city: { type: String, required: [true, "City is required"] },
    addressLine1: { type: String, default: "" },
    addressLine2: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    description: { type: String, default: "" },
    academicCalendarType: { type: String, required: [true, "Academic calendar type is required"] },
    timezone: { type: String, required: [true, "Timezone is required"] },
    logoUrl: { type: String, default: "" },
    backgroundImageUrl: { type: String, default: "" },
    academicSession: {
      type: Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    semesters: [
      {
        type: Schema.Types.ObjectId,
        ref: "Semester",
      },
    ],
    defaultDepartments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
    defaultUnits: [
      {
        type: Schema.Types.ObjectId,
        ref: "Unit",
      },
    ],
    attendanceSettings: {
      type: Schema.Types.ObjectId,
      ref: "AttendanceSettings",
      required: true,
    },
    assessmentSettings: {
      type: Schema.Types.ObjectId,
      ref: "AssessmentSettings",
      required: true,
    },
    brandingSettings: {
      type: Schema.Types.ObjectId,
      ref: "BrandingSettings",
      required: true,
    },
    administratorUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationSettings: {
      type: Schema.Types.ObjectId,
      ref: "ApplicationSettings",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IInstitution>("Institution", InstitutionSchema);
