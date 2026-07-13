import mongoose, { Schema, Document } from "mongoose";

export interface ISemester extends Document {
  name: string;
  academicSession: mongoose.Types.ObjectId;
  order: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
}

const SemesterSchema = new Schema<ISemester>(
  {
    name: { type: String, required: [true, "Semester name is required"] },
    academicSession: {
      type: Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: [true, "Academic session reference is required"],
    },
    order: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SemesterSchema.index({ academicSession: 1, order: 1 }, { unique: true });

export default mongoose.model<ISemester>("Semester", SemesterSchema);
