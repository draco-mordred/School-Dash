import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion {
  _id: mongoose.Types.ObjectId;
  questionText: string;
  type: "MCQ" | "Sort answer" | "Essay";
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
  },
  { timestamps: true }
);

export default mongoose.model<IExam>("Exam", examSchema);