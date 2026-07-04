import mongoose, { Schema } from "mongoose";
const academicYearSchema = new Schema({
    name: { type: String, required: true },
    fromYear: { type: Date, required: true },
    toYear: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    clockStartDate: { type: Date, default: null },
    clockIsPaused: { type: Boolean, default: false },
    clockPausedAt: { type: Date, default: null },
    clockPhase: {
        type: String,
        default: null,
    },
    classClockData: {
        type: Schema.Types.Mixed,
        default: {},
    },
}, { timestamps: true });
academicYearSchema.index({ name: 1 }, { unique: true });
export default mongoose.model("AcademicYear", academicYearSchema);
