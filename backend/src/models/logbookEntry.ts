import mongoose, { Schema, Document } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface IDayEntry {
  _id?: mongoose.Types.ObjectId;
  weekNumber: number;
  date: Date;
  dayName: string; // e.g., "Monday", "Tuesday"
  attendanceStatus: AttendanceStatus;
  notes?: string;
}

export interface ITutorialEntry {
  _id?: mongoose.Types.ObjectId;
  topic: string;
  date: Date;
  notes?: string;
}

export interface IPersonalEntry {
  _id?: mongoose.Types.ObjectId;
  note: string;
  date: Date;
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
  weekNumber: { type: Number, required: true },
  date: { type: Date, required: true },
  dayName: { type: String, required: true },
  attendanceStatus: {
    type: String,
    enum: ["present", "absent", "late", "excused"],
    default: "present",
  },
  notes: { type: String, default: "" },
}, { _id: true });

const TutorialEntrySchema = new Schema({
  topic: { type: String, required: true },
  date: { type: Date, required: true },
  notes: { type: String, default: "" },
}, { _id: true });

const PersonalEntrySchema = new Schema({
  note: { type: String, required: true },
  date: { type: Date, required: true },
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
