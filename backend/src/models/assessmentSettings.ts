import mongoose, { Schema, Document } from "mongoose";
import { DEFAULT_GRADING_POLICY, type GradeBand } from "../utils/grading";
import { DEFAULT_ELIGIBILITY_POLICY, type EligibilityPolicy } from "../utils/eligibility";

export interface IGradingPolicy {
  caWeightPercent: number;
  examWeightPercent: number;
  caTestMaxScore: number;
  gpaScale: number;
  passMarkPercent: number;
  gradeBands: GradeBand[];
}

export interface IAssessmentSettings extends Document {
  mcq: boolean;
  essay: boolean;
  osce: boolean;
  longCase: boolean;
  shortCase: boolean;
  continuousAssessment: boolean;
  passMark: number;
  gradingScale: string[];
  // PR G1: institution-configurable grading policy (JUTH values are seeded
  // once by config/juthInstitution.ts; admin edits always win afterwards).
  gradingPolicy: IGradingPolicy;
  // PR G2: institution-configurable exam-eligibility policy (seeded once by
  // config/juthInstitution.ts; admin edits always win afterwards).
  eligibilityPolicy: EligibilityPolicy;
}

const GradeBandSchema = new Schema(
  {
    letter: { type: String, required: true },
    minPercent: { type: Number, required: true },
    gradePoints: { type: Number, required: true },
  },
  { _id: false }
);

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
    gradingPolicy: {
      caWeightPercent: { type: Number, default: DEFAULT_GRADING_POLICY.caWeightPercent },
      examWeightPercent: { type: Number, default: DEFAULT_GRADING_POLICY.examWeightPercent },
      caTestMaxScore: { type: Number, default: DEFAULT_GRADING_POLICY.caTestMaxScore },
      gpaScale: { type: Number, default: DEFAULT_GRADING_POLICY.gpaScale },
      passMarkPercent: { type: Number, default: DEFAULT_GRADING_POLICY.passMarkPercent },
      gradeBands: {
        type: [GradeBandSchema],
        default: () => DEFAULT_GRADING_POLICY.gradeBands,
      },
    },
    // PR G2: exam-eligibility / result-release-gate policy
    eligibilityPolicy: {
      caThresholdPercent: { type: Number, default: DEFAULT_ELIGIBILITY_POLICY.caThresholdPercent },
      attendanceCutoffPercent: { type: Number, default: DEFAULT_ELIGIBILITY_POLICY.attendanceCutoffPercent },
      requireSchoolFees: { type: Boolean, default: DEFAULT_ELIGIBILITY_POLICY.requireSchoolFees },
      requireDepartmentalClearance: { type: Boolean, default: DEFAULT_ELIGIBILITY_POLICY.requireDepartmentalClearance },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAssessmentSettings>("AssessmentSettings", AssessmentSettingsSchema);
