import mongoose, { Schema, Document } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface IDayEntry {
  _id?: mongoose.Types.ObjectId;
  time?: string;
  procedure?: string;
  procedures?: string[];
  diagnosis?: string;
  supervisor?: string;
  hours?: number;
  location?: string;
  outcome?: string;
  weekNumber?: number;
  date?: Date;
  dayName?: string;
  attendanceStatus?: AttendanceStatus;
  notes?: string;
}

export interface ITutorialEntry {
  _id?: mongoose.Types.ObjectId;
  topic: string;
  date?: Date;
  presenter?: string;
  notes?: string;
}

export interface IPersonalEntry {
  _id?: mongoose.Types.ObjectId;
  activity: string;
  date?: Date;
  notes?: string;
}

export interface ILogbookEntry extends Document {
  student: mongoose.Types.ObjectId;
  rotation: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  date: Date;
  callDuty: IDayEntry[];
  clinicDays: IDayEntry[];
  theatreDays: IDayEntry[];
  cwrDays: IDayEntry[];
  rwrDays: IDayEntry[];
  other: IDayEntry[];
  presentationTutorials: ITutorialEntry[];
  personal: IPersonalEntry[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const DayEntrySchema = new Schema({
  // Flexible day entry to support clinical logbook fields used by the frontend
  time: { type: String, default: "" },
  procedure: { type: String, default: "" },
  procedures: { type: [String], default: [] },
  diagnosis: { type: String, default: "" },
  supervisor: { type: String, default: "" },
  hours: { type: Number, default: 0 },
  location: { type: String, default: "" },
  outcome: { type: String, default: "" },
  // Backwards-compatible attendance fields (optional)
  weekNumber: { type: Number },
  date: { type: Date },
  dayName: { type: String },
  attendanceStatus: {
    type: String,
    enum: ["present", "absent", "late", "excused"],
    default: "present",
  },
  notes: { type: String, default: "" },
}, { _id: true });

const TutorialEntrySchema = new Schema({
  topic: { type: String, required: true },
  date: { type: Date },
  presenter: { type: String, default: "" },
  notes: { type: String, default: "" },
}, { _id: true });

const PersonalEntrySchema = new Schema({
  activity: { type: String, required: true },
  date: { type: Date },
  notes: { type: String, default: "" },
}, { _id: true });

const LogbookEntrySchema = new Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rotation: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicalRotation", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  date: { type: Date, required: true },
  callDuty: { type: [DayEntrySchema], default: [] },
  clinicDays: { type: [DayEntrySchema], default: [] },
  theatreDays: { type: [DayEntrySchema], default: [] },
  cwrDays: { type: [DayEntrySchema], default: [] },
  rwrDays: { type: [DayEntrySchema], default: [] },
  other: { type: [DayEntrySchema], default: [] },
  presentationTutorials: { type: [TutorialEntrySchema], default: [] },
  personal: { type: [PersonalEntrySchema], default: [] },
  notes: { type: String, default: "" },
}, {
  timestamps: true,
});

export default mongoose.model<ILogbookEntry>("LogbookEntry", LogbookEntrySchema);
