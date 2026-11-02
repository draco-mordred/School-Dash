// PR G3 — pure exam-cycle progression / ladder math. No DB imports.

// One rung of the institution's exam-cycle ladder (JUTH MBBS by default,
// seeded via config/juthInstitution.ts — NOT hardcoded at read time).
export interface ProgressionStage {
  id: string;
  // Sort key for the ladder (100 < 200 < ... )
  order: number;
  label: string;
  // Class-level digits this stage maps to in the DB class names, e.g. "400"
  classLevel: string;
  // Sub-level part for classes from 400 level up: "A" | "B" | null
  subLevel: string | null;
  // The exit exam of this cycle (e.g. "3rd MBBS"); null = tests-only stage
  examName: string | null;
  // What happens when the stage is failed
  failAction: "repeat_stage" | "repeat_from" | "stay";
  // For failAction "repeat_from": the stage id to go back to
  repeatFromStageId?: string | null;
  // The AcademicClock class-level this stage's clock runs on. Phase
  // equivalences (NOV 2026 ADDITIONS b): 400B ≈ 500A and 500B ≈ 600A —
  // sub-level cohorts share the SAME clock phase as their equivalence.
  clockClassLevel: string;
}

export interface ProgressionPolicy {
  stages: ProgressionStage[];
  // Percent a released course grade must reach to count as passed
  passMarkPercent: number;
  // Sub-level equivalence map used when resolving a class's clock phase
  phaseEquivalences: Record<string, string>;
}

// The JUTH MBBS exam-cycle ladder (user-described, Oct/Nov 2026):
// 100 (1st MBBS) -> 200 (tests only) -> 300 (2nd MBBS) -> 400A ->
// at ~3/5 of the class year transition to 500A and write 3rd MBBS
// (fail = repeat 400 from scratch) -> 500A (O&G junior + specialty) ->
// cohort then regarded 500B/600A -> 600A (O&G senior + 4th MBBS, pass ->
// 600B) -> 600B (final postings + final-year exams) -> graduation.
export const DEFAULT_PROGRESSION_POLICY: ProgressionPolicy = {
  passMarkPercent: 50,
  phaseEquivalences: { "400B": "500A", "500B": "600A" },
  stages: [
    { id: "100", order: 100, label: "100 Level", classLevel: "100", subLevel: null, examName: "1st MBBS", failAction: "repeat_stage", clockClassLevel: "100" },
    { id: "200", order: 200, label: "200 Level", classLevel: "200", subLevel: null, examName: null, failAction: "repeat_stage", clockClassLevel: "200" },
    { id: "300", order: 300, label: "300 Level", classLevel: "300", subLevel: null, examName: "2nd MBBS", failAction: "repeat_stage", clockClassLevel: "300" },
    { id: "400A", order: 400, label: "400 Level A", classLevel: "400", subLevel: "A", examName: null, failAction: "stay", clockClassLevel: "400A" },
    { id: "400B", order: 450, label: "400 Level B", classLevel: "400", subLevel: "B", examName: null, failAction: "stay", clockClassLevel: "400A" },
    { id: "500A", order: 500, label: "500 Level A", classLevel: "500", subLevel: "A", examName: "3rd MBBS", failAction: "repeat_from", repeatFromStageId: "400A", clockClassLevel: "500A" },
    { id: "500B", order: 550, label: "500 Level B", classLevel: "500", subLevel: "B", examName: null, failAction: "stay", clockClassLevel: "500A" },
    { id: "600A", order: 600, label: "600 Level A", classLevel: "600", subLevel: "A", examName: "4th MBBS", failAction: "repeat_stage", clockClassLevel: "600A" },
    { id: "600B", order: 650, label: "600 Level B", classLevel: "600", subLevel: "B", examName: "Final MBBS Exams", failAction: "repeat_stage", clockClassLevel: "600A" },
  ],
};

export const normalizeLadder = (stages: ProgressionStage[]): ProgressionStage[] =>
  [...(stages ?? [])]
    .filter((s) => s && typeof s.id === "string" && s.id.trim().length > 0)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

export const resolveStage = (
  stages: ProgressionStage[],
  stageId: string | null | undefined,
): ProgressionStage | null =>
  normalizeLadder(stages).find((s) => s.id === String(stageId ?? "")) ?? null;

export const nextStage = (
  stages: ProgressionStage[],
  stageId: string | null | undefined,
): ProgressionStage | null => {
  const ladder = normalizeLadder(stages);
  const current = resolveStage(ladder, stageId);
  if (!current) return null;
  return ladder.find((s) => Number(s.order) > Number(current.order)) ?? null;
};

