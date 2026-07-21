import { describe, expect, it } from "vitest";
import { shouldShowAdminDashboardSkeleton } from "../lib/dashboardState";
import { buildAdminDashboardData } from "./useAdminDashboard";

describe("buildAdminDashboardData", () => {
  it("preserves prior snapshot values when a later response omits them", () => {
    const previousData = {
      stats: {
        totalStudents: 120,
        totalParents: 90,
        totalStaff: 14,
        activeSession: "2024/2025",
      },
      academicData: {
        sessions: 3,
        semesters: 2,
        classes: 8,
        courses: 24,
        assessments: 18,
        details: {
          activeAcademicYear: "2024/2025",
          currentSemester: "Second Semester",
          classes: [{ name: "MBBS 500", courseCount: 4, assessmentCount: 3 }],
        },
      },
      clinicalData: {
        postings: 5,
        departments: 3,
        units: 7,
        teams: 10,
        rotations: 4,
        details: {
          postings: [{ className: "MBBS 500", phaseLabel: "Phase 3", hasSchedule: true }],
          rotationTeams: [{ className: "MBBS 500", teamCount: 2 }],
          rotations: [{ className: "MBBS 500", name: "Surgery", dateRange: "Now", duration: "4 weeks" }],
        },
      },
      alerts: [],
      activities: [],
    } as any;

    const nextData = buildAdminDashboardData({ totalStudents: 200 }, {}, previousData);

    expect(nextData.stats.totalStudents).toBe(200);
    expect(nextData.academicData.sessions).toBe(3);
    expect(nextData.academicData.details?.activeAcademicYear).toBe("2024/2025");
    expect(nextData.clinicalData.postings).toBe(5);
    expect(nextData.clinicalData.details?.postings?.[0].className).toBe("MBBS 500");
  });
});

describe("shouldShowAdminDashboardSkeleton", () => {
  it("does not keep the admin dashboard in a skeleton when loading is done and data is still unavailable", () => {
    expect(shouldShowAdminDashboardSkeleton(true, true, true, null)).toBe(true);
    expect(shouldShowAdminDashboardSkeleton(false, true, true, null)).toBe(true);
    expect(shouldShowAdminDashboardSkeleton(false, true, false, null)).toBe(false);
    expect(shouldShowAdminDashboardSkeleton(false, true, false, { hello: "world" } as any)).toBe(false);
    expect(shouldShowAdminDashboardSkeleton(false, false, false, null)).toBe(false);
  });
});
