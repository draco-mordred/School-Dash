import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion {
  _id: mongoose.Types.ObjectId;
  questionText: string;
  type: "MCQ" | "SHORT_ANSWER" | "ESSAY"; // must match schema enum
  options?: string[]; // only for MCQs
  correctAnswer: string;
  points: number;
}

export interface IExam extends Document {
  title: string;
  course: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  lecturer: mongoose.Types.ObjectId;
  duration: number; //in minutes
  questions: IQuestion[];
  dueDate: Date;
  isActive: boolean;
  // here we want to target the subjects within the course so that we can use the subject names to choose which subjects we want to generate questions for
  courseSubjects: mongoose.Types.ObjectId[];
  // PR G1: "major_exam" = the ONE major exam for the course;
  // "ca_test" = a cumulative CA test (series, averaged into the CA).
  assessmentKind: "major_exam" | "ca_test";
  // Optional explicit max score; when null the max is the sum of question points.
  maxScore?: number | null;
}

const examSchema = new Schema(
  {
    title: { type: String, required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    lecturer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    duration: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    questions: [
      {
        questionText: { type: String, required: true },
        type: { type: String, enum: ["MCQ", "SHORT_ANSWER", "ESSAY"], default: "MCQ" },
        options: [{ type: String }],
        correctAnswer: { type: String, select: false },
        points: { type: Number, default: 1 },
      },
    ],
    courseSubjects: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    // PR G1 grading fields
    assessmentKind: { type: String, enum: ["major_exam", "ca_test"], default: "major_exam" },
    maxScore: { type: Number, default: null, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IExam>("Exam", examSchema);