// Where a failed student goes. "repeat_from" rewinds to repeatFromStageId
// (JUTH: fail 3rd MBBS in 500A -> repeat 400 from scratch), "repeat_stage"
// stays on the same stage, "stay" leaves the decision to the admin.
export const failTargetStageId = (stage: ProgressionStage | null): string | null => {
  if (!stage) return null;
  if (stage.failAction === "repeat_from" && stage.repeatFromStageId) {
    return stage.repeatFromStageId;
  }
  if (stage.failAction === "repeat_stage") return stage.id;
  return null;
};

const extractLevel = (className?: string | null): { level: string; sub: string | null } => {
  const norm = String(className ?? "").toLowerCase().replace(/\s+/g, "");
  const match = norm.match(/(\d{3})/);
  const level = match ? match[1] : "";
  const subMatch = norm.match(/([ab])(?![a-z])/);
  const sub = subMatch ? subMatch[1].toUpperCase() : null;
  return { level, sub };
};

// Resolve the ladder stage a DB class name ("500 Level A", "400B") maps to.
export const resolveStageForClassName = (
  stages: ProgressionStage[],
  className?: string | null,
): ProgressionStage | null => {
  const { level, sub } = extractLevel(className);
  if (!level) return null;
  const ladder = normalizeLadder(stages);
  const byId = ladder.find((s) => s.id === level + (sub ?? "")) ?? null;
  if (byId) return byId;
  // Sub-level fallback: prefer the matching sub-level, else the bare level
  const matches = ladder.filter((s) => s.classLevel === level);
  if (matches.length === 0) return null;
  return matches.find((s) => s.subLevel === sub) ?? matches[0];
};

// Phase equivalences (NOV 2026 ADDITIONS b): 400B ≈ 500A, 500B ≈ 600A —
// the SAME academic clock phase. Maps a stage to the clock class-level it
// runs on, applying the equivalence map first.
export const clockClassForStage = (
  policy: ProgressionPolicy | null | undefined,
  stage: ProgressionStage | null,
): string | null => {
  if (!stage) return null;
  const key = stage.id;
  const equivalents = policy?.phaseEquivalences ?? {};
  if (equivalents[key]) return String(equivalents[key]);
  return stage.clockClassLevel ?? stage.classLevel ?? null;
};

export interface StageGradeInput {
  passed?: boolean | null;
  released?: boolean | null;
  withheld?: boolean | null;
  hasCa?: boolean | null;
  hasExam?: boolean | null;
  weightedPercent?: number | null;
}

export interface StageOutcome {
  totalCourses: number;
  passedCount: number;
  failedCount: number;
  withheldCount: number;
  incompleteCount: number;
  pendingCount: number;
  // Weighted average across RELEASED, non-withheld, complete grades
  weightedAverage: number;
  allPassed: boolean;
  // True when every course grade is released, not withheld, complete and
  // passing — the student is ready to be advanced to the next stage.
  readyToAdvance: boolean;
}

// Pure evaluation of one student's course grades against a stage gate:
// a course counts only when RELEASED and NOT withheld (PR G2 gate); a
// complete grade (hasCa + hasExam) must be >= passMarkPercent to pass;
// incomplete or still-pending grades keep the student from advancing.
export const evaluateStageOutcome = (
  grades: StageGradeInput[],
  passMarkPercent: number,
): StageOutcome => {
  const list = grades ?? [];
  let passedCount = 0;
  let failedCount = 0;
  let withheldCount = 0;
  let incompleteCount = 0;
  let pendingCount = 0;
  let percentSum = 0;
  let percentCount = 0;

  for (const g of list) {
    if (g.withheld) {
      withheldCount += 1;
      continue;
    }
    if (!g.released) {
      pendingCount += 1;
      continue;
    }
    const complete = Boolean(g.hasCa) && Boolean(g.hasExam);
    const percent = typeof g.weightedPercent === "number" && Number.isFinite(g.weightedPercent)
      ? g.weightedPercent
      : 0;
    if (!complete) {
      incompleteCount += 1;
      continue;
    }
    percentSum += percent;
    percentCount += 1;
    if (percent >= passMarkPercent) passedCount += 1;
    else failedCount += 1;
  }

  const weightedAverage = percentCount > 0 ? Math.round((percentSum / percentCount) * 100) / 100 : 0;

  return {
    totalCourses: list.length,
    passedCount,
    failedCount,
    withheldCount,
    incompleteCount,
    pendingCount,
    weightedAverage,
    allPassed: failedCount === 0 && incompleteCount === 0 && withheldCount === 0 && pendingCount === 0 && passedCount > 0,
    readyToAdvance: failedCount === 0 && incompleteCount === 0 && withheldCount === 0 && pendingCount === 0 && passedCount > 0,
  };
};
