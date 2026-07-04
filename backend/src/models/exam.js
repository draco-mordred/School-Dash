import mongoose, { Schema } from "mongoose";
const examSchema = new Schema({
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
}, { timestamps: true });
export default mongoose.model("Exam", examSchema);
