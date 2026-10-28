import mongoose, { Schema, Document, Model } from "mongoose";

export type UmbrellaCategory = "MEDICINE" | "SURGERY" | "OTHER";
export type RoundType = "NONE" | "RESIDENT_ROUND" | "CONSULTANT_ROUND" | "BOTH";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ActivityCategory =
  | "clerking"
  | "theatre"
  | "clinic"
  | "ward_round"
  | "call_duty"
  | "other";
export type ActivityEntrySource = "manual" | "clinical_attendance";

export interface ISurgicalMetrics {
  theatreDaysCount: number;
  casesObserved: string[]; // Array of case descriptions
  casesAssisted: string[];
}

export interface IMedicalMetrics {
  proceduresWitnessedOrDone: string[]; // Array of procedure descriptions
}

export interface IActivityEntry extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId; // Reference to User (student)
  rotation?: mongoose.Types.ObjectId; // Reference to ClinicalRotation / RotationPlan window
  unit?: mongoose.Types.ObjectId; // Reference to HospitalUnit (optional)
  supervisor?: mongoose.Types.ObjectId; // Reference to HospitalStaff
  umbrellaCategory: UmbrellaCategory;
  entryDate: Date; // Must be Monday-Friday for manual entries

  // Categorisation (clinical logbook trend)
  category: ActivityCategory; // clerking | theatre | clinic | ward_round | call_duty | other
  categoryLabel?: string; // free-text label for "other" procedures (e.g. Venipuncture)
  title?: string; // procedure / activity name
  hours?: number; // hours logged (default 8)
  groupId?: string; // clinical posting group id (supervisorGroupId)
  groupLabel?: string; // clinical posting group label (student's team)
  supervisorName?: string; // name of the supervisor it was submitted to / signed by
  source: ActivityEntrySource; // manual submission vs auto from clinical attendance
  clinicalSessionId?: mongoose.Types.ObjectId; // ClinicalAttendance session (auto entries)
  autoSigned?: boolean; // attendance-tagged entries are signed by the supervisor's attendance list
  
  // Shared metrics
  clinicsAttended: boolean;
  wardRoundsAttended: RoundType;
  callDutyCompleted: boolean;
  
  // Umbrella-specific metrics
  surgicalMetrics?: ISurgicalMetrics;
  medicalMetrics?: IMedicalMetrics;
  
  // Approval tracking
  approvalStatus: ApprovalStatus;
  approvedBy?: mongoose.Types.ObjectId; // Reference to HospitalStaff
  approvedByRole?: "RESIDENT" | "CONSULTANT";
  approvedAt?: Date;
  rejectionReason?: string;
  
  // Metadata
  notes?: string;
  attachments?: string[]; // URLs to supporting documents if needed
  
  createdAt: Date;
  updatedAt: Date;
}

const ActivityEntrySchema = new Schema<IActivityEntry>(
  {
    student: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rotation: {
      type: mongoose.Types.ObjectId,
      ref: "ClinicalRotation",
    },
    unit: {
      type: mongoose.Types.ObjectId,
      ref: "HospitalUnit",
    },
    supervisor: {
      type: mongoose.Types.ObjectId,
      ref: "HospitalStaff",
    },
    umbrellaCategory: {
      type: String,
      enum: ["MEDICINE", "SURGERY", "OTHER"],
      required: true,
      default: "OTHER",
    },
    entryDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (v: Date) {
          // Auto entries from clinical attendance may legitimately fall on
          // weekends (call duty); only manual submissions are weekday-only.
          const anyDoc = this as any;
          if (anyDoc && anyDoc.source === "clinical_attendance") return true;
          const day = v.getDay();
          // 0 = Sunday, 6 = Saturday - reject weekends
          return day !== 0 && day !== 6;
        },
        message: "Clinical activity entries can only be documented for Monday through Friday.",
      },
    },

    // Categorisation (clinical logbook trend)
    category: {
      type: String,
      enum: ["clerking", "theatre", "clinic", "ward_round", "call_duty", "other"],
      default: "other",
    },
    categoryLabel: { type: String, default: "" },
    title: { type: String, default: "" },
    hours: { type: Number, default: 8 },
    groupId: { type: String, default: "" },
    groupLabel: { type: String, default: "" },
    supervisorName: { type: String, default: "" },
    source: {
      type: String,
      enum: ["manual", "clinical_attendance"],
      default: "manual",
    },
    clinicalSessionId: {
      type: mongoose.Types.ObjectId,
      ref: "ClinicalAttendance",
      default: null,
    },
    autoSigned: { type: Boolean, default: false },
    
    // Shared metrics
    clinicsAttended: { type: Boolean, default: false },
    wardRoundsAttended: {
      type: String,
      enum: ["NONE", "RESIDENT_ROUND", "CONSULTANT_ROUND", "BOTH"],
      default: "NONE",
    },
    callDutyCompleted: { type: Boolean, default: false },
    
    // Umbrella-specific metrics
    surgicalMetrics: {
      theatreDaysCount: { type: Number, default: 0 },
      casesObserved: [{ type: String }],
      casesAssisted: [{ type: String }],
    },
    medicalMetrics: {
      proceduresWitnessedOrDone: [{ type: String }],
    },
    
    // Approval tracking
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Types.ObjectId,
      ref: "HospitalStaff",
    },
    approvedByRole: {
      type: String,
      enum: ["RESIDENT", "CONSULTANT"],
    },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    
    // Metadata
    notes: { type: String },
    attachments: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast queries
ActivityEntrySchema.index({ student: 1, entryDate: -1 });
ActivityEntrySchema.index({ rotation: 1, approvalStatus: 1 });
ActivityEntrySchema.index({ unit: 1, umbrellaCategory: 1 });
ActivityEntrySchema.index({ approvalStatus: 1, supervisor: 1 });
ActivityEntrySchema.index({ entryDate: 1, approvalStatus: 1 });
ActivityEntrySchema.index({ student: 1, category: 1 });
ActivityEntrySchema.index({ clinicalSessionId: 1, student: 1 }, { unique: true, sparse: true });

const ActivityEntryModel: Model<IActivityEntry> = mongoose.model<IActivityEntry>(
  "ActivityEntry",
  ActivityEntrySchema,
  "activity_entries"
);

export default ActivityEntryModel;
