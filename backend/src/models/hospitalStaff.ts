import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHospitalStaff extends Document {
  _id: mongoose.Types.ObjectId;
  fileNumber: string; // Unique identifier from staff roster (e.g., "3721")
  name: string;
  qualification: string; // e.g., "PROF.", "DR.", etc.
  designation: "Professor" | "Reader" | "Associate Prof." | "Senior Lecturer" | "Lecturer I" | "Lecturer II";
  systemRole: "CONSULTANT" | "RESIDENT"; // For logbook sign-off purposes
  department: string; // e.g., "Internal Medicine", "Surgery", "O&G"
  assignedUnits: mongoose.Types.ObjectId[]; // References to HospitalUnit
  email?: string;
  phone?: string;
  isActive: boolean;
  canApproveLogbooks: boolean; // Permission to sign off clinical activities
  createdAt: Date;
  updatedAt: Date;
}

const HospitalStaffSchema = new Schema<IHospitalStaff>(
  {
    fileNumber: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    qualification: { type: String, required: true },
    designation: {
      type: String,
      enum: ["Professor", "Reader", "Associate Prof.", "Senior Lecturer", "Lecturer I", "Lecturer II"],
      required: true,
    },
    systemRole: {
      type: String,
      enum: ["CONSULTANT", "RESIDENT"],
      default: "CONSULTANT",
    },
    department: { type: String, required: true, trim: true },
    assignedUnits: [
      {
        type: mongoose.Types.ObjectId,
        ref: "HospitalUnit",
      },
    ],
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    canApproveLogbooks: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups (fileNumber is indexed via `unique: true` on the field)
HospitalStaffSchema.index({ department: 1, isActive: 1 });
HospitalStaffSchema.index({ assignedUnits: 1 });
HospitalStaffSchema.index({ systemRole: 1, canApproveLogbooks: 1 });

const HospitalStaffModel: Model<IHospitalStaff> = mongoose.model<IHospitalStaff>(
  "HospitalStaff",
  HospitalStaffSchema,
  "hospital_staff"
);

export default HospitalStaffModel;
