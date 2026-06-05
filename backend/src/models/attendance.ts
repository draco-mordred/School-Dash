import mongoose, { Schema, Document } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface IAttendance extends Document {
  student: mongoose.Types.ObjectId;
  teacher?: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  date: Date;
  status: AttendanceStatus;
  notes?: string;
} 

const AttendanceSchema = new Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      required: true,
      default: "present",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAttendance>("Attendance", AttendanceSchema);
