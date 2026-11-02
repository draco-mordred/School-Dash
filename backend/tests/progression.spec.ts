import { describe, test, expect } from "bun:test";
import {
  DEFAULT_PROGRESSION_LADDER,
  DEFAULT_PROGRESSION_POLICY,
  GRADUATED_STEP,
  evaluateProgression,
  findLadderStep,
  nextLadderStep,
  normalizeProgressionStep,
  repeatTargetFor,
  sharesClockPhase,
} from "../src/utils/progression";

describe("PR G3 — progression utils", () => {
  test("normalizes class names to ladder step ids", () => {
    expect(normalizeProgressionStep("500 Level")).toBe("500A");
    expect(normalizeProgressionStep("500 level a")).toBe("500A");
    expect(normalizeProgressionStep("500B")).toBe("500B");
    expect(normalizeProgressionStep("600 Level B")).toBe("600B");
    expect(normalizeProgressionStep("300")).toBe("300A");
    expect(normalizeProgressionStep("")).toBeNull();
    expect(normalizeProgressionStep("Staff Common Room")).toBeNull();
  });

  test("ladder order: 100 → 200 → 300 → 400A → 500A → 500B → 600A → 600B", () => {
    expect(DEFAULT_PROGRESSION_LADDER.map((s) => s.id)).toEqual([
      "100", "200", "300", "400A", "500A", "500B", "600A", "600B",
    ]);
    expect(nextLadderStep(DEFAULT_PROGRESSION_LADDER, "400A")?.id).toBe("500A");
    expect(nextLadderStep(DEFAULT_PROGRESSION_LADDER, "600B")).toBeNull();
    expect(nextLadderStep(DEFAULT_PROGRESSION_LADDER, "unknown")).toBeNull();
  });

  test("clock-phase equivalences: 400B ≈ 500A, 500B ≈ 600A (symmetric)", () => {
    expect(sharesClockPhase(DEFAULT_PROGRESSION_LADDER, "400B", "500A")).toBe(true);
    expect(sharesClockPhase(DEFAULT_PROGRESSION_LADDER, "500A", "400B")).toBe(true);
    expect(sharesClockPhase(DEFAULT_PROGRESSION_LADDER, "500B", "600A")).toBe(true);
    expect(sharesClockPhase(DEFAULT_PROGRESSION_LADDER, "600A", "500B")).toBe(true);
    expect(sharesClockPhase(DEFAULT_PROGRESSION_LADDER, "400A", "500A")).toBe(false);
    expect(sharesClockPhase(DEFAULT_PROGRESSION_LADDER, "300", "400B")).toBe(false);
  });

  test("fail rules: 3rd MBBS fail at 500A repeats 400 from scratch; other steps repeat themselves", () => {
    expect(repeatTargetFor(DEFAULT_PROGRESSION_LADDER, "500A")?.id).toBe("400A");
    expect(repeatTargetFor(DEFAULT_PROGRESSION_LADDER, "400A")?.id).toBe("400A");
    expect(repeatTargetFor(DEFAULT_PROGRESSION_LADDER, "600A")?.id).toBe("600A");
    expect(repeatTargetFor(DEFAULT_PROGRESSION_LADDER, "nope")).toBeNull();
  });

  test("findLadderStep resolves and GRADUATED_STEP is synthetic", () => {
    expect(findLadderStep(DEFAULT_PROGRESSION_LADDER, "600B")?.examKind).toBe("final");
    expect(findLadderStep(DEFAULT_PROGRESSION_LADDER, GRADUATED_STEP)).toBeNull();
  });

  test("evaluateProgression: all released + passed → ready", () => {
    const result = evaluateProgression([
      { passed: true, released: true, withheld: false, hasExam: true },
      { passed: true, released: true, withheld: false, hasExam: true },
    ]);
    expect(result.readyToAdvance).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.gradedCount).toBe(2);
  });

  test("evaluateProgression: a failed course blocks", () => {
    const result = evaluateProgression([
      { passed: true, released: true, withheld: false, hasExam: true },
      { passed: false, released: true, withheld: false, hasExam: true },
    ]);
    expect(result.readyToAdvance).toBe(false);
    expect(result.blockers).toContain("failed-courses");
  });

  test("evaluateProgression: withheld (G2 gate) and unreleased results are PENDING, never fail", () => {
    const result = evaluateProgression([
      { passed: true, released: true, withheld: false, hasExam: true },
      { passed: false, released: true, withheld: true, hasExam: true },
      { passed: false, released: false, withheld: false, hasExam: true },
    ]);
    expect(result.gradedCount).toBe(1);
    expect(result.withheldCount).toBe(1);
    expect(result.unreleasedCount).toBe(1);
    expect(result.pendingCount).toBe(2);
    expect(result.blockers).toContain("pending-results");
    expect(result.readyToAdvance).toBe(false);
  });

  test("evaluateProgression: pending allowed when requireAllReleased is false, but failures still block", () => {
    const ok = evaluateProgression(
      [{ passed: true, released: true, withheld: false, hasExam: true }],
      { requireAllReleased: false },
    );
    expect(ok.readyToAdvance).toBe(true);
    const pendingOk = evaluateProgression(
      [
        { passed: true, released: true, withheld: false, hasExam: true },
        { passed: false, released: false, withheld: false, hasExam: true },
      ],
      { requireAllReleased: false },
    );
    expect(pendingOk.readyToAdvance).toBe(true);
    expect(pendingOk.pendingCount).toBe(1);
    const failPending = evaluateProgression(
      [{ passed: false, released: true, withheld: false, hasExam: true }],
      { requireAllReleased: false },
    );
    expect(failPending.readyToAdvance).toBe(false);
  });

  test("evaluateProgression: missing major exam blocks; no results at all blocks", () => {
    const missingExam = evaluateProgression([
      { passed: true, released: true, withheld: false, hasExam: false },
    ]);
    expect(missingExam.blockers).toContain("missing-major-exam");
    const empty = evaluateProgression([]);
    expect(empty.blockers).toContain("no-released-results");
    expect(empty.readyToAdvance).toBe(false);
  });

  test("default policy shape", () => {
    expect(DEFAULT_PROGRESSION_POLICY.passMarkPercent).toBe(50);
    expect(DEFAULT_PROGRESSION_POLICY.requireAllReleased).toBe(true);
    expect(DEFAULT_PROGRESSION_POLICY.ladder.length).toBe(8);
  });
});
