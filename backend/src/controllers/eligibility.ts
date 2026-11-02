import { type Request, type Response } from "express";
import User from "../models/user";
import CourseGrade from "../models/courseGrade";
import AssessmentSettings from "../models/assessmentSettings";
import Institution from "../models/institution";
import { DEFAULT_ELIGIBILITY_POLICY, type EligibilityPolicy } from "../utils/eligibility";
import {
  resolveEligibilityPolicy,
  getOrInitStudentFinance,
  setStudentFinanceItems,
  setGradeAdminOverride,
  evaluateStudentEligibility,
} from "../services/eligibilityService";
import { logActivity } from "../utils/activitieslog";

// PR G2 — exam-eligibility / result-release-gate controllers.

export const getEligibilityPolicy = async (req: Request, res: Response) => {
  try {
    const policy = await resolveEligibilityPolicy();
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

const validateEligibilityPolicy = (body: any): { policy?: Partial<EligibilityPolicy>; error?: string } => {
  const p = body?.policy ?? body;
  if (!p || typeof p !== "object") return { error: "policy object is required" };
  const policy: Partial<EligibilityPolicy> = {};
  if (p.caThresholdPercent !== undefined) {
    const v = Number(p.caThresholdPercent);
    if (!Number.isFinite(v) || v < 0 || v > 100) return { error: "caThresholdPercent must be between 0 and 100" };
    policy.caThresholdPercent = v;
  }
  if (p.attendanceCutoffPercent !== undefined) {
    const v = Number(p.attendanceCutoffPercent);
    if (!Number.isFinite(v) || v < 0 || v > 100) return { error: "attendanceCutoffPercent must be between 0 and 100" };
    policy.attendanceCutoffPercent = v;
  }
  if (p.requireSchoolFees !== undefined) policy.requireSchoolFees = p.requireSchoolFees === true;
  if (p.requireDepartmentalClearance !== undefined) policy.requireDepartmentalClearance = p.requireDepartmentalClearance === true;
  if (Object.keys(policy).length === 0) return { error: "no recognized policy fields provided" };
  return { policy };
};

export const updateEligibilityPolicy = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      return res.status(403).json({ status: "Error!", message: "Only admins can update the eligibility policy" });
    }
    const { policy, error } = validateEligibilityPolicy(req.body);
    if (error || !policy) {
      return res.status(400).json({ status: "Error!", message: error ?? "Invalid policy" });
    }
    const institution: any = await Institution.findOne().populate("assessmentSettings");
    if (!institution?.assessmentSettings?._id) {
      return res.status(404).json({ status: "Error!", message: "Institution assessment settings not found" });
    }
    const settings: any = await AssessmentSettings.findById(institution.assessmentSettings._id);
    settings.eligibilityPolicy = {
      ...DEFAULT_ELIGIBILITY_POLICY,
      ...(settings.eligibilityPolicy ?? {}),
      ...policy,
    };
    await settings.save();
    await logActivity({
      userId: user._id,
      action: "Eligibility policy updated",
    }).catch(() => undefined);
    res.json({ policy: settings.eligibilityPolicy });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const getStudentClearance = async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;
    const student: any = await User.findById(studentId).select("name idNumber email role");
    if (!student) {
      return res.status(404).json({ status: "Error!", message: "Student not found" });
    }
    const academicYear = (req.query?.academicYear as string) ?? null;
    const finance = await getOrInitStudentFinance(studentId, academicYear);
    const courseId = (req.query?.courseId as string) ?? null;
    const evaluation = await evaluateStudentEligibility(studentId, courseId);
    res.json({ student, finance, evaluation });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const upsertStudentClearance = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      return res.status(403).json({ status: "Error!", message: "Only admins can record fees/clearance" });
    }
    const studentId = req.params.studentId;
    const student: any = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ status: "Error!", message: "Student not found" });
    }
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: "Error!", message: "items array is required" });
    }
    for (const item of items) {
      if (item?.kind !== "school_fees" && item?.kind !== "departmental_clearance") {
        return res.status(400).json({ status: "Error!", message: "each item kind must be school_fees or departmental_clearance" });
      }
    }
    const academicYear = req.body?.academicYear ?? null;
    const finance = await setStudentFinanceItems(studentId, items, user._id.toString(), academicYear);
    await logActivity({
      userId: user._id,
      action: "Recorded fees/clearance for student " + studentId + " (" + items.length + " item(s))",
    }).catch(() => undefined);
    res.json({ status: "Success", finance });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const getMyClearance = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "student") {
      return res.status(403).json({ status: "Error!", message: "Student access only" });
    }
    const academicYear = (req.query?.academicYear as string) ?? null;
    const finance = await getOrInitStudentFinance(user._id.toString(), academicYear);
    const evaluation = await evaluateStudentEligibility(user._id.toString(), null);
    // Withheld results the student should know about (G2: students see the
    // reasons so they know what to clear; scores stay hidden until released).
    const withheld: any[] = await CourseGrade.find({ student: user._id, withheld: true })
      .populate("course", "name code courseID")
      .select("course withheld withheldReasons");
    res.json({ finance, evaluation, withheldResults: withheld });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const setCourseGradeOverride = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      return res.status(403).json({ status: "Error!", message: "Only admins can override the result-release gate" });
    }
    const { courseId, studentId } = req.params;
    const override = req.body?.override !== false;
    const grade = await setGradeAdminOverride(courseId, studentId, override);
    if (!grade) {
      return res.status(404).json({ status: "Error!", message: "Course grade not found for this student" });
    }
    await logActivity({
      userId: user._id,
      action: (override ? "Enabled" : "Disabled") + " result-release admin override for student " + studentId + " course " + courseId,
    }).catch(() => undefined);
    res.json({ status: "Success", adminOverride: grade.adminOverride });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};
