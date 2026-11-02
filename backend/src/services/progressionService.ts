import AssessmentSettings from "../models/assessmentSettings";
import Institution from "../models/institution";
import CourseGrade from "../models/courseGrade";
import ClassModel from "../models/classes";
import User from "../models/user";
import StudentProgression from "../models/studentProgression";
import {
  DEFAULT_PROGRESSION_POLICY,
  evaluateStageOutcome,
  failTargetStageId,
  nextStage,
  normalizeLadder,
  resolveStage,
  resolveStageForClassName,
  clockClassForStage,
  type ProgressionPolicy,
  type ProgressionStage,
  type StageOutcome,
} from "../utils/progression";

// PR G3 — progression + clock-sync service. Resolves the institution's
// exam-cycle ladder (JUTH seeded via config file), evaluates students
// against their stage gate from released CourseGrades, and records admin
// pass/fail/repeat decisions that drive class/sub-level transitions.

export const resolveProgressionPolicy = async (): Promise<ProgressionPolicy> => {
  try {
    const institution: any = await Institution.findOne();
    const settingsId = institution?.assessmentSettings;
    if (!settingsId) return DEFAULT_PROGRESSION_POLICY;
    const settings: any = await AssessmentSettings.findById(settingsId);
    const policy = settings?.progressionPolicy;
    if (policy && Array.isArray(policy.stages) && policy.stages.length > 0) {
      return {
        stages: policy.stages,
        passMarkPercent: Number.isFinite(Number(policy.passMarkPercent))
          ? Number(policy.passMarkPercent)
          : DEFAULT_PROGRESSION_POLICY.passMarkPercent,
        phaseEquivalences: policy.phaseEquivalences ?? DEFAULT_PROGRESSION_POLICY.phaseEquivalences,
      };
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_PROGRESSION_POLICY;
};

export interface StudentStageEvaluation {
  studentId: string;
  stage: ProgressionStage | null;
  stageStatus: string | null;
  outcome: StageOutcome;
  nextStage: ProgressionStage | null;
  failTargetStageId: string | null;
  clockClassLevel: string | null;
  readyToAdvance: boolean;
}

// Evaluate one student against the ladder stage their class maps to
// (or an explicit stageId). Grades come from released, non-withheld
// CourseGrades (PR G2 gate respected).
export const evaluateStudentProgression = async (
  studentId: string,
  stageId?: string | null,
): Promise<StudentStageEvaluation> => {
  const policy = await resolveProgressionPolicy();
  const student: any = await User.findById(studentId);
  if (!student) throw new Error("Student not found");

  let stage: ProgressionStage | null = null;
  if (stageId) {
    stage = resolveStage(policy.stages, stageId);
  }
  if (!stage) {
    // Resolve from the student's class name
    const classIds: any[] = Array.isArray(student.studentClasses) ? student.studentClasses : [];
    let className: string | null = null;
    if (classIds.length > 0) {
      const cls: any = await ClassModel.findById(classIds[classIds.length - 1]);
      className = cls?.name ?? null;
    }
    stage = resolveStageForClassName(policy.stages, className);
  }

  const grades: any[] = await CourseGrade.find({ student: studentId }).lean();
  const outcome = evaluateStageOutcome(grades ?? [], policy.passMarkPercent);

  // Latest existing progression record for this stage (status history)
  let stageStatus: string | null = null;
  if (stage) {
    const record: any = await StudentProgression.findOne({ student: studentId, stageId: stage.id })
      .sort({ createdAt: -1 });
    stageStatus = record?.status ?? "in_progress";
  }

  return {
    studentId,
    stage,
    stageStatus,
    outcome,
    nextStage: stage ? nextStage(policy.stages, stage.id) : null,
    failTargetStageId: failTargetStageId(stage),
    clockClassLevel: clockClassForStage(policy, stage),
    readyToAdvance: outcome.readyToAdvance,
  };
};

// Evaluate every student in a class against the stage that class maps to.
export const evaluateClassProgression = async (classId: string) => {
  const policy = await resolveProgressionPolicy();
  const cls: any = await ClassModel.findById(classId);
  if (!cls) throw new Error("Class not found");
  const stage = resolveStageForClassName(policy.stages, cls.name);

  const studentIds: any[] = Array.isArray(cls.students) ? cls.students : [];
  const results: StudentStageEvaluation[] = [];
  for (const id of studentIds) {
    results.push(await evaluateStudentProgression(String(id), stage?.id ?? null));
  }
  return {
    classId: String(cls._id),
    className: cls.name,
    stage,
    clockClassLevel: clockClassForStage(policy, stage),
    evaluated: results.length,
    readyCount: results.filter((r) => r.readyToAdvance).length,
    students: results,
  };
};

export interface StageDecision {
  outcome: "passed" | "failed" | "repeating";
  note?: string;
  // When passed: also advance the student to the next stage (and optionally
  // move their class to the next stage's class).
  advance?: boolean;
  moveClass?: boolean;
}

// Record an admin's progression decision for a student's stage. On
// outcome "passed" + advance, a new in_progress record is created for the
// next stage; with moveClass the student's class is switched to the class
// matching the next stage label (same academic year).
export const recordStageDecision = async (
  studentId: string,
  stageId: string,
  decision: StageDecision,
  actorId: string,
) => {
  const policy = await resolveProgressionPolicy();
  const stage = resolveStage(policy.stages, stageId);
  if (!stage) throw new Error(`Unknown progression stage: ${stageId}`);

  const student: any = await User.findById(studentId);
  if (!student) throw new Error("Student not found");

  const evaluation = await evaluateStudentProgression(studentId, stageId);

  const updated: any = await StudentProgression.findOneAndUpdate(
    { student: studentId, stageId: stage.id, academicYear: null },
    {
      $set: {
        student: studentId,
        stageId: stage.id,
        stageLabel: stage.label,
        status: decision.outcome,
        courseCount: evaluation.outcome.totalCourses,
        passedCount: evaluation.outcome.passedCount,
        failedCount: evaluation.outcome.failedCount,
        withheldCount: evaluation.outcome.withheldCount,
        weightedAverage: evaluation.outcome.weightedAverage,
        decidedBy: actorId,
        decidedAt: new Date(),
        note: String(decision.note ?? ""),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  let advancedTo: ProgressionStage | null = null;
  let classMoved = false;
  if (decision.outcome === "passed" && decision.advance) {
    advancedTo = nextStage(policy.stages, stage.id);
    if (advancedTo) {
      await StudentProgression.findOneAndUpdate(
        { student: studentId, stageId: advancedTo.id, academicYear: null },
        {
          $set: {
            student: studentId,
            stageId: advancedTo.id,
            stageLabel: advancedTo.label,
            status: "in_progress",
            decidedBy: null,
            decidedAt: null,
            note: "",
            courseCount: 0,
            passedCount: 0,
            failedCount: 0,
            withheldCount: 0,
            weightedAverage: 0,
            enteredAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (decision.moveClass) {
        // Move the student to the class matching the next stage (same
        // academic year as their current class, if any).
        const classIds: any[] = Array.isArray(student.studentClasses) ? student.studentClasses : [];
        let academicYear: any = null;
        if (classIds.length > 0) {
          const currentClass: any = await ClassModel.findById(classIds[classIds.length - 1]);
          academicYear = currentClass?.academicYear ?? null;
        }
        const targetClass: any = academicYear
          ? await ClassModel.findOne({ name: { $regex: advancedTo.classLevel, $options: "i" }, academicYear })
          : null;
        if (targetClass) {
          await User.updateOne({ _id: studentId }, { $set: { studentClasses: [targetClass._id] } });
          await ClassModel.updateOne({ _id: targetClass._id }, { $addToSet: { students: studentId } });
          for (const oldId of classIds) {
            if (String(oldId) !== String(targetClass._id)) {
              await ClassModel.updateOne({ _id: oldId }, { $pull: { students: studentId } });
            }
          }
          classMoved = true;
        }
      }
    }
  }

  return { decision: updated, advancedTo, classMoved, evaluation };
};

export const getStudentProgressionHistory = async (studentId: string) => {
  const policy = await resolveProgressionPolicy();
  const history: any[] = await StudentProgression.find({ student: studentId })
    .sort({ createdAt: 1 })
    .lean();
  const stageIds = new Set(history.map((h) => h.stageId));
  // Current stage = first ladder stage with no record yet, else the last
  // recorded in_progress / repeating stage.
  const ladder = normalizeLadder(policy.stages);
  let currentStage: ProgressionStage | null = null;
  for (const s of ladder) {
    if (!stageIds.has(s.id)) { currentStage = s; break; }
  }
  if (!currentStage) {
    const active = history.find((h) => h.status === "in_progress" || h.status === "repeating");
    currentStage = active ? resolveStage(policy.stages, active.stageId) : null;
  }
  return {
    ladder,
    currentStage,
    nextStage: currentStage ? nextStage(policy.stages, currentStage.id) : null,
    history,
  };
};
