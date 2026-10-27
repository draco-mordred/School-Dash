import { type Request, type Response } from "express";
import mongoose from "mongoose";
import LectureSession from "../models/lectureSession";
import Attendance from "../models/attendance";
import Course from "../models/courses";
import AttendanceComplaint from "../models/attendanceComplaint";
import { createNotificationIfUnique } from "../utils/notificationUtils";
import { emitSystemEvent } from "../events";
import { logActivity } from "../utils/activitieslog";

// Phase E — complaints + the lecturer's auto-attendance session view.
// Permission model (D13/E2): ONLY the session's lecturer can resolve
// complaints and set the final status of auto-generated records;
// admins are read-only everywhere here.

const IS_OBJECT_ID = (v: unknown) =>
  typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

const describeSubject = async (session: any) => {
  const course = await Course.findById(session.course).lean<any>();
  if (!course) return "Lecture";
  const subject = (course.subjects ?? []).find(
    (s: any) => String(s._id) === String(session.subject),
  );
  return subject?.name ?? course.name ?? "Lecture";
};

// GET /attendance/my-sessions (teacher)
// The lecturer's auto-generated sessions today with check-in state and
// record counts — powers the lecturer check-in card (Phase D1b).
export const getMyLectureSessions = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const sessions = await LectureSession.find({
      lecturer: user._id,
      date: { $gte: startOfDay, $lt: endOfDay },
    }).lean<any[]>();

    const data = [];
    for (const session of sessions) {
      const records = await Attendance.find({ session: session._id }).lean<any[]>();
      const openComplaints = await AttendanceComplaint.countDocuments({
        session: session._id,
        status: "open",
      });
      const venue = session.venueSnapshot?.name
        ? session.venueSnapshot.name + (session.venueSnapshot.room ? " · " + session.venueSnapshot.room : "")
        : "";
      data.push({
        _id: String(session._id),
        subjectLabel: await describeSubject(session),
        venue,
        window: {
          lectureStart: session.window?.lectureStart ?? null,
          lectureEnd: session.window?.lectureEnd ?? null,
          closesAt: session.window?.closesAt ?? null,
        },
        status: session.status,
        checkIn: {
          at: session.lecturerCheckIn?.at ?? null,
          verified: session.lecturerCheckIn?.verified ?? false,
        },
        counts: {
          present: records.filter((r: any) => r.status === "present").length,
          absent: records.filter((r: any) => r.status === "absent").length,
          unverified: records.filter((r: any) => r.status === "unverified").length,
        },
        openComplaints,
      });
    }

    return res.status(200).json({
      success: true,
      data: { sessions: data, serverTime: now.toISOString() },
    });
  } catch (error: any) {
    console.error("Error fetching lecturer sessions:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching lecturer sessions",
      error: error.message,
    });
  }
};

// POST /attendance/complaints (student)
// Body: { record, message }
export const createComplaint = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { record: recordId, message } = req.body ?? {};
    if (!IS_OBJECT_ID(recordId)) {
      return res.status(400).json({ success: false, message: "record is required" });
    }
    const msg = typeof message === "string" ? message.trim() : "";
    if (!msg) {
      return res.status(400).json({ success: false, message: "A message is required" });
    }

    const record = await Attendance.findById(recordId).lean<any>();
    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }
    if (String(record.student) !== String(user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only complain about your own attendance record",
      });
    }
    if (!record.session) {
      return res.status(400).json({
        success: false,
        message: "Only auto-generated attendance records can be complained about",
      });
    }

    const existing = await AttendanceComplaint.findOne({
      record: record._id,
      status: "open",
    }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already have an open complaint for this record",
      });
    }

    const session = await LectureSession.findById(record.session).lean<any>();
    const complaint = await AttendanceComplaint.create({
      student: user._id,
      record: record._id,
      session: record.session,
      lecturer: session?.lecturer ?? record.lecturer ?? null,
      message: msg,
      status: "open",
      resolution: { finalStatus: null, note: "", resolvedBy: null, resolvedAt: null },
    });

    // Route to the session's lecturer (admins remain read-only; escalation
    // to admin happens in the Phase L day-close).
    if (session?.lecturer && IS_OBJECT_ID(String(session.lecturer))) {
      try {
        await createNotificationIfUnique({
          userId: new mongoose.Types.ObjectId(String(session.lecturer)),
          role: "teacher",
          title: "Attendance complaint",
          message: "A student disputed an attendance record for " +
            (await describeSubject(session)) + ". Review it in your complaint queue.",
          type: "attendance",
          link: "/attendance",
          metadata: { complaintId: String(complaint._id) },
        });
      } catch (err) {
        console.warn("[complaints] lecturer notification failed:", err);
      }
    }

    await logActivity({
      userId: user._id,
      action: "Attendance complaint submitted",
      details: "Complaint " + String(complaint._id) + " for record " + String(record._id),
    });
    emitSystemEvent("attendance.complaint.created", {
      complaintId: String(complaint._id),
      record: String(record._id),
      session: String(record.session),
      student: String(user._id),
    });

    return res.status(201).json({ success: true, data: complaint });
  } catch (error: any) {
    console.error("Error creating complaint:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating complaint",
      error: error.message,
    });
  }
};

