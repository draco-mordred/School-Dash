import mongoose, { Schema, Document } from "mongoose";

export interface ISubmission extends Document {
  exam: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  answers: { questionId: string; answer: string }[];
  score: number;
  submission: Date;
}

const submissionSchema = new Schema({
  exam: {type: Schema.Types.ObjectId, ref: "Exam", required: true },
  student: {type: Schema.Types.ObjectId, ref: "User", required: true },
  answers: [
    {
      questionId: String,
      answer: String,
    },
  ],
  score: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
});

// Prevent duplicate submissions
submissionSchema.index({ exam: 1, student: 1 }, { unique: true });

export default mongoose.model<ISubmission>("Submission", submissionSchema);