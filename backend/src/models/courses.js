import mongoose, { Schema } from "mongoose";
const StudentClassMembershipSchema = new Schema({
    classID: {
        type: Schema.Types.ObjectId,
        ref: "Class",
        required: true,
    },
    students: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
}, { _id: false });
const CourseSubjectSchema = new Schema({
    subjectUID: {
        type: String,
        required: true,
        trim: true,
        default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: null },
    // Keep naming consistent with requested output
    subjectID: { type: String, required: true, trim: true },
    unit: {
        type: Schema.Types.ObjectId,
        ref: "Unit",
        required: false,
        default: null,
    },
    lecturer: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    isActive: { type: Boolean, default: true },
    semester: { type: String, trim: true, default: null },
    students: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
}, { timestamps: true });
const CourseSchema = new Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true },
    courseID: { type: String, required: true, trim: true },
    semester: { type: String, required: false, trim: true, default: null },
    year: { type: String, required: false, trim: true, default: null },
    department: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        required: true,
        index: true,
    },
    unit: {
        type: Schema.Types.ObjectId,
        ref: "Unit",
        required: false,
        index: true,
        default: null,
    },
    lecturer: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    isActive: { type: Boolean, default: true },
    // [{ classID, students: [UserIds] }]
    studentClasses: { type: [StudentClassMembershipSchema], default: [] },
    // Embedded subjects
    subjects: { type: [CourseSubjectSchema], default: [] },
    // REQUIRED: academic year
    academicYear: {
        type: Schema.Types.ObjectId,
        ref: "AcademicYear",
        required: false,
        index: true,
    },
}, { timestamps: true });
// Prevent duplicates for the same courseID + academicYear
CourseSchema.index({ courseID: 1, academicYear: 1, department: 1 }, { unique: true });
export default mongoose.model("Course", CourseSchema);
