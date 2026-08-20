import { describe, expect, it } from "vitest";
import { resolveVisibleClasses } from "./StudyMaterials";

describe("resolveVisibleClasses", () => {
  it("shows all classes for admins", () => {
    const classes = [
      { _id: "c1", name: "Class A" },
      { _id: "c2", name: "Class B" },
    ] as any[];

    expect(resolveVisibleClasses({ role: "admin" } as any, classes)).toEqual(classes);
  });

  it("resolves teacher classes through subject-to-course-to-class membership and deduplicates them", () => {
    const classes = [
      {
        _id: "c1",
        name: "Class A",
        courses: [{ _id: "course-1", name: "Math", subjects: [{ _id: "subject-1", name: "Algebra" }, { _id: "subject-2", name: "Calculus" }] }],
      },
      {
        _id: "c2",
        name: "Class B",
        courses: [{ _id: "course-2", name: "Science", subjects: [{ _id: "subject-3", name: "Biology" }] }],
      },
      {
        _id: "c3",
        name: "Class C",
        courses: [{ _id: "course-1", name: "Math", subjects: [{ _id: "subject-4", name: "Statistics" }] }],
      },
    ] as any[];

    const user = {
      role: "teacher",
      teacherSubject: ["subject-1", "subject-3"],
      teacherCourses: ["course-1"],
    } as any;

    expect(resolveVisibleClasses(user, classes).map((item) => item._id)).toEqual(["c1", "c2", "c3"]);
  });

  it("treats staff as a teacher alias for class visibility", () => {
    const classes = [
      {
        _id: "c1",
        name: "Class A",
        courses: [{ _id: "course-1", name: "Math", subjects: [{ _id: "subject-1", name: "Algebra" }] }],
      },
      {
        _id: "c2",
        name: "Class B",
        courses: [{ _id: "course-2", name: "Science", subjects: [{ _id: "subject-2", name: "Biology" }] }],
      },
    ] as any[];

    const user = {
      role: "staff",
      teacherSubject: ["subject-1"],
    } as any;

    expect(resolveVisibleClasses(user, classes).map((item) => item._id)).toEqual(["c1"]);
  });

  it("shows only the student class for students", () => {
    const classes = [
      { _id: "c1", name: "Class A" },
      { _id: "c2", name: "Class B" },
    ] as any[];

    const user = {
      role: "student",
      studentClasses: "c2",
    } as any;

    expect(resolveVisibleClasses(user, classes).map((item) => item._id)).toEqual(["c2"]);
  });
});
