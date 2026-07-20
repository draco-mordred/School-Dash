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
  sixth: [
    {
      id: "phase1",
      name: "O&G / Peds Senior Posting",
      durationMonths: 4,
      color: "#3B82F6",
      subPostings: ["O&G Senior", "Pediatrics Senior"],
    },
    {
      id: "phase2",
      name: "Specialty Senior Posting",
      durationMonths: 6,
      color: "#10B981",
      subPostings: ["Psychiatry", "ENT", "Anesthesiology", "Radiology", "Ophthalmology", "Dermatology"],
    },
    {
      id: "phase3",
      name: "Emergency & Critical Care Posting",
      durationMonths: 4,
      color: "#8B5CF6",
      subPostings: ["Emergency", "Critical Care"],
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

export const normalizePhasePlan = (plan?: AcademicClockPhaseDefinition[] | null): AcademicClockPhaseDefinition[] => {
  if (!Array.isArray(plan) || plan.length === 0) {
    return [];
  }

  return plan.map((phase, index) => ({
    id: phase?.id ?? `phase-${index + 1}`,
    name: phase?.name ?? `Phase ${index + 1}`,
    durationMonths: Number.isFinite(phase?.durationMonths) ? phase.durationMonths : 1,
    color: phase?.color ?? "#3B82F6",
    subPostings: Array.isArray(phase?.subPostings) ? phase.subPostings.filter(Boolean) : [],
  }));
};

export const getClassLevelPhasePlan = (className?: string | null): AcademicClockPhaseDefinition[] => {
  const normalized = (className ?? "").toLowerCase();

  if (normalized.includes("500") || normalized.includes("fifth")) {
    return CLASS_LEVEL_PHASE_PLANS.fifth;
  }

  if (normalized.includes("600") || normalized.includes("sixth")) {
    return CLASS_LEVEL_PHASE_PLANS.sixth;
  }

  if (normalized.includes("400") || normalized.includes("fourth")) {
    return CLASS_LEVEL_PHASE_PLANS.fourth;
  }

  if (normalized.includes("300") || normalized.includes("third")) {
    return CLASS_LEVEL_PHASE_PLANS.third;
  }

  return ACADEMIC_CLOCK_PHASES;
};

export const buildInitialPhasePlan = ({
  className,
  useTemplate = false,
  existingPlan,
}: {
  className?: string | null;
  useTemplate?: boolean;
  existingPlan?: AcademicClockPhaseDefinition[] | null;
}): AcademicClockPhaseDefinition[] => {
  if (existingPlan && existingPlan.length > 0) {
    return existingPlan.map((phase) => ({
      ...phase,
      subPostings: [...(phase.subPostings ?? [])],
    }));
  }

  if (!useTemplate) {
    return [];
  }

  return getClassLevelPhasePlan(className).map((phase) => ({
    ...phase,
    subPostings: [...phase.subPostings],
  }));
};

export const getTotalPhaseMonths = (phasePlan: Array<AcademicClockPhasePlanEntry> = ACADEMIC_CLOCK_PHASES) =>
  phasePlan.reduce((total, phase) => total + Math.max(0, phase.durationMonths), 0);

export const getClockPhaseId = (
  startDate: Date,
  currentDate: Date,
  phasePlan: Array<AcademicClockPhasePlanEntry> = ACADEMIC_CLOCK_PHASES,
): AcademicClockPhase => {
  const totalMonths = Math.max(0, getTotalPhaseMonths(phasePlan));
  const maxDays = totalMonths * ACADEMIC_CLOCK_DAYS_PER_MONTH;
  const elapsedDays = clamp(
    Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    0,
    maxDays,
  );

  const progressMonths = totalMonths > 0 ? elapsedDays / ACADEMIC_CLOCK_DAYS_PER_MONTH : 0;
  const currentMonth = clamp(progressMonths, 0, totalMonths);
  let localMonth = currentMonth;

  for (const phase of phasePlan) {
    if (localMonth < phase.durationMonths || phase === phasePlan[phasePlan.length - 1]) {
      return phase.id;
    }
    localMonth -= phase.durationMonths;
  }

  return phasePlan[phasePlan.length - 1]?.id ?? "phase4";
};

export interface ResolvedAcademicClockPhase {
  phaseId: AcademicClockPhase | null;
  phasePlan: AcademicClockPhaseDefinition[];
}

export const resolveActiveAcademicClockPhase = (
  clock?: {
    clockPhase?: string | null;
    clockStartDate?: string | Date | null;
    classLevel?: string | null;
  } | null,
  classNameOrLevel?: string | null,
  currentDate: Date = new Date(),
): ResolvedAcademicClockPhase => {
  const phasePlan = normalizePhasePlan(getClassLevelPhasePlan(clock?.classLevel ?? classNameOrLevel ?? ""));

  if (clock?.clockStartDate) {
    const startDate = clock.clockStartDate instanceof Date ? clock.clockStartDate : new Date(clock.clockStartDate);
    if (!Number.isNaN(startDate.getTime()) && phasePlan.length > 0) {
      return { phaseId: getClockPhaseId(startDate, currentDate, phasePlan), phasePlan };
    }
  }

  if (typeof clock?.clockPhase === "string" && clock.clockPhase) {
    return { phaseId: clock.clockPhase, phasePlan };
  }

  return {
    phaseId: phasePlan[0]?.id ?? null,
    phasePlan,
  };
};
