import mongoose, { Schema } from "mongoose";
const HospitalStaffSchema = new Schema({
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
}, {
    timestamps: true,
});
// Indexes for faster lookups (fileNumber is indexed via `unique: true` on the field)
HospitalStaffSchema.index({ department: 1, isActive: 1 });
HospitalStaffSchema.index({ assignedUnits: 1 });
HospitalStaffSchema.index({ systemRole: 1, canApproveLogbooks: 1 });
const HospitalStaffModel = mongoose.model("HospitalStaff", HospitalStaffSchema, "hospital_staff");
export default HospitalStaffModel;
