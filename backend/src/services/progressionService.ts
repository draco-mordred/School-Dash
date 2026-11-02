import AssessmentSettings from "../models/assessmentSettings";
import CourseGrade from "../models/courseGrade";
import Class from "../models/classes";
import User from "../models/user";
import AcademicClock from "../models/academicClock";
import ProgressionRecord from "../models/progressionRecord";
import { logActivity } from "../utils/activitieslog";
import { resolveAcademicClockPhase, hasConfiguredAcademicClockPhases } from "../utils/academicClockPhase";
import {
  DEFAULT_PROGRESSION_POLICY,
  GRADUATED_STEP,
  evaluateProgression,
  findLadderStep,
  nextLadderStep,
  normalizeProgressionStep,
  repeatTargetFor,
  type ProgressionPolicy,
  type ProgressionStep,
} from "../utils/progression";

// PR G3 — progression + clock-sync service.

export const resolveProgressionPolicy = async (): Promise<ProgressionPolicy> => {
  try {
    const settings: any = await AssessmentSettings.findOne();
    const p = settings?.progressionPolicy;
    if (p && Array.isArray(p?.ladder) && p.ladder.length > 0) {
      return {
        ...DEFAULT_PROGRESSION_POLICY,
        ...(p as Partial<ProgressionPolicy>),
        ladder: p.ladder as ProgressionStep[],
      };
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_PROGRESSION_POLICY;
};

// Find the Class for a ladder step id within an academic year. Class names are
// free-form ("500 Level", "500 Level A", "500A"...) so match on the numeric
// level + optional A/B sub-level.
const findClassForStep = async (academicYear: any, stepId: string) => {
  const base = String(stepId).slice(0, 3);
  const sub = String(stepId).slice(3).toUpperCase() || null;
  const candidates = sub
    ? [base + " " + sub, base + " Level " + sub, base + sub, base + " Level"]
    : [base + " Level", base];
  for (const candidate of candidates) {
    const found: any = await Class.findOne({
      academicYear,
      name: { $regex: new RegExp("^\\s*" + candidate.replace(/\s+/g, "\\s+") + "\\s*$", "i") },
    });
    if (found) return found;
  }
  // Fallback: any class whose normalized name matches the step.
  const all: any[] = await Class.find({ academicYear });
  return all.find((c) => normalizeProgressionStep(c.name) === stepId) ?? null;
};

export interface StudentProgressionSnapshot {
  studentId: any;
  studentName: string;
  classId: any | null;
  className: string | null;
  academicYear: any | null;
  currentStep: ProgressionStep | null;
  nextStep: ProgressionStep | null;
  repeatStep: ProgressionStep | null;
  evaluation: ReturnType<typeof evaluateProgression>;
  clockPhase: { phaseId: string | null; phaseName: string | null; startsAt: Date | null; endsAt: Date | null; configured: boolean } | null;
  clockSynced: boolean;
  history: any[];
}

export const getStudentProgression = async (studentId: any): Promise<StudentProgressionSnapshot> => {
  const student: any = await User.findById(studentId);
  if (!student || student.role !== "student") {
    throw new Error("Student not found");
  }
  const policy = await resolveProgressionPolicy();
  const classId = student.studentClasses ?? null;
  const klass: any = classId ? await Class.findById(classId) : null;
  const currentStepId = normalizeProgressionStep(klass?.name);
  const currentStep = findLadderStep(policy.ladder, currentStepId);
  const nextStep = nextLadderStep(policy.ladder, currentStepId);
  const repeatStep = repeatTargetFor(policy.ladder, currentStepId);

  const grades: any[] = klass
    ? await CourseGrade.find({ student: studentId, class: classId })
    : [];
  const evaluation = evaluateProgression(
    grades.map((g: any) => ({
      passed: g.passed,
      released: g.released,
      withheld: g.withheld,
      hasExam: g.hasExam,
      letter: g.letter,
    })),
    policy,
  );

  // Clock sync (NOV 2026 ADDITIONS b): the class's AcademicClock phases drive
  // the exam/CA windows for the step. Equivalent steps share the same phase.
  const clock: any = classId ? await AcademicClock.findOne({ classId }) : null;
  const configured = Boolean(clock && hasConfiguredAcademicClockPhases(clock.phaseConfig));
  const resolution = clock ? resolveAcademicClockPhase(clock) : null;
  const clockPhase = clock
    ? {
        phaseId: resolution?.phaseId ?? clock.clockPhase ?? null,
        phaseName: resolution?.phase?.name ?? String(resolution?.phaseId ?? "unknown"),
        startsAt: resolution?.startsAt ?? null,
        endsAt: resolution?.endsAt ?? null,
        configured,
      }
    : null;
  const clockSynced = Boolean(clock && clock.clockStartDate && configured);

  const history = await ProgressionRecord.find({ student: studentId }).sort({ createdAt: -1 }).limit(20);

  return {
    studentId: student._id,
    studentName: student.name,
    classId: klass?._id ?? null,
    className: klass?.name ?? null,
    academicYear: klass?.academicYear ?? null,
    currentStep,
    nextStep,
    repeatStep,
    evaluation,
    clockPhase,
    clockSynced,
    history,
  };
};

export const decideStudentProgression = async ({
  studentId,
  decision,
  actorId,
  notes,
}: {
  studentId: any;
  decision: "advance" | "repeat" | "hold";
  actorId: any;
  notes?: string | null;
}) => {
  const snapshot = await getStudentProgression(studentId);
  const policy = await resolveProgressionPolicy();

  if (snapshot.currentStep && policy.clockSyncRequired && !snapshot.clockSynced) {
    throw new Error("Class academic clock is not configured/synced (progressionPolicy.clockSyncRequired)");
  }

  let toStepId: string | null = null;
  let recordedDecision: "advance" | "repeat" | "hold" | "graduate" = decision;

  if (decision === "advance") {
    if (!snapshot.currentStep) throw new Error("Student's class does not map to a ladder step");
    if (!snapshot.evaluation.readyToAdvance) {
      throw new Error(`Not ready to advance: ${snapshot.evaluation.blockers.join(", ")}`);
    }
    const next = snapshot.nextStep;
    toStepId = next ? next.id : GRADUATED_STEP;
    if (!next) recordedDecision = "graduate";
    // Move the student to the target class (same academic year). Graduation and
    // repeat-to-same-class keep the current class; a repeat_from jump moves.
  } else if (decision === "repeat") {
    const target = snapshot.repeatStep ?? snapshot.currentStep;
    if (!target) throw new Error("Student's class does not map to a ladder step");
    toStepId = target.id;
  } else {
    toStepId = snapshot.currentStep?.id ?? null;
  }

  // Class move when the target step differs from the current step.
  if (
    snapshot.classId &&
    toStepId &&
    toStepId !== GRADUATED_STEP &&
    toStepId !== snapshot.currentStep?.id
  ) {
    const targetClass: any = await findClassForStep(snapshot.academicYear, toStepId);
    if (targetClass && String(targetClass._id) !== String(snapshot.classId)) {
      await Class.updateOne(
        { _id: snapshot.classId },
        { $pull: { students: studentId } },
      );
      await Class.updateOne(
        { _id: targetClass._id },
        { $addToSet: { students: studentId } },
      );
      await User.updateOne({ _id: studentId }, { studentClasses: targetClass._id });
    }
    // No matching class for the target step: the admin creates it and re-runs;
    // the decision record is still kept for audit.
  }

  const record = await ProgressionRecord.create({
    student: studentId,
    academicYear: snapshot.academicYear,
    fromStep: snapshot.currentStep?.id ?? null,
    toStep: toStepId,
    decision: recordedDecision,
    passedAll: snapshot.evaluation.passedAll,
    gradedCount: snapshot.evaluation.gradedCount,
    failedCount: snapshot.evaluation.failedCount,
    pendingCount: snapshot.evaluation.pendingCount,
    blockers: snapshot.evaluation.blockers,
    decidedBy: actorId,
    notes: notes ?? null,
  });

  try {
    await logActivity({
      userId: actorId,
      action: `progression:${recordedDecision}`,
      details: `Student ${snapshot.studentName}: ${snapshot.currentStep?.id ?? "?"} → ${toStepId ?? "?"} (${recordedDecision})`,
    });
  } catch {
    // activity logging must never block a progression decision
  }

  return record;
};
