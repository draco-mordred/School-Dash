import mongoose, { Schema, Document } from "mongoose";
import User from "./user";

export interface ICourse extends Document {
  name: string; // "Pediatrics"
  courseID: string; // Specify the Course ID to which course the subject belongs to, e.g., PED for Pediatrics, OG for Obstetrics and Gynecology, etc. This can be used to group subjects under a specific course.
  code: string; // autmaticallyy generated from the course name.
  lecturer?: mongoose.Types.ObjectId[]; // Default lecturer for this subject
  isActive: boolean; // indicates if the subjecct is currently active
  students: mongoose.Types.ObjectId[]; // Array of student IDs enrolled in this subject, optional for now but can be used in the future for easier querying of students in a subject
}

const CourseSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    courseID: { type: String, required: true }, // New field to specify the Course ID
    lecturer: [{ type: Schema.Types.ObjectId, ref: "User"}],
    isActive: { type: Boolean, default: true },
    students: [{ type: Schema.Types.ObjectId, ref: "User" }], // Optional field to track enrolled students
  },
  { timestamps: true}
);

export default mongoose.model<ICourse>("Course", CourseSchema);

//display here the structure of what course looks like in the database.
// {
//   name: "Computer Science",
//   code: "CS101",
//   courseID: "CS101-2023",
//   lecturer: ["645645645645645645645645"], // Array of lecturer IDs
//   isActive: true,
//   students: ["645645645645645645645645"], // Array of student IDs
// }
//
//what if we remapped the course model so that each course model has an array of subjects within it, and the subjects themselves have a model? Instead of a list of Students at the Course level, we can have the COurse assigned to a CLass instead. Like:

// {  
//   name: "Pediatrics",
//   code: "PAE",
//   courseID: "PAE-2026",
//   lecturer: ["645645645645645645645645"], // Array of lecturer IDs this would be gotten from the user model and mapped according to staff from "Pediatrics Department" (According to the the list of Staff Per Department)
//   isActive: true,
//   studentClasses: [ {
//     classID: "645645645645645645645645",
//     students: ["645645645645645645645645"], // Array of student IDs
//   }],
//   subjects: [
//     {
//       name: "Introduction to Computer Science",
//       code: "CS101-1",
//       courseID: "CS101-2023-1",
//       lecturer: ["645645645645645645645645"], // Array of lecturer IDs
//       isActive: true,
//       students: ["645645645645645645645645"], // Array of student IDs
//     }, {
//       name: "Introduction to Computer Science",
//       code: "CS101-2",
//       courseID: "CS101-2023-2",
//       lecturer: ["645645645645645645645645"], // Array of lecturer IDs
//       isActive: true,
//       students: ["645645645645645645645645"], // Array of student IDs
//     }
//   ]
// }    
