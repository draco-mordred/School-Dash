import mongoose, { Schema, Document } from "mongoose";

export type PostingCategory =
  | "medicine"
  | "surgery"
  | "paediatrics"
  | "obstetrics"
  | "specialty"
  | "block";

export interface IUnitRotation {
  unitName: string;
  unitCode?: string;
  startDate: Date;
  endDate: Date;
}

export interface IRotationGroup extends Document {
  name: string;
  students: mongoose.Types.ObjectId[]; // refs to User
  supervisor?: mongoose.Types.ObjectId | null;
  block?: number; // optional block index for block postings
  assignedRotations: IUnitRotation[];
}

export interface IClinicalPosting {
  name: string; // e.g., M0, S0, M1
  category: PostingCategory;
  phase?: string; // e.g., intro, junior, senior, specialty
  startDate: Date;
  endDate: Date;
  unitRotationWeeks: number; // typical unit length, e.g., 4 or 2
  units: { unitName: string; unitCode?: string }[];
  groups: { groupId: mongoose.Types.ObjectId; assigned: IUnitRotation[] }[]; // group assignments with rotations
  // Optional periods for postings that are split into sub-periods (e.g., Pediatrics/O&G halves)
  periods?: { startDate: Date; endDate: Date; assignments: { groupId: mongoose.Types.ObjectId; category?: string; unitName: string; supervisorName?: string }[] }[];
  rules?: Record<string, any>;
}

export interface IBlockPosting {
  courseName: string; // e.g., CHEMICAL PATHOLOGY
  orderIndex: number;
  durationWeeks: number;
}

export interface ISpecialtyPosting {
  name: string; // PSYCHIATRY, ENT, ...
  category: PostingCategory; // medicine/surgery mapping
  monthDurationWeeks: number; // typically 4
}

export interface IActivityApproval extends Document {
  rotationSchedule: mongoose.Types.ObjectId;
  postingName: string;
  unitName: string;
  student: mongoose.Types.ObjectId;
  approver: mongoose.Types.ObjectId;
  approvedAt?: Date;
  status: "pending" | "approved" | "rejected";
  notes?: string;
}

export interface IRotationSchedule extends Document {
  name: string; // e.g., "2026-07 Clinical Rotations - 400 Level"
  academicYear: mongoose.Types.ObjectId;
  class?: mongoose.Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  applicableLevels: number[]; // e.g., [400] or [500]
  postings: IClinicalPosting[];
  blockPostings?: IBlockPosting[];
  specialtyPostings?: ISpecialtyPosting[];
  groups: mongoose.Types.ObjectId[]; // RotationGroup refs
  generatedBy: mongoose.Types.ObjectId; // User
  generatedAt: Date;
  notes?: string;
}

const UnitRotationSchema = new Schema({
  unitName: { type: String, required: true },
  unitCode: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, { _id: false });

const RotationGroupSchema = new Schema({
  name: { type: String, required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  block: { type: Number },
  assignedRotations: { type: [UnitRotationSchema], default: [] },
}, { timestamps: true });

const ClinicalPostingSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ["medicine","surgery","paediatrics","obstetrics","specialty","block"] },
  phase: { type: String, default: "" },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  unitRotationWeeks: { type: Number, required: true, default: 4 },
  units: [{ unitName: String, unitCode: String }],
  // groups now store groupId + assigned rotations per group
  groups: [{ groupId: { type: mongoose.Schema.Types.ObjectId, ref: "RotationGroup" }, assigned: { type: [UnitRotationSchema], default: [] } }],
  periods: [{ startDate: { type: Date }, endDate: { type: Date }, assignments: [{ groupId: { type: mongoose.Schema.Types.ObjectId, ref: "RotationGroup" }, category: { type: String }, unitName: { type: String }, supervisorName: { type: String } }] }],
  rules: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const BlockPostingSchema = new Schema({
  courseName: { type: String, required: true },
  orderIndex: { type: Number, required: true },
  durationWeeks: { type: Number, required: true, default: 4 },
}, { _id: false });

const SpecialtyPostingSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ["medicine","surgery"], required: true },
  monthDurationWeeks: { type: Number, default: 4 },
}, { _id: false });

const ActivityApprovalSchema = new Schema({
  rotationSchedule: { type: mongoose.Schema.Types.ObjectId, ref: "RotationSchedule", required: true },
  postingName: { type: String, required: true },
  unitName: { type: String, required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  status: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  notes: { type: String, default: "" },
}, { timestamps: true });

const RotationScheduleSchema = new Schema({
  name: { type: String, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  applicableLevels: { type: [Number], default: [] },
  postings: { type: [ClinicalPostingSchema], default: [] },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  blockPostings: { type: [BlockPostingSchema], default: [] },
  specialtyPostings: { type: [SpecialtyPostingSchema], default: [] },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "RotationGroup" }],
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  generatedAt: { type: Date, required: true },
  notes: { type: String, default: "" },
}, { timestamps: true });

export const RotationGroupModel = mongoose.model<IRotationGroup>("RotationGroup", RotationGroupSchema);
export const ActivityApprovalModel = mongoose.model<IActivityApproval>("ActivityApproval", ActivityApprovalSchema);
export default mongoose.model<IRotationSchedule>("RotationSchedule", RotationScheduleSchema);
