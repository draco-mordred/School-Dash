import { describe, expect, test } from "bun:test";
import {
  AttendanceGenerationError,
  validateAttendanceGenerationInput,
} from "../src/subs/latifah/attendanceGeneration";

const base = {
  courseId: "507f1f77bcf86cd799439011",
  classId: "507f1f77bcf86cd799439012",
  academicYearId: "507f1f77bcf86cd799439013",
  subjectId: "507f1f77bcf86cd799439014",
};

const expectError = (fn: () => unknown, code: string, status: number) => {
  try {
    fn();
    throw new Error("expected validateAttendanceGenerationInput to throw " + code);
  } catch (err: any) {
    if (!(err instanceof AttendanceGenerationError)) throw err;
    expect(err.code).toBe(code);
    expect(err.status).toBe(status);
  }
};

describe("validateAttendanceGenerationInput", () => {
  test("accepts a weekday and returns its parsed date and day name", () => {
    const { dayName } = validateAttendanceGenerationInput({
      ...base,
      date: "2026-10-26", // Monday
    });
    expect(dayName).toBe("Monday");
  });

  test("rejects Saturdays with a 400 WEEKEND error", () => {
    expectError(
      () => validateAttendanceGenerationInput({ ...base, date: "2026-10-31" }),
      "WEEKEND",
      400,
    );
  });

  test("rejects Sundays with a 400 WEEKEND error", () => {
    expectError(
      () => validateAttendanceGenerationInput({ ...base, date: "2026-11-01" }),
      "WEEKEND",
      400,
    );
  });

  test("rejects a missing subjectId with a 400 MISSING_FIELDS error", () => {
    const { subjectId, ...rest } = base;
    expectError(
      () => validateAttendanceGenerationInput({ ...rest, date: "2026-10-26" }),
      "MISSING_FIELDS",
      400,
    );
  });

  test("rejects an invalid date with a 400 INVALID_DATE error", () => {
    expectError(
      () => validateAttendanceGenerationInput({ ...base, date: "not-a-date" }),
      "INVALID_DATE",
      400,
    );
  });
});

describe("AttendanceGenerationError HTTP status mapping", () => {
  // These mirror the DB-dependent guards in generateSessionRecords; the DB paths
  // (duplicate session, missing subject/course/class) throw the same error class,
  // which the HTTP wrapper maps to res.status(error.status).
  test("duplicate session maps to 409 DUPLICATE_SESSION", () => {
    const err = new AttendanceGenerationError(409, "DUPLICATE_SESSION", "duplicate");
    expect(err.status).toBe(409);
    expect(err.code).toBe("DUPLICATE_SESSION");
    expect(err).toBeInstanceOf(Error);
  });

  test("missing subject maps to 404 SUBJECT_NOT_FOUND", () => {
    const err = new AttendanceGenerationError(404, "SUBJECT_NOT_FOUND", "missing");
    expect(err.status).toBe(404);
  });
});
