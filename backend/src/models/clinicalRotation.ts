import mongoose, { Schema, Document } from "mongoose";

export type RotationStatus = "pending_approval" | "upcoming" | "active" | "completed";
export type RotationType = "medicine" | "surgery" | "paediatrics" | "obstetrics" | "psychiatry" | "community" | "elective";

export interface IClinicDay {
  _id?: mongoose.Types.ObjectId;
  dayName: string; // e.g., "Monday", "Thursday"
  weekNumber: number;
  attendanceStatus?: "present" | "absent" | "late" | "excused";
  notes?: string;
}

export interface ITheatreDay {
  _id?: mongoose.Types.ObjectId;
  dayName: string;
  weekNumber: number;
  attendanceStatus?: "present" | "absent" | "late" | "excused";
  notes?: string;
}

export interface ICWRDay {
  _id?: mongoose.Types.ObjectId;
  dayName: string;
  weekNumber: number;
  attendanceStatus?: "present" | "absent" | "late" | "excused";
  notes?: string;
}

export interface IRWRDay {
  _id?: mongoose.Types.ObjectId;
  dayName: string;
  weekNumber: number;
  attendanceStatus?: "present" | "absent" | "late" | "excused";
  notes?: string;
}

export interface ICallDay {
  _id?: mongoose.Types.ObjectId;
  dayName: string;
  weekNumber: number;
  attendanceStatus?: "present" | "absent" | "late" | "excused";
  notes?: string;
}

export interface IOtherDay {
  _id?: mongoose.Types.ObjectId;
  dayName: string;
  weekNumber: number;
  attendanceStatus?: "present" | "absent" | "late" | "excused";
  notes?: string;
}

export interface ITutorial {
  _id?: mongoose.Types.ObjectId;
  topic: string;
  date?: Date;
  notes?: string;
}

export interface IPatientClerked {
  _id?: mongoose.Types.ObjectId;
  patientName: string;
  diagnosis: string;
  clerkedAt?: Date;
  notes?: string;
}

export interface IClinicalRotation extends Document {
  rotationName: string;
  rotationDescription: string;
  rotationType: RotationType;
  rotationStartDate: Date;
  rotationEndDate: Date;
  rotationUnit: string;
  rotationSupervisor: mongoose.Types.ObjectId | null;
  rotationStatus: RotationStatus;
  rotationNotes: string;
  rotationActivities: {
    numberOfWeeks: number;
    numberOfConsultantWardRound: number;
    numberOfClinics: number;
    numberOfResidentWardRound: number;
    numberOfCallDuty: number;
    numberOfTheatreDays: number;
  };
  rotationTutorials: ITutorial[];
  rotationTutorialPersonal: string;
  patientsClerked: IPatientClerked[];
  // Tracking days for the rotation
  clinicDays: IClinicDay[];
  theatreDays: ITheatreDay[];
  cwrDays: ICWRDay[];
  rwrDays: IRWRDay[];
  callDays: ICallDay[];
  otherDays: IOtherDay[];
  student: mongoose.Types.ObjectId;
  students?: mongoose.Types.ObjectId[];
  // Persisted display fields for signup history
  studentName: string;
  supervisorName: string;
  academicYear: mongoose.Types.ObjectId;
  generatedFromSchedule?: mongoose.Types.ObjectId | null;
  // Posting-specific assignment tracking
  postingName?: string; // Which posting: "M0", "S0", "M1", "S1", etc.
  assignedGroup?: mongoose.Types.ObjectId | null; // Which group for this posting (dynamic per posting)
  postingCategory?: string; // medicine, surgery, paediatrics, obstetrics, specialty, block
}


const ClinicDaySchema = new Schema({
  dayName: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  attendanceStatus: { type: String, enum: ["present", "absent", "late", "excused"], default: null },
  notes: { type: String, default: "" },
}, { _id: true });

