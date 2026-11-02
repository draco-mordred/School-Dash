import type { Request, Response } from "express";
import {
  checkExamOverlap,
  getClassRiskOverview,
  getStudentRiskSnapshot,
} from "../services/riskService";
import { logActivity } from "../utils/activitieslog";

// PR H — predictive risk controllers.

const STAFF_ROLES = ["admin", "teacher", "unitconsultant", "unitresident"];

export const getMyRisk = async (req: Request, res: Response) => {
  const userId = (req as any).user?._id ?? (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ status: "Error", message: "Not authenticated" });
  }
  try {
    const snapshot = await getStudentRiskSnapshot(userId);
    return res.status(200).json({ status: "Success", risk: snapshot });
  } catch (err) {
    return res.status(404).json({ status: "Error", message: (err as Error).message });
  }
};

export const getStudentRisk = async (req: Request, res: Response) => {
  try {
    const snapshot = await getStudentRiskSnapshot(req.params.studentId);
    return res.status(200).json({ status: "Success", risk: snapshot });
  } catch (err) {
    return res.status(404).json({ status: "Error", message: (err as Error).message });
  }
};

export const getClassRisk = async (req: Request, res: Response) => {
  try {
    const overview = await getClassRiskOverview(req.params.classId);
    return res.status(200).json({ status: "Success", overview });
  } catch (err) {
    return res.status(404).json({ status: "Error", message: (err as Error).message });
  }
};

// Pre-save overlap check endpoint (staff): same math the exam create flows use.
export const examOverlapCheck = async (req: Request, res: Response) => {
  const { class: classId, dueDate, duration, excludeExamId } = req.body ?? {};
  if (!classId || !dueDate || !duration) {
    return res.status(400).json({
      status: "Error",
      message: "class, dueDate and duration are required",
    });
  }
  try {
    const warnings = await checkExamOverlap({
      classId,
      dueDate,
      durationMinutes: Number(duration),
      excludeExamId,
    });
    return res.status(200).json({ status: "Success", overlapWarnings: warnings });
  } catch (err) {
    return res.status(400).json({ status: "Error", message: (err as Error).message });
  }
};

export const logRiskViewed = async (req: Request, res: Response) => {
  try {
    await logActivity({
      userId: (req as any).user?._id ?? (req as any).user?.id,
      action: "risk-overview-viewed",
      details: String(req.params.classId ?? ""),
    });
  } catch {
    // never block on activity logging
  }
  return res.status(200).json({ status: "Success" });
};

export const STAFF = STAFF_ROLES;
