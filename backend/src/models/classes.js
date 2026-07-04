import mongoose, { Schema } from "mongoose";
const classSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Class name required'],
        trim: true,
    },
    // Reference to the Academic Year model
    academicYear: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "AcademicYear",
    },
    // Reference to the User model (Teacher role)
    classTeacher: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    // Arrays of References to Course model
    courses: [
        {
            type: Schema.Types.ObjectId,
            ref: "Course",
        },
    ],
    // Arrays of Refernces to User model (Student role)
    students: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    capacity: {
        type: Number,
        default: 200,
    },
}, {
    timestamps: true, // Automatically manages createdAt and updatedAt
});
// Compound Index: Prevents creating duplicate classes (e.g., You can't have two "Grade 10 - A" in the same Academic Year)
classSchema.index({ name: 1, academicYear: 1 }, { unique: true });
export default mongoose.model("Class", classSchema);
