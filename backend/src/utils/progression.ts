import type { Document } from "mongoose";

// PR G3 — pure exam-cycle progression math. No DB imports: fully unit-testable.
// JUTH MBBS exam-cycle ladder (NOV 2026 ADDITIONS a/b): 100 → 200 → 300 → 400A
// → (write 3rd MBBS) → 500A/500B → 600A/600B → graduate. Phase equivalences:
// 400B ≈ 500A and 500B ≈ 600A (same academic-clock phase).
// Nothing is hardcoded at read time: the ladder ships as a JUTH institution
// config seed and stays institution-configurable (AssessmentSettings.progressionPolicy).

export interface ProgressionStep {
  id: string;
  label: string;
  // Professional / final exam written at the END of this step (null = CA-only).
  exam: string | null;
  examKind: "professional" | "ca_tests" | "final" | null;
  // What a FAIL at this step means for progression.
  failAction: "repeat_step" | "repeat_from" | null;
  // For "repeat_from": the step the student repeats from (e.g. failing the
  // 3rd MBBS at the 400A → 500A transition repeats 400 from scratch).
  repeatFromStep?: string | null;
  // Clock-phase equivalences: steps/sub-levels sharing the same AcademicClock
  // phase (e.g. "400B" ≈ "500A"). Equivalences are symmetric and may reference
  // sub-level aliases that are not ladder steps themselves.
  equivalentSteps?: string[];
}

export interface ProgressionPolicy {
  passMarkPercent: number;
  // All course results must be released (and not withheld) before advancing.
  requireAllReleased: boolean;
  // Require the class academic clock to be configured/synced to advance.
  clockSyncRequired: boolean;
  // Ordered ladder of exam-cycle steps.
  ladder: ProgressionStep[];
}

const step = (s: ProgressionStep) => s;

// JUTH exam-cycle ladder (seeded via config/juthInstitution.ts).
export const DEFAULT_PROGRESSION_LADDER: ProgressionStep[] = [
  step({ id: "100", label: "100 Level (1st MBBS)", exam: "1st MBBS", examKind: "professional", failAction: "repeat_step" }),
  step({ id: "200", label: "200 Level (CA tests only)", exam: null, examKind: "ca_tests", failAction: "repeat_step" }),
  step({ id: "300", label: "300 Level (2nd MBBS)", exam: "2nd MBBS", examKind: "professional", failAction: "repeat_step" }),
  step({ id: "400A", label: "400 Level A", exam: null, examKind: null, failAction: "repeat_step" }),
  step({
    id: "500A",
    label: "500 Level A (writes 3rd MBBS at the 400A → 500A transition)",
    exam: "3rd MBBS",
    examKind: "professional",
    failAction: "repeat_from",
    repeatFromStep: "400A",
    equivalentSteps: ["400B"],
  }),
  step({ id: "500B", label: "500 Level B", exam: null, examKind: null, failAction: "repeat_step", equivalentSteps: ["400B"] }),
  step({
    id: "600A",
    label: "600 Level A (O&G senior postings + 4th MBBS)",
    exam: "4th MBBS",
    examKind: "professional",
    failAction: "repeat_step",
    equivalentSteps: ["500B"],
  }),
  step({ id: "600B", label: "600 Level B (final-year exams → graduation)", exam: "Final MBBS exams", examKind: "final", failAction: "repeat_step" }),
];

export const DEFAULT_PROGRESSION_POLICY: ProgressionPolicy = {
  passMarkPercent: 50,
  requireAllReleased: true,
  clockSyncRequired: false,
  ladder: DEFAULT_PROGRESSION_LADDER,
};

// Synthetic terminal step id: advancing past 600B graduates the student.
export const GRADUATED_STEP = "graduated";

// "500 Level", "500 level A", "500A", "500-A" → "500A". Bare level numbers from
// 400 up resolve to the A sub-level part (400+ classes split into A/B parts).
export const normalizeProgressionStep = (name?: string | null): string | null => {
  const raw = String(name ?? "").trim().toLowerCase();
  if (!raw) return null;
  const digits = raw.match(/(\d{3})/);
  if (!digits) return null;
  const base = digits[1];
  const hasA = /(^|[^a-z])a([^a-z]|$)/.test(raw) || raw.endsWith("a");
  const hasB = /(^|[^a-z])b([^a-z]|$)/.test(raw) || raw.endsWith("b");
  if (hasB && !hasA) return base + "B";
  if (hasA && !hasB) return base + "A";
  return base + "A";
};

