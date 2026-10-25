successfully downloaded text file (SHA: cb4a52354edd0bb23419ef39f65b8cf8c82c2946)
import { type Request, type Response } from "express";
import LectureSession from "../models/lectureSession";
import Attendance from "../models/attendance";
import Course from "../models/courses";
import { emitSystemEvent } from "../events";
import { logActivity } from "../utils/activitieslog";
import {
  evaluateProximity,
  processSessionVerifications,
} from "../subs/latifah/proximityVerification";

// Phase C — student tap check-in for auto-generated lecture sessions (D3).
// Server-authoritative window: the SERVER clock decides whether the tap
// lands inside [triggerAt, closesAt]; clientTimestamp is stored for audit
// only. Phase F: offline-buffered taps are accepted within a 15-minute
// grace window after close when their CLIENT timestamp was in-window,
// and are tagged submissionSource "offline-retry".

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
          ["tap", "offline-retry"].includes(String(record.submissionSource)),
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
    // Server-authoritative window check. For a LIVE tap the server clock
    // alone decides. Phase F2: a tap buffered offline may arrive after
    // the window closed — accept it only when the CLIENT timestamp was
    // inside [triggerAt, closesAt] and the server is still within the
    // grace cap (closesAt + 15 min). Tag those as "offline-retry".
    const now = new Date();
    const triggerAt = session.window?.triggerAt ? new Date(session.window.triggerAt) : null;
    const closesAt = session.window?.closesAt ? new Date(session.window.closesAt) : null;
    if (!triggerAt || !closesAt) {
      return res.status(400).json({ success: false, message: "Session window is misconfigured" });
    }
    const OFFLINE_GRACE_MS = 15 * 60 * 1000;
    const clientTs = typeof clientTimestamp === "string" ? Date.parse(clientTimestamp) : NaN;
    let offlineRetry = false;
    if (session.status !== "open") {
      const withinGrace =
        session.status === "closed" &&
        Number.isFinite(clientTs) &&
        now.getTime() <= closesAt.getTime() + OFFLINE_GRACE_MS;
      if (!withinGrace) {
        return res.status(400).json({
          success: false,
          message: "This attendance window is not open",
          code: "WINDOW_NOT_OPEN",
        });
      }
      offlineRetry = true;
    }
    if (offlineRetry) {
      // Client clock decides in-window-ness for buffered taps; the server
      // clock only enforced the grace cap above.
      if (clientTs < triggerAt.getTime()) {
        return res.status(400).json({
          success: false,
          message: "This tap was recorded before the attendance window opened",
          code: "WINDOW_NOT_OPEN",
        });
      }
      if (clientTs > closesAt.getTime()) {
        return res.status(400).json({
          success: false,
          message: "This tap was recorded after the attendance window closed",
          code: "WINDOW_CLOSED",
        });
      }
    } else {
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
      ["tap", "offline-retry"].includes(String(record.submissionSource))
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
    record.submissionSource = offlineRetry ? "offline-retry" : "tap";
    // D2: verify immediately as the submission arrives — student<->venue
    // distance first, then lecturer presence. Provisional (lecturer-absent)
    // records are re-verified by the tick and the 18:00 sweeper.
    const verdict = evaluateProximity(
      {
        status: choice,
        proximity: { studentLat, studentLng, distanceMeters },
      },
      session,
    );
    record.proximity = {
      studentLat,
      studentLng,
      distanceMeters,
      verificationStatus: verdict.verificationStatus,
      capturedAt: now,
    };
    if (verdict.markRecordUnverified && record.status === "present") {
      record.status = "unverified";
    }
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

// POST /attendance/lecturer-check-in (teacher)
// D5: the session's lecturer submits GPS during the lecture; stored on the
// session as the lecturer-presence leg of proximity verification. Only the
// session's lecturer can check in (D13 — admins are read-only). Checking in
// re-verifies students who tapped before the lecturer arrived.
export const submitLecturerCheckIn = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { session: sessionId, coords } = req.body ?? {};
    if (!IS_OBJECT_ID(sessionId)) {
      return res.status(400).json({ success: false, message: "session is required" });
    }
    if (
      !coords ||
      typeof coords.lat !== "number" ||
      typeof coords.lng !== "number" ||
      coords.lat < -90 || coords.lat > 90 ||
      coords.lng < -180 || coords.lng > 180
    ) {
      return res.status(400).json({ success: false, message: "Valid coordinates are required" });
    }

    const session = await LectureSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (!session.lecturer || String(session.lecturer) !== String(user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the lecturer assigned to this session can check in",
      });
    }

    // Accept check-ins from 15 min before lecture start to 30 min after the
    // attendance window closes — generous on purpose (a missing check-in is
    // the D5 fallback-unverified risk).
    const now = new Date();
    const lectureStart = session.window?.lectureStart
      ? new Date(session.window.lectureStart)
      : null;
    const closesAt = session.window?.closesAt
      ? new Date(session.window.closesAt)
      : null;
    if (!lectureStart || !closesAt) {
      return res.status(400).json({ success: false, message: "Session window is misconfigured" });
    }
    if (now.getTime() < lectureStart.getTime() - 15 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "Check-in opens 15 minutes before the lecture starts",
      });
    }
    if (now.getTime() > closesAt.getTime() + 30 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "The check-in period for this session has ended",
      });
    }

    let verified = true;
    let distanceMeters: number | null = null;
    const vLat = session.venueSnapshot?.lat ?? 0;
    const vLng = session.venueSnapshot?.lng ?? 0;
    if (vLat || vLng) {
      distanceMeters = haversineMeters(coords.lat, coords.lng, vLat, vLng);
      verified = distanceMeters <= (session.venueSnapshot?.radiusMeters ?? 150);
    }

    session.lecturerCheckIn = { lat: coords.lat, lng: coords.lng, at: now, verified };
    await session.save();

    const reverification = await processSessionVerifications(session.toObject(), now);

    await logActivity({
      userId: user._id,
      action: "Lecture GPS check-in",
      details:
        "Lecturer checked in for session " + String(session._id) +
        " (" + (verified ? "within venue" : "outside venue radius") + ")",
    });
    emitSystemEvent("attendance.lecturer-checkin", {
      sessionId: String(session._id),
      lecturer: String(user._id),
      verified,
      distanceMeters,
      reverification,
    });

    return res.status(200).json({
      success: true,
      data: { verified, distanceMeters, reverification },
    });
  } catch (error: any) {
    console.error("Error submitting lecturer check-in:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting lecturer check-in",
      error: error.message,
    });
  }
};
