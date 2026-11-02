import type { Document } from "mongoose";

// PR G1 — pure grading/GPA math. No DB imports: fully unit-testable.

export interface GradeBand {
  letter: string;
  minPercent: number;
  gradePoints: number;
}

export interface GradingPolicy {
  // Weight of the CA average in the final course grade (default 40)
  caWeightPercent: number;
  // Weight of the major exam in the final course grade (default 60)
  examWeightPercent: number;
  // Each cumulative CA test is scored out of this (JUTH: 25)
  caTestMaxScore: number;
  // GPA scale (Nigerian 5.0)
  gpaScale: number;
  passMarkPercent: number;
  // Sorted descending by minPercent
  gradeBands: GradeBand[];
}

export const DEFAULT_GRADING_POLICY: GradingPolicy = {
  caWeightPercent: 40,
  examWeightPercent: 60,
  caTestMaxScore: 25,
  gpaScale: 5,
  passMarkPercent: 50,
  gradeBands: [
    { letter: "A", minPercent: 70, gradePoints: 5 },
    { letter: "B", minPercent: 60, gradePoints: 4 },
    { letter: "C", minPercent: 50, gradePoints: 3 },
    { letter: "D", minPercent: 45, gradePoints: 2 },
    { letter: "E", minPercent: 40, gradePoints: 1 },
    { letter: "F", minPercent: 0, gradePoints: 0 },
  ],
};

export interface ScoredItem {
  score: number;
  maxScore: number | null | undefined;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export const scorePercent = (
  score: number | null | undefined,
  maxScore: number | null | undefined
): number => {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  if (typeof maxScore !== "number" || !Number.isFinite(maxScore) || maxScore <= 0) return 0;
  return clampPercent((score / maxScore) * 100);
};

export const gradeFromPercent = (percent: number, bands: GradeBand[]): GradeBand => {
  const sorted = [...(bands ?? [])].sort((a, b) => b.minPercent - a.minPercent);
  for (const band of sorted) {
    if (percent >= band.minPercent) return band;
  }
  return { letter: "F", minPercent: 0, gradePoints: 0 };
};

// Course CA = average of ALL CA tests, expressed on the 0..caTestMaxScore scale.
export const averageCaRaw = (caTests: ScoredItem[], caTestMaxScore: number): number => {
  const list = caTests ?? [];
  if (list.length === 0) return 0;
  const max = typeof caTestMaxScore === "number" && caTestMaxScore > 0 ? caTestMaxScore : 25;
  const total = list.reduce(
    (sum, t) => sum + (scorePercent(t.score, t.maxScore) * max) / 100,
    0
  );
  return round2(total / list.length);
};

export interface CourseResult {
  caTestCount: number;
  // 0..caTestMaxScore
  caAverageRaw: number;
  caAveragePercent: number;
  examPercent: number;
  weightedPercent: number;
  letter: string;
  gradePoints: number;
  passed: boolean;
  hasCa: boolean;
  hasExam: boolean;
}

export interface CourseResultInput {
  caTests: ScoredItem[];
  // ONE major exam per course. When a course has several major exams, pass a
  // pre-averaged item { score: avgPercent, maxScore: 100 }.
  exam: ScoredItem | null;
  policy?: Partial<GradingPolicy> | null;
}

export const computeCourseResult = ({ caTests, exam, policy }: CourseResultInput): CourseResult => {
  const effective: GradingPolicy = {
    ...DEFAULT_GRADING_POLICY,
    ...(policy ?? {}),
    gradeBands:
      policy && (policy as GradingPolicy).gradeBands && (policy as GradingPolicy).gradeBands.length
        ? (policy as GradingPolicy).gradeBands
        : DEFAULT_GRADING_POLICY.gradeBands,
  };
  const caAverageRaw = averageCaRaw(caTests ?? [], effective.caTestMaxScore);
  const caAveragePercent =
    effective.caTestMaxScore > 0
      ? round2((caAverageRaw / effective.caTestMaxScore) * 100)
      : 0;
  const examPercent = exam ? scorePercent(exam.score, exam.maxScore) : 0;
  const weightSum = effective.caWeightPercent + effective.examWeightPercent;
  const caW = weightSum > 0 ? effective.caWeightPercent / weightSum : 0;
  const exW = weightSum > 0 ? effective.examWeightPercent / weightSum : 0;
  // A missing component contributes 0; completeness is flagged via hasCa/hasExam
  // so G2/G3 can gate eligibility/progression on them.
  const weightedPercent = round2(caAveragePercent * caW + examPercent * exW);
  const band = gradeFromPercent(weightedPercent, effective.gradeBands);
  return {
    caTestCount: (caTests ?? []).length,
    caAverageRaw,
    caAveragePercent,
    examPercent,
    weightedPercent,
    letter: band.letter,
    gradePoints: band.gradePoints,
    passed: weightedPercent >= effective.passMarkPercent,
    hasCa: (caTests ?? []).length > 0,
    hasExam: Boolean(exam),
  };
};

// GPA = credit-unit-weighted mean of grade points (Nigerian 5.0 scale).
// Missing/invalid credit units are treated as 1; a course list with zero total
// credits returns 0.
export const computeGpa = (
  results: Array<{ gradePoints: number | null | undefined; creditUnits: number | null | undefined }>
): number => {
  const list = results ?? [];
  let points = 0;
  let credits = 0;
  for (const r of list) {
    const cu = typeof r.creditUnits === "number" && r.creditUnits > 0 ? r.creditUnits : 1;
    points += (r.gradePoints ?? 0) * cu;
    credits += cu;
  }
  if (credits === 0) return 0;
  return round2(points / credits);
};
