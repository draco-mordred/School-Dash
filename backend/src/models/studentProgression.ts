import mongoose, { Schema, Document } from "mongoose";

// PR G3 — per-student exam-cycle progression record. One record per student
// per ladder stage: the admin decision (pass/fail/repeat) that drives the
// class/sub-level transition, plus the grade snapshot it was based on.
export interface IStudentProgression extends Document {
  student: mongoose.Types.ObjectId;
  stageId: string;
  stageLabel: string;
  academicYear: mongoose.Types.ObjectId | null;
  // in_progress = enrolled in the stage, no decision yet
  status: "in_progress" | "passed" | "failed" | "repeating" | "advanced";
  courseCount: number;
  passedCount: number;
  failedCount: number;
  withheldCount: number;
  weightedAverage: number;
  decidedBy: mongoose.Types.ObjectId | null;
  decidedAt: Date | null;
  note: string;
  enteredAt: Date;
}

const StudentProgressionSchema = new Schema<IStudentProgression>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stageId: { type: String, required: true },
    stageLabel: { type: String, default: "" },
    academicYear: { type: Schema.Types.ObjectId, ref: "AcademicYear", default: null },
    status: {
      type: String,
      enum: ["in_progress", "passed", "failed", "repeating", "advanced"],
      default: "in_progress",
    },
    courseCount: { type: Number, default: 0 },
    passedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    withheldCount: { type: Number, default: 0 },
    weightedAverage: { type: Number, default: 0 },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    note: { type: String, default: "", trim: true },
    enteredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One progression record per student per stage (repeat years get a new
// academicYear via the service upsert-by-year semantics).
StudentProgressionSchema.index({ student: 1, stageId: 1, academicYear: 1 }, { unique: true });

export default mongoose.model<IStudentProgression>("StudentProgression", StudentProgressionSchema);
