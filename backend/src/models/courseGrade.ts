import mongoose, { Schema, Document } from "mongoose";

export interface ICourseGrade extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId | null;
  academicYear: mongoose.Types.ObjectId | null;
  caTestCount: number;
  // 0..caTestMaxScore — the averaged raw CA mark
  caAverageRaw: number;
  caAveragePercent: number;
  examPercent: number;
  weightedPercent: number;
  letter: string;
  gradePoints: number;
  creditUnits: number;
  passed: boolean;
  hasCa: boolean;
  hasExam: boolean;
  // G1 groundwork: results are hidden from students until released (G2 gates this).
  released: boolean;
  computedAt: Date;
}

const CourseGradeSchema = new Schema<ICourseGrade>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", default: null },
    academicYear: { type: Schema.Types.ObjectId, ref: "AcademicYear", default: null },
    caTestCount: { type: Number, default: 0 },
    caAverageRaw: { type: Number, default: 0 },
    caAveragePercent: { type: Number, default: 0 },
    examPercent: { type: Number, default: 0 },
    weightedPercent: { type: Number, default: 0 },
    letter: { type: String, default: "F" },
    gradePoints: { type: Number, default: 0 },
    creditUnits: { type: Number, default: 1, min: 0 },
    passed: { type: Boolean, default: false },
    hasCa: { type: Boolean, default: false },
    hasExam: { type: Boolean, default: false },
    released: { type: Boolean, default: false },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One computed result per student per course (courses are per academic year).
CourseGradeSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model<ICourseGrade>("CourseGrade", CourseGradeSchema);
