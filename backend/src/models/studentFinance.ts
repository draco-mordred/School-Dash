import mongoose, { Schema, Document } from "mongoose";

// PR G2 — school fees + departmental clearance (MANUAL ADMIN ENTRY v1).
// One doc per student per academic year; admins toggle items paid/unpaid.
export type FinanceItemKind = "school_fees" | "departmental_clearance";

export interface IFinanceItem {
  kind: FinanceItemKind;
  label: string;
  amount: number;
  currency: string;
  paid: boolean;
  paidAt: Date | null;
  recordedBy: mongoose.Types.ObjectId | null;
  note: string;
}

export interface IStudentFinance extends Document {
  student: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId | null;
  items: IFinanceItem[];
}

const FinanceItemSchema = new Schema(
  {
    kind: { type: String, enum: ["school_fees", "departmental_clearance"], required: true },
    label: { type: String, default: "" },
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "NGN" },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: false, updatedAt: false } }
);

const StudentFinanceSchema = new Schema<IStudentFinance>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    academicYear: { type: Schema.Types.ObjectId, ref: "AcademicYear", default: null },
    items: { type: [FinanceItemSchema], default: [] },
  },
  { timestamps: true }
);

// Non-unique: the service upserts by {student, academicYear} so there is only
// ever one doc per pair (null academicYear = current/unspecified year).
StudentFinanceSchema.index({ student: 1, academicYear: 1 });

export default mongoose.model<IStudentFinance>("StudentFinance", StudentFinanceSchema);
