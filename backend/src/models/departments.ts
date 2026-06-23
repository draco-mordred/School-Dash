
import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript to know the Structure

export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId; // Unique identifier
  name: string; // e.g "Department of Medicine"
  code: string; // e.g "MED"
  departmentID: string; // Unique identifier string (ex: MED-2026-001)
  head: mongoose.Types.ObjectId; // Reference to User (Teacher/Admin) � Department head
  units: mongoose.Types.ObjectId[]; // List of Units under this department
  courses: mongoose.Types.ObjectId[]; // List of Courses offered by this department
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, "Department name required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Department code required"],
      trim: true,
    },
    departmentID: {
      type: String,
      required: [true, "Department ID required"],
      trim: true,
    },
    // Reference to the User model (Teacher/Admin role) � Department head
    head: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Arrays of References to Unit model
    units: [
      {
        type: Schema.Types.ObjectId,
        ref: "Unit",
      },
    ],
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

// Compound Index: Prevents creating duplicate departments (e.g., You can't have two "MED" departments with the same departmentID)
DepartmentSchema.index(
  { name: 1, departmentID: 1 },
  { unique: true }
);

export default mongoose.model<IDepartment>("Department", DepartmentSchema);
