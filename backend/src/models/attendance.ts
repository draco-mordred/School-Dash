import mongoose, { Schema, Document } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface IAttendance extends Document {
  student?: mongoose.Types.ObjectId;
  lecturer?: mongoose.Types.ObjectId;
  course?: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  date: Date;
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  status: AttendanceStatus;
  notes?: string;
  approvedBy?: mongoose.Types.ObjectId; // For excused absences, who approved it (e.g., admin or teacher)
  lecturerApproval?: "approved" | "not-approved" | null;
  lecturerApprovalDate?: Date | null;
  hodApproval?: "approved" | "not-approved" | null;
  hodApprovalDate?: Date | null;
} 

const AttendanceSchema = new Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    course: {
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
    dayOfWeek: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      required: true,
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
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lecturerApproval: {
      type: String,
      enum: ["approved", "not-approved", null],
      default: null,
    },
    lecturerApprovalDate: {
      type: Date,
      default: null,
    },
    hodApproval: {
      type: String,
      enum: ["approved", "not-approved", null],
      default: null,
    },
    hodApprovalDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAttendance>("Attendance", AttendanceSchema);
