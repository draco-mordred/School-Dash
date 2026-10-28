import mongoose, { Schema } from "mongoose";
const ActivityEntrySchema = new Schema({
    student: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
    },
    rotation: {
        type: mongoose.Types.ObjectId,
        ref: "ClinicalRotation",
    },
    unit: {
        type: mongoose.Types.ObjectId,
        ref: "HospitalUnit",
    },
    supervisor: {
        type: mongoose.Types.ObjectId,
        ref: "HospitalStaff",
    },
    umbrellaCategory: {
        type: String,
        enum: ["MEDICINE", "SURGERY", "OTHER"],
        required: true,
        default: "OTHER",
    },
    entryDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (v) {
                // Auto entries from clinical attendance may legitimately fall on
                // weekends (call duty); only manual submissions are weekday-only.
                if (this && this.source === "clinical_attendance") return true;
                const day = v.getDay();
                // 0 = Sunday, 6 = Saturday - reject weekends
                return day !== 0 && day !== 6;
            },
            message: "Clinical activity entries can only be documented for Monday through Friday.",
        },
    },
    // Categorisation (clinical logbook trend)
    category: {
        type: String,
        enum: ["clerking", "theatre", "clinic", "ward_round", "call_duty", "other"],
        default: "other",
    },
    categoryLabel: { type: String, default: "" },
    title: { type: String, default: "" },
    hours: { type: Number, default: 8 },
    groupId: { type: String, default: "" },
    groupLabel: { type: String, default: "" },
    supervisorName: { type: String, default: "" },
    source: {
        type: String,
        enum: ["manual", "clinical_attendance"],
        default: "manual",
    },
    clinicalSessionId: {
        type: mongoose.Types.ObjectId,
        ref: "ClinicalAttendance",
        default: null,
    },
    autoSigned: { type: Boolean, default: false },
    // Shared metrics
    clinicsAttended: { type: Boolean, default: false },
    wardRoundsAttended: {
        type: String,
        enum: ["NONE", "RESIDENT_ROUND", "CONSULTANT_ROUND", "BOTH"],
        default: "NONE",
    },
    callDutyCompleted: { type: Boolean, default: false },
    // Umbrella-specific metrics
    surgicalMetrics: {
        theatreDaysCount: { type: Number, default: 0 },
        casesObserved: [{ type: String }],
        casesAssisted: [{ type: String }],
    },
    medicalMetrics: {
        proceduresWitnessedOrDone: [{ type: String }],
    },
    // Approval tracking
    approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    approvedBy: {
        type: mongoose.Types.ObjectId,
        ref: "HospitalStaff",
    },
    approvedByRole: {
        type: String,
        enum: ["RESIDENT", "CONSULTANT"],
    },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    // Metadata
    notes: { type: String },
    attachments: [{ type: String }],
}, {
    timestamps: true,
});
// Indexes for fast queries
ActivityEntrySchema.index({ student: 1, entryDate: -1 });
ActivityEntrySchema.index({ rotation: 1, approvalStatus: 1 });
ActivityEntrySchema.index({ unit: 1, umbrellaCategory: 1 });
ActivityEntrySchema.index({ approvalStatus: 1, supervisor: 1 });
ActivityEntrySchema.index({ entryDate: 1, approvalStatus: 1 });
ActivityEntrySchema.index({ student: 1, category: 1 });
ActivityEntrySchema.index({ clinicalSessionId: 1, student: 1 }, { unique: true, sparse: true });
const ActivityEntryModel = mongoose.model("ActivityEntry", ActivityEntrySchema, "activity_entries");
export default ActivityEntryModel;
