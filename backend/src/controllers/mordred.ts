import { type Request, type Response } from "express";
import mongoose from "mongoose";
import MordredMessage from "../models/mordredMessenger";
import Course from "../models/courses";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText, streamText } from "ai"; // Vercel AI SDK helper for structured schemas
import { z } from "zod";
import { routeTaskToStaff } from "../services/mordredEngine";
import { inngest } from "../inngest/client";
import Attendance from "../models/attendance";
import MordredLog from "../models/mordredLog";
import User from "../models/user";
import { createNotificationIfUnique } from "../utils/notificationUtils";
import { buildMordredFallbackResponse } from "../utils/mordredFallback";
import { normalizeRole } from "../middleware/auth";

const permittedInsightRoles = new Set(["admin", "teacher", "unitconsultant", "unitresident", "parent"]);
const systemActionType = z.enum([
  "NONE",
  "UPDATE_PROFILE",
  "REQUEST_ROLE_CHANGE",
  "CREATE_USER",
  "DELETE_USER",
  "SEND_ALERT",
  "ESCALATE_TO_ADMIN",
]);

const isAdminRole = (role?: string) => normalizeRole(role) === "admin";
const isInsightRole = (role?: string) => permittedInsightRoles.has(normalizeRole(role));

const handleAdminSystemAction = async (action: any, user: any) => {
  if (!action || action.actionType === "NONE") return "";

  // Placeholder system-action handling for admin requests. This can be extended
  // to invoke actual admin workflows such as profile updates, role changes, or alerts.
  console.log(`MORDRED system action requested by admin ${user?.email || user?._id}:`, action);

  switch (action.actionType) {
    case "UPDATE_PROFILE":
      return ` System action prepared: update profile request recorded.`;
    case "REQUEST_ROLE_CHANGE":
      return ` System action prepared: role change request recorded.`;
    case "CREATE_USER":
      return ` System action prepared: user creation workflow flagged.`;
    case "DELETE_USER":
      return ` System action prepared: user deletion workflow flagged.`;
    case "SEND_ALERT":
      return ` System action prepared: alert dispatch request recorded.`;
    case "ESCALATE_TO_ADMIN":
      return ` System action prepared: escalation workflow queued.`;
    default:
      return "";
  }
};

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
          expires_at: null // Setting to null clears the TTL deletion timer completely
        }
      },
      { returnDocument: 'after' }
    );

    if (!savedLog) return res.status(404).json({ message: "Message link not found." });
    return res.status(200).json({ success: true, message: "Secured by MORDRED." });
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
        `MORDRED AI says: ${courseTitle} is a key course for ${studentClassName}${departmentName ? ` in the ${departmentName} department` : ""}.${semesterLabel}`,
        `It helps students in ${studentClassName} build strong foundations and make sense of how the subject connects to their current learning goals.`,
        `This course is designed to support your class with real classroom relevance and future study readiness.`,
        `You will gain knowledge that ties directly into your timetable, assessments, and the broader program for ${studentClassName}.`,
        `The syllabus focuses on practical understanding, giving you a clear reason why this course is important to your academic progress.`,
        // `Even when the AI service is unavailable, this summary helps you see how ${course.name} fits into your journey.`,
      ];
      return sentencePool
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .join("\n");
    };

    const apiKey = (process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      console.warn("⚠️ MORDRED Configuration Warning: AI credentials are missing. Using course-summary fallback.");
      return res.status(200).json({
        _id: `mordred-course-summary-fallback-${Date.now()}`,
        sender: "mordred_ai",
        text: buildFallbackText(),
        fallbackUsed: true,
      });
    }

    const models = {
      geminiAI: "google/gemini-3.5-pro",
      openAI: "openai/gpt-5.5",
    };

    try {
      const googleAI = createGoogleGenerativeAI({ apiKey });
      const vercelModel = process.env.MORDRED_MODEL || models.geminiAI;
      const { text } = await generateText({
        model: vercelModel,
        prompt: `You are MORDRED, a concise academic assistant for medical students. Provide a 5-6 line summary explaining why the course ${courseTitle} is important for students in ${studentClassName}${departmentName ? ` of the ${departmentName} department` : ""}.${semesterLabel} Keep the tone supportive, clear, and focused on student relevance. Start the response with \"MORDRED AI says:\" and do not exceed six lines.`,
        temperature: 0.4,
        max_tokens: 220,
      });

      const summaryText = String(text ?? "").trim() || buildFallbackText();
      const normalizedText = summaryText.startsWith("MORDRED AI says:")
        ? summaryText
        : `MORDRED AI says: ${summaryText}`;

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
  try {
    const { message, studentContext } = req.body;
    const userRole = String((req as any).user?.role ?? "").trim().toLowerCase();
    const canExecuteSystemActions = isAdminRole(userRole);

    const apiKey = (process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY || "").trim();

    if (!apiKey) {
      console.warn("⚠️ MORDRED Configuration Warning: AI credentials are missing. Using fallback response.");
      return res.status(200).json(
        buildMordredFallbackResponse(
          "missing credentials",
          message,
          studentContext,
          userRole
        )
      );
    }
    const models = {
      geminiAI: 'google/gemini-3.5-pro',
      openAI: 'openai/gpt-5.5',
      anthropicAI: 'anthropic/claude-fable-5',
      xAI: 'xai/grok-4.5',
      ossAI: 'moonshotai/kimi-k2.7-code'
    }
    try {
      const googleAI = createGoogleGenerativeAI({ apiKey });
      // const vercelAI = streamText({
      //   //so I want the model here to pick from any of the available models in the models variable at a time
      //   model: models,
      //   prompt: "why is the sky blue?"
      // })
      const activeModel = googleAI(process.env.MORDRED_MODEL || "gemini-2.0-flash");
      const vercelModel = models.geminiAI;
      const { object: mordredDecision } = await generateObject({
        model: vercelModel,
        system: `
        You are MORDRED (Medlog Operational Rotation, Dialogue, & Record Engagement Director).
        Your persona is a vigilant, polite, and clinically precise digital steward.
        
        Your job is to read student messages and do one of two things:
        1. ANSWER directly if it's a general question about medical school policies, rotations, or tips.
        2. ESCALATE by creating a ticket if they are reporting a software bug, hardware issue, missing attendance logs, or a direct complaint that requires human admin intervention.
        // We provide a strict schema to ensure MORDRED's responses are machine-readable and actionable and also limit the scope of the AI's responses to avoid hallucinations or irrelevant answers, and each student can only have one active ticket at a time, so MORDRED should check for existing tickets before creating a new one. and Limit ANSWERS to 5 per student per day to avoid spam and ensure quality responses.
        3. The schema is designed to ensure that MORDRED's responses are structured and actionable, allowing the backend to process them effectively.
        4. If the student is asking about attendance, logbook issues, or timetable conflicts, MORDRED should always escalate to a human staff member and not attempt to answer directly.
        5. If the student is asking about general questions, MORDRED should answer directly and not escalate.
        6. If the student is asking about a bug or issue, MORDRED should escalate to a human staff member and not answer directly.
        7. If the student is asking about a timetable conflict, MORDRED should escalate to a human staff member and not answer directly.
        8. MORDRED should always be polite, professional, and concise in its responses, and should never provide medical advice or diagnosis.
        9. MORDRED should always check for existing tickets before creating a new one, and should only create a new ticket if there are no existing tickets for the student.
        10. MORDRED should always limit ANSWERS to 5 per student per day to avoid spam and ensure quality responses.
        
        user: 
        User ID: ${(req as any).user._id}. 
        User Name: ${(req as any).user.name}. 
        User Email: ${(req as any).user.email}. 
        User Role: ${userRole}. 
        User Permissions: ${canExecuteSystemActions ? "admin system actions allowed" : "non-admin profile/role requests only"}. 
        Student Department: ${studentContext.department}. 
        Student Rotation Unit: ${studentContext.rotationUnit}. 
        Student Rotation Start Date: ${studentContext.rotationStartDate}. 
        Student Rotation End Date: ${studentContext.rotationEndDate}.,
        input: 'Student says: "${message}". Student Current Rotation Context: ${JSON.stringify(studentContext)}.',
        `,
        
        schema: z.object({
          reply: z.string().describe("Your conversational response back to the student."),
          shouldEscalate: z.boolean().describe("Set to true ONLY if a human staff member needs to fix a bug, logbook issue, or attendance error."),
          issueCategory: z.enum(["NONE", "ATTENDANCE_BUG", "LOGBOOK_ERROR", "TIMETABLE_CONFLICT", "OTHER"]).describe("The classification category of the problem."),
          systemAction: z
            .object({
              actionType: systemActionType,
              details: z.string().optional(),
            })
            .optional()
            .describe("Structured system action request. Only admins may execute real system actions."),
        }),
        prompt: `Student says: "${message}". Student Current Rotation Context: ${JSON.stringify(studentContext)}`,
      });

      const systemAction = mordredDecision.systemAction ?? { actionType: "NONE" };

      if (!canExecuteSystemActions && systemAction.actionType !== "NONE") {
        mordredDecision.reply = `As a non-admin user, I cannot execute system-level changes. ${mordredDecision.reply}`;
        systemAction.actionType = "NONE";
        systemAction.details = undefined;
      }

      if (mordredDecision.shouldEscalate) {
        try {
          const assignedStaff = await routeTaskToStaff(
            studentContext.department,
            "is_available_for_escalations",
            (req as any).user._id
          );

          await inngest.send({
            name: "mordred/ticket.created",
            data: {
              ticketId: (req as any).user._id,
              departmentName: studentContext.department,
              assignedTo: assignedStaff?._id || "SUPER_ADMIN",
            },
          });

          mordredDecision.reply += ` [System Notice: I have flagged this anomaly and routed a ticket to ${assignedStaff?.name || "the admin desk"}.]`;

          const actorName = "MORDRED AI";
          const requestedBy = (req as any).user?.name || (req as any).user?.email || "A user";
          const notificationMessage = `MORDRED flagged an anomaly for ${requestedBy} and routed a ticket to ${assignedStaff?.name || "the admin desk"}.`;
          const adminUsers = await User.find({ role: "admin", isActive: true }).select("_id").lean();
          if (adminUsers.length > 0) {
            await Promise.all(
              adminUsers.map((admin) =>
                createNotificationIfUnique({
                  userId: admin._id,
                  role: "admin",
                  title: "MORDRED Alert: Anomaly Ticket Routed",
                  message: notificationMessage,
                  type: "system",
                  actorName,
                  actorRole: "admin",
                  metadata: {
                    studentId: (req as any).user?._id,
                    assignedStaffId: assignedStaff?._id,
                    issueCategory: mordredDecision.issueCategory,
                  },
                })
              )
            );
          }
        } catch (escalationError) {
          console.error("⚠️ MORDRED escalation flow failed, continuing with fallback response.", escalationError);
        }
      }

      let adminActionNote = "";
      if (canExecuteSystemActions && systemAction.actionType !== "NONE") {
        adminActionNote = await handleAdminSystemAction(systemAction, (req as any).user);
      }

      return res.status(200).json({
        _id: new mongoose.Types.ObjectId(),
        sender: "mordred_ai",
        text: `${mordredDecision.reply}${adminActionNote}`.trim(),
        is_ticket_created: mordredDecision.shouldEscalate,
        systemAction: canExecuteSystemActions ? systemAction : undefined,
      });
    } catch (error: any) {
      console.error("⚠️ MORDRED AI request failed, returning a safe fallback response.", error);
      return res.status(200).json(
        buildMordredFallbackResponse(
          error?.message || "AI request failed",
          message,
          studentContext,
          userRole
        )
      );
    }

 } catch (error: any) {
  if (error.message.includes("API key") || error.message.includes("identity")) {
    await MordredLog.create({
      logType: "API_FAILURE",
      message: "Google Gemini Authentication Failure",
      details: error.message
    });
  }
  return res.status(200).json(buildMordredFallbackResponse(error?.message || "unexpected error", message, studentContext, userRole));
}
};
// Show me how to run this and test in Thunder Client:
// POST http://localhost:5000/mordred/chat/handle
// Headers:
// Content-Type: application/json
// Authorization: Bearer <your_token_here>
// Body:
// {
//   "messageId": "<message_id>",
//   "uniqueToken": "<unique_token>"
// }
// Replace <message_id> and <unique_token> with the actual values you want to test.

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
}


export const testWhatsAppAlert = async (
  req: Request, 
  res: Response
) => {}

export const dynamicAIInsights = async (
  req: Request, 
  res: Response
) => {
   try {
    const userRole = String((req as any).user?.role ?? "").trim().toLowerCase();
    if (!isInsightRole(userRole)) {
      return res.status(403).json({ message: "Access denied. MORDRED insights are only available to admin, teacher, unitconsultant, unitresident, and parent users." });
    }

    const dynamicInsights = [];

    // Insight 1: Check for any API failures logged by MORDRED's runtime engines
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
    // Adjust field names to match your schema structures if necessary
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
    // Look for records where the date passed but no check-in exists or completion flag is false
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

    // Fallback item if your database is completely clean during testing
    if (dynamicInsights.length === 0) {
      dynamicInsights.push({
        id: "clean_slate",
        type: "INFO",
        targetUser: "All Staff",
        message: "MORDRED Engine Audit complete. No system flags, lecture absences, or attendance warnings detected.",
        timestamp: "Just Now"
      });
    }

    return res.status(200).json({ insights: dynamicInsights });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}