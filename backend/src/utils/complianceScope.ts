// PR D — ownership scoping for compliance endpoints.
// Pure decision matrix (decideComplianceAccess) + a DB-fact wrapper
// (checkComplianceAccess) used by /check, /violations and /report so
// every role is restricted to the students/classes it actually owns:
//   admin                    -> everything
//   student                  -> only self, only own class
//   parent                   -> only own children (parentStudents)
//   teacher                  -> only classes they teach, students enrolled there
//   unitconsultant/unitresident -> only students they supervise

import User from "../models/user";
import ClassModel from "../models/classes";

export interface ComplianceAccessFacts {
  role: string;
  userId: string;
  studentId: string;
  classId: string;
  isSelf: boolean;
  studentOwnClassId: string | null;
  studentIsChild: boolean;
  studentInClass: boolean;
  teacherOfClass: boolean;
  studentIsSupervised: boolean;
}

export interface ComplianceAccessDecision {
  allowed: boolean;
  reason?: string;
}

// Normalizes a value that may be an ObjectId, a populated doc, or an id string.
export const idOf = (v: any): string =>
  v == null ? "" : v._id != null ? String(v._id) : String(v);

export const decideComplianceAccess = (
  facts: ComplianceAccessFacts,
): ComplianceAccessDecision => {
  switch (facts.role) {
    case "admin":
      return { allowed: true };
    case "student":
      if (!facts.isSelf) {
        return {
          allowed: false,
          reason: "Students can only access their own compliance records",
        };
      }
      if (
        facts.studentOwnClassId &&
        facts.studentOwnClassId !== facts.classId
      ) {
        return {
          allowed: false,
          reason: "Students can only access their own class records",
        };
      }
      return { allowed: true };
    case "parent":
      if (!facts.studentIsChild) {
        return {
          allowed: false,
          reason: "Parents can only access compliance records for their own children",
        };
      }
      if (!facts.studentInClass) {
        return {
          allowed: false,
          reason: "Student is not enrolled in the requested class",
        };
      }
      return { allowed: true };
    case "teacher":
      if (!facts.teacherOfClass) {
        return { allowed: false, reason: "You do not teach this class" };
      }
      if (!facts.studentInClass) {
        return {
          allowed: false,
          reason: "Student is not enrolled in the requested class",
        };
      }
      return { allowed: true };
    case "unitconsultant":
    case "unitresident":
      if (!facts.studentIsSupervised) {
        return {
          allowed: false,
          reason: "You do not supervise this student",
        };
      }
      if (!facts.studentInClass) {
        return {
          allowed: false,
          reason: "Student is not enrolled in the requested class",
        };
      }
      return { allowed: true };
    default:
      return {
        allowed: false,
        reason: "Unsupported role for compliance access",
      };
  }
};

const asIdArray = (arr: any): any[] =>
  Array.isArray(arr) ? arr : arr == null ? [] : [arr];

/**
 * Gathers the DB facts for (user, student, class) and applies the pure
 * decision matrix. Returns { allowed, reason } — callers map a denied
 * decision to a 403 with the reason.
 */
export const checkComplianceAccess = async (
  user: any,
  target: { studentId: unknown; classId: unknown },
): Promise<ComplianceAccessDecision> => {
  const studentId = idOf(target.studentId);
  const classId = idOf(target.classId);
  if (!studentId || !classId) {
    return { allowed: false, reason: "Student and class are required" };
  }

  const student = await User.findById(studentId)
    .select("role studentClasses")
    .lean();
  if (!student) {
    return { allowed: false, reason: "Student not found" };
  }

  const cls = await ClassModel.findById(classId)
    .select("students classTeacher")
    .lean();
  if (!cls) {
    return { allowed: false, reason: "Class not found" };
  }

  return decideComplianceAccess({
    role: String(user?.role ?? ""),
    userId: idOf(user?._id),
    studentId,
    classId,
    isSelf: idOf(user?._id) === studentId,
    studentOwnClassId: student.studentClasses
      ? idOf(student.studentClasses)
      : null,
    studentIsChild: asIdArray(user?.parentStudents).some((x: any) =>
      idOf(x) === studentId
    ),
    studentInClass: (cls.students ?? []).some((s: any) => idOf(s) === studentId),
    teacherOfClass:
      asIdArray(user?.teacherClasses).some((x: any) => idOf(x) === classId) ||
      (cls.classTeacher ? idOf(cls.classTeacher) === idOf(user?._id) : false),
    studentIsSupervised: asIdArray(user?.supervisorStudents).some(
      (x: any) => idOf(x) === studentId
    ),
  });
};
