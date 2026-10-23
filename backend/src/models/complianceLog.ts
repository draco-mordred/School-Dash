import mongoose, { Schema, Document } from "mongoose";

// Compliance log types
export type ComplianceLogType = 
  | "lecture_before_clinical_violation" 
  | "minimum_attendance_violation" 
  | "clinical_attendance_violation" 
  | "time_window_violation" 
  | "proximity_violation";

// Resolution status
export type ResolutionStatus = "open" | "resolved" | "acknowledged" | "escalated" | "waived";

/**
 * Compliance Log Model
 * Tracks all compliance violations and their resolutions
 */
export interface IComplianceLog extends Document {
  // References
  student: mongoose.Types.ObjectId; // The student involved
  classId: mongoose.Types.ObjectId; // The class
  academicYear: mongoose.Types.ObjectId; // Academic year
  
  // Related records
  lectureSessionId?: mongoose.Types.ObjectId; // Reference to LATIFAH attendance
  clinicalSessionId?: mongoose.Types.ObjectId; // Reference to KRYSTA clinical attendance
  proximityCheckinId?: mongoose.Types.ObjectId; // Reference to proximity checkin
  complianceRuleId: mongoose.Types.ObjectId; // Which rule was violated
  
  // Violation details
  logType: ComplianceLogType;
  ruleName: string; // Name of the violated rule
  severity: "warning" | "error" | "critical" | "info";
  
  // Description of the violation
  title: string;
  message: string;
  details?: Record<string, any>; // Additional context
  
  // Timing information
  lectureTime?: Date; // When the lecture occurred
  clinicalTime?: Date; // When the clinical session occurred
  checkinTime?: Date; // When proximity checkin happened
  
  // Status and resolution
  status: ResolutionStatus;
  resolvedBy?: mongoose.Types.ObjectId; // Who resolved it
  resolvedAt?: Date; // When it was resolved
  resolutionNotes?: string; // Notes on resolution
  
  // Actions taken
  actionsTaken: {
    studentNotified?: boolean;
    supervisorNotified?: boolean;
    adminNotified?: boolean;
    clinicalBlocked?: boolean;
    autoMarkedAbsent?: boolean;
  };
  
  // For escalation
  escalatedTo?: mongoose.Types.ObjectId[]; // List of users escalated to
  escalationLevel: number; // 0 = initial, 1 = supervisor, 2 = admin, etc.
  
  // Network/offline tracking
  isOffline: boolean; // Was this logged while offline
  syncedAt?: Date; // When it was synced to server
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
}

const ComplianceLogSchema = new Schema<IComplianceLog>(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },
    
    lectureSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
      index: true,
    },
    clinicalSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClinicalAttendance",
      default: null,
      index: true,
    },
    proximityCheckinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProximityCheckin",
      default: null,
      index: true,
    },
    complianceRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceRule",
      required: true,
      index: true,
    },
    
    logType: {
      type: String,
      enum: [
        "lecture_before_clinical_violation",
        "minimum_attendance_violation",
        "clinical_attendance_violation",
        "time_window_violation",
        "proximity_violation",
      ],
      required: true,
      index: true,
    },
    ruleName: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["warning", "error", "critical", "info"],
      default: "warning",
      index: true,
    },
    
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    
    lectureTime: {
      type: Date,
      default: null,
    },
    clinicalTime: {
      type: Date,
      default: null,
    },
    checkinTime: {
      type: Date,
      default: null,
    },
    
    status: {
      type: String,
      enum: ["open", "resolved", "acknowledged", "escalated", "waived"],
      default: "open",
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: "",
    },
    
    actionsTaken: {
      studentNotified: { type: Boolean, default: false },
      supervisorNotified: { type: Boolean, default: false },
      adminNotified: { type: Boolean, default: false },
      clinicalBlocked: { type: Boolean, default: false },
      autoMarkedAbsent: { type: Boolean, default: false },
    },
    
    escalatedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    }],
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    isOffline: {
      type: Boolean,
      default: false,
    },
    syncedAt: {
      type: Date,
      default: null,
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

// Indexes for efficient queries
ComplianceLogSchema.index({ student: 1, status: 1, createdAt: -1 });
ComplianceLogSchema.index({ classId: 1, logType: 1, createdAt: -1 });
ComplianceLogSchema.index({ complianceRuleId: 1, createdAt: -1 });
ComplianceLogSchema.index({ severity: 1, status: 1, createdAt: -1 });
ComplianceLogSchema.index({ "actionsTaken.clinicalBlocked": 1 });
ComplianceLogSchema.index({ isOffline: 1, syncedAt: 1 });

// TTL index for automatic cleanup (after 1 year)
ComplianceLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

export default mongoose.model<IComplianceLog>(
  "ComplianceLog",
  ComplianceLogSchema
);
