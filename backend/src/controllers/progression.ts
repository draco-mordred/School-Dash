import type { Request, Response } from "express";
import AssessmentSettings from "../models/assessmentSettings";
import User from "../models/user";
import { logActivity } from "../utils/activitieslog";
import { DEFAULT_PROGRESSION_POLICY } from "../utils/progression";
import {
  decideStudentProgression as serviceDecide,
  getStudentProgression as serviceGetStudent,
  resolveProgressionPolicy,
} from "../services/progressionService";

// PR G3 — progression / clock-sync controllers.

const STAFF_ROLES = ["admin", "teacher", "unitconsultant", "unitresident"];

export const getProgressionPolicy = async (req: Request, res: Response) => {
  const policy = await resolveProgressionPolicy();
  return res.status(200).json({ status: "Success", policy });
};

export const updateProgressionPolicy = async (req: Request, res: Response) => {
  const { passMarkPercent, requireAllReleased, clockSyncRequired, ladder } = req.body ?? {};
  const settings: any = await AssessmentSettings.findOne();
  if (!settings) {
    return res.status(404).json({ status: "Error", message: "Assessment settings not found" });
  }
  const updates: any = {};
  if (passMarkPercent != null) {
    const pm = Number(passMarkPercent);
    if (!Number.isFinite(pm) || pm < 0 || pm > 100) {
      return res.status(400).json({ status: "Error", message: "passMarkPercent must be 0-100" });
    }
    updates["progressionPolicy.passMarkPercent"] = pm;
  }
  if (typeof requireAllReleased === "boolean") {
    updates["progressionPolicy.requireAllReleased"] = requireAllReleased;
  }
  if (typeof clockSyncRequired === "boolean") {
    updates["progressionPolicy.clockSyncRequired"] = clockSyncRequired;
  }
  if (Array.isArray(ladder)) {
    const valid = ladder.every(
      (s: any) => s && typeof s.id === "string" && typeof s.label === "string",
    );
    if (!valid || ladder.length === 0) {
      return res.status(400).json({
        status: "Error",
        message: "ladder must be a non-empty array of {id, label, ...} steps",
      });
    }
    updates["progressionPolicy.ladder"] = ladder;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ status: "Error", message: "No valid progression policy fields supplied" });
  }
  for (const [key, value] of Object.entries(updates)) {
    settings.set(key, value);
  }
  await settings.save();
  try {
    await logActivity({
      userId: (req as any).user?._id ?? (req as any).user?.id,
      action: "progression-policy-updated",
      details: Object.keys(updates).join(", "),
    });
  } catch {
    // never block a policy update on activity logging
  }
  return res.status(200).json({ status: "Success", policy: settings.progressionPolicy ?? DEFAULT_PROGRESSION_POLICY });
};

export const getStudentProgression = async (req: Request, res: Response) => {
  try {
    const snapshot = await serviceGetStudent(req.params.studentId);
    return res.status(200).json({ status: "Success", progression: snapshot });
  } catch (err) {
    return res.status(404).json({ status: "Error", message: (err as Error).message });
  }
};

export const decideStudentProgression = async (req: Request, res: Response) => {
  const { decision, notes } = req.body ?? {};
  if (!["advance", "repeat", "hold"].includes(decision)) {
    return res.status(400).json({
      status: "Error",
      message: "decision must be one of: advance, repeat, hold",
    });
  }
  try {
    const actorId = (req as any).user?._id ?? (req as any).user?.id;
    const record = await serviceDecide({
      studentId: req.params.studentId,
      decision,
      actorId,
      notes: typeof notes === "string" ? notes : null,
    });
    return res.status(201).json({ status: "Success", record });
  } catch (err) {
    return res.status(400).json({ status: "Error", message: (err as Error).message });
  }
};

export const getMyProgression = async (req: Request, res: Response) => {
  const userId = (req as any).user?._id ?? (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ status: "Error", message: "Not authenticated" });
  }
  try {
    const snapshot = await serviceGetStudent(userId);
    return res.status(200).json({ status: "Success", progression: snapshot });
  } catch (err) {
    return res.status(404).json({ status: "Error", message: (err as Error).message });
  }
};
