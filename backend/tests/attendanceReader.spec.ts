import { describe, test, expect } from "bun:test";
import {
  toDisplayStatus,
  normalizeLectureRecord,
  normalizeClinicalEntry,
  summarizeAttendance,
  type NormalizedAttendanceRecord,
} from "../src/services/attendanceReader";

// Phase K tests — pure normalization + D12 KPI math for the central
// attendance read accessor (no DB access required).

const lectureRecord = (overrides: Record<string, any> = {}) => ({
  _id: "lecture-record-id",
  student: { _id: "student-1" },
  class: { _id: "class-1" },
  academicYear: "year-1",
  date: "2026-10-20T09:00:00.000Z",
  status: "present",
  course: { name: "Medicine", code: "MED101" },
  subject: { name: "Cardiology", code: "CARD" },
  session: "session-1",
  ...overrides,
});

const clinicalSession = (overrides: Record<string, any> = {}) => ({
  _id: "clinical-session-id",
  classId: "class-1",
  academicYear: "year-1",
  title: "Ward Round",
  activityType: "ward_round",
  date: "2026-10-21T08:00:00.000Z",
  startTime: "2026-10-21T08:00:00.000Z",
  supervisorGroupLabel: "Unit 3 Group B",
  attendees: [],
  ...overrides,
});

const clinicalAttendee = (overrides: Record<string, any> = {}) => ({
  _id: "attendee-id",
  student: { _id: "student-1" },
  status: "present",
  ...overrides,
});

const rec = (displayStatus: NormalizedAttendanceRecord["displayStatus"]): NormalizedAttendanceRecord => ({
  recordId: "r-" + displayStatus,
  source: "lecture",
  studentId: "student-1",
  classId: "class-1",
  academicYearId: "year-1",
  date: "2026-10-20T09:00:00.000Z",
  status: displayStatus,
  displayStatus,
  label: "Lecture",
  detail: "",
  sessionId: null,
});

describe("Phase K - toDisplayStatus (D12)", () => {
  test("unverified displays as pending", () => {
    expect(toDisplayStatus("unverified")).toBe("pending");
  });

  test("pending displays as pending", () => {
    expect(toDisplayStatus("pending")).toBe("pending");
  });

  test("known statuses pass through", () => {
    expect(toDisplayStatus("present")).toBe("present");
    expect(toDisplayStatus("late")).toBe("late");
    expect(toDisplayStatus("absent")).toBe("absent");
    expect(toDisplayStatus("excused")).toBe("excused");
    expect(toDisplayStatus("on-leave")).toBe("on-leave");
  });

  test("missing or unknown statuses fall back to pending", () => {
    expect(toDisplayStatus(undefined)).toBe("pending");
    expect(toDisplayStatus("")).toBe("pending");
    expect(toDisplayStatus("weird")).toBe("pending");
  });
});

describe("Phase K - normalizeLectureRecord", () => {
  test("builds label from course and subject", () => {
    const normalized = normalizeLectureRecord(lectureRecord());
    expect(normalized.label).toBe("Medicine - Cardiology");
    expect(normalized.source).toBe("lecture");
    expect(normalized.studentId).toBe("student-1");
  });

  test("unverified lecture record displays as pending", () => {
    const normalized = normalizeLectureRecord(lectureRecord({ status: "unverified" }));
    expect(normalized.displayStatus).toBe("pending");
    expect(normalized.status).toBe("unverified");
  });

  test("absence reason becomes the detail", () => {
    const normalized = normalizeLectureRecord(
      lectureRecord({ status: "absent", absenceReason: "Was ill" }),
    );
    expect(normalized.detail).toBe("Was ill");
    expect(normalized.displayStatus).toBe("absent");
  });
});

describe("Phase K - normalizeClinicalEntry", () => {
  test("uses the session title as label and group label in detail", () => {
    const normalized = normalizeClinicalEntry(clinicalSession(), clinicalAttendee({ notes: "QR scanned" }));
    expect(normalized.label).toBe("Ward Round");
    expect(normalized.detail).toBe("Unit 3 Group B - QR scanned");
    expect(normalized.source).toBe("clinical");
    expect(normalized.sessionId).toBe("clinical-session-id");
  });

  test("pending clinical attendee displays as pending", () => {
    const normalized = normalizeClinicalEntry(clinicalSession(), clinicalAttendee({ status: "pending" }));
    expect(normalized.displayStatus).toBe("pending");
  });
});

describe("Phase K - summarizeAttendance (D12 KPI math)", () => {
  test("rate counts present + late over resolved records only", () => {
    const records = [
      rec("present"),
      rec("present"),
      rec("present"),
      rec("late"),
      rec("absent"),
      rec("absent"),
      rec("excused"),
      rec("pending"),
      rec("pending"),
    ];
    const summary = summarizeAttendance(records);
    expect(summary.total).toBe(9);
    expect(summary.pending).toBe(2);
    expect(summary.resolved).toBe(7);
    expect(summary.attendanceRate).toBe(57);
  });

  test("excused and on-leave do not count in the rate but are resolved", () => {
    const records = [rec("present"), rec("excused"), rec("on-leave")];
    const summary = summarizeAttendance(records);
    expect(summary.resolved).toBe(3);
    expect(summary.attendanceRate).toBe(33);
  });

  test("all pending -> rate 0", () => {
    const summary = summarizeAttendance([rec("pending"), rec("pending")]);
    expect(summary.attendanceRate).toBe(0);
    expect(summary.resolved).toBe(0);
  });

  test("empty set -> zeroed summary", () => {
    const summary = summarizeAttendance([]);
    expect(summary.total).toBe(0);
    expect(summary.attendanceRate).toBe(0);
  });
});

describe("Phase L - escalation audit flag (D13)", () => {
  test("lecture record carries escalatedToAdmin", () => {
    const escalated = normalizeLectureRecord(lectureRecord({ escalatedToAdmin: true }));
    expect(escalated.escalatedToAdmin).toBe(true);
    const notEscalated = normalizeLectureRecord(lectureRecord({}));
    expect(notEscalated.escalatedToAdmin).toBe(false);
  });

  test("clinical entries are never flagged as admin-escalated", () => {
    const normalized = normalizeClinicalEntry(clinicalSession(), clinicalAttendee());
    expect(normalized.escalatedToAdmin).toBe(false);
  });
});
