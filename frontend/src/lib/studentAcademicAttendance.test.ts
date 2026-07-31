import { describe, expect, it } from "vitest";
import { buildAcademicAttendanceSummary, sortCourseSummaries, sortSubjectSummaries } from "./studentAcademicAttendance";

describe("buildAcademicAttendanceSummary", () => {
  it("aggregates attendance by course and subject", () => {
    const summary = buildAcademicAttendanceSummary([
      { course: { _id: "course-1", name: "Anatomy" }, subject: { _id: "subject-1", name: "Gross Anatomy" }, status: "present" },
      { course: { _id: "course-1", name: "Anatomy" }, subject: { _id: "subject-1", name: "Gross Anatomy" }, status: "absent" },
      { course: { _id: "course-1", name: "Anatomy" }, subject: { _id: "subject-2", name: "Embryology" }, status: "present" },
      { course: { _id: "course-2", name: "Physiology" }, subject: { _id: "subject-3", name: "Neurophysiology" }, status: "late" },
    ], 75);

    expect(summary.courses).toHaveLength(2);
    expect(summary.courses[0].courseName).toBe("Anatomy");
    expect(summary.courses[0].subjects).toHaveLength(2);
    expect(summary.courses[0].attendancePercent).toBe(67);
    expect(summary.overallPercent).toBe(75);
    expect(summary.requiresAttention).toBe(false);
  });

  it("includes courses from the student course catalog even without attendance records", () => {
    const summary = buildAcademicAttendanceSummary([], 75, [
      {
        _id: "course-1",
        name: "Anatomy",
        code: "ANAT",
        subjects: [{ _id: "subject-1", name: "Gross Anatomy" }, { _id: "subject-2", name: "Embryology" }],
      },
      {
        _id: "course-2",
        name: "Physiology",
        code: "PHYS",
        subjects: [{ _id: "subject-3", name: "Neurophysiology" }],
      },
    ]);

    expect(summary.courses).toHaveLength(2);
    expect(summary.courses[0].courseName).toBe("Anatomy");
    expect(summary.courses[0].subjects).toHaveLength(2);
    expect(summary.courses[0].attendancePercent).toBe(0);
    expect(summary.courses[1].subjects[0].subjectName).toBe("Neurophysiology");
  });

  it("captures the most recent attendance date and lecturer names per subject", () => {
    const summary = buildAcademicAttendanceSummary([
      {
        course: { _id: "course-1", name: "Anatomy" },
        subject: { _id: "subject-1", name: "Gross Anatomy" },
        lecturer: { name: "Dr. Ada" },
        date: "2024-08-01T10:00:00.000Z",
        status: "present",
      },
      {
        course: { _id: "course-1", name: "Anatomy" },
        subject: { _id: "subject-1", name: "Gross Anatomy" },
        lecturer: { name: "Dr. Grace" },
        date: "2024-08-15T10:00:00.000Z",
        status: "absent",
      },
    ], 75);

    const subject = summary.courses[0].subjects[0];
    expect(subject.lastAttendanceDate).toBe("2024-08-15T10:00:00.000Z");
    expect(subject.lecturerNames).toEqual(["Dr. Ada", "Dr. Grace"]);
  });
});

describe("sort helpers", () => {
  it("sorts courses and subjects by attendance percentage", () => {
    const courses = [
      { courseId: "b", courseName: "B", attendancePercent: 80, totalSessions: 1, attendedSessions: 1, subjectCount: 1, subjects: [], requiresAttention: false },
      { courseId: "a", courseName: "A", attendancePercent: 60, totalSessions: 1, attendedSessions: 1, subjectCount: 1, subjects: [], requiresAttention: true },
    ] as any;
    const subjects = [
      { subjectId: "b", subjectName: "B", attendancePercent: 80, totalSessions: 1, attendedSessions: 1 },
      { subjectId: "a", subjectName: "A", attendancePercent: 60, totalSessions: 1, attendedSessions: 1 },
    ] as any;

    expect(sortCourseSummaries(courses, "asc")[0].courseName).toBe("A");
    expect(sortSubjectSummaries(subjects, "desc")[0].subjectName).toBe("B");
  });
});
