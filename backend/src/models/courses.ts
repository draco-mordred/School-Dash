import mongoose, { Schema, Document } from "mongoose";

/**
 * Course model (revamp)
 *
 * Target structure:
 * {
 *   name,
 *   code,
 *   courseID,
 *   department: ObjectId (Department),
 *   unit: ObjectId (Unit),
 *   lecturer: [ObjectId],
 *   isActive,
 *   studentClasses: [{ classID, students: [ObjectId] }],
 *   subjects: [{ name, code, courseID, lecturer: [ObjectId], isActive, students: [ObjectId] }]
 * }
 */

export interface IStudentClassMembership {
  classID: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
}

export interface ICourseSubject extends Document {
  name: string;
  code: string | null;

  /** Embedded subject instance id string (ex: CS101-2023-1) */
  subjectID: string;

  lecturer: mongoose.Types.ObjectId[];
  isActive: boolean;
  students: mongoose.Types.ObjectId[];
}

export interface ICourse extends Document {
  name: string;
  code: string;
  courseID: string;

  // Legacy fields used by existing UI/controller payloads
  semester?: string;
  year?: string;

  /** Department this course belongs to (mapped to Department model) */
  department: mongoose.Types.ObjectId;

  /** Unit this course belongs to (mapped to Unit model) */
  unit: mongoose.Types.ObjectId;


  /** Department-level lecturers for this course (top-level) */
  lecturer: mongoose.Types.ObjectId[];

  isActive: boolean;
  studentClasses: IStudentClassMembership[];

  /** Subject instances embedded under the course */
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

    // Keep naming consistent with your requested output: `subjectID` inside subject
    subjectID: { type: String, required: true, trim: true },

    lecturer: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    isActive: { type: Boolean, default: true },
    students: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

const CourseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true },

    // Keep naming consistent with your requested output
    courseID: { type: String, required: true, trim: true },

    semester: { type: String, required: false, trim: true, default: null },
    year: { type: String, required: false, trim: true, default: null },

    // Department + Unit references (models will be created soon)
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

    studentClasses: { type: [StudentClassMembershipSchema], default: [] },

    subjects: { type: [CourseSubjectSchema], default: [] },
  },
  { timestamps: true }
);

// Prevent duplicates for the same courseID across deployments
CourseSchema.index({ name: 1, courseID: 1 }, { unique: true });

export default mongoose.model<ICourse>("Course", CourseSchema);

