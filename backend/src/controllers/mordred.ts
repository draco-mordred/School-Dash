import { type Request, type Response } from "express";
import mongoose from "mongoose";
import MordredMessage from "../models/mordredMessenger";
import Course from "../models/courses";
import Class from "../models/classes";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createGroq } from "@ai-sdk/groq";
import { generateText, tool } from "ai"; // Vercel AI SDK — PR M1 agentic tool flow
import { z } from "zod";
import { inngest } from "../inngest/client";
import Attendance from "../models/attendance";
import MordredLog from "../models/mordredLog";
import User from "../models/user";
import { createNotificationIfUnique } from "../utils/notificationUtils";
import { buildMordredFallbackResponse } from "../utils/mordredFallback";
import { normalizeRole } from "../middleware/auth";
import { toolsForRole } from "../utils/mordredTools";
import {
  checkAndIncrementMordredUsage,
  executeMordredTool,
  getGoogleApiKeys,
  getGroqApiKeys,
  getMistralApiKeys,
  resolveMordredProvider,
} from "../services/mordredEngine";
import { getStudentRiskSnapshot, getClassRiskOverview } from "../services/riskService";
import { extractMentionEmail } from "../utils/dmModeration";
import { sendDmFromMention } from "../services/dmService"; // PR M2 — @mention DM flow

const permittedInsightRoles = new Set(["admin", "teacher", "unitconsultant", "unitresident", "parent", "student"]);
const isInsightRole = (role?: string) => permittedInsightRoles.has(normalizeRole(role));

// ─── PR M1 — agentic tool wiring ──────────────────────────────────────
// Tool access is resolved from the RBAC registry; the engine re-checks
// permissions at execution time (defense in depth).
const MORDRED_TOOL_INPUTS: Record<string, any> = {
  get_my_attendance: z.object({}),
  get_my_results_and_gpa: z.object({}),
  get_my_risk_snapshot: z.object({}),
  get_my_upcoming_exams: z.object({}),
  post_attendance_concern: z.object({
    note: z.string().describe("Short description of the attendance concern"),
  }),
  request_escalation: z.object({
    department: z
      .string()
      .optional()
      .describe("Department to route the ticket to, e.g. Surgery, Paediatrics"),
    details: z.string().optional().describe("Extra details for the staff member"),
  }),
  get_class_risk_overview: z.object({
    classId: z.string().describe("Mongo id of the class"),
  }),
  get_student_risk_snapshot: z.object({
    studentId: z.string().describe("Mongo id of the student"),
  }),
  check_exam_overlap: z.object({
    classId: z.string().describe("Mongo id of the class"),
    dueDate: z.string().describe("ISO date of the proposed exam"),
    duration: z.number().describe("Exam duration in minutes"),
    excludeExamId: z.string().optional().describe("Exam id to exclude from the check"),
  }),
  flag_student_for_attention: z.object({
    studentId: z.string().describe("Mongo id of the student"),
    reason: z.string().describe("Why the student needs attention"),
  }),
  release_course_results: z.object({
    courseId: z.string().describe("Mongo id of the course"),
    override: z
      .boolean()
      .optional()
      .describe("Force release even if eligibility gates are not met"),
  }),
  override_withheld_result: z.object({
    courseId: z.string().describe("Mongo id of the course"),
    studentId: z.string().describe("Mongo id of the student"),
    override: z.boolean().optional().describe("True to force-show the withheld result"),
  }),
  recompute_course_results: z.object({
    courseId: z.string().describe("Mongo id of the course"),
  }),
  send_system_alert: z.object({
    title: z.string().describe("Alert title"),
    message: z.string().describe("Alert body"),
    targetRole: z
      .string()
      .optional()
      .describe("Recipient role: student, teacher, unitconsultant, unitresident, parent, admin"),
  }),
};

const buildDaleTools = (role: string, userId: any, userName?: string) => {
  const toolsUsed: string[] = [];
  const daleTools: Record<string, any> = {};
  for (const name of toolsForRole(role)) {
    const inputSchema = MORDRED_TOOL_INPUTS[name];
    if (!inputSchema) continue;
    daleTools[name] = tool({
      description: `DALE tool: ${name}`,
      inputSchema,
      execute: async (args: any) => {
        toolsUsed.push(name);
        try {
          return await executeMordredTool(name, args, { userId, role, userName });
        } catch (error: any) {
          // Surface the error to the model so it can inform the user instead
          // of failing the whole generation.
          return { error: error?.message || "Tool execution failed." };
        }
      },
    });
  }
  return { daleTools, toolsUsed };
};

