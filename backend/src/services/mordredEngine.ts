import User from "../models/user"; // Path to your User model
import mongoose from "mongoose";
import MordredUsage from "../models/mordredUsage";
import CourseGrade from "../models/courseGrade";
import Exam from "../models/exam";
import {
  canUseTool,
  limitsForRole,
  usageDateKey,
} from "../utils/mordredTools";
import { computeStudentAttendancePercent, applyResultReleaseGate, setGradeAdminOverride } from "./eligibilityService";
import { getStudentRiskSnapshot, getClassRiskOverview, checkExamOverlap } from "./riskService";
import { recomputeCourseResults } from "./gradingService";
import { createNotificationIfUnique } from "../utils/notificationUtils";
import { inngest } from "../inngest/client";

export async function routeTaskToStaff(departmentName: string, taskType: string, referenceId: string) {
  try {
    const permissionKey = `mordred_rules.${taskType}`;

    const queryFilter = {
      // 1. Target only active personnel roles from your UserRole enum
      role: { $in: ["teacher", "unitconsultant", "unitresident"] }, 
      
      // 2. Match the exact string name from your UserDepartmentName mapping
      department: departmentName, 
      isActive: true,
      
      // 3. Ensure the individual is permitted for this type of task
      [permissionKey]: true,
      
      // 4. Load checking logic
      $expr: {
        $lt: ["$mordred_rules.current_active_load", "$mordred_rules.max_ticket_capacity"]
      }
    } as any;

    const assignedStaff = await User.findOneAndUpdate(
      queryFilter,
      {
        $inc: { "mordred_rules.current_active_load": 1 },
        $push: {
          mordred_assigned_tasks: {
            task_type: taskType.toUpperCase(),
            reference_id: new mongoose.Types.ObjectId(referenceId),
            assigned_at: new Date()
          }
        }
      },
      { returnDocument: 'after' }
    );

    return assignedStaff; // Returns the updated staff User document or null if full
  } catch (error) {
    console.error("MORDRED Automation Core Error:", error);
    throw error;
  }
}

// ─── PR M1 — provider chain ────────────────────────────────────────
// Mistral (La Plateforme) is the primary provider when MISTRAL_API_KEY is
// set; Google Gemini is the fallback provider; the deterministic template
// fallback in utils/mordredFallback is the last resort (controllers).
export const resolveMordredProvider = (): "mistral" | "gemini" | "none" => {
  if ((process.env.MISTRAL_API_KEY || "").trim()) return "mistral";
  if ((process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY || "").trim()) return "gemini";
  return "none";
};

