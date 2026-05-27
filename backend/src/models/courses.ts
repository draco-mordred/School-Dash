import mongoose, { Schema, Document } from "mongoose";
import User from "./user";

export interface ICourse extends Document {
  name: string; // "Pediatrics"
  lecturer?: mongoose.Types.ObjectId[]; // Array of lecture objects with title, lecturer (reference to User), and date
  // // the course has multiple lectures each of which are taught by a lecturer, so we need to store the lecturer's name and the lecture title and the date of the lecture
  // lecture: mongoose.Types.ObjectId[]; // Array of lecture objects with title, lecturer (reference to User), and date
  isActive: boolean; // Indocates if the subject is currently active.
  //each course is split into various sections each of which are taken by different lecturers, like a standard university coourse, so we need to capture this data in the course model. Each section of the course will be called a Subject and will have A Teacher responsible for it, for example.
  // Histopathology (Introduction to Histopathology) - Dr. Ben James
  // Histopathology (The Cell) - Dr. Ben James
  // Subject: { type: String, required: true }, // "Histopathology"
  // So we create the Subject Object which will be an array of objects with the following structure:
  // lecture: {
  //   title: string; // "Introduction to Histopathology"
  //   lecturer: mongoose.Types.ObjectId; // Reference to User model (the lecturer)
  //   date: Date; // Date of the lecture
  // }[]; // Array of lecture objects with title, lecturer (reference to User), and date
  courseSections?: {
    title: string; // "Introduction to Histopathology"
    code: string; // "Histo101"
    lecturer: mongoose.Types.ObjectId; // Reference to User model (the lecturer)
    date: Date; // Date of the lecture
  }[]; // Array of course section objects with title, lecturer (reference to User), and date
  courseTitle?: string; // "Histopathology"
}
const SubjectSchema: Schema = new Schema(
  {
  name: { type: String, required: true }, //Pediatrics
  // code: { type: String, required: true }, //PED101
  isActive: { type: Boolean, default: true },
  courseSections: [
    {
      title: { type: String, required: true }, // "Introduction to Histopathology"
      lecturer: [{ type: Schema.Types.ObjectId, ref: User }], // Array of lecture objects with title, lecturer (reference to User), and date
      date: { type: Date, required: true }, // Date of the lecture
      code: { type: String, required: true }, // "Histo101"
    }
  ],
  courseTitle: { type: String, required: true } // "Histopathology"
},
{ timestamps: true }
);

export default mongoose.model<ICourse>("Course", SubjectSchema);