const DALE_SYSTEM_PROMPT = [
  "You are DALE, the AI steward of the Medlog LMS (internally known as the MORDRED engine).",
  "Your persona is a vigilant, polite, and clinically precise digital steward for medical students and staff.",
  "",
  "Rules:",
  "1. You may ONLY use the tools provided for this user role. Never claim access you do not have.",
  "2. Use tools to fetch live data (attendance, results, risk, exams) — NEVER fabricate numbers.",
  "3. For general study/policy questions, answer directly, concise and supportive.",
  "4. If the user reports a bug, missing attendance logs, logbook errors, or timetable conflicts, use the",
  "   request_escalation tool so a human staff member is routed a ticket.",
  "5. Admin tools that require confirmation (releases, overrides, recomputes, alerts) must be used only",
  "   when the admin clearly asks for that action.",
  "6. NEVER provide medical advice or diagnosis.",
  "7. Keep replies short (under 120 words unless a tool result requires more).",
].join("\n");

export const saveChatMessage = async (
  req: Request, 
  res: Response
) => {
  try {
    const { messageId, uniqueToken } = req.body;

    const savedLog = await MordredMessage.findOneAndUpdate(
      { 
        _id: messageId, 
        user_id: (req as any).user._id }, // Ensure the student owns this message
      {
        $set: {
          is_saved: true,
          chat_token: uniqueToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // PR M10: saved messages persist max 30 days (was null = permanent)
        }
      },
      { returnDocument: 'after' }
    );

    if (!savedLog) return res.status(404).json({ message: "Message link not found." });
    return res.status(200).json({ success: true, message: "Secured by DALE." });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCourseSummary = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ message: "courseId is required" });
    }

    const course = await Course.findById(courseId)
      .populate("department", "name")
      .populate("unit", "name");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = (req as any).user;
    const studentClassName = Array.isArray(user?.studentClasses)
      ? (typeof user.studentClasses[0] === "object"
          ? String((user.studentClasses[0] as any)?.name ?? "your class")
          : String(user.studentClasses[0] ?? "your class"))
      : typeof user?.studentClasses === "object"
      ? String((user.studentClasses as any)?.name ?? "your class")
      : String(user?.studentClasses ?? "your class");

    const departmentName = String((course.department as any)?.name ?? "");
    const semesterLabel = course.semester ? ` It is offered in semester ${course.semester}.` : "";
    const courseTitle = `${course.name} (${course.code})`;

    const buildFallbackText = () => {
      const sentencePool = [
        `DALE AI says: ${courseTitle} is a key course for ${studentClassName}${departmentName ? ` in the ${departmentName} department` : ""}.${semesterLabel}`,
        `It helps students in ${studentClassName} build strong foundations and make sense of how the subject connects to their current learning goals.`,
        `This course is designed to support your class with real classroom relevance and future study readiness.`,
        `You will gain knowledge that ties directly into your timetable, assessments, and the broader program for ${studentClassName}.`,
        `The syllabus focuses on practical understanding, giving you a clear reason why this course is important to your academic progress.`,
      ];
      return sentencePool
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .join("\n");
    };

    const groqKeys = getGroqApiKeys();
    const mistralKeys = getMistralApiKeys();
    const googleKeys = getGoogleApiKeys();
    if (groqKeys.length === 0 && mistralKeys.length === 0 && googleKeys.length === 0) {
      console.warn("⚠️ DALE Configuration Warning: AI credentials are missing. Using course-summary fallback.");
      return res.status(200).json({
        _id: `mordred-course-summary-fallback-${Date.now()}`,
        sender: "mordred_ai",
        text: buildFallbackText(),
        fallbackUsed: true,
      });
    }

    const summaryPrompt = `You are DALE, a concise academic assistant for medical students. Provide a 5-6 line summary explaining why the course ${courseTitle} is important for students in ${studentClassName}${departmentName ? ` of the ${departmentName} department` : ""}.${semesterLabel} Keep the tone supportive, clear, and focused on student relevance. Start the response with "DALE AI says:" and do not exceed six lines.`;

    const runSummary = async () => {
      // Key pools: try each Groq key in order, then each Mistral key, then each Google key.
      for (const apiKey of groqKeys) {
        try {
          const groq = createGroq({ apiKey });
          const { text } = await generateText({
            model: groq(process.env.GROQ_MODEL || "llama-3.3-70b-versatile"),
            prompt: summaryPrompt,
            temperature: 0.4,
          });
          return String(text ?? "").trim();
        } catch (groqError) {
          console.warn(`⚠️ DALE Groq course summary failed (key ${groqKeys.indexOf(apiKey) + 1}/${groqKeys.length}), trying next key.`, groqError);
        }
      }
      for (const apiKey of mistralKeys) {
        try {
          const mistral = createMistral({ apiKey });
          const { text } = await generateText({
            model: mistral(process.env.MORDRED_MISTRAL_MODEL || "mistral-small-latest"),
            prompt: summaryPrompt,
            temperature: 0.4,
          });
          return String(text ?? "").trim();
        } catch (mistralError) {
          console.warn(`⚠️ DALE Mistral course summary failed (key ${mistralKeys.indexOf(apiKey) + 1}/${mistralKeys.length}), trying next key.`, mistralError);
        }
      }
      for (const apiKey of googleKeys) {
        try {
          const googleAI = createGoogleGenerativeAI({ apiKey });
          const { text } = await generateText({
            model: googleAI(process.env.MORDRED_MODEL || "gemini-3.8-flash"),
            prompt: summaryPrompt,
            temperature: 0.4,
          });
          return String(text ?? "").trim();
        } catch (googleError) {
          console.warn(`⚠️ DALE Gemini course summary failed (key ${googleKeys.indexOf(apiKey) + 1}/${googleKeys.length}), trying next key.`, googleError);
        }
      }
      throw new Error("All DALE provider keys failed.");
    };

    try {
      const summaryText = (await runSummary()) || buildFallbackText();
      const normalizedText = summaryText.startsWith("DALE AI says:")
        ? summaryText
        : `DALE AI says: ${summaryText}`;

      return res.status(200).json({
        _id: new mongoose.Types.ObjectId(),
        sender: "mordred_ai",
        text: normalizedText,
        fallbackUsed: false,
      });
    } catch (error: any) {
      console.error("⚠️ Course summary AI request failed, returning fallback text.", error);
      return res.status(200).json({
        _id: `mordred-course-summary-fallback-${Date.now()}`,
        sender: "mordred_ai",
        text: buildFallbackText(),
        fallbackUsed: true,
      });
    }
  } catch (error: any) {
    console.error("Course summary route failed:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

export const mordredsWords = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { message, studentContext } = req.body;
  const userRole = String(user?.role ?? "").trim().toLowerCase();

  try {
    // PR M2 — @email mention → DM another user. Generic responses prevent
    // email enumeration; DMs are moderated before delivery (design points 4-10).
    const mentionEmail = extractMentionEmail(String(message ?? ""));
    if (mentionEmail) {
      const dmResult = await sendDmFromMention(user, String(message));
      const dmTexts: Record<string, string> = {
        delivered: `DALE delivered your direct message to ${dmResult.recipientName ?? "the user"}. They will see it in their DALE inbox.`,
        soft_flagged: `DALE delivered your direct message to ${dmResult.recipientName ?? "the user"}, but our moderation system flagged it: ${dmResult.caution ?? "please keep conversations respectful."}`,
        blocked: dmResult.caution ?? "Your message was blocked by moderation and not delivered.",
        unavailable: dmResult.caution || "User not available.",
        frozen: dmResult.caution ?? "Your chat is frozen pending admin review.",
        suspended: dmResult.caution ?? "Your chat is currently suspended.",
      };
      return res.status(200).json({
        _id: new mongoose.Types.ObjectId(),
        sender: "mordred_ai",
        text: dmTexts[dmResult.status] ?? "Your message could not be delivered.",
        is_ticket_created: false,
        toolsUsed: ["dm_mention"],
        provider: "dm",
        fallbackUsed: false,
        dm: dmResult,
      });
    }

    // PR M1: daily per-user message caps (RBAC registry driven).
    const usage = await checkAndIncrementMordredUsage(user?._id, "messages");
    if (!usage.allowed) {
      return res.status(200).json({
        _id: new mongoose.Types.ObjectId(),
        sender: "mordred_ai",
        text: `You have reached your daily DALE chat limit (${usage.cap} messages for your role). Please try again tomorrow.`,
        is_ticket_created: false,
        toolsUsed: [],
        provider: "limit",
        fallbackUsed: true,
      });
    }

    const provider = resolveMordredProvider();
    if (provider === "none") {
      console.warn("⚠️ DALE Configuration Warning: AI credentials are missing. Using fallback response.");
      return res.status(200).json(
        buildMordredFallbackResponse("missing credentials", message, studentContext, userRole)
      );
    }

    const { daleTools, toolsUsed } = buildDaleTools(userRole, user?._id, user?.name);

    const runDale = async () => {
      const groqKeys = getGroqApiKeys();
      const mistralKeys = getMistralApiKeys();
      const googleKeys = getGoogleApiKeys();

      const contextBlock = [
        `User ID: ${user?._id}.`,
        `User Name: ${user?.name}.`,
        `User Email: ${user?.email}.`,
        `User Role: ${userRole}.`,
        `Student Department: ${studentContext?.department ?? "N/A"}.`,
        `Student Rotation Unit: ${studentContext?.rotationUnit ?? "N/A"}.`,
        `Student Rotation Start Date: ${studentContext?.rotationStartDate ?? "N/A"}.`,
        `Student Rotation End Date: ${studentContext?.rotationEndDate ?? "N/A"}.`,
      ].join("\n");

      const commonParams: any = {
        system: `${DALE_SYSTEM_PROMPT}\n\n${contextBlock}`,
        prompt: `User says: "${message}". User Context: ${JSON.stringify(studentContext ?? {})}.`,
        tools: daleTools,
        maxSteps: 5,
        temperature: 0.4,
      };

      // Key pools: try each Groq key in order, then each Mistral key, then each Google key.
      for (const apiKey of groqKeys) {
        try {
          const groq = createGroq({ apiKey });
          const result = await generateText({
            ...commonParams,
            model: groq(process.env.GROQ_MODEL || "llama-3.3-70b-versatile"),
          });
          return { text: result.text, provider: "groq" as const };
        } catch (groqError) {
          console.warn(`⚠️ DALE Groq request failed (key ${groqKeys.indexOf(apiKey) + 1}/${groqKeys.length}), trying next key.`, groqError);
        }
      }
      for (const apiKey of mistralKeys) {
        try {
          const mistral = createMistral({ apiKey });
          const result = await generateText({
            ...commonParams,
            model: mistral(process.env.MORDRED_MISTRAL_MODEL || "mistral-small-latest"),
          });
          return { text: result.text, provider: "mistral" as const };
        } catch (mistralError) {
          console.warn(`⚠️ DALE Mistral request failed (key ${mistralKeys.indexOf(apiKey) + 1}/${mistralKeys.length}), trying next key.`, mistralError);
        }
      }
      for (const apiKey of googleKeys) {
        try {
          const googleAI = createGoogleGenerativeAI({ apiKey });
          const result = await generateText({
            ...commonParams,
            model: googleAI(process.env.MORDRED_MODEL || "gemini-3.8-flash"),
          });
          return { text: result.text, provider: "gemini" as const };
        } catch (googleError) {
          console.warn(`⚠️ DALE Gemini request failed (key ${googleKeys.indexOf(apiKey) + 1}/${googleKeys.length}), trying next key.`, googleError);
        }
      }
      throw new Error("All DALE provider keys failed.");
    };

    try {
      const { text, provider: usedProvider } = await runDale();
      const reply = String(text ?? "").trim();
      if (!reply) {
        return res.status(200).json(
          buildMordredFallbackResponse("empty model response", message, studentContext, userRole)
        );
      }

      return res.status(200).json({
        _id: new mongoose.Types.ObjectId(),
        sender: "mordred_ai",
        text: reply,
        is_ticket_created: toolsUsed.includes("request_escalation"),
        toolsUsed,
        provider: usedProvider,
        fallbackUsed: false,
      });
    } catch (error: any) {
      console.error("⚠️ DALE AI request failed, returning a safe fallback response.", error);
      return res.status(200).json(
        buildMordredFallbackResponse(error?.message || "AI request failed", message, studentContext, userRole)
      );
    }
  } catch (error: any) {
    if (error?.message?.includes("API key") || error?.message?.includes("identity")) {
      await MordredLog.create({
        logType: "API_FAILURE",
        message: "AI Provider Authentication Failure",
        details: error.message,
      });
    }
    return res.status(200).json(
      buildMordredFallbackResponse(error?.message || "unexpected error", message, req.body?.studentContext, userRole)
    );
  }
};

export const trackMordredPerformance = async (
  req: Request, 
  res: Response
) => {
   try {
    // 1. Count active loads vs max capacity across all staff
    const staffMetrics = await User.aggregate([
      { $match: { role: { $in: ["teacher", "unitconsultant", "unitresident"] } } },
      {
        $group: {
          _id: null,
          totalActiveLoad: { $sum: "$mordred_rules.current_active_load" },
          totalCapacity: { $sum: "$mordred_rules.max_ticket_capacity" }
        }
      }
    ]);

    // 2. Count total saved items vs auto-deleted chat counts
    const automaticReplies = await MordredMessage.countDocuments({ is_saved: false });
    const escalatedSavedTickets = await MordredMessage.countDocuments({ is_saved: true });

    // 3. Fetch unresolved API errors
    const criticalFailures = await MordredLog.find({ logType: "API_FAILURE", resolved: false }).sort({ createdAt: -1 });

    return res.status(200).json({
      automationScore: automaticReplies,
      escalationScore: escalatedSavedTickets,
      currentStaffWorkload: staffMetrics[0] || { totalActiveLoad: 0, totalCapacity: 0 },
      criticalFailures
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const createPostingAttendanceAlert = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;
    const payload = req.body ?? {};

    if (!user?._id) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const targetUserId = payload.studentId
      ? new mongoose.Types.ObjectId(String(payload.studentId))
      : user._id;

    const overallPercent = Number(payload.overallPercent ?? 0);
    const activeLocationTitle = String(payload.activeLocationTitle || "Active unit").trim();
    const activeLocationValue = String(payload.activeLocationValue || "Current posting").trim();
    const note = String(payload.note || "Please attend the next scheduled session to stay on track.").trim();

    const message = `Your posting attendance is below the expected target at ${overallPercent}%. ${activeLocationTitle}: ${activeLocationValue}. ${note}`;

    const notification = await createNotificationIfUnique({
      userId: targetUserId,
      role: "student",
      title: "Posting attendance needs attention",
      message,
      type: "attendance",
      metadata: {
        source: "posting-attendance-alert",
        activeLocationTitle,
        activeLocationValue,
        overallPercent,
      },
      actorName: user.name || "DALE",
      actorRole: "student",
    });

    return res.status(200).json({
      success: true,
      notification,
      insight: {
        id: notification?._id?.toString() ?? `attendance-alert-${Date.now()}`,
        type: "WARNING",
        targetUser: user.name || "You",
        message,
        timestamp: "Just Now",
      },
    });
  } catch (error: any) {
    console.error("Failed to create posting attendance alert", error);
    return res.status(500).json({ message: error.message || "Unable to create attendance alert." });
  }
};

export const dynamicAIInsights = async (
  req: Request, 
  res: Response
) => {
  try {
    const user = (req as any).user;
    const userRole = String(user?.role ?? "").trim().toLowerCase();
    if (!isInsightRole(userRole)) {
      return res.status(403).json({ message: "Access denied. DALE insights are only available to admin, teacher, unitconsultant, unitresident, parent, and student users." });
    }

    const dynamicInsights: any[] = [];

    // Insight 1: Check for any API failures logged by the engine runtime
    const criticalFailures = await MordredLog.find({ logType: "API_FAILURE", resolved: false }).limit(2);
    for (const failure of criticalFailures) {
      dynamicInsights.push({
        id: failure._id.toString(),
        type: "CRITICAL",
        targetUser: "System Admin",
        message: `System Anomaly: ${failure.message} (${failure.details})`,
        timestamp: "Just Now"
      });
    }

    // Insight 2: Query students whose active class attendance averages drop below safety thresholds (e.g., 75%)
    const lowAttendanceStudents = await User.find({
      role: "student",
      isActive: true,
      "attendance_percentage.clinical": { $lt: 75 }
    }).limit(2).select("name attendance_percentage department");

    for (const student of lowAttendanceStudents) {
      const attendanceClinical = (student as any).attendance_percentage?.clinical ?? "unknown";
      dynamicInsights.push({
        id: student._id.toString(),
        type: "WARNING",
        targetUser: "Clinical Coordinators",
        message: `Attendance Alert: ${student.name}'s clinical attendance in ${student.department || "Wards"} has dropped to ${attendanceClinical}%. Action required.`,
        timestamp: "Calculated Recently"
      });
    }

    // Insight 3: Dynamic Check for any Lectures marked as unattended or missing logs
    const missedRotationsCount = await Attendance.countDocuments({
      status: "absent",
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Past 24 hours
    } as any);

    if (missedRotationsCount > 0) {
      dynamicInsights.push({
        id: "missed_rotation_summary",
        type: "INFO",
        targetUser: "Faculty Records",
        message: `Logbook Audit: ${missedRotationsCount} mandatory clinical rotation check-ins were missed by students today.`,
        timestamp: "Daily Summary"
      });
    }

    // Insight 4 (PR M1 — unified with PR H risk engine): role-scoped risk snapshots.
    try {
      if (userRole === "student") {
        const snapshot: any = await getStudentRiskSnapshot(user?._id);
        if (snapshot?.risk?.tier && snapshot.risk.tier !== "low") {
          dynamicInsights.push({
            id: `dale-risk-${String(user?._id)}`,
            type: snapshot.risk.tier === "high" ? "WARNING" : "INFO",
            targetUser: user?.name || "You",
            message: `DALE Risk Engine: your overall risk tier is ${snapshot.risk.tier}${snapshot.risk.score ? ` (score ${snapshot.risk.score})` : ""}. Keep attendance above 75% and stay on top of pending assessments.`,
            timestamp: "Calculated Recently"
          });
        }
      } else if (["teacher", "unitconsultant", "unitresident"].includes(userRole)) {
        const classes: any[] = await Class.find({ classTeacher: user?._id }).limit(2);
        for (const cls of classes) {
          const overview: any = await getClassRiskOverview(cls._id);
          if (overview?.highRisk?.length > 0) {
            dynamicInsights.push({
              id: `dale-class-risk-${cls._id.toString()}`,
              type: "WARNING",
              targetUser: cls.name || "Class",
              message: `DALE Risk Engine: ${overview.highRisk.length} student(s) in ${cls.name || "your class"} are in the high-risk tier${overview.highRisk[0]?.name ? `, including ${overview.highRisk[0].name}` : ""}.`,
              timestamp: "Calculated Recently"
            });
          }
        }
      } else if (userRole === "admin") {
        const classes: any[] = await Class.find().limit(3);
        for (const cls of classes) {
          const overview: any = await getClassRiskOverview(cls._id);
          if (overview?.highRisk?.length > 0) {
            dynamicInsights.push({
              id: `dale-class-risk-${cls._id.toString()}`,
              type: "WARNING",
              targetUser: cls.name || "Class",
              message: `DALE Risk Engine: ${overview.highRisk.length} high-risk student(s) detected in ${cls.name || "a class"}${overview.highRisk[0]?.name ? `, including ${overview.highRisk[0].name}` : ""}.`,
              timestamp: "Calculated Recently"
            });
          }
        }
      }
    } catch (riskError) {
      console.warn("⚠️ DALE risk insight aggregation skipped:", (riskError as Error).message);
    }

    // Fallback item if your database is completely clean during testing
    if (dynamicInsights.length === 0) {
      dynamicInsights.push({
        id: "clean_slate",
        type: "INFO",
        targetUser: "All Staff",
        message: "DALE Engine Audit complete. No system flags, lecture absences, or attendance warnings detected.",
        timestamp: "Just Now"
      });
    }

    return res.status(200).json({ insights: dynamicInsights });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};