// ─── PR M1 — usage metering ──────────────────────────────────────────
// Per-user daily caps enforced BEFORE any model call. Subscription tiers
// can later override the caps per institution (design locked Nov 2026).
export const checkAndIncrementMordredUsage = async (
  userId: any,
  kind: "messages" | "toolCalls"
) => {
  const date = usageDateKey(new Date());
  const user: any = await User.findById(userId).select("role").lean();
  const role = String(user?.role ?? "student").trim().toLowerCase();
  const limits = limitsForRole(role);
  const cap = kind === "messages" ? limits.messages : limits.toolCalls;

  const existing: any = await MordredUsage.findOne({ user: userId, date });
  const used = existing ? Number(existing[kind] ?? 0) : 0;
  if (used >= cap) {
    return { allowed: false, used, cap, role, kind };
  }

  await MordredUsage.findOneAndUpdate(
    { user: userId, date },
    { $inc: { [kind]: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { allowed: true, used: used + 1, cap, role, kind };
};

// ─── PR M1 — RBAC-gated tool execution ──────────────────────────────
// Role is re-checked at execution time even though the model only ever
// receives role-appropriate tools (defense in depth).
export interface MordredToolContext {
  userId: any;
  role: string;
  userName?: string;
}

const notifyAllAdmins = async (title: string, message: string, metadata: Record<string, unknown> = {}) => {
  try {
    const adminUsers: any[] = await User.find({ role: "admin", isActive: true }).select("_id").lean();
    if (adminUsers.length === 0) return 0;
    await Promise.all(
      adminUsers.map((admin) =>
        createNotificationIfUnique({
          userId: admin._id,
          role: "admin",
          title,
          message,
          type: "system",
          actorName: "DALE AI",
          actorRole: "admin",
          metadata,
        })
      )
    );
    return adminUsers.length;
  } catch (err) {
    console.warn("DALE admin notification failed:", (err as Error).message);
    return 0;
  }
};

export const executeMordredTool = async (name: string, args: any, ctx: MordredToolContext) => {
  if (!canUseTool(name, ctx.role)) {
    throw new Error(`Tool not available for your role: ${name}`);
  }
  const usage = await checkAndIncrementMordredUsage(ctx.userId, "toolCalls");
  if (!usage.allowed) {
    throw new Error("Daily DALE tool-call limit reached. Please try again tomorrow.");
  }

  const input = args ?? {};

  switch (name) {
    case "get_my_attendance": {
      const attendancePercent = await computeStudentAttendancePercent(String(ctx.userId));
      return { attendancePercent, attendanceTracked: attendancePercent != null };
    }

    case "get_my_results_and_gpa": {
      const grades: any[] = await CourseGrade.find({
        student: ctx.userId,
        released: true,
        withheld: { $ne: true },
      }).populate("course", "name code").lean();
      const totalCredits =
        grades.reduce((sum: number, g: any) => sum + (Number(g.creditUnits) || 0), 0) || 1;
      const weightedPoints = grades.reduce(
        (sum: number, g: any) => sum + Number(g.gradePoints ?? 0) * (Number(g.creditUnits) || 0),
        0
      );
      return {
        gpaScale: 5,
        gpa: Math.round((weightedPoints / totalCredits) * 100) / 100,
        courses: grades.map((g: any) => ({
          course: (g.course as any)?.name ?? g.course,
          letter: g.letter,
          weightedPercent: g.weightedPercent,
          passed: g.passed,
          creditUnits: g.creditUnits,
        })),
      };
    }

    case "get_my_risk_snapshot": {
      return getStudentRiskSnapshot(ctx.userId);
    }

    case "get_student_risk_snapshot": {
      return getStudentRiskSnapshot(input.studentId);
    }

    case "get_my_upcoming_exams": {
      const student: any = await User.findById(ctx.userId).select("studentClasses studentClass").lean();
      const classId =
        student?.studentClasses ?? student?.studentClass?._id ?? student?.studentClass ?? null;
      if (!classId) return { exams: [] };
      const exams: any[] = await Exam.find({
        class: classId,
        isActive: true,
        dueDate: { $gte: new Date() },
      })
        .select("title dueDate duration assessmentKind")
        .sort({ dueDate: 1 })
        .limit(10)
        .lean();
      return { exams };
    }

    case "post_attendance_concern": {
      const note = String(input.note ?? "").trim();
      if (!note) throw new Error("A note is required for an attendance concern.");
      const requester: any = await User.findById(ctx.userId).select("name email").lean();
      const requesterName = requester?.name ?? requester?.email ?? "A user";
      const count = await notifyAllAdmins(
        "DALE Alert: Attendance Concern Raised",
        `${requesterName} raised an attendance concern: ${note}`,
        { source: "dale-attendance-concern", studentId: String(ctx.userId) }
      );
      return { concernSent: true, adminsNotified: count };
    }

    case "request_escalation": {
      const department = String(input.department ?? "").trim() || "General";
      const assignedStaff = await routeTaskToStaff(department, "is_available_for_escalations", ctx.userId);
      await inngest.send({
        name: "mordred/ticket.created",
        data: {
          ticketId: ctx.userId,
          departmentName: department,
          assignedTo: assignedStaff?._id || "SUPER_ADMIN",
          details: input.details ? String(input.details) : undefined,
        },
      });
      await notifyAllAdmins(
        "DALE Alert: Escalation Ticket Routed",
        `DALE flagged an issue and routed a ticket to ${assignedStaff?.name || "the admin desk"}.`,
        { requestedBy: String(ctx.userId), assignedStaffId: assignedStaff?._id ?? null }
      );
      return { escalated: true, assignedStaffName: assignedStaff?.name ?? "the admin desk" };
    }

    case "get_class_risk_overview": {
      return getClassRiskOverview(input.classId);
    }

    case "check_exam_overlap": {
      const warnings = await checkExamOverlap({
        classId: input.classId,
        dueDate: input.dueDate,
        durationMinutes: Number(input.duration) || 0,
        excludeExamId: input.excludeExamId,
      });
      return { overlapWarnings: warnings };
    }

    case "flag_student_for_attention": {
      const student: any = await User.findById(input.studentId).select("name email").lean();
      if (!student) throw new Error("Student not found.");
      const reason = String(input.reason ?? "").trim();
      if (!reason) throw new Error("A reason is required.");
      const count = await notifyAllAdmins(
        "DALE Alert: Student Flagged for Attention",
        `${student.name ?? student.email ?? "A student"} was flagged for attention: ${reason}`,
        { source: "dale-student-flag", studentId: String(input.studentId) }
      );
      return { flagged: true, adminsNotified: count };
    }

    case "release_course_results": {
      const gate = await applyResultReleaseGate(String(input.courseId), {
        released: true,
        override: input.override === true,
        actorId: String(ctx.userId),
      });
      return gate;
    }

    case "override_withheld_result": {
      const grade = await setGradeAdminOverride(
        String(input.courseId),
        String(input.studentId),
        input.override !== false
      );
      return { updated: Boolean(grade), adminOverride: grade?.adminOverride ?? false };
    }

    case "recompute_course_results": {
      return recomputeCourseResults(String(input.courseId));
    }

    case "send_system_alert": {
      const title = String(input.title ?? "").trim();
      const message = String(input.message ?? "").trim();
      if (!title || !message) throw new Error("Title and message are required.");
      const targetRole = String(input.targetRole ?? "admin").trim().toLowerCase();
      const targets: any[] = await User.find({ role: targetRole, isActive: true })
        .select("_id")
        .limit(500)
        .lean();
      await Promise.all(
        targets.map((target) =>
          createNotificationIfUnique({
            userId: target._id,
            role: targetRole,
            title,
            message,
            type: "system",
            actorName: "DALE AI",
            actorRole: "admin",
            metadata: { source: "dale-system-alert" },
          })
        )
      );
      return { sent: targets.length };
    }

    default:
      throw new Error(`Unknown DALE tool: ${name}`);
  }
};