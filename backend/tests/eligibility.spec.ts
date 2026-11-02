import { describe, expect, test } from "bun:test";
import {
  DEFAULT_ELIGIBILITY_POLICY,
  computeEligibilityIssues,
  attendancePercentFromCounts,
} from "../src/utils/eligibility";

describe("computeEligibilityIssues (G2 result-release gate)", () => {
  test("clean student -> no issues", () => {
    expect(
      computeEligibilityIssues({
        hasCa: true,
        caAveragePercent: 60,
        attendancePercent: 90,
        feesPaid: true,
        clearancePaid: true,
      })
    ).toEqual([]);
  });

  test("CA below threshold raises an issue", () => {
    const issues = computeEligibilityIssues({
      hasCa: true,
      caAveragePercent: 30,
      attendancePercent: 90,
      feesPaid: true,
      clearancePaid: true,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("CA average");
  });

  test("no CA record at all raises an issue", () => {
    const issues = computeEligibilityIssues({
      hasCa: false,
      attendancePercent: 90,
      feesPaid: true,
      clearancePaid: true,
    });
    expect(issues.some((i) => i.includes("No CA test record"))).toBe(true);
  });

  test("attendance below cutoff raises an issue; untracked attendance does not", () => {
    const below = computeEligibilityIssues({
      hasCa: true,
      caAveragePercent: 60,
      attendancePercent: 60,
      feesPaid: true,
      clearancePaid: true,
    });
    expect(below.some((i) => i.includes("Attendance"))).toBe(true);

    const untracked = computeEligibilityIssues({
      hasCa: true,
      caAveragePercent: 60,
      attendancePercent: null,
      feesPaid: true,
      clearancePaid: true,
    });
    expect(untracked).toEqual([]);
  });

  test("unpaid fees and clearance raise issues", () => {
    const issues = computeEligibilityIssues({
      hasCa: true,
      caAveragePercent: 60,
      attendancePercent: 90,
      feesPaid: false,
      clearancePaid: false,
    });
    expect(issues.some((i) => i.includes("School fees"))).toBe(true);
    expect(issues.some((i) => i.includes("Departmental clearance"))).toBe(true);
  });

  test("custom policy can disable fee/clearance requirements", () => {
    const issues = computeEligibilityIssues({
      policy: { requireSchoolFees: false, requireDepartmentalClearance: false },
      hasCa: true,
      caAveragePercent: 60,
      attendancePercent: 90,
      feesPaid: false,
      clearancePaid: false,
    });
    expect(issues).toEqual([]);
  });

  test("boundary: exactly at thresholds is clean", () => {
    const issues = computeEligibilityIssues({
      hasCa: true,
      caAveragePercent: DEFAULT_ELIGIBILITY_POLICY.caThresholdPercent,
      attendancePercent: DEFAULT_ELIGIBILITY_POLICY.attendanceCutoffPercent,
      feesPaid: true,
      clearancePaid: true,
    });
    expect(issues).toEqual([]);
  });
});

describe("attendancePercentFromCounts", () => {
  test("computes percent and rounds to 2dp", () => {
    expect(attendancePercentFromCounts(2, 3)).toBe(66.67);
    expect(attendancePercentFromCounts(0, 0)).toBe(null);
    expect(attendancePercentFromCounts(5, 5)).toBe(100);
  });
});
