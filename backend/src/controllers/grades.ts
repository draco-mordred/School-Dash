import { type Request, type Response } from "express";
import CourseModel from "../models/courses";
import CourseGrade from "../models/courseGrade";
import AssessmentSettings from "../models/assessmentSettings";
import Institution from "../models/institution";
import { DEFAULT_GRADING_POLICY, computeGpa, type GradeBand, type GradingPolicy } from "../utils/grading";
import { recomputeCourseResults, resolveGradingPolicy } from "../services/gradingService";
import { logActivity } from "../utils/activitieslog";

// PR G1 — grading/GPA controllers.

const idStr = (value: any) => (value?.toString ? value.toString() : String(value));

const canManageCourse = (user: any, course: any) =>
  user?.role === "admin" ||
  (Array.isArray(course?.lecturer) &&
    course.lecturer.some((l: any) => idStr(l) === idStr(user?._id)));

export const getGradingPolicy = async (req: Request, res: Response) => {
  try {
    const policy = await resolveGradingPolicy();
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

const validatePolicy = (body: any): { policy?: Partial<GradingPolicy>; error?: string } => {
  const p = body?.policy ?? body;
  if (!p || typeof p !== "object") return { error: "policy object is required" };
  const ca = Number(p.caWeightPercent);
  const ex = Number(p.examWeightPercent);
  if (!Number.isFinite(ca) || !Number.isFinite(ex) || ca < 0 || ex < 0 || ca + ex <= 0) {
    return { error: "caWeightPercent and examWeightPercent must be non-negative numbers summing above zero" };
  }
  let bands: GradeBand[] | undefined;
  if (p.gradeBands !== undefined) {
    if (!Array.isArray(p.gradeBands) || p.gradeBands.length === 0) {
      return { error: "gradeBands must be a non-empty array of { letter, minPercent, gradePoints }" };
    }
    for (const b of p.gradeBands) {
      if (!b || typeof b.letter !== "string" || !b.letter.trim()) {
        return { error: "each grade band needs a letter" };
      }
      if (!Number.isFinite(Number(b.minPercent)) || !Number.isFinite(Number(b.gradePoints))) {
        return { error: "each grade band needs numeric minPercent and gradePoints" };
      }
    }
    bands = p.gradeBands
      .map((b: any) => ({
        letter: String(b.letter).trim(),
        minPercent: Number(b.minPercent),
        gradePoints: Number(b.gradePoints),
      }))
      .sort((a: GradeBand, b: GradeBand) => b.minPercent - a.minPercent);
  }
  const policy: Partial<GradingPolicy> = {
    caWeightPercent: ca,
    examWeightPercent: ex,
  };
  if (p.caTestMaxScore !== undefined) {
    const v = Number(p.caTestMaxScore);
    if (!Number.isFinite(v) || v <= 0) return { error: "caTestMaxScore must be a positive number" };
    policy.caTestMaxScore = v;
  }
  if (p.passMarkPercent !== undefined) {
    const v = Number(p.passMarkPercent);
    if (!Number.isFinite(v) || v < 0 || v > 100) return { error: "passMarkPercent must be between 0 and 100" };
    policy.passMarkPercent = v;
  }
  if (bands) policy.gradeBands = bands;
  return { policy };
};

export const updateGradingPolicy = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      return res.status(403).json({ status: "Error!", message: "Only admins can update the grading policy" });
    }
    const { policy, error } = validatePolicy(req.body);
    if (error || !policy) {
      return res.status(400).json({ status: "Error!", message: error ?? "Invalid policy" });
    }
    const institution: any = await Institution.findOne().populate("assessmentSettings");
    if (!institution?.assessmentSettings?._id) {
      return res.status(404).json({ status: "Error!", message: "Institution assessment settings not found" });
    }
    const settings: any = await AssessmentSettings.findById(institution.assessmentSettings._id);
    settings.gradingPolicy = { ...DEFAULT_GRADING_POLICY, ...(settings.gradingPolicy ?? {}), ...policy };
    await settings.save();
    await logActivity({
      userId: user._id,
      action: "Grading policy updated (weights " + policy.caWeightPercent + "/" + policy.examWeightPercent + ")",
    }).catch(() => undefined);
    res.json({ policy: settings.gradingPolicy });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

const loadCourseOr404 = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const course: any = await CourseModel.findById(req.params.courseId);
  if (!course) {
    res.status(404).json({ status: "Error!", message: "Course not found" });
    return null;
  }
  if (!canManageCourse(user, course)) {
    res.status(403).json({ status: "Error!", message: "Only admins or the course lecturer can manage course grades" });
    return null;
  }
  return course;
};

export const recomputeCourse = async (req: Request, res: Response) => {
  try {
    const course = await loadCourseOr404(req, res);
    if (!course) return;
    const classId = (req.query?.classId as string) ?? null;
    const outcome = await recomputeCourseResults(idStr(course._id), classId);
    res.json({ status: "Success", ...outcome });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const getCourseResults = async (req: Request, res: Response) => {
  try {
    const course = await loadCourseOr404(req, res);
    if (!course) return;
    const filter: any = { course: idStr(course._id) };
    const classId = req.query?.classId as string | undefined;
    if (classId) filter.class = classId;
    const grades = await CourseGrade.find(filter)
      .populate("student", "name idNumber email")
      .populate("class", "name")
      .sort({ weightedPercent: -1 });
    res.json({ results: grades });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const releaseCourseResults = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      return res.status(403).json({ status: "Error!", message: "Only admins can release course results" });
    }
    const released = req.body?.released !== false;
    const outcome = await CourseGrade.updateMany(
      { course: req.params.courseId },
      { $set: { released } }
    );
    await logActivity({
      userId: user._id,
      action: (released ? "Released" : "Unreleased") + " results for course " + req.params.courseId,
    }).catch(() => undefined);
    res.json({ status: "Success", released, modified: outcome.modifiedCount ?? 0 });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const getMyResults = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "student") {
      return res.status(403).json({ status: "Error!", message: "Student access only" });
    }
    // Students only ever see RELEASED results (G2 will gate this harder).
    const grades: any[] = await CourseGrade.find({ student: user._id, released: true })
      .populate("course", "name code courseID creditUnits")
      .populate("class", "name");
    const gpa = computeGpa(
      grades.map((g) => ({ gradePoints: g.gradePoints, creditUnits: g.creditUnits }))
    );
    res.json({ results: grades, gpa, gpaScale: DEFAULT_GRADING_POLICY.gpaScale });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};
