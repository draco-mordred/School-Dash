import mongoose from "mongoose";
import StudentFinance, { type FinanceItemKind } from "../models/studentFinance";
import CourseGrade from "../models/courseGrade";
import Attendance from "../models/attendance";
import ClinicalAttendance from "../models/clinicalAttendance";
import Institution from "../models/institution";
import {
  DEFAULT_ELIGIBILITY_POLICY,
  computeEligibilityIssues,
  attendancePercentFromCounts,
  type EligibilityPolicy,
} from "../utils/eligibility";

// PR G2 — exam-eligibility / result-release-gate service.

const idStr = (value: any) => (value?.toString ? value.toString() : String(value));

export const resolveEligibilityPolicy = async (): Promise<EligibilityPolicy> => {
  try {
    const institution: any = await Institution.findOne().populate("assessmentSettings");
    const policy = institution?.assessmentSettings?.eligibilityPolicy;
    if (policy && typeof policy.caThresholdPercent === "number") {
      return { ...DEFAULT_ELIGIBILITY_POLICY, ...policy };
    }
  } catch (err) {
    console.warn("eligibility: could not load institution policy, using defaults:", (err as Error).message);
  }
  return DEFAULT_ELIGIBILITY_POLICY;
};

const toObjectId = (value: string) => new mongoose.Types.ObjectId(value);

// Manual admin entry v1: one doc per {student, academicYear}.
export const getOrInitStudentFinance = async (studentId: string, academicYear?: string | null) => {
  const ay = academicYear ? toObjectId(academicYear) : null;
  return StudentFinance.findOneAndUpdate(
    { student: studentId, academicYear: ay },
    { $setOnInsert: { student: studentId, academicYear: ay, items: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const setStudentFinanceItems = async (
  studentId: string,
  items: Array<{ kind: FinanceItemKind; label?: string; amount?: number; paid?: boolean; note?: string }>,
  recordedBy: string,
  academicYear?: string | null
) => {
  const ay = academicYear ? toObjectId(academicYear) : null;
  const now = new Date();
  const mapped = (items ?? []).map((item) => ({
    kind: item.kind,
    label: item.label ?? (item.kind === "school_fees" ? "School fees" : "Departmental clearance"),
    amount: Number(item.amount) || 0,
    currency: "NGN",
    paid: item.paid === true,
    paidAt: item.paid === true ? now : null,
    recordedBy: toObjectId(recordedBy),
    note: item.note ?? "",
  }));
  return StudentFinance.findOneAndUpdate(
    { student: studentId, academicYear: ay },
    { $set: { items: mapped } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const getFinanceStatus = (finance: any) => {
  const items = finance?.items ?? [];
  const hasUnpaid = (kind: FinanceItemKind) =>
    items.some((i: any) => i.kind === kind && i.paid !== true);
  return {
    feesPaid: !hasUnpaid("school_fees"),
    clearancePaid: !hasUnpaid("departmental_clearance"),
    items,
  };
};

// Overall attendance percent across lecture Attendance and clinical attendance
// records. Final statuses only (pending/unverified excluded). Returns null
// when nothing is tracked (G2 does not block on untracked attendance).
export const computeStudentAttendancePercent = async (studentId: string) => {
  const lectureAgg: any[] = await (Attendance as any).aggregate([
    { $match: { student: toObjectId(studentId) } },
    { $group: { _id: null, total: { $sum: 1 }, attended: { $sum: { $cond: [{ $in: ["$status", ["present", "late", "excused"]] }, 1, 0] } } } },
  ]);
  const clinicalAgg: any[] = await (ClinicalAttendance as any).aggregate([
    { $match: { "attendees.student": toObjectId(studentId) } },
    { $unwind: "$attendees" },
    { $match: { "attendees.student": toObjectId(studentId) } },
    { $group: { _id: null, total: { $sum: 1 }, attended: { $sum: { $cond: [{ $in: ["$attendees.status", ["present", "late", "excused", "on-leave"]] }, 1, 0] } } },
  ]);
  const attended = (lectureAgg[0]?.attended ?? 0) + (clinicalAgg[0]?.attended ?? 0);
  const total = (lectureAgg[0]?.total ?? 0) + (clinicalAgg[0]?.total ?? 0);
  return attendancePercentFromCounts(attended, total);
};

// Evaluate one student's eligibility (optionally for a specific course's CA).
export const evaluateStudentEligibility = async (
  studentId: string,
  courseId?: string | null
) => {
  const policy = await resolveEligibilityPolicy();
  const finance = await getOrInitStudentFinance(studentId);
  const { feesPaid, clearancePaid } = getFinanceStatus(finance);
  const attendancePercent = await computeStudentAttendancePercent(studentId);

  let hasCa: boolean | null = null;
  let caAveragePercent: number | null = null;
  if (courseId) {
    const grade: any = await CourseGrade.findOne({ student: studentId, course: courseId });
    hasCa = grade ? Boolean(grade.hasCa) : false;
    caAveragePercent = grade ? Number(grade.caAveragePercent ?? 0) : 0;
  } else {
    // No specific course: clean if EVERY course grade has a CA record above
    // the threshold (no records at all -> treated as no-CA on file).
    const grades: any[] = await CourseGrade.find({ student: studentId });
    if (grades.length === 0) {
      hasCa = false;
      caAveragePercent = 0;
    } else {
      const below = grades.filter((gr) => !gr.hasCa || Number(gr.caAveragePercent ?? 0) < policy.caThresholdPercent);
      hasCa = below.length === 0;
      caAveragePercent = Math.round((grades.reduce((s, gr) => s + Number(gr.caAveragePercent ?? 0), 0) / grades.length) * 100) / 100;
    }
  }

  const issues = computeEligibilityIssues({
    policy,
    hasCa: hasCa ?? false,
    caAveragePercent,
    attendancePercent,
    feesPaid,
    clearancePaid,
  });

  return {
    policy,
    eligible: issues.length === 0,
    issues,
    feesPaid,
    clearancePaid,
    attendancePercent,
    attendanceTracked: attendancePercent != null,
    hasCa: hasCa ?? false,
    caAveragePercent,
  };
};

// THE G2 RESULT-RELEASE GATE: releasing a course WITHHOLDS results for students
// with outstanding issues (unless override / per-student adminOverride).
export const applyResultReleaseGate = async (
  courseId: string,
  options: { released: boolean; override?: boolean; actorId: string }
) => {
  const { released, override = false, actorId } = options;
  const grades: any[] = await CourseGrade.find({ course: courseId });
  let releasedCount = 0;
  let withheldCount = 0;

  for (const grade of grades) {
    const studentId = idStr(grade.student);
    if (!released) {
      grade.released = false;
      await grade.save();
      continue;
    }
    let issues: string[] = [];
    if (!override && !grade.adminOverride) {
      const evaluation = await evaluateStudentEligibility(studentId, idStr(grade.course));
      issues = evaluation.issues;
    }
    if (issues.length === 0) {
      grade.released = true;
      grade.withheld = false;
      grade.withheldReasons = [];
      releasedCount += 1;
    } else {
      grade.released = false;
      grade.withheld = true;
      grade.withheldReasons = issues;
      withheldCount += 1;
    }
    await grade.save();
  }

  return { total: grades.length, releasedCount, withheldCount };
};

export const setGradeAdminOverride = async (
  courseId: string,
  studentId: string,
  override: boolean
) => {
  const grade: any = await CourseGrade.findOneAndUpdate(
    { course: courseId, student: studentId },
    { $set: { adminOverride: override === true } },
    { new: true }
  );
  return grade;
};
