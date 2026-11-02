import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PROGRESSION_POLICY,
  evaluateStageOutcome,
  failTargetStageId,
  nextStage,
  normalizeLadder,
  resolveStage,
  resolveStageForClassName,
  clockClassForStage,
} from "../src/utils/progression";

// PR G3 — pure exam-cycle ladder / phase-gate tests.

describe("progression ladder", () => {
  test("JUTH default ladder covers 100 -> 600B in order", () => {
    const ladder = normalizeLadder(DEFAULT_PROGRESSION_POLICY.stages);
    expect(ladder.map((s) => s.id)).toEqual([
      "100", "200", "300", "400A", "400B", "500A", "500B", "600A", "600B",
    ]);
  });

  test("normalizeLadder sorts by order and drops invalid entries", () => {
    const ladder = normalizeLadder([
      { id: "600A", order: 600, label: "600A", classLevel: "600", subLevel: "A", failAction: "stay", clockClassLevel: "600A" },
      { id: "", order: 1, label: "bad", classLevel: "x", subLevel: null, failAction: "stay", clockClassLevel: "x" },
      { id: "100", order: 100, label: "100", classLevel: "100", subLevel: null, failAction: "stay", clockClassLevel: "100" },
    ] as any);
    expect(ladder.map((s) => s.id)).toEqual(["100", "600A"]);
  });

  test("resolveStage and nextStage walk the ladder", () => {
    const stages = DEFAULT_PROGRESSION_POLICY.stages;
    expect(resolveStage(stages, "400A")?.id).toBe("400A");
    expect(nextStage(stages, "400A")?.id).toBe("400B");
    expect(nextStage(stages, "600B")).toBeNull();
    expect(resolveStage(stages, "nope")).toBeNull();
  });

  test("JUTH rule: failing 3rd MBBS in 500A repeats 400 from scratch", () => {
    const stages = DEFAULT_PROGRESSION_POLICY.stages;
    const stage = resolveStage(stages, "500A");
    expect(stage?.examName).toBe("3rd MBBS");
    expect(failTargetStageId(stage)).toBe("400A");
    // repeat_stage stages return themselves
    expect(failTargetStageId(resolveStage(stages, "300"))).toBe("300");
    // "stay" stages leave the decision to the admin
    expect(failTargetStageId(resolveStage(stages, "400A"))).toBeNull();
  });

  test("200 is the tests-only stage", () => {
    const stage = resolveStage(DEFAULT_PROGRESSION_POLICY.stages, "200");
    expect(stage?.examName).toBeNull();
  });
});

describe("class name -> stage resolution", () => {
  test("resolves sub-level class names", () => {
    const stages = DEFAULT_PROGRESSION_POLICY.stages;
    expect(resolveStageForClassName(stages, "500 Level A")?.id).toBe("500A");
    expect(resolveStageForClassName(stages, "400 Level B")?.id).toBe("400B");
    expect(resolveStageForClassName(stages, "400B")?.id).toBe("400B");
  });

  test("bare level names fall back to the first sub-stage", () => {
    const stage = resolveStageForClassName(DEFAULT_PROGRESSION_POLICY.stages, "500 Level");
    expect(stage?.id).toBe("500A");
  });

  test("unknown class names resolve to null", () => {
    expect(resolveStageForClassName(DEFAULT_PROGRESSION_POLICY.stages, "JSS 1")).toBeNull();
    expect(resolveStageForClassName(DEFAULT_PROGRESSION_POLICY.stages, null)).toBeNull();
  });
});

describe("clock phase equivalences", () => {
  test("400B runs on the 500A clock; 500B on the 600A clock", () => {
    const policy = DEFAULT_PROGRESSION_POLICY;
    const stages = policy.stages;
    expect(clockClassForStage(policy, resolveStage(stages, "400B"))).toBe("500A");
    expect(clockClassForStage(policy, resolveStage(stages, "500B"))).toBe("600A");
    expect(clockClassForStage(policy, resolveStage(stages, "400A"))).toBe("400A");
    expect(clockClassForStage(policy, null)).toBeNull();
  });
});

describe("stage gate evaluation", () => {
  const pass = 50;

  test("all released, complete, passing grades -> ready to advance", () => {
    const outcome = evaluateStageOutcome(
      [
        { passed: true, released: true, withheld: false, hasCa: true, hasExam: true, weightedPercent: 72 },
        { passed: true, released: true, withheld: false, hasCa: true, hasExam: true, weightedPercent: 55 },
      ],
      pass,
    );
    expect(outcome.readyToAdvance).toBe(true);
    expect(outcome.allPassed).toBe(true);
    expect(outcome.passedCount).toBe(2);
    expect(outcome.failedCount).toBe(0);
    expect(outcome.weightedAverage).toBe(63.5);
  });

  test("a failed course blocks advancement", () => {
    const outcome = evaluateStageOutcome(
      [
        { passed: true, released: true, withheld: false, hasCa: true, hasExam: true, weightedPercent: 80 },
        { released: true, withheld: false, hasCa: true, hasExam: true, weightedPercent: 40 },
      ],
      pass,
    );
    expect(outcome.failedCount).toBe(1);
    expect(outcome.readyToAdvance).toBe(false);
  });

  test("boundary: exactly the pass mark passes", () => {
    const outcome = evaluateStageOutcome(
      [{ released: true, withheld: false, hasCa: true, hasExam: true, weightedPercent: 50 }],
      pass,
    );
    expect(outcome.passedCount).toBe(1);
    expect(outcome.readyToAdvance).toBe(true);
  });

  test("withheld results (G2 gate) block advancement and are not counted", () => {
    const outcome = evaluateStageOutcome(
      [
        { released: true, withheld: true, hasCa: true, hasExam: true, weightedPercent: 90 },
        { released: true, withheld: false, hasCa: true, hasExam: true, weightedPercent: 60 },
      ],
      pass,
    );
    expect(outcome.withheldCount).toBe(1);
    expect(outcome.passedCount).toBe(1);
    expect(outcome.readyToAdvance).toBe(false);
  });

  test("unreleased grades count as pending, not failed", () => {
    const outcome = evaluateStageOutcome(
      [{ released: false, withheld: false, hasCa: true, hasExam: true, weightedPercent: 70 }],
      pass,
    );
    expect(outcome.pendingCount).toBe(1);
    expect(outcome.failedCount).toBe(0);
    expect(outcome.readyToAdvance).toBe(false);
  });

  test("incomplete grades (missing CA or exam) block advancement", () => {
    const outcome = evaluateStageOutcome(
      [
        { released: true, withheld: false, hasCa: true, hasExam: false, weightedPercent: 90 },
        { released: true, withheld: false, hasCa: false, hasExam: true, weightedPercent: 90 },
      ],
      pass,
    );
    expect(outcome.incompleteCount).toBe(2);
    expect(outcome.readyToAdvance).toBe(false);
  });

  test("no grades at all is not ready", () => {
    const outcome = evaluateStageOutcome([], pass);
    expect(outcome.totalCourses).toBe(0);
    expect(outcome.readyToAdvance).toBe(false);
    expect(outcome.weightedAverage).toBe(0);
  });
});
