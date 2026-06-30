import type { AcademicClockPhase } from "@/types";

export interface AcademicClockPhaseDefinition {
  id: AcademicClockPhase;
  name: string;
  durationMonths: number;
  color: string;
  subPostings: string[];
}

export interface AcademicClockPhasePlanEntry {
  id: AcademicClockPhase;
  durationMonths: number;
}

export const TOTAL_ACADEMIC_CLOCK_MONTHS = 16;
export const ACADEMIC_CLOCK_DAYS_PER_MONTH = 30;
export const TOTAL_ACADEMIC_CLOCK_DAYS = TOTAL_ACADEMIC_CLOCK_MONTHS * ACADEMIC_CLOCK_DAYS_PER_MONTH;

export const ACADEMIC_CLOCK_PHASES: AcademicClockPhaseDefinition[] = [
  {
    id: "phase1",
    name: "O&G / Peds Junior",
    durationMonths: 4,
    color: "#3B82F6",
    subPostings: ["O&G Junior", "Pediatrics Junior"],
  },
  {
    id: "phase2",
    name: "Specialty Postings",
    durationMonths: 6,
    color: "#10B981",
    subPostings: [
      "Psychiatry",
      "ENT",
      "Anesthesiology",
      "Radiology",
      "Ophthalmology",
      "Dermatology",
    ],
  },
  {
    id: "phase3",
    name: "O&G / Peds Senior",
    durationMonths: 4,
    color: "#8B5CF6",
    subPostings: ["O&G Senior", "Pediatrics Senior"],
  },
  {
    id: "phase4",
    name: "Exam / Elective",
    durationMonths: 2,
    color: "#EF4444",
    subPostings: ["Revision", "Final Exam"],
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const CLASS_LEVEL_PHASE_PLANS: Record<string, AcademicClockPhaseDefinition[]> = {
  fifth: [
    {
      id: "phase1",
      name: "O&G Junior Posting",
      durationMonths: 4,
      color: "#3B82F6",
      subPostings: ["O&G Junior", "Pediatrics Junior"],
    },
    {
      id: "phase2",
      name: "Specialty Posting",
      durationMonths: 6,
      color: "#10B981",
      subPostings: ["Psychiatry", "ENT", "Anesthesiology", "Radiology", "Ophthalmology", "Dermatology"],
    },
    {
      id: "phase3",
      name: "O&G Senior Posting",
      durationMonths: 4,
      color: "#8B5CF6",
      subPostings: ["O&G Senior", "Pediatrics Senior"],
    },
    {
      id: "phase4",
      name: "Exam / Elective",
      durationMonths: 2,
      color: "#EF4444",
      subPostings: ["Revision", "Final Exam"],
    },
  ],
  fourth: [
    {
      id: "phase1",
      name: "Medicine and Surgery Clinical Postings",
      durationMonths: 10,
      color: "#3B82F6",
      subPostings: ["Medicine", "Surgery"],
    },
    {
      id: "phase2",
      name: "Pathology Block Postings",
      durationMonths: 4,
      color: "#10B981",
      subPostings: ["Pathology"],
    },
    {
      id: "phase3",
      name: "3rd MBBS Exams",
      durationMonths: 2,
      color: "#EF4444",
      subPostings: ["Exams"],
    },
  ],
  third: [
    {
      id: "phase1",
      name: "Preclinical Postings",
      durationMonths: 12,
      color: "#3B82F6",
      subPostings: ["Preclinical"],
    },
    {
      id: "phase2",
      name: "2nd MBBS Exams",
      durationMonths: 2,
      color: "#EF4444",
      subPostings: ["Exams"],
    },
  ],
};

export const getClassLevelPhasePlan = (className?: string | null): AcademicClockPhaseDefinition[] => {
  const normalized = (className ?? "").toLowerCase();

  if (normalized.includes("500") || normalized.includes("fifth")) {
    return CLASS_LEVEL_PHASE_PLANS.fifth;
  }

  if (normalized.includes("400") || normalized.includes("fourth")) {
    return CLASS_LEVEL_PHASE_PLANS.fourth;
  }

  if (normalized.includes("300") || normalized.includes("third")) {
    return CLASS_LEVEL_PHASE_PLANS.third;
  }

  return ACADEMIC_CLOCK_PHASES;
};

export const getClockPhaseId = (
  startDate: Date,
  currentDate: Date,
  phasePlan: Array<AcademicClockPhasePlanEntry> = ACADEMIC_CLOCK_PHASES,
): AcademicClockPhase => {
  const elapsedDays = clamp(
    Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    0,
    TOTAL_ACADEMIC_CLOCK_DAYS,
  );

  const progressMonths = elapsedDays / ACADEMIC_CLOCK_DAYS_PER_MONTH;
  const currentMonth = clamp(progressMonths, 0, TOTAL_ACADEMIC_CLOCK_MONTHS);
  let localMonth = currentMonth;

  for (const phase of phasePlan) {
    if (localMonth < phase.durationMonths || phase === phasePlan[phasePlan.length - 1]) {
      return phase.id;
    }
    localMonth -= phase.durationMonths;
  }

  return phasePlan[phasePlan.length - 1]?.id ?? "phase4";
};
