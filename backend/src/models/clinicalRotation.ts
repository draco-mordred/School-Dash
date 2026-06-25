import mongoose, { Schema } from "mongoose";

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

export default mongoose.model("ClinicalRotation", ClinicalRotationSchema);
