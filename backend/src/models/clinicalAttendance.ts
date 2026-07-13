import mongoose, { Schema, Document } from "mongoose";

export type ClinicalActivityType =
  | "ward_round"
  | "clinic"
  | "theatre"
  | "call_duty"
  | "simulation"
  | "procedure"
  | "practical";

export type AttendanceRecordStatus = "present" | "absent" | "late" | "excused" | "on-leave";

export interface IAttendanceRecord {
  student: mongoose.Types.ObjectId;
  status: AttendanceRecordStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  duration?: number; // in minutes
  notes?: string;
}

export interface IClinicalAttendance extends Document {
  // Activity Details
  activityType: ClinicalActivityType;
  title: string;
  description?: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes

  // Location & Unit
  unit: mongoose.Types.ObjectId; // HospitalUnit
  location?: string;
  room?: string;

  // Participants
  supervisor: mongoose.Types.ObjectId; // Consultant/Resident overseeing
  attendees: IAttendanceRecord[];
  expectedStudents?: mongoose.Types.ObjectId[]; // List of students expected

  // Session Management
  status: "planned" | "ongoing" | "completed" | "cancelled";
  checkInMethod: "manual" | "qr_code" | "biometric";
  requiresApproval: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;

  // Clinical Rotation
  clinicalRotation?: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;

  // Statistics
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;

  // Additional Info
  patientCount?: number;
  proceduresPerformed?: string[];
  learningOutcomes?: string[];
  feedback?: string;
  createdBy: mongoose.Types.ObjectId;
}

const AttendanceRecordSchema = new Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused", "on-leave"],
      default: "absent",
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in minutes
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const ClinicalAttendanceSchema = new Schema(
  {
    activityType: {
      type: String,
      enum: [
        "ward_round",
        "clinic",
        "theatre",
        "call_duty",
        "simulation",
        "procedure",
        "practical",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in minutes
      default: null,
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    location: {
      type: String,
      default: "",
    },
    room: {
      type: String,
      default: "",
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attendees: [AttendanceRecordSchema],
    expectedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["planned", "ongoing", "completed", "cancelled"],
      default: "planned",
    },
    checkInMethod: {
      type: String,
      enum: ["manual", "qr_code", "biometric"],
      default: "manual",
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    clinicalRotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClinicalRotation",
      default: null,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    presentCount: {
      type: Number,
      default: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
    },
    lateCount: {
      type: Number,
      default: 0,
    },
    excusedCount: {
      type: Number,
      default: 0,
    },
    patientCount: {
      type: Number,
      default: 0,
    },
    proceduresPerformed: [
      {
        type: String,
        default: "",
      },
    ],
    learningOutcomes: [
      {
        type: String,
        default: "",
      },
    ],
    feedback: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
ClinicalAttendanceSchema.index({ date: 1, unit: 1 });
ClinicalAttendanceSchema.index({ supervisor: 1, date: -1 });
ClinicalAttendanceSchema.index({ academicYear: 1 });
ClinicalAttendanceSchema.index({ "attendees.student": 1, date: -1 });
ClinicalAttendanceSchema.index({ status: 1 });

export default mongoose.model<IClinicalAttendance>(
  "ClinicalAttendance",
  ClinicalAttendanceSchema
);
