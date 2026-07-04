import mongoose, { Schema } from "mongoose";
const HospitalUnitSchema = new Schema({
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ["medicine", "surgery", "paediatrics", "obstetrics", "block", "specialty"],
        required: true,
    },
    umbrella: {
        type: String,
        enum: ["MEDICINE", "SURGERY"],
        required: true,
    },
    description: { type: String },
    supervisors: [
        {
            type: mongoose.Types.ObjectId,
            ref: "HospitalStaff",
        },
    ],
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});
// Index for faster lookups
HospitalUnitSchema.index({ department: 1, category: 1 });
HospitalUnitSchema.index({ umbrella: 1, isActive: 1 });
const HospitalUnitModel = mongoose.model("HospitalUnit", HospitalUnitSchema, "hospital_units");
export default HospitalUnitModel;
