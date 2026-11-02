import mongoose, { Schema, Document } from "mongoose";

// PR G3 — progression decision record: one per student decision (advance /
// repeat / hold / graduate), with the evidence snapshot used to decide.

export interface IProgressionRecord extends Document {
  student: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId | null;
  fromStep: string | null;
  toStep: string | null;
  decision: "advance" | "repeat" | "hold" | "graduate";
  passedAll: boolean;
  gradedCount: number;
  failedCount: number;
  pendingCount: number;
  blockers: string[];
  decidedBy: mongoose.Types.ObjectId;
  notes?: string | null;
}

const ProgressionRecordSchema: Schema<IProgressionRecord> = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    academicYear: { type: Schema.Types.ObjectId, ref: "AcademicYear", default: null },
    fromStep: { type: String, default: null },
    toStep: { type: String, default: null },
    decision: {
      type: String,
      enum: ["advance", "repeat", "hold", "graduate"],
      required: true,
    },
    passedAll: { type: Boolean, default: false },
    gradedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    blockers: { type: [String], default: [] },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IProgressionRecord>("ProgressionRecord", ProgressionRecordSchema);
