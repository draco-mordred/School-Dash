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

export const procredureAction = {
  performed: "performed",
  assisted: "assisted",
  watched: "watched"
} as const;

const ProceduresWatchedAssistedOrPerformedSchema = new Schema(
  {
    procedureName: { type: String, required: true, default: "" },
    action: {
      type: String,
      enum: Object.values(procredureAction),
      required: true,
      default: procredureAction.watched,
    },
    date: { type: Date, default: () => new Date(), required: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);
  

const PracticalsPerformedSchema = new Schema(
  {
    practicalName: { type: String, required: true, default: "" },
    coursseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    performedAt: { type: Date, default: () => new Date(), required: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const UnitActivitiesSchema = new Schema(
  {
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
    activities: { type: RotationActivitiesSchema, default: () => ({}) },
    patientsClerked: { type: [PatientClerkedSchema], default: [] },
    proceduresWatchedAssistedOrPerformed: { type: [ProceduresWatchedAssistedOrPerformedSchema], default: [] },
  },
  { _id: false }
);


export const ClinicalPostingType = {
  acedemic: "academic",
  clinical: "clinical",
} as const;

export const ClinicalPostingPhase = {
  OandGAndPediatricsPosting: "OG_PED",
  SpecialtyPosting: "SPECIALTY",
  ElectivePosting: "ELECTIVE",
  MedicineAndSurgeryPosting: "MED_SUR",
} as const;

export const CurrentPosting = {
  OBG: "O&G",
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

export type clinicalPostingPhase = "OG_PED" | "SPECIALTY" | "ELECTIVE" | "MED_SUR";

export type clinicalPostingType = "academic" | "clinical";

export interface IClinicalRotations extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  department: mongoose.Types.ObjectId;
  supervisor?: mongoose.Types.ObjectId;
  currentPosting: currentPostings;
  postingType: clinicalPostingType;
  postingPhase: clinicalPostingPhase;
  isActive: boolean;
  practicalActivities?: typeof PracticalsPerformedSchema[];// for Block postings, this will be an array of practicals performed during the posting
  unitActivities?: typeof UnitActivitiesSchema[]; //
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
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  currentPosting: { type: String, required: true },
  postingType: { type: String, required: true },
  postingPhase: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  practicalActivities: { type: [PracticalsPerformedSchema], default: [] },
  unitActivities: { type: [UnitActivitiesSchema], default: [] },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
  totalPoints: { type: Number, default: 320 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true }
})

export default mongoose.model("ClinicalRotations", ClinicalRotationsSchema);
