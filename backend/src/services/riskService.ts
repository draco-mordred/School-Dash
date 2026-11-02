import Exam from "../models/exam";
import Submission from "../models/submission";
import Class from "../models/classes";
import User from "../models/user";
import { computeStudentAttendancePercent } from "./eligibilityService";
import {
  DEFAULT_RISK_POLICY,
  caTrendSlope,
  classifyStudentRisk,
  generateRiskInsights,
  type RiskPolicy,
} from "../utils/risk";
import {
  examTimeWindow,
  findExamOverlaps,
  type OverlapWarning,
} from "../utils/scheduleOverlap";

// PR H — predictive risk service: trend risk tiers + AI insights + pre-save
// exam overlap warnings.

export const resolveRiskPolicy = (): RiskPolicy => DEFAULT_RISK_POLICY;

const totalExamPoints = (exam: any): number => {
  if (exam?.maxScore != null && Number(exam.maxScore) > 0) return Number(exam.maxScore);
  return (exam?.questions ?? []).reduce((s: number, q: any) => s + (Number(q?.points) || 0), 0);
};

export interface StudentRiskSnapshot {
  studentId: any;
  studentName: string | null;
  classId: any | null;
  attendancePercent: number | null;
  attendanceTracked: boolean;
  caSeries: number[];
  latestCaPercent: number | null;
  caTrendSlope: number | null;
  missedAssessments: number;
  missedExamTitles: string[];
  risk: ReturnType<typeof classifyStudentRisk>;
  insights: string[];
}

// CA test series (percent per test, in chronological order) + missed
// past-due CA tests with no submission.
export const getStudentCaTrend = async (studentId: any, classId: any) => {
  const exams: any[] = await Exam.find({
    class: classId,
    assessmentKind: "ca_test",
    isActive: true,
  }).select("title dueDate maxScore questions.points");

  const submissions: any[] = await Submission.find({ student: studentId }).select("exam score");
  const scoreByExam = new Map<string, number>(
    submissions.map((s: any) => [String(s.exam?._id ?? s.exam), Number(s.score ?? 0)])
  );

  const series: Array<{ percent: number; dueDate: Date }> = [];
  const missedExamTitles: string[] = [];
  const now = Date.now();
  for (const exam of exams) {
    const total = totalExamPoints(exam);
    const due = new Date(exam.dueDate);
    if (scoreByExam.has(String(exam._id))) {
      const score = scoreByExam.get(String(exam._id)) ?? 0;
      const percent = total > 0 ? Math.round((score / total) * 10000) / 100 : 0;
      series.push({ percent, dueDate: due });
    } else if (due.getTime() < now) {
      missedExamTitles.push(String(exam.title ?? exam._id));
    }
  }
  series.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return { caSeries: series.map((s) => s.percent), missedExamTitles };
};

export const getStudentRiskSnapshot = async (studentId: any): Promise<StudentRiskSnapshot> => {
  const student: any = await User.findById(studentId);
  if (!student || student.role !== "student") {
    throw new Error("Student not found");
  }
  const classId =
    student.studentClasses ?? student.studentClass?._id ?? student.studentClass ?? student.StudentClass ?? null;

  const attendancePercent = await computeStudentAttendancePercent(String(student._id));
  const { caSeries, missedExamTitles } = classId
    ? await getStudentCaTrend(student._id, classId)
    : { caSeries: [], missedExamTitles: [] };

  const latestCaPercent = caSeries.length > 0 ? caSeries[caSeries.length - 1] : null;
  const risk = classifyStudentRisk(
    {
      attendancePercent,
      latestCaPercent,
      caSeries,
      missedAssessments: missedExamTitles.length,
    },
    resolveRiskPolicy()
  );

  return {
    studentId: student._id,
    studentName: student.name ?? null,
    classId,
    attendancePercent,
    attendanceTracked: attendancePercent != null,
    caSeries,
    latestCaPercent,
    caTrendSlope: caTrendSlope(caSeries),
    missedAssessments: missedExamTitles.length,
    missedExamTitles,
    risk,
    insights: generateRiskInsights(student.name ?? "Student", risk),
  };
};

export const getClassRiskOverview = async (classId: any) => {
  const klass: any = await Class.findById(classId);
  if (!klass) throw new Error("Class not found");
  const studentIds: any[] = klass.students ?? [];
  const snapshots: StudentRiskSnapshot[] = [];
  for (const studentId of studentIds) {
    try {
      snapshots.push(await getStudentRiskSnapshot(studentId));
    } catch {
      // skip unresolvable students in the overview
    }
  }
  const count = (tier: string) => snapshots.filter((s) => s.risk.tier === tier).length;
  return {
    classId: klass._id,
    className: klass.name,
    total: snapshots.length,
    tiers: { low: count("low"), medium: count("medium"), high: count("high") },
    highRisk: snapshots
      .filter((s) => s.risk.tier === "high")
      .map((s) => ({ studentId: s.studentId, studentName: s.studentName, factors: s.risk.factors })),
    students: snapshots,
  };
};

// Pre-save overlap check used by the exam controllers: active exams for the
// same class whose [dueDate, dueDate+duration] window intersects the
// candidate's. Non-blocking: returns warnings only.
export const checkExamOverlap = async ({
  classId,
  dueDate,
  durationMinutes,
  excludeExamId,
}: {
  classId: any;
  dueDate: Date | string;
  durationMinutes: number;
  excludeExamId?: any;
}): Promise<OverlapWarning[]> => {
  if (!classId || !dueDate || !Number.isFinite(Number(durationMinutes)) || Number(durationMinutes) <= 0) {
    return [];
  }
  const existing: any[] = await Exam.find({ class: classId, isActive: true }).select("title dueDate duration");
  const filtered = existing
    .filter((exam: any) => !excludeExamId || String(exam._id) !== String(excludeExamId))
    .map((exam: any) => ({
      id: String(exam._id),
      title: exam.title,
      dueDate: exam.dueDate,
      durationMinutes: Number(exam.duration) || 0,
      isActive: true,
    }));
  return findExamOverlaps(examTimeWindow(dueDate, Number(durationMinutes)), filtered);
};
