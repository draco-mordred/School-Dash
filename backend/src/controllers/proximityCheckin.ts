import { type Request, type Response } from "express";
import mongoose from "mongoose";
import ProximityCheckin from "../models/proximityCheckin";
import ClassModel from "../models/classes";
import User from "../models/user";
import Timetable from "../models/timetable";
import ClinicalAttendance from "../models/clinicalAttendance";
import Attendance from "../models/attendance";
import { processProximityCheckin, validateProximity } from "../subs/tinasha/krystaLatifahSync";
import { emitSystemEvent } from "../events";
import { logActivity } from "../utils/activitieslog";

/**
 * Proximity Checkin Controller
 * Handles student checkins for lecture and clinical attendance
 * with GPS and QR code support
 */

// Helper to extract user from request
const getRequestUser = (req: Request) => (req as any).user;

/**
 * Create a proximity checkin
 * POST /api/proximity/checkin
 * 
 * Body:
 * - locationType: "lecture_hall" | "clinical_ward" | "lab" | "classroom" | "other"
 * - locationName: string
 * - classroomId: ObjectId (optional)
 * - clinicalUnitId: ObjectId (optional)
 * - gpsCoordinates: { latitude, longitude, accuracy } (optional)
 * - checkinMethod: "qr_code" | "nfc" | "biometric" | "manual" | "gps"
 * - lectureSessionId: ObjectId (optional) - link to lecture attendance
 * - clinicalSessionId: ObjectId (optional) - link to clinical attendance
 * - timetablePeriodId: ObjectId (optional) - link to timetable period
 */
