import mongoose, { Schema, Document } from "mongoose";

export interface IFaculty extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  facultyID: string;
  head?: mongoose.Types.ObjectId | null;
  departments: mongoose.Types.ObjectId[];
  units: mongoose.Types.ObjectId[];
}

const FacultySchema = new Schema<IFaculty>(
  {
    name: {
      type: String,
      required: [true, "Faculty name required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Faculty code required"],
      trim: true,
    },
    facultyID: {
      type: String,
      required: [true, "Faculty ID required"],
      trim: true,
    },
    head: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    departments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
    units: [
      {
        type: Schema.Types.ObjectId,
        ref: "Unit",
      },
    ],
  },
  {
    timestamps: true,
  }
);

FacultySchema.index(
  { name: 1, facultyID: 1 },
  { unique: true }
);

export default mongoose.model<IFaculty>("Faculty", FacultySchema);
