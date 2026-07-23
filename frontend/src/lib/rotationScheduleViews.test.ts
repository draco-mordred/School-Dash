import { describe, expect, it } from "vitest";
import { buildTimelineWindowView, formatWindowDuration, getDepartmentName, getReferenceDisplayName } from "./rotationScheduleViews";

describe("rotation schedule view helpers", () => {
  it("resolves department names from department IDs", () => {
    expect(getDepartmentName("MED")).toBe("Medicine");
    expect(getDepartmentName("XYZ")).toBe("XYZ");
  });

  it("formats the duration from the timeline window dates", () => {
    expect(formatWindowDuration("2026-07-01T00:00:00.000Z", "2026-07-07T00:00:00.000Z")).toBe("6 days");
  });

  it("builds a timeline window view with department, phase, and unit labels", () => {
    const view = buildTimelineWindowView(
      { _id: "schedule-1", name: "Posting A", postings: [{ name: "Posting A" }] },
      {
        startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-07-07T00:00:00.000Z",
        phaseIndex: 0,
        phaseLabel: "Phase 1",
        phaseDurationWeeks: 2,
        departmentId: "MED",
        departmentName: "Department of Medicine",
        departmentCode: "MED",
        departmentGroupIndex: 1,
        unitGroupIndex: 2,
        unitId: "unit-10",
        unitName: "Cardiology",
        studentIds: ["1", "2"],
        supervisorName: "Dr. Ada",
      },
      0,
    );

    expect(view.postingName).toBe("Posting A");
    expect(view.departmentName).toBe("Department of Medicine (MED)");
    expect(view.phaseLabel).toBe("Phase 1");
    expect(view.phaseDurationLabel).toBe("2 weeks");
    expect(view.departmentGroupLabel).toBe("Department Group 2");
    expect(view.unitGroupLabel).toBe("Cardiology (unit-10)");
    expect(view.supervisorName).toBe("Dr. Ada");
  });

  it("resolves display names from object IDs and populated objects", () => {
    expect(getReferenceDisplayName("64f8e1c2f1a2b3c4d5e6f7a8", { "64f8e1c2f1a2b3c4d5e6f7a8": "Ada Lovelace" })).toBe("Ada Lovelace");
    expect(getReferenceDisplayName({ _id: "student-2", name: "Grace Hopper" }, {}, "Student")).toBe("Grace Hopper");
    expect(getReferenceDisplayName("fallback-id", {}, "Student")).toBe("Student");
  });
});
