import mongoose, { Schema, Document } from "mongoose";

export interface IAssessmentSettings extends Document {
  mcq: boolean;
  essay: boolean;
  osce: boolean;
  longCase: boolean;
  shortCase: boolean;
  continuousAssessment: boolean;
  passMark: number;
  gradingScale: string[];
}

const AssessmentSettingsSchema = new Schema<IAssessmentSettings>(
  {
    mcq: { type: Boolean, default: true },
    essay: { type: Boolean, default: true },
    osce: { type: Boolean, default: true },
    longCase: { type: Boolean, default: true },
    shortCase: { type: Boolean, default: true },
    continuousAssessment: { type: Boolean, default: true },
    passMark: { type: Number, default: 50 },
    gradingScale: { type: [String], default: ["A", "B", "C", "D", "F"] },
  },
  { timestamps: true }
);

export default mongoose.model<IAssessmentSettings>("AssessmentSettings", AssessmentSettingsSchema);
