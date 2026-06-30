import mongoose, { Schema, Document } from "mongoose";
import type { classLevel } from "./academicClock";

  

export interface IAcademicYear extends Document {
  name: string; // 2026-2027
  fromYear: Date; // 2026-01-05
  toYear: Date; // 2026-09-10
  isCurrent: boolean; // true/false
  clockStartDate?: Date;
  clockIsPaused?: boolean;
  clockPausedAt?: Date | null;
  clockPhase?: "phase1" | "phase2" | "phase3" | "phase4" | null;
  classClockData?: Record<
    string,
    {
      classId: mongoose.Types.ObjectId;
      classLevel?: classLevel | null;
      clockStartDate?: Date | null;
      clockIsPaused?: boolean;
      clockPausedAt?: Date | null;
      clockPhase?: "phase1" | "phase2" | "phase3" | "phase4" | null;
      phaseConfig?: Record<
        string,
        {
          name: string;
          duration: number;
          postingType: string | null;
          postingId?: mongoose.Types.ObjectId | null;
        }
      >;
    }
  >;
}

const academicYearSchema = new Schema(
  {
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
  },
  { timestamps: true }
)
academicYearSchema.index({ name: 1 }, { unique: true });

export default mongoose.model<IAcademicYear>(
  "AcademicYear",
  academicYearSchema
)