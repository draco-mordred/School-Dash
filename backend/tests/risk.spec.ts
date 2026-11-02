import { describe, test, expect } from "bun:test";
import {
  DEFAULT_RISK_POLICY,
  caSeriesDrop,
  caTrendSlope,
  classifyStudentRisk,
  generateRiskInsights,
} from "../src/utils/risk";
import {
  examTimeWindow,
  findExamOverlaps,
  overlapMinutes,
  windowsOverlap,
} from "../src/utils/scheduleOverlap";

describe("PR H — risk tiers", () => {
  test("clean student is LOW risk with no factors", () => {
    const r = classifyStudentRisk({
      attendancePercent: 95,
      latestCaPercent: 70,
      caSeries: [70, 72, 68, 70],
      missedAssessments: 0,
    });
    expect(r.tier).toBe("low");
    expect(r.factors).toEqual([]);
    expect(r.riskScore).toBe(0);
  });

  test("attendance below cutoff is HIGH; watch band is MEDIUM; untracked is never a factor", () => {
    expect(classifyStudentRisk({ attendancePercent: 60 }).tier).toBe("high");
    const watch = classifyStudentRisk({ attendancePercent: 76 });
    expect(watch.tier).toBe("medium");
    expect(watch.factors.map((f) => f.code)).toContain("attendance-watch");
    const untracked = classifyStudentRisk({ attendancePercent: null });
    expect(untracked.tier).toBe("low");
    expect(untracked.factors).toEqual([]);
  });

  test("CA below threshold is HIGH; watch band is MEDIUM; null CA is not a factor", () => {
    expect(classifyStudentRisk({ latestCaPercent: 30 }).tier).toBe("high");
    expect(classifyStudentRisk({ latestCaPercent: 45 }).tier).toBe("medium");
    expect(classifyStudentRisk({ latestCaPercent: null }).tier).toBe("low");
  });

  test("dropping CA trend flags ca-trend-dropping", () => {
    const r = classifyStudentRisk({ caSeries: [80, 70, 60, 50], latestCaPercent: 50, attendancePercent: 95 });
    expect(r.factors.map((f) => f.code)).toContain("ca-trend-dropping");
  });

  test("rising or flat CA trend does not flag", () => {
    expect(classifyStudentRisk({ caSeries: [40, 50, 60], latestCaPercent: 60, attendancePercent: 95 }).factors.map((f) => f.code))
      .not.toContain("ca-trend-dropping");
    expect(classifyStudentRisk({ caSeries: [50, 50, 50], latestCaPercent: 50, attendancePercent: 95 }).factors.map((f) => f.code))
      .not.toContain("ca-trend-dropping");
  });

  test("missed assessments scale watch -> risk", () => {
    expect(classifyStudentRisk({ missedAssessments: 0 }).tier).toBe("low");
    expect(classifyStudentRisk({ missedAssessments: 1 }).tier).toBe("medium");
    expect(classifyStudentRisk({ missedAssessments: 2 }).tier).toBe("high");
    const three = classifyStudentRisk({ missedAssessments: 3 });
    expect(three.tier).toBe("high");
    expect(three.factors.map((f) => f.code)).toContain("missed-assessments");
  });

  test("trend slope + drop math", () => {
    expect(caTrendSlope([10, 20, 30])).toBe(10);
    expect(caTrendSlope([30, 20, 10])).toBe(-10);
    expect(caTrendSlope([50])).toBeNull();
    expect(caTrendSlope([])).toBeNull();
    expect(caSeriesDrop([80, 60])).toBe(20);
    expect(caSeriesDrop([60, 80])).toBe(-20);
    expect(caSeriesDrop([50])).toBeNull();
  });

  test("any risk factor dominates watch factors -> HIGH", () => {
    const r = classifyStudentRisk({ attendancePercent: 76, missedAssessments: 2 });
    expect(r.tier).toBe("high");
    expect(r.riskScore).toBe(55); // 15 (watch) + 40 (risk)
  });

  test("insights: low tier gets an on-track line; high tier gets an intervention line", () => {
    const low = generateRiskInsights("Ada", classifyStudentRisk({ attendancePercent: 95, latestCaPercent: 80 }));
    expect(low.length).toBe(1);
    expect(low[0]).toContain("on track");
    const high = generateRiskInsights("Ada", classifyStudentRisk({ attendancePercent: 60 }));
    expect(high.some((l) => l.includes("HIGH risk tier"))).toBe(true);
  });

  test("default policy shape", () => {
    expect(DEFAULT_RISK_POLICY.attendanceRiskPercent).toBe(75);
    expect(DEFAULT_RISK_POLICY.caTrendDropPoints).toBe(15);
  });
});

