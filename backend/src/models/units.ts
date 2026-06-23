
import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript to know the Structure

export interface IUnit extends Document {
  _id: mongoose.Types.ObjectId; // Automatically added by MongoDB
  name: string; // e.g "Emergency Unit"
  code: string; // e.g "ER"
  unitID: string; // Unique identifier string (ex: ER-2026-001)
  department: mongoose.Types.ObjectId; // Reference to Department
  supervisor: mongoose.Types.ObjectId; // Reference to User (Supervisor)
  courses: mongoose.Types.ObjectId[]; // List of Courses offered in this unit
}

const UnitSchema = new Schema<IUnit>(
  {
    name: {
      type: String,
      required: [true, "Unit name required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Unit code required"],
      trim: true,
    },
    unitID: {
      type: String,
      required: [true, "Unit ID required"],
      trim: true,
    },
    // Reference to the Department model
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    // Reference to the User model (Supervisor role)
    supervisor: {
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
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Compound Index: Prevents creating duplicate units (e.g., You can't have two "ER" units with the same unitID)
UnitSchema.index(
  { name: 1, unitID: 1 },
  { unique: true }
);

export default mongoose.model<IUnit>("Unit", UnitSchema);
