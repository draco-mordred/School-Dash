import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript to know the Structure

export interface IClass extends Document {
  name: string; // e.g 500 level
  academicYear: mongoose.Types.ObjectId; // Link to 2026-2027
  classTeacher: mongoose.Types.ObjectId; // The main Teacher in charge ... will change this later as Classes don't have a fixed teacher here ... maybe swap with Level cord or Examination officer.
  courses: mongoose.Types.ObjectId[]; // List of Courses taught in this class.
  students: mongoose.Types.ObjectId[]; // List of Students enrolled.
  capacity: number; // Max number of Students allowed (optional).
  cloudStorage: {
    provider: "google-drive" | "onedrive" | "dropbox" | "other";
    rootUrl: string;
    folderId: string;
    status: "idle" | "syncing" | "ready" | "error";
    lastSyncedAt?: Date | null;
    lastError?: string | null;
    syncedBy?: mongoose.Types.ObjectId | null;
  };
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
    cloudStorage: {
      provider: {
        type: String,
        enum: ["google-drive", "onedrive", "dropbox", "other"],
        default: "google-drive",
      },
      rootUrl: {
        type: String,
        default: "",
        trim: true,
      },
      folderId: {
        type: String,
        default: "",
        trim: true,
      },
      status: {
        type: String,
        enum: ["idle", "syncing", "ready", "error"],
        default: "idle",
      },
      lastSyncedAt: {
        type: Date,
        default: null,
      },
      lastError: {
        type: String,
        default: null,
      },
      syncedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
);

// Compound Index: Prevents creating duplicate classes (e.g., You can't have two "Grade 10 - A" in the same Academic Year)

classSchema.index(
  {name: 1, academicYear: 1},
  {unique: true}
);

export default mongoose.model<IClass>("Class", classSchema);