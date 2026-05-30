import mongoose, { Schema, Document } from "mongoose";
import User from "./user";

export interface ICourse extends Document {
  name: string; // "Pediatrics"
  courseID: string; // Specify the Course ID to which course the subject belongs to, e.g., PED for Pediatrics, OG for Obstetrics and Gynecology, etc. This can be used to group subjects under a specific course.
  code: string; // autmaticallyy generated from the course name.
  lecturer?: mongoose.Types.ObjectId[]; // Default lecturer for this subject
  isActive: boolean; // indicates if the subjecct is currently active
}

const CourseSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    courseID: { type: String, required: true }, // New field to specify the Course ID
    lecturer: [{ type: Schema.Types.ObjectId, ref: "User"}],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true}
);

export default mongoose.model<ICourse>("Course", CourseSchema);