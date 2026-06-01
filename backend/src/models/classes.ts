import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript to know the Structure

export interface IClass extends Document {
  name: string; // e.g 500 level
  academicYear: mongoose.Types.ObjectId; // Link to 2026-2027
  classTeacher: mongoose.Types.ObjectId; // The main Teacher in charge ... will change this later as Classes don't have a fixed teacher here ... maybe swap with Level cord or Examination officer.
  courses: mongoose.Types.ObjectId[]; // List of Courses taught in this class.
  students: mongoose.Types.ObjectId[]; // List of Students enrolled.
  capacity: number; // Max number of Students allowed (optional).
}

const classSchema = new Schema<IClass>(
  {
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
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
)

// Compound Index: Prevents creating duplicate classes (e.g., You can't have two "Grade 10 - A" in the same Academic Year)

classSchema.index(
  {name: 1, academicYear: 1},
  {unique: true}
);

export default mongoose.model<IClass>("Class", classSchema);