export const createProximityCheckin = async (req: Request, res: Response) => {
  try {
    const {
      locationType,
      locationName,
      classroomId,
      clinicalUnitId,
      gpsCoordinates,
      checkinMethod = "qr_code",
      lectureSessionId,
      clinicalSessionId,
      timetablePeriodId,
    } = req.body;
    
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    const student = user._id;
    const studentIdNumber = user.idNumber;
    const classId = user.studentClasses?.[0]?._id || user.studentClass?._id || user.StudentClass?._id;
    const academicYear = user.academicYear?._id;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Student class information not found in profile",
      });
    }
    
    if (!locationType) {
      return res.status(400).json({
        success: false,
        message: "locationType is required",
      });
    }
    
    // Validate location type
    const validLocationTypes = ["lecture_hall", "clinical_ward", "lab", "classroom", "other"];
    if (!validLocationTypes.includes(locationType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid locationType. Must be one of: ${validLocationTypes.join(", ")}`,
      });
    }
    
    // Validate GPS coordinates if provided
    if (gpsCoordinates) {
      if (
        typeof gpsCoordinates.latitude !== "number" ||
        typeof gpsCoordinates.longitude !== "number"
      ) {
        return res.status(400).json({
          success: false,
          message: "GPS coordinates must include latitude and longitude as numbers",
        });
      }
    }
    
    // Check if there's an active session for this checkin
    const now = new Date();
    
    // If lecture session ID provided, validate it
    let lectureSession = null;
    if (lectureSessionId) {
      lectureSession = await Attendance.findById(lectureSessionId);
      if (!lectureSession) {
        return res.status(404).json({
          success: false,
          message: "Lecture session not found",
        });
      }
      
      // Verify student is in this lecture
      if (lectureSession.student.toString() !== student.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this lecture session",
        });
      }
    }
    
    // If clinical session ID provided, validate it
    let clinicalSession = null;
    if (clinicalSessionId) {
      clinicalSession = await ClinicalAttendance.findById(clinicalSessionId);
      if (!clinicalSession) {
        return res.status(404).json({
          success: false,
          message: "Clinical session not found",
        });
      }
      
      // Verify student is expected in this clinical session
      if (
        !clinicalSession.expectedStudents?.some(
          (s) => s.toString() === student.toString()
        )
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not expected in this clinical session",
        });
      }
      
      // Check if session is active (within time window)
      const startTime = new Date(clinicalSession.startTime);
      const endTime = clinicalSession.endTime ? new Date(clinicalSession.endTime) : null;
      
      if (endTime && now > endTime) {
        return res.status(400).json({
          success: false,
          message: "This clinical session has ended",
        });
      }
      
      if (now < new Date(startTime.getTime() - 30 * 60 * 1000)) {
        return res.status(400).json({
          success: false,
          message: "This clinical session has not started yet (checkins allowed 30 min before)",
        });
      }
    }
    
    // Create the checkin
    const result = await processProximityCheckin(
      {
        student,
        studentIdNumber,
        locationType,
        locationName,
        classroomId,
        clinicalUnitId,
        gpsCoordinates,
        checkinMethod,
        classId,
        academicYear,
        lectureSessionId,
        clinicalSessionId,
        timetablePeriodId,
      },
      student
    );
    
    // Log activity
    await logActivity({
      userId: student,
      action: "Proximity checkin created",
      details: `Student checked in at ${locationType} ${locationName || ""}`,
    });
    
    // Emit event
    emitSystemEvent("proximity.checkin.created", {
      checkinId: result.checkin?._id?.toString(),
      student: student.toString(),
      locationType,
      classId: classId.toString(),
    });
    
    return res.status(201).json({
      success: true,
      message: "Proximity checkin created successfully",
      data: result.checkin,
    });
  } catch (error: any) {
    console.error("Error creating proximity checkin:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating proximity checkin",
      error: error.message,
    });
  }
};

/**
 * Checkin with QR code
 * POST /api/proximity/checkin-qr
 * 
 * Body:
 * - qrData: The QR code payload
 * - gpsCoordinates: Optional GPS data
 */
export const createQrProximityCheckin = async (req: Request, res: Response) => {
  try {
    const { qrData, gpsCoordinates, checkinMethod = "qr_code" } = req.body;
    
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: "qrData is required",
      });
    }
    
    // Parse QR data (could be JSON string or session ID)
    let sessionId: string | null = null;
    let locationType: string = "classroom";
    
    try {
      // Try to parse as JSON
      if (typeof qrData === "string") {
        const parsed = JSON.parse(qrData);
        sessionId = parsed.sessionId || parsed.id;
        locationType = parsed.locationType || "classroom";
      } else if (qrData.sessionId) {
        sessionId = qrData.sessionId;
        locationType = qrData.locationType || "classroom";
      }
    } catch {
      // If not JSON, treat as direct session ID
      sessionId = String(qrData);
    }
    
    const student = user._id;
    const studentIdNumber = user.idNumber;
    const classId = user.studentClasses?.[0]?._id || user.studentClass?._id;
    const academicYear = user.academicYear?._id;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Student class information not found",
      });
    }
    
    // Check if session ID is a lecture or clinical session
    let lectureSession = null;
    let clinicalSession = null;
    let sessionType: "lecture" | "clinical" | null = null;
    
    try {
      lectureSession = await Attendance.findById(sessionId);
      if (lectureSession) {
        sessionType = "lecture";
      }
    } catch {}
    
    try {
      clinicalSession = await ClinicalAttendance.findById(sessionId);
      if (clinicalSession) {
        sessionType = "clinical";
      }
    } catch {}
    
    if (!sessionType) {
      return res.status(404).json({
        success: false,
        message: "Session not found for QR code",
      });
    }
    
    // Create checkin with appropriate session reference
    const result = await processProximityCheckin(
      {
        student,
        studentIdNumber,
        locationType: sessionType === "clinical" ? "clinical_ward" : locationType,
        gpsCoordinates,
        checkinMethod,
        classId,
        academicYear,
        lectureSessionId: sessionType === "lecture" ? sessionId : undefined,
        clinicalSessionId: sessionType === "clinical" ? sessionId : undefined,
      },
      student
    );
    
    return res.status(201).json({
      success: true,
      message: `QR checkin successful for ${sessionType} session`,
      data: result.checkin,
    });
  } catch (error: any) {
    console.error("Error in QR checkin:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing QR checkin",
      error: error.message,
    });
  }
};

/**
 * Validate a checkin with proximity
 * POST /api/proximity/validate
 * 
 * Validates if a student is within range of a target location
 */
export const validateCheckinProximity = async (req: Request, res: Response) => {
  try {
    const { checkinId, targetLocation } = req.body;
    
    if (!checkinId || !targetLocation) {
      return res.status(400).json({
        success: false,
        message: "checkinId and targetLocation are required",
      });
    }
    
    const checkin = await ProximityCheckin.findById(checkinId);
    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "Checkin not found",
      });
    }
    
    const result = validateProximity(checkin, targetLocation);
    
    // Update checkin with validation result
    await ProximityCheckin.findByIdAndUpdate(checkinId, {
      isWithinRange: result.isValid,
      distanceFromTarget: result.distance,
      status: result.isValid ? "verified" : "rejected",
      verifiedAt: result.isValid ? new Date() : undefined,
    });
    
    return res.status(200).json({
      success: true,
      isValid: result.isValid,
      distance: result.distance,
      message: result.isValid
        ? "Checkin is within acceptable range"
        : "Checkin is out of range",
    });
  } catch (error: any) {
    console.error("Error validating proximity:", error);
    return res.status(500).json({
      success: false,
      message: "Error validating proximity",
      error: error.message,
    });
  }
};

/**
 * Get student's checkin history
 * GET /api/proximity/history
 * 
 * Query params:
 * - startDate: Optional start date
 * - endDate: Optional end date
 * - locationType: Optional filter by location type
 * - status: Optional filter by status
 */
export const getCheckinHistory = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    const student = user._id;
    const classId = user.studentClasses?.[0]?._id || user.studentClass?._id;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Student class information not found",
      });
    }
    
    const { startDate, endDate, locationType, status, page = 1, limit = 20 } = req.query;
    
    const filter: any = {
      student,
      classId,
    };
    
    if (startDate) {
      filter.checkinTime = { $gte: new Date(String(startDate)) };
    }
    
    if (endDate) {
      if (!filter.checkinTime) filter.checkinTime = {};
      filter.checkinTime.$lte = new Date(String(endDate));
    }
    
    if (locationType) {
      filter.locationType = locationType;
    }
    
    if (status) {
      filter.status = status;
    }
    
    const checkins = await ProximityCheckin.find(filter)
      .populate("classId", "name")
      .populate("lectureSessionId", "course subject date status")
      .populate("clinicalSessionId", "title activityType startTime")
      .sort({ checkinTime: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    
    const total = await ProximityCheckin.countDocuments(filter);
    
    return res.status(200).json({
      success: true,
      data: checkins,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching checkin history:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching checkin history",
      error: error.message,
    });
  }
};

/**
 * Get today's checkins for a class (for supervisor view)
 * GET /api/proximity/today/:classId
 */
export const getTodaysCheckins = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const user = getRequestUser(req);
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Verify user has access to this class
    if (user.role !== "admin" && user.role !== "teacher") {
      // Check if user is a student in this class
      const studentClass = user.studentClasses?.[0]?._id || user.studentClass?._id;
      if (studentClass !== classId) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this class",
        });
      }
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const checkins = await ProximityCheckin.find({
      classId,
      checkinTime: { $gte: today, $lt: tomorrow },
    })
      .populate("student", "name idNumber")
      .populate("lectureSessionId", "course subject")
      .populate("clinicalSessionId", "title activityType")
      .sort({ checkinTime: -1 });
    
    // Group by student
    const byStudent: Record<string, any> = {};
    checkins.forEach((checkin) => {
      const studentId = checkin.student.toString();
      if (!byStudent[studentId]) {
        byStudent[studentId] = {
          student: checkin.student,
          checkins: [],
          totalCheckins: 0,
        };
      }
      byStudent[studentId].checkins.push(checkin);
      byStudent[studentId].totalCheckins++;
    });
    
    return res.status(200).json({
      success: true,
      total: checkins.length,
      byStudent,
      allCheckins: checkins,
    });
  } catch (error: any) {
    console.error("Error fetching today's checkins:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching today's checkins",
      error: error.message,
    });
  }
};

/**
 * Manually mark a student as present for a session
 * POST /api/proximity/manual-mark
 * 
 * Used when automatic checkin fails (e.g., network issues)
 */
export const manualMarkPresent = async (req: Request, res: Response) => {
  try {
    const { sessionId, sessionType, studentId, reason } = req.body;
    const user = getRequestUser(req);
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Only teachers, supervisors, or admins can manually mark attendance
    if (!["admin", "teacher", "unitconsultant", "unitresident"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized personnel can manually mark attendance",
      });
    }
    
    if (!sessionId || !sessionType) {
      return res.status(400).json({
        success: false,
        message: "sessionId and sessionType are required",
      });
    }
    
    const targetStudent = studentId || user._id;
    
    if (sessionType === "lecture") {
      const session = await Attendance.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Lecture session not found",
        });
      }
      
      // Update attendance
      await Attendance.findByIdAndUpdate(sessionId, {
        status: "present",
        notes: reason ? `Manual mark: ${reason}` : "Manually marked present",
      });
      
      // Create proximity checkin record
      await ProximityCheckin.create({
        student: new mongoose.Types.ObjectId(targetStudent),
        locationType: "classroom",
        checkinTime: new Date(),
        lectureSessionId: new mongoose.Types.ObjectId(sessionId),
        status: "verified",
        checkinMethod: "manual",
        isWithinRange: true,
        syncStatus: "synced",
        classId: session.class,
        academicYear: session.academicYear,
        createdBy: user._id,
        notes: reason || "Manually marked by staff",
      });
      
      await logActivity({
        userId: user._id,
        action: "Manual attendance mark",
        details: `Manually marked student ${targetStudent} as present for lecture ${sessionId}`,
      });
      
      return res.status(200).json({
        success: true,
        message: "Student marked as present for lecture",
      });
    } else if (sessionType === "clinical") {
      const session = await ClinicalAttendance.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Clinical session not found",
        });
      }
      
      // Add or update attendee
      const existingAttendee = session.attendees.find(
        (a) => a.student.toString() === targetStudent.toString()
      );
      
      if (existingAttendee) {
        existingAttendee.status = "present";
        existingAttendee.notes = reason ? `Manual mark: ${reason}` : "Manually marked present";
        existingAttendee.checkInTime = new Date();
      } else {
        session.attendees.push({
          student: new mongoose.Types.ObjectId(targetStudent),
          status: "present",
          checkInTime: new Date(),
          notes: reason || "Manually marked present",
        });
      }
      
      await session.save();
      
      // Create proximity checkin record
      await ProximityCheckin.create({
        student: new mongoose.Types.ObjectId(targetStudent),
        locationType: "clinical_ward",
        checkinTime: new Date(),
        clinicalSessionId: new mongoose.Types.ObjectId(sessionId),
        status: "verified",
        checkinMethod: "manual",
        isWithinRange: true,
        syncStatus: "synced",
        classId: session.classId,
        academicYear: session.academicYear,
        createdBy: user._id,
        notes: reason || "Manually marked by staff",
      });
      
      await logActivity({
        userId: user._id,
        action: "Manual clinical attendance mark",
        details: `Manually marked student ${targetStudent} as present for clinical session ${sessionId}`,
      });
      
      return res.status(200).json({
        success: true,
        message: "Student marked as present for clinical session",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid sessionType. Must be 'lecture' or 'clinical'",
      });
    }
  } catch (error: any) {
    console.error("Error in manual mark:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking student as present",
      error: error.message,
    });
  }
};

export default {
  createProximityCheckin,
  createQrProximityCheckin,
  validateCheckinProximity,
  getCheckinHistory,
  getTodaysCheckins,
  manualMarkPresent,
};