// GET /attendance/complaints (role-aware queue)
// teacher → complaints on their sessions; student → own complaints;
// admin → all (read-only view). Defaults to open complaints; ?status=all
// returns everything.
export const getComplaints = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const role = String(user?.role ?? "");
    const filter: any =
      req.query.status && String(req.query.status) !== "open"
        ? {}
        : { status: "open" };
    if (role === "teacher") {
      // Scope to the teacher's own sessions AND records. Complaints can
      // carry lecturer: null when the auto-generated session had no
      // lecturer stamped at all (timetable period without a lecturer) —
      // surface those when the session or the attendance record belongs
      // to this teacher, so nothing is orphaned.
      const [sessionIds, recordIds] = await Promise.all([
        LectureSession.find({ lecturer: user._id }).distinct("_id"),
        Attendance.find({ lecturer: user._id }).distinct("_id"),
      ]);
      filter.$or = [
        { lecturer: user._id },
        { lecturer: null, session: { $in: sessionIds } },
        { lecturer: null, record: { $in: recordIds } },
      ];
    } else if (role === "student") {
      filter.student = user._id;
    } else if (role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const complaints = await AttendanceComplaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("student", "name idNumber")
      .populate("record", "status absenceReason date")
      .lean<any[]>();

    return res.status(200).json({ success: true, data: { complaints } });
  } catch (error: any) {
    console.error("Error fetching complaints:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching complaints",
      error: error.message,
    });
  }
};

// POST /attendance/complaints/:id/resolve (teacher)
// Body: { finalStatus: "present"|"absent", note? }
// E2/D13 guard: only the session's lecturer resolves auto records.
export const resolveComplaint = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (String(user?.role) !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only the session's lecturer can resolve attendance complaints",
      });
    }
    const { id } = req.params;
    const { finalStatus, note } = req.body ?? {};
    if (finalStatus !== "present" && finalStatus !== "absent") {
      return res.status(400).json({ success: false, message: "finalStatus must be present or absent" });
    }
    const noteText = typeof note === "string" ? note.trim() : "";

    const complaint = await AttendanceComplaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    if (complaint.status !== "open") {
      return res.status(400).json({ success: false, message: "This complaint is already resolved" });
    }
    if (!complaint.lecturer || String(complaint.lecturer) !== String(user._id)) {
      // Backfill path: complaints created without a stamped lecturer can
      // still be resolved by the lecturer who owns the session or the
      // attendance record (the session may itself have no lecturer).
      const [session, record] = await Promise.all([
        complaint.session
          ? LectureSession.findById(complaint.session).lean<any>()
          : null,
        Attendance.findById(complaint.record).lean<any>(),
      ]);
      const ownsSession =
        session != null && String(session.lecturer) === String(user._id);
      const ownsRecord =
        record != null && String(record.lecturer) === String(user._id);
      if (!ownsSession && !ownsRecord) {
        return res.status(403).json({
          success: false,
          message: "Only the lecturer assigned to this session can resolve this complaint",
        });
      }
      complaint.lecturer = user._id;
    }

    const record = await Attendance.findById(complaint.record);
    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record no longer exists" });
    }

    // The lecturer's decision is authoritative for auto-generated records.
    record.status = finalStatus;
    if (finalStatus === "absent" && !record.absenceReason && noteText) {
      record.absenceReason = noteText;
    }
    if (record.proximity) {
      record.proximity.verificationStatus = "verified";
    }
    await record.save();

    complaint.status = "resolved";
    complaint.resolution = {
      finalStatus,
      note: noteText,
      resolvedBy: user._id,
      resolvedAt: new Date(),
    };
    await complaint.save();

    try {
      await createNotificationIfUnique({
        userId: new mongoose.Types.ObjectId(String(complaint.student)),
        role: "student",
        title: "Your attendance update is ready",
        message:
          "Your lecturer reviewed your complaint and marked you " +
          finalStatus +
          (noteText ? " (" + noteText + ")" : "") +
          ".",
        type: "attendance",
        link: "/attendance",
        metadata: { complaintId: String(complaint._id) },
      });
    } catch (err) {
      console.warn("[complaints] student notification failed:", err);
    }

    await logActivity({
      userId: user._id,
      action: "Attendance complaint resolved",
      details:
        "Complaint " + String(complaint._id) + " resolved as " + finalStatus,
    });
    // KPIs recompute off this event (D-decision: resolution event).
    emitSystemEvent("attendance.complaint.resolved", {
      complaintId: String(complaint._id),
      record: String(record._id),
      student: String(complaint.student),
      finalStatus,
    });

    return res.status(200).json({ success: true, data: complaint });
  } catch (error: any) {
    console.error("Error resolving complaint:", error);
    return res.status(500).json({
      success: false,
      message: "Error resolving complaint",
      error: error.message,
    });
  }
};
