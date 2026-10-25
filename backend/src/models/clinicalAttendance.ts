import mongoose, { Schema, Document } from "mongoose";

export type ClinicalActivityType =
  | "ward_round"
  | "clinic"
  | "theatre"
  | "call_duty"
  | "simulation"
  | "procedure"
  | "practical";

export type AttendanceRecordStatus = "present" | "absent" | "late" | "excused" | "on-leave" | "pending";

export interface IAttendanceRecord {
  student: mongoose.Types.ObjectId;
  status: AttendanceRecordStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  duration?: number; // in minutes
  notes?: string;
  // Phase J (D14/D15): complaint raised by the student after the supervisor
  // submits the attendance list. Unresolved complaints become final at
  // day-close.
  complaint?: {
    reason: string;
    raisedAt?: Date;
    status: "open" | "resolved" | "dismissed";
    resolution?: string;
    resolvedAt?: Date;
    resolvedBy?: mongoose.Types.ObjectId;
  };
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
  unit?: mongoose.Types.ObjectId | null; // HospitalUnit
  unitLabel?: string;
  department?: string;
  location?: string;
  room?: string;

  // Participants
  supervisor: mongoose.Types.ObjectId; // Consultant/Resident overseeing
  supervisorName?: string;
  supervisorEmail?: string;
  supervisorGroupId?: string | null;
  supervisorGroupLabel?: string;
  supervisorGroupCode?: string;
  supervisorGroupType?: string;
  attendees: IAttendanceRecord[];
  expectedStudents?: mongoose.Types.ObjectId[]; // List of students expected

  // Session Management
  status: "planned" | "ongoing" | "completed" | "cancelled";
  checkInMethod: "manual" | "qr_code" | "biometric";
  requiresApproval: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  complaintGraceUntil?: Date;

  // Clinical Rotation
  clinicalRotation?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
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
      enum: ["present", "absent", "late", "excused", "on-leave", "pending"],
      default: "pending",
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
    // Approver info stored at the attendee record level
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedByName: {
      type: String,
      default: "",
    },
    approvedByEmail: {
      type: String,
      default: "",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvalNonce: {
      type: String,
      default: "",
    },
    // Phase I4: GPS corroboration captured when the student generates
    // their QR/OTP. Supporting signal only — the supervisor-scanned
    // QR/OTP is the authoritative in-person proof.
    gps: {
      type: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        capturedAt: { type: Date, default: null },
      },
      default: null,
    },
    // Phase J (D14/D15): student complaint raised after the supervisor
    // submits the attendance list. Unresolved complaints become final at
    // day-close.
    complaint: {
      type: {
        reason: { type: String, default: "" },
        raisedAt: { type: Date, default: null },
        status: { type: String, enum: ["open", "resolved", "dismissed"], default: null },
        resolution: { type: String, default: "" },
        resolvedAt: { type: Date, default: null },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
      default: null,
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
      required: false,
      default: null,
    },
    unitLabel: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
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
    supervisorName: {
      type: String,
      default: "",
    },
    supervisorEmail: {
      type: String,
      default: "",
    },
    supervisorGroupId: {
      type: String,
      default: null,
    },
    supervisorGroupLabel: {
      type: String,
      default: "",
    },
    supervisorGroupCode: {
      type: String,
      default: "",
    },
    supervisorGroupType: {
      type: String,
      default: "",
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
    // Phase J1b (D14): 20-minute post-submit complaint grace window.
    complaintGraceUntil: {
      type: Date,
      default: null,
    },
    clinicalRotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClinicalRotation",
      default: null,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
      index: true,
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
