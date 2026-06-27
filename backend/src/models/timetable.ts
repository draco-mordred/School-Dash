import mongoose, { Schema, Document } from "mongoose";

export interface IPeriod {
  subject: mongoose.Types.ObjectId;
  lecturer?: mongoose.Types.ObjectId;
  startTime: string; // e.g., "08:00",
  endTime: string; // e.g., "10:00"
  isClinical?: boolean;
  isOptional?: boolean;
  displayLabel?: string;
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
            // Timetable periods now point to embedded subjects inside Course
            subject: { type: mongoose.Types.ObjectId, ref: "Course", default: null },
            lecturer: { type: mongoose.Types.ObjectId, ref: "User", default: null },
            startTime: String,
            endTime: String,
            isClinical: { type: Boolean, default: false },
            isOptional: { type: Boolean, default: false },
            displayLabel: { type: String, default: null },
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