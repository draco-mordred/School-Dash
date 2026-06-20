import mongoose, { Schema, Document, Model } from "mongoose";

export type UmbrellaCategory = "MEDICINE" | "SURGERY";
export type RoundType = "NONE" | "RESIDENT_ROUND" | "CONSULTANT_ROUND" | "BOTH";
export type ApprovalStatus = "pending" | "approved" | "rejected";

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
  rotation: mongoose.Types.ObjectId; // Reference to ClinicalRotation
  unit: mongoose.Types.ObjectId; // Reference to HospitalUnit
  supervisor?: mongoose.Types.ObjectId; // Reference to HospitalStaff
  umbrellaCategory: UmbrellaCategory;
  entryDate: Date; // Must be Monday-Friday
  
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
      required: true,
    },
    unit: {
      type: mongoose.Types.ObjectId,
      ref: "HospitalUnit",
      required: true,
    },
    supervisor: {
      type: mongoose.Types.ObjectId,
      ref: "HospitalStaff",
    },
    umbrellaCategory: {
      type: String,
      enum: ["MEDICINE", "SURGERY"],
      required: true,
    },
    entryDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (v: Date) {
          const day = v.getDay();
          // 0 = Sunday, 6 = Saturday - reject weekends
          return day !== 0 && day !== 6;
        },
        message: "Clinical activity entries can only be documented for Monday through Friday.",
      },
    },
    
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

const ActivityEntryModel: Model<IActivityEntry> = mongoose.model<IActivityEntry>(
  "ActivityEntry",
  ActivityEntrySchema,
  "activity_entries"
);

export default ActivityEntryModel;
