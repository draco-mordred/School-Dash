import { type Request, type Response } from "express";
import User from "../models/user";
import AssessmentSettings from "../models/assessmentSettings";
import Institution from "../models/institution";
import { DEFAULT_PROGRESSION_POLICY, normalizeLadder, type ProgressionPolicy, type ProgressionStage } from "../utils/progression";
import {
  resolveProgressionPolicy,
  evaluateStudentProgression,
  evaluateClassProgression,
  recordStageDecision,
  getStudentProgressionHistory,
} from "../services/progressionService";
import { logActivity } from "../utils/activitieslog";

// PR G3 — exam-cycle progression + clock-sync controllers.

export const getProgressionPolicy = async (req: Request, res: Response) => {
  try {
    const policy = await resolveProgressionPolicy();
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

const validateStage = (s: any): { stage?: ProgressionStage; error?: string } => {
  if (!s || typeof s !== "object") return { error: "each stage must be an object" };
  const id = String(s.id ?? "").trim();
  if (!id) return { error: "stage id is required" };
  const order = Number(s.order);
  if (!Number.isFinite(order)) return { error: `stage ${id}: order must be a number` };
  const failAction = s.failAction ?? "stay";
  if (failAction !== "repeat_stage" && failAction !== "repeat_from" && failAction !== "stay") {
    return { error: `stage ${id}: failAction must be repeat_stage, repeat_from or stay` };
  }
  return {
    stage: {
      id,
      order,
      label: String(s.label ?? id),
      classLevel: String(s.classLevel ?? id.replace(/[AB]$/, "")),
      subLevel: s.subLevel ? String(s.subLevel).toUpperCase() : null,
      examName: s.examName ? String(s.examName) : null,
      failAction,
      repeatFromStageId: s.repeatFromStageId ? String(s.repeatFromStageId) : null,
      clockClassLevel: String(s.clockClassLevel ?? s.classLevel ?? id),
    },
  };
};

export const updateProgressionPolicy = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      return res.status(403).json({ status: "Error!", message: "Only admins can update the progression policy" });
    }
    const p = req.body?.policy ?? req.body;
    if (!p || typeof p !== "object") {
      return res.status(400).json({ status: "Error!", message: "policy object is required" });
    }
    const stagesIn = Array.isArray(p.stages) ? p.stages : null;
    if (!stagesIn || stagesIn.length === 0) {
      return res.status(400).json({ status: "Error!", message: "stages array is required" });
    }
    const stages: ProgressionStage[] = [];
    for (const s of stagesIn) {
      const { stage, error } = validateStage(s);
      if (error || !stage) {
        return res.status(400).json({ status: "Error!", message: error ?? "Invalid stage" });
      }
      stages.push(stage);
    }
    const ids = new Set(stages.map((s) => s.id));
    for (const s of stages) {
      if (s.failAction === "repeat_from" && s.repeatFromStageId && !ids.has(s.repeatFromStageId)) {
        return res.status(400).json({ status: "Error!", message: `stage ${s.id}: repeatFromStageId ${s.repeatFromStageId} is not a configured stage` });
      }
    }
    const policy: ProgressionPolicy = {
      stages: normalizeLadder(stages),
      passMarkPercent: Number.isFinite(Number(p.passMarkPercent)) && Number(p.passMarkPercent) >= 0 && Number(p.passMarkPercent) <= 100
        ? Number(p.passMarkPercent)
        : DEFAULT_PROGRESSION_POLICY.passMarkPercent,
      phaseEquivalences: p.phaseEquivalences && typeof p.phaseEquivalences === "object"
        ? p.phaseEquivalences
        : DEFAULT_PROGRESSION_POLICY.phaseEquivalences,
    };
    const institution: any = await Institution.findOne().populate("assessmentSettings");
    if (!institution?.assessmentSettings?._id) {
      return res.status(404).json({ status: "Error!", message: "Institution assessment settings not found" });
    }
    const settings: any = await AssessmentSettings.findById(institution.assessmentSettings._id);
    settings.progressionPolicy = policy;
    await settings.save();
    await logActivity({
      userId: user._id,
      action: "Progression policy updated (" + policy.stages.length + " stages)",
    }).catch(() => undefined);
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const getStudentProgression = async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;
    const student: any = await User.findById(studentId).select("name idNumber email role");
    if (!student) {
      return res.status(404).json({ status: "Error!", message: "Student not found" });
    }
    const stageId = (req.query?.stageId as string) ?? null;
    const evaluation = await evaluateStudentProgression(studentId, stageId);
    const history = await getStudentProgressionHistory(studentId);
    res.json({ student, evaluation, history });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const getClassProgression = async (req: Request, res: Response) => {
  try {
    const result = await evaluateClassProgression(req.params.classId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const getMyProgression = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "student") {
      return res.status(403).json({ status: "Error!", message: "Student access only" });
    }
    const studentId = user._id.toString();
    const evaluation = await evaluateStudentProgression(studentId, null);
    const history = await getStudentProgressionHistory(studentId);
    // Students see their stage, outcome summary and history — no
    // not-yet-released per-course scores (those come from /grades/my).
    res.json({
      stage: evaluation.stage,
      stageStatus: evaluation.stageStatus,
      outcome: evaluation.outcome,
      nextStage: evaluation.nextStage,
      readyToAdvance: evaluation.readyToAdvance,
      history: history.history,
    });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};

export const decideStudentProgression = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      return res.status(403).json({ status: "Error!", message: "Only admins can record progression decisions" });
    }
    const { studentId, stageId } = req.params;
    const outcome = req.body?.outcome;
    if (outcome !== "passed" && outcome !== "failed" && outcome !== "repeating") {
      return res.status(400).json({ status: "Error!", message: "outcome must be passed, failed or repeating" });
    }
    const result = await recordStageDecision(
      studentId,
      stageId,
      {
        outcome,
        note: req.body?.note,
        advance: outcome === "passed" ? req.body?.advance !== false : false,
        moveClass: req.body?.moveClass === true,
      },
      user._id.toString(),
    );
    await logActivity({
      userId: user._id,
      action: "Progression decision for student " + studentId + " stage " + stageId + ": " + outcome +
        (result.advancedTo ? " (advanced to " + result.advancedTo.id + ")" : ""),
    }).catch(() => undefined);
    res.json({
      status: "Success",
      decision: result.decision,
      advancedTo: result.advancedTo,
      classMoved: result.classMoved,
      evaluation: {
        outcome: result.evaluation.outcome,
        nextStage: result.evaluation.nextStage,
        failTargetStageId: result.evaluation.failTargetStageId,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "Error!", message: (err as Error).message });
  }
};
