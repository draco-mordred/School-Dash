import mongoose, { Schema, Document } from "mongoose";

export interface IAcademicYear extends Document {
  name: string; // 2026-2027
  fromYear: Date; // 2026-01-05
  toYear: Date; // 2026-09-10
  isCurrent: boolean; // true/false
}

const academicYearSchema = new Schema(
  {
    name: { type: String, required: true },
    fromYear: { type: Date, required: true },
    toYear: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IAcademicYear>(
  "AcademicYear",
  academicYearSchema
)