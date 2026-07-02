import mongoose, { Schema, Document } from "mongoose";

// Build the Clock Phases for each class level (3rd, 4th, 5th, 6th, Final Year)
export const LevelPhaseData = {
  final: {},
  sixth: {
    classNameID: "600 Level",
    phase1: {
      name: "Medicine and Surgery Final Postings",
      duration: 4,
      postingType: "MED&SURG3",
      postingId: null,
    },
    phase2: {
      name: "Other Specialty Postings",
      duration: 6,
      postingType: "SPECIALTY",
      postingId: null,
    },
    phase3: {
      name: "Community Medicine & Rural Postings",
      duration: 4,
      postingType: "COM&RURAL",
      postingId: null,
    },
    phase4: {
      name: "Acccident & Emergency Postings",
      duration: 2,
      postingType: "ACCIDENT&EMERGENCY",
      postingId: null,
    },
    numberOfPhases: 4,
  },
  fifth: {
    phase1: {
      name: "O&G/Pediatrics Junior Postings",
      duration: 4,
      postingType: "OG_PEDS",
      postingId: null,
    },
    phase2: {
      name: "Specialty Postings",
      duration: 6,
      postingType: "SPECIALTY",
      postingId: null,
    },
    phase3: {
      name: "O&G/Pediatrics Senior Postings",
      duration: 4,
      postingType: "OG_PEDS",
      postingId: null,
    },
    phase4: {
      name: "4th MBBS Exams/Elective Posting",
      duration: 2,
      postingType: null,
      postingId: null,
    },
    classNameID: "500 Level",
    numberOfPhases: 4,
  },
  fourth: {
    classNameID: "400 Level",
    phase1: {
      name: "Medicine and Surgery Initial Clinical Postings",
      duration: 10,
      postingType: "MED&SURG0&1&2",
      postingId: null,
    },
    phase2: {
      name: "Pathology Block Postings",
      duration: 4,
      postingType: "PATHOLOGY",
      postingId: null,
    },
    phase3: {
      name: "3rd MBBS Exams",
      duration: 2,
      postingType: null,
      postingId: null,
    },
    numberOfPhases: 3,
  },
  third: {
    classNameID: "300 Level",
    phase1: {
      name: "Preclinical Postings",
      duration: 12,
      postingType: "PRECLINICAL",
      postingId: null,
    },
    phase2: {
      name: "2nd MBBS Exams",
      duration: 2,
      postingType: null,
      postingId: null,
    },
    numberOfPhases: 2,
  },
} as const;

export type classLevel = "final" | "sixth" | "fifth" | "fourth" | "third";
export type AcademicClockPhase = "phase1" | "phase2" | "phase3" | "phase4";

export type AcademicClockPhaseConfig = {
  name: string;
  duration: number;
  postingType: string | null;
  postingId?: mongoose.Types.ObjectId | null;
};

export const resolveClassLevelFromName = (className?: string | null): classLevel | null => {
  const normalized = (className ?? "").toLowerCase();

  if (normalized.includes("500") || normalized.includes("fifth")) return "fifth";
  if (normalized.includes("400") || normalized.includes("fourth")) return "fourth";
  if (normalized.includes("300") || normalized.includes("third")) return "third";
  if (normalized.includes("600") || normalized.includes("sixth")) return "sixth";
  if (normalized.includes("final")) return "final";

  return null;
};

export const buildPhaseConfigForClassLevel = (classLevel?: classLevel | string | null): Record<string, AcademicClockPhaseConfig> => {
  if (!classLevel) return {};

  const phaseData = (LevelPhaseData as Record<string, Record<string, unknown>>)[String(classLevel)] ?? {};

  return Object.entries(phaseData)
    .filter(([key]) => key.startsWith("phase"))
    .reduce<Record<string, AcademicClockPhaseConfig>>((acc, [key, value]) => {
      const phaseValue = value as { name?: unknown; duration?: unknown; postingType?: unknown; postingId?: unknown };
      acc[key] = {
        name: String(phaseValue?.name ?? ""),
        duration: Number(phaseValue?.duration ?? 0),
        postingType: (phaseValue?.postingType as string | null | undefined) ?? null,
        postingId: (phaseValue?.postingId as mongoose.Types.ObjectId | null | undefined) ?? null,
      };
      return acc;
    }, {});
};

export const CLASS_LEVEL_META: Record<classLevel, { name: string; numberOfPhases: number }> = {
  final: { name: "Final Year", numberOfPhases: 0 },
  sixth: { name: "Sixth Year", numberOfPhases: 4 },
  fifth: { name: "Fifth Year", numberOfPhases: 4 },
  fourth: { name: "Fourth Year", numberOfPhases: 3 },
  third: { name: "Third Year", numberOfPhases: 2 },
};