const TheatreDaySchema = new Schema({
  dayName: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  attendanceStatus: { type: String, enum: ["present", "absent", "late", "excused"], default: null },
  notes: { type: String, default: "" },
}, { _id: true });

const CWRDaySchema = new Schema({
  dayName: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  attendanceStatus: { type: String, enum: ["present", "absent", "late", "excused"], default: null },
  notes: { type: String, default: "" },
}, { _id: true });

const RWRDaySchema = new Schema({
  dayName: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  attendanceStatus: { type: String, enum: ["present", "absent", "late", "excused"], default: null },
  notes: { type: String, default: "" },
}, { _id: true });

const CallDaySchema = new Schema({
  dayName: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  attendanceStatus: { type: String, enum: ["present", "absent", "late", "excused"], default: null },
  notes: { type: String, default: "" },
}, { _id: true });

const OtherDaySchema = new Schema({
  dayName: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  attendanceStatus: { type: String, enum: ["present", "absent", "late", "excused"], default: null },
  notes: { type: String, default: "" },
}, { _id: true });

const TutorialSchema = new Schema({
  topic: { type: String, required: true },
  date: { type: Date },
  notes: { type: String, default: "" },
}, { _id: true });

const PatientClerkedSchema = new Schema({
  patientName: { type: String, required: true },
  diagnosis: { type: String, default: "" },
  clerkedAt: { type: Date },
  notes: { type: String, default: "" },
}, { _id: true });

const ClinicalRotationSchema = new Schema({
  rotationName: { type: String, required: true },
  rotationDescription: { type: String, default: "" },
  rotationType: {
    type: String,
    enum: ["medicine", "surgery", "paediatrics", "obstetrics", "psychiatry", "community", "elective"],
    required: true,
  },
  rotationStartDate: { type: Date, required: true },
  rotationEndDate: { type: Date, required: true },
  rotationUnit: { type: String, required: true },
  rotationSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  rotationStatus: {
    type: String,
    enum: ["pending_approval", "upcoming", "active", "completed"],
    default: "pending_approval",
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  rotationNotes: { type: String, default: "" },
  rotationActivities: {
    numberOfWeeks: { type: Number, default: 0 },
    numberOfConsultantWardRound: { type: Number, default: 0 },
    numberOfClinics: { type: Number, default: 0 },
    numberOfResidentWardRound: { type: Number, default: 0 },
    numberOfCallDuty: { type: Number, default: 0 },
    numberOfTheatreDays: { type: Number, default: 0 },
  },
  rotationTutorials: { type: [TutorialSchema], default: [] },
  rotationTutorialPersonal: { type: String, default: "" },
  patientsClerked: { type: [PatientClerkedSchema], default: [] },
  clinicDays: { type: [ClinicDaySchema], default: [] },
  theatreDays: { type: [TheatreDaySchema], default: [] },
  cwrDays: { type: [CWRDaySchema], default: [] },
  rwrDays: { type: [RWRDaySchema], default: [] },
  callDays: { type: [CallDaySchema], default: [] },
  otherDays: { type: [OtherDaySchema], default: [] },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  students: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
  // Persisted display fields for signup history
  studentName: { type: String, required: true, default: "" },
  supervisorName: { type: String, required: true, default: "" },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  generatedFromSchedule: { type: mongoose.Schema.Types.ObjectId, ref: "RotationSchedule", default: null },
  // Posting-specific assignment tracking
  postingName: { type: String, default: null }, // Which posting: "M0", "S0", "M1", "S1", etc.
  assignedGroup: { type: mongoose.Schema.Types.ObjectId, ref: "RotationGroup", default: null }, // Which group for this posting
  postingCategory: { type: String, default: null }, // medicine, surgery, paediatrics, obstetrics, specialty, block
}, {

  timestamps: true,
});

export default mongoose.model<IClinicalRotation>("ClinicalRotation", ClinicalRotationSchema);
