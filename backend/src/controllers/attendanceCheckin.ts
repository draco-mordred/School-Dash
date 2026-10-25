import { type Request, type Response } from "express";
import LectureSession from "../models/lectureSession";
import Attendance from "../models/attendance";
import Course from "../models/courses";
import { emitSystemEvent } from "../events";
import { logActivity } from "../utils/activitieslog";

// Phase C — student tap check-in for auto-generated lecture sessions (D3).
// Server-authoritative window: the SERVER clock decides whether the tap
// lands inside [triggerAt, closesAt]; clientTimestamp is stored for audit
// only (offline grace handling arrives in Phase F).

const IS_OBJECT_ID = (v: unknown) =>
  typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

// Haversine distance in metres between two lat/lng points.
export const haversineMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

const getStudentClassId = (user: any) =>
  user?.studentClasses?.[0]?._id ??
  user?.studentClass?._id ??
  user?.StudentClass?._id ??
  null;

const describeSessionSubject = async (session: any) => {
  const course = await Course.findById(session.course).lean<any>();
  if (!course) return "Lecture";
  const subject = (course.subjects ?? []).find(
    (s: any) => String(s._id) === String(session.subject),
  );
  return subject?.name ?? course.name ?? "Lecture";
};

// GET /attendance/active-sessions (student)
// Open, in-window sessions for the student's class, plus the caller's own
// record state so the UI can render countdown / already-tapped states.
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const classId = getStudentClassId(user);
    if (!classId) {
      return res.status(400).json({ success: false, message: "Student class information not found" });
    }
    const now = new Date();
    const sessions = await LectureSession.find({
      class: classId,
      status: "open",
      "window.closesAt": { $ne: null, $gte: now },
    }).lean<any[]>();

    const data = [];
    for (const session of sessions) {
      const record = await Attendance.findOne({
        session: session._id,
        student: user._id,
      }).lean<any>();
      const venue = session.venueSnapshot?.name
        ? session.venueSnapshot.name + (session.venueSnapshot.room ? " · " + session.venueSnapshot.room : "")
        : "";
      data.push({
        _id: String(session._id),
        subjectLabel: await describeSessionSubject(session),
        venue,
        venueRadiusMeters: session.venueSnapshot?.radiusMeters ?? 150,
        window: {
          lectureStart: session.window?.lectureStart ?? null,
          lectureEnd: session.window?.lectureEnd ?? null,
          closesAt: session.window?.closesAt ?? null,
        },
        myStatus: record?.status ?? "unverified",
        myAbsenceReason: record?.absenceReason ?? null,
        alreadyTapped:
          !!record &&
          ["present", "absent"].includes(String(record.status)) &&
          record.submissionSource === "tap",
      });
    }

    return res.status(200).json({
      success: true,
      data: { sessions: data, serverTime: now.toISOString() },
    });
  } catch (error: any) {
    console.error("Error fetching active sessions:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching active sessions",
      error: error.message,
    });
  }
};

// POST /attendance/check-in (student)
// Body: { session, choice: "present"|"absent", absenceReason?, coords? {lat,lng,accuracy?}, clientTimestamp?, idempotencyKey? }
export const submitCheckIn = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const {
      session: sessionId,
      choice,
      absenceReason,
      coords,
      clientTimestamp,
      idempotencyKey,
    } = req.body ?? {};

    if (!IS_OBJECT_ID(sessionId)) {
      return res.status(400).json({ success: false, message: "session is required" });
    }
    if (choice !== "present" && choice !== "absent") {
      return res.status(400).json({ success: false, message: "choice must be present or absent" });
    }
    const reason = typeof absenceReason === "string" ? absenceReason.trim() : "";
    if (choice === "absent" && !reason) {
      return res.status(400).json({
        success: false,
        message: "An absence reason is required when marking yourself absent",
      });
    }

    const session = await LectureSession.findById(sessionId).lean<any>();
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    const classId = getStudentClassId(user);
    if (!classId || String(session.class) !== String(classId)) {
      return res.status(403).json({ success: false, message: "This session does not belong to your class" });
    }
    if (session.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This attendance window is not open",
        code: "WINDOW_NOT_OPEN",
      });
    }

    // Server-authoritative window check (client clock is never trusted).
    const now = new Date();
    const triggerAt = session.window?.triggerAt ? new Date(session.window.triggerAt) : null;
    const closesAt = session.window?.closesAt ? new Date(session.window.closesAt) : null;
    if (!triggerAt || !closesAt) {
      return res.status(400).json({ success: false, message: "Session window is misconfigured" });
    }
    if (now.getTime() < triggerAt.getTime()) {
      return res.status(400).json({
        success: false,
        message: "The attendance window has not opened yet",
        code: "WINDOW_NOT_OPEN",
      });
    }
    if (now.getTime() > closesAt.getTime()) {
      return res.status(400).json({
        success: false,
        message: "The attendance window has closed",
        code: "WINDOW_CLOSED",
      });
    }

    const record = await Attendance.findOne({
      session: session._id,
      student: user._id,
    });
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "No attendance record found for this session",
        code: "RECORD_NOT_FOUND",
      });
    }
    // Idempotency: a previous tap is never overwritten by a second one.
    if (
      ["present", "absent"].includes(String(record.status)) &&
      record.submissionSource === "tap"
    ) {
      return res.status(200).json({ success: true, alreadyCheckedIn: true, data: record });
    }

    let studentLat: number | null = null;
    let studentLng: number | null = null;
    let distanceMeters: number | null = null;
    if (
      coords &&
      typeof coords.lat === "number" &&
      typeof coords.lng === "number" &&
      coords.lat >= -90 && coords.lat <= 90 &&
      coords.lng >= -180 && coords.lng <= 180
    ) {
      studentLat = coords.lat;
      studentLng = coords.lng;
      const vLat = session.venueSnapshot?.lat ?? 0;
      const vLng = session.venueSnapshot?.lng ?? 0;
      if (vLat || vLng) {
        distanceMeters = haversineMeters(coords.lat, coords.lng, vLat, vLng);
      }
    }

    record.status = choice;
    if (choice === "absent") {
      record.absenceReason = reason;
    }
    record.submissionSource = "tap";
    record.proximity = {
      studentLat,
      studentLng,
      distanceMeters,
      // Phase D verifies against the venue radius + lecturer presence.
      verificationStatus: "pending",
      capturedAt: now,
    };
    await record.save();

    await logActivity({
      userId: user._id,
      action: "Attendance tap check-in",
      details: "Student tapped " + choice + " for session " + String(session._id),
    });
    emitSystemEvent("attendance.checkin.submitted", {
      sessionId: String(session._id),
      student: String(user._id),
      choice,
      distanceMeters,
      clientTimestamp: clientTimestamp ?? null,
      idempotencyKey: idempotencyKey ?? null,
    });

    return res.status(200).json({ success: true, alreadyCheckedIn: false, data: record });
  } catch (error: any) {
    console.error("Error submitting check-in:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting check-in",
      error: error.message,
    });
  }
};
