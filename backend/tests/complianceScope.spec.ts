import { describe, expect, test } from "bun:test";
import { decideComplianceAccess } from "../src/utils/complianceScope";

// PR D — pure decision matrix for compliance ownership scoping.
const facts = (o: Partial<Parameters<typeof decideComplianceAccess>[0]>) => ({
  role: "student",
  userId: "u1",
  studentId: "s1",
  classId: "c1",
  isSelf: true,
  studentOwnClassId: "c1",
  studentIsChild: false,
  studentInClass: true,
  teacherOfClass: false,
  studentIsSupervised: false,
  ...o,
});

describe("decideComplianceAccess (PR D scoping)", () => {
  test("admin can access anything", () => {
    const d = decideComplianceAccess(facts({ role: "admin", isSelf: false }));
    expect(d.allowed).toBe(true);
  });

  test("student can access own records in own class", () => {
    expect(decideComplianceAccess(facts({})).allowed).toBe(true);
  });

  test("student cannot access another student's records", () => {
    const d = decideComplianceAccess(facts({ isSelf: false }));
    expect(d.allowed).toBe(false);
  });

  test("student cannot access records for a class that is not theirs", () => {
    const d = decideComplianceAccess(facts({ studentOwnClassId: "c9" }));
    expect(d.allowed).toBe(false);
  });

  test("parent can access their own child", () => {
    const d = decideComplianceAccess(facts({ role: "parent", studentIsChild: true }));
    expect(d.allowed).toBe(true);
  });

  test("parent cannot access someone else's child", () => {
    const d = decideComplianceAccess(facts({ role: "parent", studentIsChild: false }));
    expect(d.allowed).toBe(false);
  });

  test("teacher with the class but student not enrolled -> denied", () => {
    const d = decideComplianceAccess(
      facts({ role: "teacher", teacherOfClass: true, studentInClass: false })
    );
    expect(d.allowed).toBe(false);
  });

  test("teacher teaching the class with enrolled student -> allowed", () => {
    const d = decideComplianceAccess(
      facts({ role: "teacher", teacherOfClass: true, studentInClass: true })
    );
    expect(d.allowed).toBe(true);
  });

  test("teacher without the class -> denied", () => {
    const d = decideComplianceAccess(
      facts({ role: "teacher", teacherOfClass: false, studentInClass: true })
    );
    expect(d.allowed).toBe(false);
  });

  test("unit consultant supervising the student -> allowed", () => {
    const d = decideComplianceAccess(
      facts({ role: "unitconsultant", studentIsSupervised: true })
    );
    expect(d.allowed).toBe(true);
  });

  test("unit resident not supervising the student -> denied", () => {
    const d = decideComplianceAccess(
      facts({ role: "unitresident", studentIsSupervised: false })
    );
    expect(d.allowed).toBe(false);
  });

  test("unknown role -> denied", () => {
    const d = decideComplianceAccess(facts({ role: "intruder" }));
    expect(d.allowed).toBe(false);
  });
});
