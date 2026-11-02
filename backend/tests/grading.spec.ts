import { describe, expect, test } from "bun:test";
import {
  DEFAULT_GRADING_POLICY,
  scorePercent,
  gradeFromPercent,
  averageCaRaw,
  computeCourseResult,
  computeGpa,
} from "../src/utils/grading";

describe("scorePercent", () => {
  test("computes percent and clamps to 0..100", () => {
    expect(scorePercent(20, 25)).toBe(80);
    expect(scorePercent(30, 25)).toBe(100);
    expect(scorePercent(-5, 25)).toBe(0);
  });
  test("guards against bad inputs", () => {
    expect(scorePercent(null, 25)).toBe(0);
    expect(scorePercent(10, null)).toBe(0);
    expect(scorePercent(10, 0)).toBe(0);
    expect(scorePercent(NaN, 25)).toBe(0);
  });
});

describe("gradeFromPercent (Nigerian 5.0 bands)", () => {
  const bands = DEFAULT_GRADING_POLICY.gradeBands;
  test("band boundaries", () => {
    expect(gradeFromPercent(70, bands).letter).toBe("A");
    expect(gradeFromPercent(69.99, bands).letter).toBe("B");
    expect(gradeFromPercent(60, bands).letter).toBe("B");
    expect(gradeFromPercent(50, bands).letter).toBe("C");
    expect(gradeFromPercent(45, bands).letter).toBe("D");
    expect(gradeFromPercent(40, bands).letter).toBe("E");
    expect(gradeFromPercent(39.9, bands).letter).toBe("F");
    expect(gradeFromPercent(0, bands).letter).toBe("F");
  });
});

describe("averageCaRaw", () => {
  test("averages CA tests onto the 0..caTestMaxScore scale", () => {
    // 20/25 (80%) and 10/25 (40%) -> raw average of 60% of 25 = 15
    expect(averageCaRaw([{ score: 20, maxScore: 25 }, { score: 10, maxScore: 25 }], 25)).toBe(15);
  });
  test("empty CA list yields 0", () => {
    expect(averageCaRaw([], 25)).toBe(0);
  });
});

describe("computeCourseResult (default 40/60 weights)", () => {
  test("full result: CA 20/25 (80%) + exam 65% -> 71% A", () => {
    const r = computeCourseResult({
      caTests: [{ score: 20, maxScore: 25 }],
      exam: { score: 65, maxScore: 100 },
      policy: DEFAULT_GRADING_POLICY,
    });
    expect(r.caAverageRaw).toBe(20);
    expect(r.caAveragePercent).toBe(80);
    expect(r.examPercent).toBe(65);
    // 80*0.4 + 65*0.6 = 32 + 39 = 71
    expect(r.weightedPercent).toBe(71);
    expect(r.letter).toBe("A");
    expect(r.gradePoints).toBe(5);
    expect(r.passed).toBe(true);
    expect(r.hasCa).toBe(true);
    expect(r.hasExam).toBe(true);
  });

  test("multiple CA tests are averaged first", () => {
    const r = computeCourseResult({
      caTests: [
        { score: 20, maxScore: 25 }, // 80%
        { score: 10, maxScore: 25 }, // 40%
      ],
      exam: { score: 50, maxScore: 100 },
      policy: DEFAULT_GRADING_POLICY,
    });
    // CA avg 60% -> 24; exam 50% -> 30; total 54 -> C
    expect(r.caAverageRaw).toBe(15);
    expect(r.caAveragePercent).toBe(60);
    expect(r.weightedPercent).toBe(54);
    expect(r.letter).toBe("C");
    expect(r.caTestCount).toBe(2);
  });

  test("missing exam contributes 0 and is flagged", () => {
    const r = computeCourseResult({
      caTests: [{ score: 20, maxScore: 25 }],
      exam: null,
      policy: DEFAULT_GRADING_POLICY,
    });
    expect(r.hasExam).toBe(false);
    expect(r.examPercent).toBe(0);
    // CA-only: 80 * 0.4 = 32
    expect(r.weightedPercent).toBe(32);
    expect(r.passed).toBe(false);
  });

  test("missing CA contributes 0 and is flagged", () => {
    const r = computeCourseResult({
      caTests: [],
      exam: { score: 80, maxScore: 100 },
      policy: DEFAULT_GRADING_POLICY,
    });
    expect(r.hasCa).toBe(false);
    expect(r.caAveragePercent).toBe(0);
    // exam-only: 80 * 0.6 = 48
    expect(r.weightedPercent).toBe(48);
  });

  test("custom institutional weights are normalized", () => {
    const r = computeCourseResult({
      caTests: [{ score: 25, maxScore: 25 }], // 100%
      exam: { score: 0, maxScore: 100 },
      policy: { caWeightPercent: 50, examWeightPercent: 50 },
    });
    expect(r.weightedPercent).toBe(50);
  });
});

describe("computeGpa (credit-unit-weighted, 5.0 scale)", () => {
  test("weights grade points by credit units", () => {
    const gpa = computeGpa([
      { gradePoints: 5, creditUnits: 3 },
      { gradePoints: 3, creditUnits: 1 },
    ]);
    // (5*3 + 3*1) / 4 = 4.5
    expect(gpa).toBe(4.5);
  });
  test("missing or invalid credit units default to 1", () => {
    const gpa = computeGpa([
      { gradePoints: 4, creditUnits: null },
      { gradePoints: 2, creditUnits: 0 },
    ]);
    expect(gpa).toBe(3);
  });
  test("zero-credit guard returns 0", () => {
    expect(computeGpa([])).toBe(0);
  });
});
