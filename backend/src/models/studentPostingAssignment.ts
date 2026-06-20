import mongoose, { Schema, Document } from "mongoose";

export type PostingAssignmentStatus = "upcoming" | "current" | "completed";

export interface ICompletedUnit {
  unitName: string;
  unitCode?: string;
  completedAt: Date;
}

export interface IStudentPostingAssignment extends Document {
  student: mongoose.Types.ObjectId; // Student ObjectId
  postingName: string; // "M0", "S0", "M1", "S1", "Block Month 1", specialty name, etc.
  postingCategory: string; // "medicine", "surgery", "paediatrics", "obstetrics", "specialty", "block"
  assignedGroup: mongoose.Types.ObjectId; // Which group for this posting
  status: PostingAssignmentStatus; // "upcoming" | "current" | "completed"
  postingStartDate: Date;
  postingEndDate: Date;
  completedUnits: ICompletedUnit[]; // Units completed within this posting
  sequenceIndex: number; // Position in student's posting sequence (0, 1, 2, 3...)
  rotationSchedule: mongoose.Types.ObjectId; // Reference to RotationSchedule
  createdAt: Date;
  updatedAt: Date;
}

const CompletedUnitSchema = new Schema({
  unitName: { type: String, required: true },
  unitCode: { type: String },
  completedAt: { type: Date, required: true },
}, { _id: false });

const StudentPostingAssignmentSchema = new Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  postingName: { type: String, required: true }, // "M0", "S0", "M1", "S1", specialty name, etc.
  postingCategory: { type: String, required: true }, // "medicine", "surgery", "paediatrics", "obstetrics", "specialty", "block"
  assignedGroup: { type: mongoose.Schema.Types.ObjectId, ref: "RotationGroup", required: true },
  status: {
    type: String,
    enum: ["upcoming", "current", "completed"],
    default: "upcoming",
    required: true,
  },
  postingStartDate: { type: Date, required: true },
  postingEndDate: { type: Date, required: true },
  completedUnits: {
    type: [CompletedUnitSchema],
    default: [],
  },
  sequenceIndex: { type: Number, required: true, default: 0 }, // Position in posting sequence
  rotationSchedule: { type: mongoose.Schema.Types.ObjectId, ref: "RotationSchedule", required: true },
}, { timestamps: true });

// Indexes for efficient queries
StudentPostingAssignmentSchema.index({ student: 1, status: 1 }); // Query current postings
StudentPostingAssignmentSchema.index({ student: 1, postingName: 1 }); // Query specific posting
StudentPostingAssignmentSchema.index({ student: 1, sequenceIndex: 1 }); // Query by sequence
StudentPostingAssignmentSchema.index({ assignedGroup: 1, status: 1 }); // Query by group
StudentPostingAssignmentSchema.index({ postingName: 1, status: 1 }); // Query by posting type
StudentPostingAssignmentSchema.index({ student: 1, postingStartDate: 1, postingEndDate: 1 }); // Date range queries

export default mongoose.model<IStudentPostingAssignment>("StudentPostingAssignment", StudentPostingAssignmentSchema);
