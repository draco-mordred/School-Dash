import { describe, expect, it, vi } from "vitest";
import { buildStudentAttendancePercentage, formatStudentCurrentPosting, loadStudentMetrics } from "./studentListMetrics";

describe("studentListMetrics", () => {
  it("computes attendance percentage from attendance stats", () => {
    expect(buildStudentAttendancePercentage([
      { _id: "present", count: 18 },
      { _id: "late", count: 2 },
      { _id: "absent", count: 4 },
      { _id: "excused", count: 1 },
    ])).toBe(76);
  });

  it("formats a current posting label from the schedule window", () => {
    expect(formatStudentCurrentPosting({
      postingName: "Specialty Posting",
      window: {
        departmentName: "Psychiatry",
        departmentGroupIndex: 2,
        unitName: "Ward 3",
      },
    })).toBe("Department Group 3 • Psychiatry • Specialty Posting • Ward 3");
  });

  it("falls back to attendance records when the summary payload is empty", async () => {
    const requestFn = vi.fn(async (url: string) => {
      if (url.includes("/attendance/student/")) {
        return { data: { stats: [], records: [{ status: "present" }, { status: "absent" }] } };
      }

      return {
        data: {
          current: [],
        },
      };
    });

    const metrics = await loadStudentMetrics(["student-3"], requestFn as any);

    expect(metrics["student-3"].attendancePercentage).toBe(50);
  });

  it("loads metrics for students while tolerating per-student request failures", async () => {
    const requestFn = vi.fn(async (url: string) => {
      if (url.includes("student-2")) {
        throw new Error("boom");
      }

      if (url.includes("/attendance/")) {
        return { data: { stats: [{ _id: "present", count: 10 }] } };
      }

      return {
        data: {
          current: [{
            postingName: "Ward Posting",
            window: { departmentName: "Psychiatry", departmentGroupIndex: 0, unitName: "Unit 2" },
          }],
        },
      };
    });

    const metrics = await loadStudentMetrics(["student-1", "student-2"], requestFn as any);

    expect(metrics["student-1"].attendancePercentage).toBe(100);
    expect(metrics["student-1"].currentPosting).toContain("Psychiatry");
    expect(metrics["student-2"].attendancePercentage).toBe(0);
    expect(metrics["student-2"].currentPosting).toBe("Not assigned");
  });
});