describe("PR H — exam overlap windows", () => {
  const base = new Date("2026-11-02T10:00:00Z");

  test("examTimeWindow = dueDate + duration minutes", () => {
    const w = examTimeWindow(base, 90);
    expect(w.start.getTime()).toBe(base.getTime());
    expect(w.end.getTime()).toBe(base.getTime() + 90 * 60 * 1000);
    expect(examTimeWindow(base, 0).end.getTime()).toBe(base.getTime());
  });

  test("windowsOverlap: strict — touching boundaries do NOT overlap", () => {
    const a = examTimeWindow(base, 60); // [10:00, 11:00]
    // ends exactly when a starts -> touching, NOT overlapping
    expect(windowsOverlap(a, examTimeWindow(new Date("2026-11-02T10:30:00Z"), 30))).toBe(true);
    expect(windowsOverlap(a, examTimeWindow(new Date("2026-11-02T11:00:00Z"), 30))).toBe(false);
    expect(windowsOverlap(a, examTimeWindow(new Date("2026-11-02T08:00:00Z"), 130))).toBe(true);
    expect(windowsOverlap(a, examTimeWindow(new Date("2026-11-02T08:00:00Z"), 120))).toBe(false);
    expect(windowsOverlap(a, examTimeWindow(new Date("2026-11-02T12:00:00Z"), 30))).toBe(false);
  });

  test("overlapMinutes computes the intersection", () => {
    const a = examTimeWindow(base, 60);
    expect(overlapMinutes(a, examTimeWindow(new Date("2026-11-02T10:30:00Z"), 60))).toBe(30);
    expect(overlapMinutes(a, examTimeWindow(new Date("2026-11-02T11:00:00Z"), 30))).toBe(0);
  });

  test("findExamOverlaps: active exams only, sorted by overlap, capped at 5", () => {
    const candidate = examTimeWindow(base, 60);
    const existing = [
      { id: "e1", title: "Big overlap", dueDate: new Date("2026-11-02T09:30:00Z"), durationMinutes: 90, isActive: true },
      { id: "e2", title: "Small overlap", dueDate: new Date("2026-11-02T10:50:00Z"), durationMinutes: 30, isActive: true },
      { id: "e3", title: "Inactive", dueDate: new Date("2026-11-02T10:00:00Z"), durationMinutes: 60, isActive: false },
      { id: "e4", title: "No overlap", dueDate: new Date("2026-11-02T14:00:00Z"), durationMinutes: 60, isActive: true },
    ];
    const warnings = findExamOverlaps(candidate, existing);
    expect(warnings.map((w) => w.examId)).toEqual(["e1", "e2"]);
    expect(warnings[0].overlapMinutes).toBe(60);
    expect(warnings[0].title).toBe("Big overlap");
    // cap at MAX_OVERLAP_WARNINGS (5)
    const many = findExamOverlaps(
      candidate,
      Array.from({ length: 8 }, (_, i) => ({
        id: "x" + i,
        title: "X" + i,
        dueDate: new Date("2026-11-02T10:00:00Z"),
        durationMinutes: 60,
        isActive: true,
      }))
    );
    expect(many.length).toBe(5);
  });
});