export interface IAcademicClock extends Document {
  academicYear: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  classLevel?: classLevel | null;
  clockStartDate?: Date | null;
  clockIsPaused?: boolean;
  clockPausedAt?: Date | null;
  clockPhase?: AcademicClockPhase | null;
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

const AcademicClockSchema: Schema<IAcademicClock> = new Schema(
  {
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    classLevel: {
      type: String,
      enum: ["final", "sixth", "fifth", "fourth", "third"],
      default: null,
    },
    clockStartDate: {
      type: Date,
      default: null,
    },
    clockIsPaused: {
      type: Boolean,
      default: false,
    },
    clockPausedAt: {
      type: Date,
      default: null,
    },
    clockPhase: {
      type: String,
      enum: ["phase1", "phase2", "phase3", "phase4"],
      default: null,
    },
    phaseConfig: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const AcademicClock = mongoose.model<IAcademicClock>("AcademicClock", AcademicClockSchema);
export default AcademicClock;

export const PostingTemplate = {
  Schedule: {
    _id: new mongoose.Types.ObjectId("64f8e1c2f1a2b3c4d5e6f7a9"), // Replace with the actual Schedule ID
    name: "500 Level OG/PAE Junior Postings",
    duration: 4, //months
    postingType: "OG_PEDS",
    postingId: null,
    classLevel: "fifth",
    classNameID: "500 Level",
    classId: new mongoose.Types.ObjectId("64f8e1c2f1a2b3c4d5e6f7a8"), // Replace with the actual Class ID for 500 Level
    startDate: new Date(), // Replace with the actual start date of the posting
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 4)), // Replace with the actual end date of the posting
    phase1: {
      groupA: {
        posting: "O&G",
        duration: 2, //months
        totalNumberofUnitsPerStudent: 2,
        units: {
          unit1: {
            OandG_Unit_1: {
              name: "O&G Unit 1",
              duration: 1, //months
              postingType: "O&G",
              students: [], //array of student IDs
            },
          },
          unit2: {
            OandG_Unit_2: {
              name: "O&G Unit 2",
              duration: 1, //months
              postingType: "O&G",
              students: [], //array of student IDs
            }
          }
        }, //array of units for this posting
      },
      groupB: {
        posting: "Pediatrics",
        duration: 2, //months
        totalNumberofUnitsPerStudent: 4,
        units: {
          unit1: {
            Pediatrics_Unit_1: {
              name: "Pediatrics Unit 1",
              duration: 2, // weeks
              postingType: "Pediatrics",
              students: [], //array of student IDs
            },
          },
          unit2: {
            Pediatrics_Unit_2: {
              name: "Pediatrics Unit 2",
              duration: 2, // weeks
              postingType: "Pediatrics",
              students: [], //array of student IDs
            },
          }, //array of units for this posting
          unit3: {
            Pediatrics_Unit_3: {
              name: "Pediatrics Unit 3",
              duration: 2, // weeks
              postingType: "Pediatrics",
              students: [], //array of student IDs
            },
          },
          unit4: {
            Pediatrics_Unit_4: {
              name: "Pediatrics Unit 4",
              duration: 2, // weeks
              postingType: "Pediatrics",
              students: [], //array of student IDs
          },
        }
      },
    },
  }, 
  
  phase2: {
      groupA: {
        posting: "Pediatrics",
        duration: 2, //months
        totalNumberofUnitsPerStudent: 4,
        units: {
          unit1: {
            Pediatrics_Unit_1: {
              name: "Pediatrics Unit 1",
              duration: 2, // weeks
              postingType: "Pediatrics",
              students: [], //array of student IDs
            },
          },
          unit2: {
            Pediatrics_Unit_2: {
              name: "Pediatrics Unit 2",
              duration: 2, // weeks
              postingType: "Pediatrics",
              students: [], //array of student IDs
            },
          }, //array of units for this posting
          unit3: {
            Pediatrics_Unit_3: {
              name: "Pediatrics Unit 3",
              duration: 2, // weeks
              postingType: "Pediatrics",
              students: [], //array of student IDs
            },
          },
          unit4: {
            Pediatrics_Unit_4: {
              name: "Pediatrics Unit 4",
              duration: 2, // weeks
              postingType: "Pediatrics",
              students: [], //array of student IDs
          },
        }
      },
    },
      groupB: {
        posting: "O&G",
        duration: 2, //months
        totalNumberofUnitsPerStudent: 2,
        units: {
          unit1: {
            OandG_Unit_1: {
              name: "O&G Unit 1",
              duration: 1, //months
              postingType: "O&G",
              students: [], //array of student IDs
            },
          },
          unit2: {
            OandG_Unit_2: {
              name: "O&G Unit 2",
              duration: 1, //months
              postingType: "O&G",
              students: [], //array of student IDs
            }
          }
        }, //array of units for this posting   
        },
      }
    }
} as const;