export const findLadderStep = (
  ladder: ProgressionStep[] | null | undefined,
  stepId?: string | null,
): ProgressionStep | null =>
  (ladder ?? []).find((s) => s && s.id === String(stepId ?? "")) ?? null;

export const ladderStepIndex = (ladder: ProgressionStep[] | null | undefined, stepId?: string | null): number =>
  (ladder ?? []).findIndex((s) => s && s.id === String(stepId ?? ""));

// The next ladder step after stepId; null when stepId is the LAST step
// (advancing then means graduation) or unknown.
export const nextLadderStep = (
  ladder: ProgressionStep[] | null | undefined,
  stepId?: string | null,
): ProgressionStep | null => {
  const list = ladder ?? [];
  const index = ladderStepIndex(list, stepId);
  if (index < 0) return null;
  return list[index + 1] ?? null;
};

// Where a student who FAILS at stepId repeats: "repeat_from" jumps back to
// repeatFromStep (e.g. 3rd MBBS fail → repeat 400 from scratch), otherwise the
// same step. Null for unknown steps.
export const repeatTargetFor = (
  ladder: ProgressionStep[] | null | undefined,
  stepId?: string | null,
): ProgressionStep | null => {
  const s = findLadderStep(ladder, stepId);
  if (!s) return null;
  if (s.failAction === "repeat_from" && s.repeatFromStep) {
    return findLadderStep(ladder, s.repeatFromStep) ?? s;
  }
  return s;
};

// Clock-phase equivalence (NOV 2026 ADDITIONS b): 400B ≈ 500A, 500B ≈ 600A —
// symmetric. Either side may be a sub-level alias (e.g. "400B") that is not a
// ladder step itself: the equivalence declared on a ladder step (500A/600A)
// covers the alias.
export const sharesClockPhase = (
  ladder: ProgressionStep[] | null | undefined,
  a?: string | null,
  b?: string | null,
): boolean => {
  if (a == null || b == null) return false;
  if (String(a) === String(b)) return true;
  const sa = findLadderStep(ladder, a);
  const sb = findLadderStep(ladder, b);
  return Boolean(
    (sa?.equivalentSteps ?? []).includes(String(b)) ||
      (sb?.equivalentSteps ?? []).includes(String(a))
  );
};

export interface ProgressionCourseResult {
  passed: boolean | null;
  released?: boolean;
  withheld?: boolean;
  hasExam?: boolean;
  letter?: string | null;
}

export interface ProgressionEvaluation {
  gradedCount: number;
  failedCount: number;
  // Results not yet final (unreleased or withheld by the G2 gate).
  pendingCount: number;
  unreleasedCount: number;
  withheldCount: number;
  missingExamCount: number;
  passedAll: boolean;
  readyToAdvance: boolean;
  blockers: string[];
}

// Evaluate a student's released course results against the ladder policy.
// Only RELEASED and UNWITHHELD results count as final: withheld results (G2
// result-release gate) are treated as pending, never as pass or fail.
export const evaluateProgression = (
  courses: ProgressionCourseResult[],
  policy?: Partial<ProgressionPolicy> | null,
): ProgressionEvaluation => {
  const effective: ProgressionPolicy = {
    ...DEFAULT_PROGRESSION_POLICY,
    ...(policy ?? {}),
  };
  const list = courses ?? [];
  const blockers: string[] = [];
  let gradedCount = 0;
  let failedCount = 0;
  let unreleasedCount = 0;
  let withheldCount = 0;
  let missingExamCount = 0;

  for (const c of list) {
    if (c?.withheld === true) {
      withheldCount += 1;
      continue;
    }
    if (c?.released === false) {
      unreleasedCount += 1;
      continue;
    }
    if (c?.hasExam === false) {
      missingExamCount += 1;
    }
    gradedCount += 1;
    if (c?.passed !== true) failedCount += 1;
  }

  const pendingCount = unreleasedCount + withheldCount;
  if (gradedCount === 0) blockers.push("no-released-results");
  if (failedCount > 0) blockers.push("failed-courses");
  if (missingExamCount > 0) blockers.push("missing-major-exam");
  if (effective.requireAllReleased && pendingCount > 0) blockers.push("pending-results");

  const passedAll = failedCount === 0 && gradedCount > 0;
  return {
    gradedCount,
    failedCount,
    pendingCount,
    unreleasedCount,
    withheldCount,
    missingExamCount,
    passedAll,
    readyToAdvance: blockers.length === 0,
    blockers,
  };
};
