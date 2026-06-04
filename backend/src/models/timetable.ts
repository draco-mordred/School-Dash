import mongoose, { Schema, Document } from "mongoose";

export interface IPeriod {
  subject: mongoose.Types.ObjectId;
  lecturer?: mongoose.Types.ObjectId;
  startTime: string; // e.g., "08:00",
  endTime: string; // e.g., "10:00"
}

export interface IDaySchedule {
  day: string; //"Monday", "Tueasday", etc.
  periods: IPeriod[];
}

export interface ITimetable extends Document {
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  schedule: IDaySchedule[];
  createdAt: Date;
}

const timetableSchema = new Schema(
  {
    class: { 
      type: mongoose.Types.ObjectId, 
      ref: "Class", 
      required: true 
    },
    academicYear: { 
      type: mongoose.Types.ObjectId, 
      ref: "AcademicYear", 
      required: true 
    },
    schedule: [
      {
        day: { type: String, required: true },
        periods: [
          {
            subject: { type: mongoose.Types.ObjectId, ref: "Course" },
            lecturer: { type: mongoose.Types.ObjectId, ref: "User" },
            startTime: String,
            endTime: String,
          }
        ]
      }
    ]
  },
  { timestamps: true}
);

// Prevent Multiple timetables for the same class/year
timetableSchema.index({ 
  class: 1, academicYear: 1 }, 
  { unique: true }
);

export default mongoose.model<ITimetable>("Timetable", timetableSchema);