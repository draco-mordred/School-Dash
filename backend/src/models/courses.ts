import mongoose, { Schema, Document } from "mongoose";
import User from "./user";

/**
 * Course revamp:
 * - Top-level Course document represents the main course across an academic year/semester context.
 * - Embedded `subjects[]` holds the “subject instances” (per semester/year frequency) with lecturer/student assignments.
 *
 * IMPORTANT (per current requirements):
 * - Timetable periods still reference only the top-level Course document (not embedded subjects).
 */

export interface ICourseSubject extends Document {
  name: string;
  code?: string;
  /**
   * Based on academic year + semester, as provided by your convention:
   * e.g. CS101-2023-1
   */
  subjectID: string;
  lecturer: mongoose.Types.ObjectId[];
  isActive: boolean;
  students: mongoose.Types.ObjectId[];
}

export interface IStudentClassMembership {
  classID: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
}

export interface ICourse extends Document {
  name: string;
  code: string;
  courseID: string;
  department: string;
  semester: string;
  year: string;
  isActive: boolean;
  studentClasses: IStudentClassMembership[];
  /**
   * Embedded subject instances for this course.
   */
  subjects: ICourseSubject[];
}

const StudentClassMembershipSchema = new Schema<IStudentClassMembership>(
  {
    classID: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    students: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { _id: false }
);

const CourseSubjectSchema = new Schema<ICourseSubject>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: null },
    subjectID: { type: String, required: true, trim: true },

    lecturer: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    isActive: { type: Boolean, default: true },
    students: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

// Prevent duplicates inside a course for the same subjectID
// Mongoose indexes for embedded docs can be defined, but keep them simple for compatibility.
// CourseSubjectSchema.index({ subjectID: 1 });

const CourseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    courseID: { type: String, required: true, trim: true },
    // matches your example
    department: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    studentClasses: { type: [StudentClassMembershipSchema], default: [] },
    subjects: { type: [CourseSubjectSchema], default: [] },
  },
  { timestamps: true }
);

// Optional/helps keep uniqueness across an academic context.
// If you want uniqueness differently (e.g., courseID alone), adjust this.
CourseSchema.index({ courseID: 1, department: 1, semester: 1, year: 1 }, { unique: true });

export default mongoose.model<ICourse>("Course", CourseSchema);

