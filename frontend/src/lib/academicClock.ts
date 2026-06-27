import type { AcademicClockPhase } from "@/types";

export interface AcademicClockPhaseDefinition {
  id: AcademicClockPhase;
  name: string;
  durationMonths: number;
  color: string;
  subPostings: string[];
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

export const getClockPhaseId = (startDate: Date, currentDate: Date): AcademicClockPhase => {
  const elapsedDays = clamp(
    Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    0,
    TOTAL_ACADEMIC_CLOCK_DAYS,
  );

  const progressMonths = elapsedDays / ACADEMIC_CLOCK_DAYS_PER_MONTH;
  const currentMonth = clamp(progressMonths, 0, TOTAL_ACADEMIC_CLOCK_MONTHS);
  let localMonth = currentMonth;

  for (const phase of ACADEMIC_CLOCK_PHASES) {
    if (localMonth < phase.durationMonths || phase === ACADEMIC_CLOCK_PHASES[ACADEMIC_CLOCK_PHASES.length - 1]) {
      return phase.id;
    }
    localMonth -= phase.durationMonths;
  }

  return "phase4";
};
