import mongoose, { Schema, Document } from "mongoose";

export interface IAcademicSession extends Document {
  name: string;
  startsAt: Date;
  endsAt: Date;
  isCurrent: boolean;
}

const AcademicSessionSchema = new Schema<IAcademicSession>(
  {
    name: { type: String, required: [true, "Academic session name is required"] },
    startsAt: { type: Date, required: [true, "Session start date is required"] },
    endsAt: { type: Date, required: [true, "Session end date is required"] },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AcademicSessionSchema.index({ name: 1 }, { unique: true });

export default mongoose.model<IAcademicSession>("AcademicSession", AcademicSessionSchema);
