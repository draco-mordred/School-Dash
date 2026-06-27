import mongoose, { Schema, Document } from "mongoose";

const RotationActivitiesSchema = new Schema(
  {
    numberOfWeeks: { type: Number, default: 0 },
    numberOfConsultantWardRound: { type: Number, default: 0 },
    numberOfClinics: { type: Number, default: 0 },
    numberOfResidentWardRound: { type: Number, default: 0 },
    numberOfCallDuty: { type: Number, default: 0 },
    numberOfTheatreDays: { type: Number, default: 0 },
  },
  { _id: false }
);

const PatientClerkedSchema = new Schema(
  {
    patientName: { type: String },
    diagnosis: { type: String },
    clerkedAt: { type: Date, default: () => new Date() },
    notes: { type: String },
  },
  { _id: false }
);

const ClinicalRotationSchema = new Schema(
  {
    rotationName: { type: String, required: true },
    rotationDescription: { type: String, default: "" },
    rotationType: { type: String, default: "general" },
    rotationStartDate: { type: Date },
    rotationEndDate: { type: Date },
    rotationUnit: { type: String },
    rotationSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rotationStatus: { type: String, default: "pending_approval" },
    rotationNotes: { type: String, default: "" },
    rotationActivities: { type: RotationActivitiesSchema, default: () => ({}) },
    rotationTutorials: { type: [Schema.Types.Mixed], default: [] },
    rotationTutorialPersonal: { type: String, default: "" },
    patientsClerked: { type: [PatientClerkedSchema], default: [] },
    clinicDays: { type: [Date], default: [] },
    theatreDays: { type: [Date], default: [] },
    cwrDays: { type: [Date], default: [] },
    rwrDays: { type: [Date], default: [] },
    callDays: { type: [Date], default: [] },
    otherDays: { type: [Date], default: [] },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    students: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
    studentName: { type: String, default: "" },
    supervisorName: { type: String, default: "" },
  },
  { timestamps: true }
);

ClinicalRotationSchema.index({ rotationStatus: 1 });
ClinicalRotationSchema.index({ student: 1 });





export const ClinicalPostingType = {
  general: "general",
  elective: "elective",
} as const;

export const ClinicalPostingPhase = {
  OandG_PediatricsPosting: "OG_PED",
  SpecialtyPosting: "SPECIALTY",
  ElectivePosting: "ELECTIVE",
} as const;

export const CurrentPosting = {
  OandG: "O&G",
  PED: "Pediatrics",
  PSY: "Psychiatry",
  ENT: "ENT",
  RAD: "Radiology",
  OPH: "Ophthalmology",
  ANE: "Anesthesiology",
  DER: "Dermatology",
  MED: "Medicine",
  SUR: "Surgery",
  COM: "Community Medicine"
}

export type currentPostings = "O&G" | "Pediatrics" | "Psychiatry" | "ENT" | "Radiology" | "Ophthalmology" | "Anesthesiology" | "Dermatology" | "Medicine" | "Surgery" | "Community Medicine";

export type clinicalPostingPhase = "OG_PED" | "SPECIALTY" | "ELECTIVE";

export type clinicalPostingType = "general" | "elective";

export interface IClinicalRotations extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  department: mongoose.Types.ObjectId;
  currentPosting: currentPostings;
  postingType: clinicalPostingType;
  postingPhase: clinicalPostingPhase;
  isActive: boolean;
  class: mongoose.Types.ObjectId;
  unit: mongoose.Types.ObjectId;
  totalPoints: Number;
  startDate: Date;
  endDate: Date;
}

const ClinicalRotationsSchema = new Schema<IClinicalRotations>({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  currentPosting: { type: String, required: true },
  postingType: { type: String, required: true },
  postingPhase: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
  totalPoints: { type: Number, default: 320 },
  startDate: { type: Date, required: true },
})

export default mongoose.model("ClinicalRotations", ClinicalRotationsSchema);
