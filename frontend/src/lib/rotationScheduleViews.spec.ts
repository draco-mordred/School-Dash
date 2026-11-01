// PR F — vitest suite for the rotation timeline view builders (used by the
// student portal cards, StudentSection and the E2 StudentDashboardCards).
import { describe, expect, it } from "vitest";
import {
  getDepartmentName,
  getDepartmentDisplayName,
  formatWindowDuration,
  getReferenceDisplayName,
  buildTimelineWindowView,
} from "./rotationScheduleViews";

describe("getDepartmentName / getDepartmentDisplayName", () => {
  it("maps known codes to display names", () => {
    expect(getDepartmentName("OBG")).toBe("Obstetrics and Gynecology");
    expect(getDepartmentName(null)).toBe("Department");
    expect(getDepartmentName("XYZ")).toBe("XYZ"); // unknown code passes through
  });
  it("appends the code in brackets when not already present", () => {
    expect(getDepartmentDisplayName(null, null, "OBG")).toBe("Department of Obstetrics and Gynecology (OBG)");
  });
  it("prefers an explicit department name", () => {
    expect(getDepartmentDisplayName(null, "Custom Dept", "OBG")).toBe("Custom Dept (OBG)");
    expect(getDepartmentDisplayName(null, "Dept (OBG)", "OBG")).toBe("Dept (OBG)");
  });
});

describe("formatWindowDuration", () => {
  it("formats multi-day and single-day windows", () => {
    expect(formatWindowDuration("2026-01-01", "2026-01-08")).toBe("7 days");
    expect(formatWindowDuration("2026-01-01", "2026-01-01")).toBe("1 day");
  });
  it("returns a pending label for missing or invalid dates", () => {
    expect(formatWindowDuration(null, null)).toBe("Duration pending");
    expect(formatWindowDuration("nope", "2026-01-08")).toBe("Duration pending");
  });
});

describe("getReferenceDisplayName", () => {
  it("uses direct name fields on objects", () => {
    expect(getReferenceDisplayName({ name: "Dr. Ada" })).toBe("Dr. Ada");
    expect(getReferenceDisplayName({ title: "Prof" })).toBe("Prof");
  });
  it("resolves object ids through the lookup", () => {
    expect(getReferenceDisplayName({ _id: "abc123" }, { abc123: "Resolved" })).toBe("Resolved");
    expect(getReferenceDisplayName({ _id: "abc123" }, {})).toBe("Unknown");
  });
  it("treats identifier-like strings as lookup keys", () => {
    expect(getReferenceDisplayName("plain name")).toBe("plain name");
    expect(getReferenceDisplayName("some_object-id_with:parts", { "some_object-id_with:parts": "Lookup" })).toBe("Lookup");
    expect(getReferenceDisplayName("   ")).toBe("Unknown");
  });
});

describe("buildTimelineWindowView", () => {
  const schedule: any = { _id: "sched1", postings: [{ name: "500A Clinical Postings" }] };
  it("computes status from the window dates", () => {
    const past = buildTimelineWindowView(schedule, { startDate: "2000-01-01", endDate: "2000-12-31" }, 0);
    const future = buildTimelineWindowView(schedule, { startDate: "2999-01-01", endDate: "2999-12-31" }, 1);
    const current = buildTimelineWindowView(schedule, { startDate: "2000-01-01", endDate: "2999-12-31" }, 2);
    const pending = buildTimelineWindowView(schedule, {}, 3);
    expect(past.status).toBe("completed");
    expect(future.status).toBe("upcoming");
    expect(current.status).toBe("current");
    expect(pending.status).toBe("pending");
  });
  it("matches students by id and defaults to true without a studentId", () => {
    const w: any = { startDate: "2000-01-01", endDate: "2999-12-31", studentIds: ["s1", "s2"] };
    expect(buildTimelineWindowView(schedule, w, 0, "s1").matchesStudent).toBe(true);
    expect(buildTimelineWindowView(schedule, w, 0, "s3").matchesStudent).toBe(false);
    expect(buildTimelineWindowView(schedule, w, 0).matchesStudent).toBe(true);
    expect(buildTimelineWindowView(schedule, w, 0, "s3").studentCount).toBe(2);
  });
  it("resolves department and unit group labels", () => {
    const view = buildTimelineWindowView(schedule, {
      startDate: "2000-01-01",
      endDate: "2999-12-31",
      departmentCode: "OBG",
      unitGroupName: "Antenatal Clinic (OBG01)",
      departmentGroupIndex: 1,
    }, 0);
    expect(view.departmentName).toBe("Department of Obstetrics and Gynecology (OBG)");
    expect(view.unitGroupLabel).toBe("Antenatal Clinic (OBG01)");
    expect(view.departmentGroupLabel).toBe("Department Group 2");
  });
  it("falls back on unit labels and supervisor names", () => {
    const view = buildTimelineWindowView(schedule, {
      startDate: "2026-01-01",
      endDate: "2026-01-01",
      unitGroupIndex: 2,
      unitId: "OBG01",
    }, 0);
    expect(view.unitName).toBe("OBG01");
    expect(view.supervisorName).toBe("Unassigned");
    expect(view.phaseLabel).toBe("Phase 1");
    expect(view.postingName).toBe("500A Clinical Postings");
    expect(view.durationLabel).toBe("1 day"); // same-day window rounds up to 1 day
  });
  it("uses phaseName when phaseLabel is absent and honours explicit supervisors", () => {
    const view = buildTimelineWindowView(schedule, {
      startDate: "2000-01-01",
      endDate: "2999-12-31",
      phaseName: "O&G Junior",
      phaseDurationWeeks: 6,
      supervisorName: "Dr. Kato",
    }, 4);
    expect(view.phaseLabel).toBe("O&G Junior");
    expect(view.phaseDurationLabel).toBe("6 weeks");
    expect(view.supervisorName).toBe("Dr. Kato");
    expect(view.id).toBe("sched1-4");
  });
});
