import mongoose, { Schema, Document } from "mongoose";

// Compliance rule types
export type ComplianceRuleType = 
  | "lecture_before_clinical" 
  | "minimum_lecture_attendance" 
  | "clinical_attendance_required" 
  | "sequential_attendance" 
  | "time_window_validation";

// Compliance severity levels
export type ComplianceSeverity = "warning" | "error" | "critical" | "info";

// Compliance status
export type ComplianceStatus = "compliant" | "non_compliant" | "pending_review" | "exempt";

/**
 * Compliance Rule Model
 * Defines attendance validation rules between KRYSTA (clinical) and LATIFAH (lecture)
 */
export interface IComplianceRule extends Document {
  name: string; // Rule name for display
  description: string; // Detailed description of the rule
  
  // Rule type
  ruleType: ComplianceRuleType;
  
  // Severity level
  severity: ComplianceSeverity;
  
  // Rule is active
  isActive: boolean;
  
  // Rule conditions (varies by ruleType)
  conditions: {
    // For "lecture_before_clinical": require lecture attendance before clinical
    requiredLectureStatus?: ComplianceStatus[]; // What lecture statuses are acceptable
    maxLectureAbsencesAllowed?: number; // Max allowed lecture absences
    
    // For "minimum_lecture_attendance": percentage or count
    minimumAttendancePercentage?: number; // e.g., 80 for 80%
    minimumAttendanceCount?: number; // e.g., 5 lectures
    
    // For "time_window_validation": time constraints
    maxHoursAfterLecture?: number; // Clinical must start within X hours after lecture
    minHoursBetweenSessions?: number; // Minimum gap between sessions
    
    // For "sequential_attendance": ordering requirements
    requiredSequence?: string[]; // e.g., ["lecture", "clinical"]
  };
  
  // Scope of the rule
  appliesTo: {
    classes?: mongoose.Types.ObjectId[]; // Specific classes
    academicYears?: mongoose.Types.ObjectId[]; // Specific academic years
    courses?: mongoose.Types.ObjectId[]; // Specific courses
    allClasses?: boolean; // Apply to all classes
  };
  
  // Actions to take when rule is violated
  actions: {
    notifyStudent?: boolean;
    notifySupervisor?: boolean;
    notifyAdmin?: boolean;
    blockClinicalAttendance?: boolean; // Prevent clinical attendance if rule violated
    autoMarkAbsent?: boolean; // Automatically mark as absent
    requireApproval?: boolean; // Require manual approval
  };
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const ComplianceRuleSchema = new Schema<IComplianceRule>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    
    ruleType: {
      type: String,
      enum: [
        "lecture_before_clinical",
        "minimum_lecture_attendance", 
        "clinical_attendance_required",
        "sequential_attendance",
        "time_window_validation",
      ],
      required: true,
      index: true,
    },
    
    severity: {
      type: String,
      enum: ["warning", "error", "critical", "info"],
      default: "warning",
    },
    
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    conditions: {
      requiredLectureStatus: [{
        type: String,
        enum: ["compliant", "non_compliant", "pending_review", "exempt"],
        default: ["compliant"],
      }],
      maxLectureAbsencesAllowed: {
        type: Number,
        default: 0,
      },
      minimumAttendancePercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      minimumAttendanceCount: {
        type: Number,
        min: 0,
        default: null,
      },
      maxHoursAfterLecture: {
        type: Number,
        min: 0,
        default: null,
      },
      minHoursBetweenSessions: {
        type: Number,
        min: 0,
        default: null,
      },
      requiredSequence: [{
        type: String,
        default: [],
      }],
    },
    
    appliesTo: {
      classes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        default: [],
      }],
      academicYears: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicYear",
        default: [],
      }],
      courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        default: [],
      }],
      allClasses: {
        type: Boolean,
        default: false,
      },
    },
    
    actions: {
      notifyStudent: {
        type: Boolean,
        default: false,
      },
      notifySupervisor: {
        type: Boolean,
        default: false,
      },
      notifyAdmin: {
        type: Boolean,
        default: false,
      },
      blockClinicalAttendance: {
        type: Boolean,
        default: false,
      },
      autoMarkAbsent: {
        type: Boolean,
        default: false,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ComplianceRuleSchema.index({ ruleType: 1, isActive: 1 });
ComplianceRuleSchema.index({ "appliesTo.classes": 1 });
ComplianceRuleSchema.index({ "appliesTo.allClasses": 1 });

export default mongoose.model<IComplianceRule>(
  "ComplianceRule",
  ComplianceRuleSchema
);
