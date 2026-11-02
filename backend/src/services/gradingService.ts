import CourseModel from "../models/courses";
import Exam from "../models/exam";
import Submission from "../models/submission";
import CourseGrade from "../models/courseGrade";
import Institution from "../models/institution";
import {
  DEFAULT_GRADING_POLICY,
  computeCourseResult,
  computeGpa,
  type GradingPolicy,
  type ScoredItem,
} from "../utils/grading";

// PR G1 — grading computation service.

// Effective grading policy: institution's AssessmentSettings.gradingPolicy,
// falling back to the defaults (JUTH values are seeded into AssessmentSettings
// by config/juthInstitution.ts so they stay admin-editable, never hardcoded).
export const resolveGradingPolicy = async (): Promise<GradingPolicy> => {
  try {
    const institution: any = await Institution.findOne().populate("assessmentSettings");
    const policy = institution?.assessmentSettings?.gradingPolicy;
    if (policy && Array.isArray(policy.gradeBands) && policy.gradeBands.length > 0) {
      return policy as GradingPolicy;
    }
  } catch (err) {
    console.warn("grading: could not load institution grading policy, using defaults:", (err as Error).message);
  }
  return DEFAULT_GRADING_POLICY;
};

// Max score of an exam: explicit maxScore, else the sum of question points.
export const examMaxScore = (exam: any): number => {
  if (typeof exam?.maxScore === "number" && exam.maxScore > 0) return exam.maxScore;
  return (exam?.questions ?? []).reduce(
    (sum: number, q: any) => sum + (typeof q?.points === "number" ? q.points : 1),
    0
  );
};

const idStr = (value: any) => (value?.toString ? value.toString() : String(value));

// Recompute and upsert a CourseGrade for every student with submissions on
// the course. CA tests = exams with assessmentKind "ca_test"; the major exam
// component = average percent across taken "major_exam" exams (a course has
// ONE major exam; averaging keeps recompute deterministic if several exist).
export const recomputeCourseResults = async (courseId: string, classId?: string | null) => {
  const course: any = await CourseModel.findById(courseId);
  if (!course) throw new Error("Course not found");
  const policy = await resolveGradingPolicy();

  const examFilter: any = { course: courseId };
  if (classId) examFilter.class = classId;
  const exams: any[] = await Exam.find(examFilter);
  const caExams = exams.filter((e) => e.assessmentKind === "ca_test");
  const majorExams = exams.filter((e) => (e.assessmentKind ?? "major_exam") === "major_exam");
  if (exams.length === 0) return { course: courseId, updated: 0, results: [] };

  const examIds = exams.map((e) => e._id);
  const submissions: any[] = await Submission.find({ exam: { $in: examIds } });
  const byStudent = new Map<string, any[]>();
  for (const s of submissions) {
    const key = idStr(s.student);
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key)!.push(s);
  }

  const creditUnits =
    typeof course.creditUnits === "number" && course.creditUnits > 0 ? course.creditUnits : 1;
  const defaultClass = classId ?? idStr(exams[0].class) ?? null;
  const results: any[] = [];

  for (const [studentId, subs] of byStudent) {
    const caTests: ScoredItem[] = [];
    for (const exam of caExams) {
      const sub = subs.find((s: any) => idStr(s.exam) === idStr(exam._id));
      if (sub) caTests.push({ score: sub.score ?? 0, maxScore: examMaxScore(exam) });
    }
    let examItem: ScoredItem | null = null;
    const takenMajor = majorExams
      .map((exam) => {
        const sub = subs.find((s: any) => idStr(s.exam) === idStr(exam._id));
        return sub ? { score: sub.score ?? 0, maxScore: examMaxScore(exam) } : null;
      })
      .filter((x): x is ScoredItem => x !== null);
    if (takenMajor.length > 0) {
      const avgPercent =
        takenMajor.reduce((sum, item) => sum + (item.score / (item.maxScore || 1)) * 100, 0) /
        takenMajor.length;
      examItem = { score: avgPercent, maxScore: 100 };
    }

    const result = computeCourseResult({ caTests, exam: examItem, policy });
    await CourseGrade.findOneAndUpdate(
      { student: studentId, course: courseId },
      {
        $set: {
          student: studentId,
          course: courseId,
          class: defaultClass,
          academicYear: course.academicYear ?? null,
          caTestCount: result.caTestCount,
          caAverageRaw: result.caAverageRaw,
          caAveragePercent: result.caAveragePercent,
          examPercent: result.examPercent,
          weightedPercent: result.weightedPercent,
          letter: result.letter,
          gradePoints: result.gradePoints,
          creditUnits,
          passed: result.passed,
          hasCa: result.hasCa,
          hasExam: result.hasExam,
          computedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    results.push({ student: studentId, ...result });
  }

  return { course: courseId, updated: results.length, results };
};

export const computeStudentGpa = async (studentId: string) => {
  const grades: any[] = await CourseGrade.find({ student: studentId });
  const gpa = computeGpa(
    grades.map((g) => ({ gradePoints: g.gradePoints, creditUnits: g.creditUnits }))
  );
  return { gpa, gpaScale: DEFAULT_GRADING_POLICY.gpaScale, courses: grades.length };
};
