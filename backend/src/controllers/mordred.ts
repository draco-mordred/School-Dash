import { type Request, type Response } from "express";
import MordredMessage from "../models/mordredMessenger";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai"; // Vercel AI SDK helper for structured schemas
import { z } from "zod";
import { routeTaskToStaff } from "../services/mordredEngine";
import { inngest } from "../inngest/client";
import Attendance from "../models/attendance";
import MordredLog from "../models/mordredLog";
import User from "../models/user";

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
      { new: true }
    );

    if (!savedLog) return res.status(404).json({ message: "Message link not found." });
    return res.status(200).json({ success: true, message: "Secured by MORDRED." });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const mordredsWords = async (req: Request, res: Response) => {
  try {
    const { message, studentContext } = req.body;
    // 1. Get the key from process.env
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

    // 2. Add an explicit runtime guard block so your logs catch missing keys immediately
    if (!apiKey) {
      console.error("❌ MORDRED Configuration Error: GOOGLE_GENERATIVE_AI_API_KEY is missing from environment variables.");
      return res.status(500).json({ 
        error: "System configuration error. MORDRED AI initialization failed due to missing credentials." 
      });
    }

    // 3. Initialize the Vercel AI SDK provider with the verified string key
    const googleAI = createGoogleGenerativeAI({ apiKey: apiKey });
    const activeModel = googleAI("gemini-3-flash-preview");
    // We force Gemini to respond using a strict JSON schema so our backend can process it
    const { object: mordredDecision } = await generateObject({
      model: activeModel,
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
      Student ID: ${(req as any).user._id}. 
      Student Name: ${(req as any).user.name}. 
      Student Email: ${(req as any).user.email}. 
      Student Department: ${studentContext.department}. 
      Student Rotation Unit: ${studentContext.rotationUnit}. 
      Student Rotation Start Date: ${studentContext.rotationStartDate}. 
      Student Rotation End Date: ${studentContext.rotationEndDate}.,
      input: 'Student says: "${message}". Student Current Rotation Context: ${JSON.stringify(studentContext)}.',
      `,
      
      schema: z.object({
        reply: z.string().describe("Your conversational response back to the student."),
        shouldEscalate: z.boolean().describe("Set to true ONLY if a human staff member needs to fix a bug, logbook issue, or attendance error."),
        issueCategory: z.enum(["NONE", "ATTENDANCE_BUG", "LOGBOOK_ERROR", "TIMETABLE_CONFLICT", "OTHER"]).describe("The classification category of the problem.")
      }),
      prompt: `Student says: "${message}". Student Current Rotation Context: ${JSON.stringify(studentContext)}`,
    });

    // Handle automated backend actions based on MORDRED's intelligence decisions
    if (mordredDecision.shouldEscalate) {
      // 1. Kick off your smart workload assignment engine
      const assignedStaff = await routeTaskToStaff(
        studentContext.department, 
        "is_available_for_escalations", 
        (req as any).user._id // Links the user profile reference
      );

      // 2. Broadcast an event to Inngest to trigger the 12-hour ticket safety tracker we built earlier
      await inngest.send({
        name: "mordred/ticket.created",
        data: {
          ticketId: (req as any).user._id, // Replace with your real generated Ticket Object ID
          departmentName: studentContext.department,
          assignedTo: assignedStaff?._id || "SUPER_ADMIN"
        }
      });
      
      // Append a system note to the text reply to give the user visibility
      mordredDecision.reply += ` [System Notice: I have flagged this anomaly and routed a ticket to ${assignedStaff?.name || "the admin desk"}.]`;
    }

    return res.status(200).json({
 _id: new mongoose.Types.ObjectId(), // Send a real ID back for React keys
  sender: "mordred_ai",
  text: mordredDecision.reply, // Ensure this matches 'text'
  is_ticket_created: mordredDecision.shouldEscalate
    });

    // Inside your handleMordredChat try/catch block:
 } catch (error: any) {
  if (error.message.includes("API key") || error.message.includes("identity")) {
    await MordredLog.create({
      logType: "API_FAILURE",
      message: "Google Gemini Authentication Failure",
      details: error.message
    });
  }
  return res.status(500).json({ error: error.message });
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
      dynamicInsights.push({
        id: student._id.toString(),
        type: "WARNING",
        targetUser: "Clinical Coordinators",
        message: `Attendance Alert: ${student.name}'s clinical attendance in ${student.department || "Wards"} has dropped to ${student.attendance_percentage?.clinical}%. Action required.`,
        timestamp: "Calculated Recently"
      });
    }

    // Insight 3: Dynamic Check for any Lectures marked as unattended or missing logs
    // Look for records where the date passed but no check-in exists or completion flag is false
    const missedRotationsCount = await Attendance.countDocuments({
      status: "ABSENT",
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Past 24 hours
    });

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