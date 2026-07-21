import { describe, expect, it } from "vitest";
import { buildTimelineWindowView, formatWindowDuration, getDepartmentName, getReferenceDisplayName, selectStudentPostingWindow } from "./rotationScheduleViews";

describe("rotation schedule view helpers", () => {
  it("resolves department names from department IDs", () => {
    expect(getDepartmentName("MED")).toBe("Medicine");
    expect(getDepartmentName("XYZ")).toBe("XYZ");
  });

  it("formats the duration from the timeline window dates", () => {
    expect(formatWindowDuration("2026-07-01T00:00:00.000Z", "2026-07-07T00:00:00.000Z")).toBe("6 days");
  });

  it("builds a timeline window view with department and unit group labels", () => {
    const view = buildTimelineWindowView(
      { _id: "schedule-1", name: "Posting A", postings: [{ name: "Posting A" }] },
      { startDate: "2026-07-01T00:00:00.000Z", endDate: "2026-07-07T00:00:00.000Z", departmentId: "MED", departmentGroupIndex: 1, unitGroupIndex: 2, unitId: "unit-10", studentIds: ["1", "2"], supervisorName: "Dr. Ada" },
      0,
    );

    expect(view.postingName).toBe("Posting A");
    expect(view.departmentName).toBe("Medicine");
    expect(view.departmentGroupLabel).toBe("Department Group 2");
    expect(view.unitGroupLabel).toBe("Unit Group 3");
    expect(view.supervisorName).toBe("Dr. Ada");
  });

  it("resolves display names from object IDs and populated objects", () => {
    expect(getReferenceDisplayName("64f8e1c2f1a2b3c4d5e6f7a8", { "64f8e1c2f1a2b3c4d5e6f7a8": "Ada Lovelace" })).toBe("Ada Lovelace");
    expect(getReferenceDisplayName({ _id: "student-2", name: "Grace Hopper" }, {}, "Student")).toBe("Grace Hopper");
    expect(getReferenceDisplayName("fallback-id", {}, "Student")).toBe("Student");
  });

  it("prefers the window that matches the active academic-clock phase", () => {
    const windows = [
      { id: "phase-1", status: "completed", phaseId: "phase1" },
      { id: "phase-2", status: "current", phaseId: "phase2" },
      { id: "phase-1-upcoming", status: "upcoming", phaseId: "phase1" },
    ];

    const selected = selectStudentPostingWindow(windows, "phase2");

    expect(selected?.id).toBe("phase-2");
  });

  it("extracts team members from group data on the schedule payload", () => {
    const view = buildTimelineWindowView(
      {
        _id: "schedule-1",
        name: "Posting A",
        postings: [{ name: "Posting A" }],
        groups: [{ studentIds: ["student-1", "student-2"], name: "Group 1" }],
      },
      {
        startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-07-07T00:00:00.000Z",
        departmentId: "MED",
        departmentGroupIndex: 0,
        unitGroupIndex: 1,
        unitId: "unit-10",
        studentIds: ["student-3"],
        supervisorName: "Dr. Ada",
      },
      0,
    );

    expect(view.groupStudents).toHaveLength(2);
    expect(view.groupStudents?.[0]).toBe("student-1");
  });
});
