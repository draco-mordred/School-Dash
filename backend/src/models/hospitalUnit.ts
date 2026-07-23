import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHospitalUnit extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  department: string;
  category: "academic" | "clinical";
  // umbrella: "MEDICINE" | "SURGERY"; // Clinical category for logbook purposes
  description?: string;
  supervisors: mongoose.Types.ObjectId[]; // References to HospitalStaff
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalUnitSchema = new Schema<IHospitalUnit>(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["academic", "clinical"],
      required: true,
    },
    // umbrella: {
    //   type: String,
    //   enum: ["MEDICINE", "SURGERY"],
    //   required: true,
    // },
    description: { type: String },
    supervisors: [
      {
        type: mongoose.Types.ObjectId,
        ref: "HospitalStaff",
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
HospitalUnitSchema.index({ department: 1, category: 1 });
// HospitalUnitSchema.index({ umbrella: 1, isActive: 1 });

const HospitalUnitModel: Model<IHospitalUnit> = mongoose.model<IHospitalUnit>(
  "HospitalUnit",
  HospitalUnitSchema,
  "hospital_units"
);

export default HospitalUnitModel;
