import mongoose, { Schema } from "mongoose";
// NOTE:
// Your current backend uses `Course` as the model referenced by attendance:
// Attendance.subject ref: "Course".
// Some parts of the app still try to use a model named `Subjects`.
// This model is added to prevent MissingSchemaError crashes.
// If you later split Course vs Subject, you can adapt this schema accordingly.
const subjectSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    code: {
        type: String,
        trim: true,
        default: null,
    },
    courseID: {
        type: String,
        required: true,
        trim: true,
    },
    lecturer: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
// Avoid duplicates for same name/course
subjectSchema.index({ name: 1, courseID: 1 }, { unique: true });
export default mongoose.model("Subjects", subjectSchema);
