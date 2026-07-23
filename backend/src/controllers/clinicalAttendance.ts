import { Request, Response } from "express";
import crypto from "crypto";
import ClinicalAttendance from "../models/clinicalAttendance";
import User from "../models/user";
import HospitalUnitModel from "../models/hospitalUnit";
import AcademicYear from "../models/academicYear";
import ClassModel from "../models/classes";
import RotationPlan from "../models/rotationPlan";
import ClinicalRotationModel from "../models/clinicalRotation";
import { deriveClinicalSessionSeedFromClass } from "../utils/clinicalSessionSeed";
import { buildClinicalAttendanceFilter } from "../utils/clinicalAttendanceQuery";
import QrOtpModel from "../models/qrOtp";
import { createSignedQrPayload, verifySignedQrPayload } from "../utils/qrSigning";
import { getInstitutionIdentityReference } from "../utils/clinicalAttendanceIdentity";

const OTP_RATE_LIMIT_WINDOW_MS = 60_000;
const OTP_RATE_LIMIT_MAX_REQUESTS = 8;
const otpRateLimitStore = new Map<string, { count: number; resetAt: number }>();

const cleanupExpiredOtpEntries = async () => {
  try {
    await QrOtpModel.deleteMany({ expiresAt: { $lte: new Date() } });
  } catch {
    // ignore cleanup failures
  }
};

const enforceOtpRateLimit = (req: Request) => {
  const key = `${req.ip ?? "unknown"}:${(req as any).userId ?? "anonymous"}`;
  const now = Date.now();
  const bucket = otpRateLimitStore.get(key);

  if (!bucket || now >= bucket.resetAt) {
    otpRateLimitStore.set(key, { count: 1, resetAt: now + OTP_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= OTP_RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  otpRateLimitStore.set(key, bucket);
  return true;
};

// Create a new clinical attendance session
export const createClinicalAttendanceSession = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      activityType,
      title,
      description,
      date,
      startTime,
      endTime,
      unit,
      location,
      room,
      supervisor,
      expectedStudents,
      checkInMethod,
      requiresApproval,
      clinicalRotation,
      academicYear,
      classId,
      learningOutcomes,
    } = req.body;
    const { department } = req.body;

    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true }).select("_id").lean();
    const activeAcademicYearId = academicYear || currentAcademicYear?._id?.toString() || "";

    let resolvedUnitId = unit || "";
    let derivedUnitIds: string[] = [];

    if (classId) {
      const classDoc = await ClassModel.findById(classId).select("_id academicYear").lean();
      if (!classDoc) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      const schedules = await RotationPlan.find({ class: classId }).select("postings meta").lean();
      const postingUnitNames = new Set<string>();

      const addUnitName = (value: unknown) => {
        if (typeof value === "string") {
          const unitName = value.trim();
          if (unitName) {
            postingUnitNames.add(unitName);
          }
          return;
        }

        if (value && typeof value === "object") {
          const objectValue = value as Record<string, unknown>;
          if (typeof objectValue.name === "string" && objectValue.name.trim()) {
            addUnitName(objectValue.name);
            return;
          }
          if (typeof objectValue.unitName === "string" && objectValue.unitName.trim()) {
            addUnitName(objectValue.unitName);
            return;
          }
          if (typeof objectValue._id === "string" && objectValue._id.trim()) {
            addUnitName(objectValue._id);
            return;
          }
          if (typeof objectValue.id === "string" && objectValue.id.trim()) {
            addUnitName(objectValue.id);
            return;
          }
          if (typeof objectValue.toString === "function") {
            const stringValue = objectValue.toString();
            if (typeof stringValue === "string" && stringValue.trim() && stringValue !== "[object Object]") {
              addUnitName(stringValue);
            }
          }
        }
      };

      for (const schedule of schedules) {
        const timeline = Array.isArray(schedule?.meta?.timeline) ? schedule.meta.timeline : [];
        for (const window of timeline) {
          addUnitName(window?.unitName || window?.unitId);
        }

        const postings = Array.isArray(schedule.postings) ? schedule.postings : [];
        for (const posting of postings) {
          const groups = Array.isArray(posting?.groups) ? posting.groups : [];
          for (const group of groups) {
            const groupData = group?.group || group || {};
            const unitName = groupData.unitName || groupData.unit?.name || groupData.name || groupData.unit;
            addUnitName(unitName);
          }
        }
      }

      const serverSeed = await deriveClinicalSessionSeedFromClass({
        academicYearId: activeAcademicYearId,
        unitNames: Array.from(postingUnitNames),
      });

      derivedUnitIds = serverSeed.unitIds;
      if (derivedUnitIds.length > 0) {
        if (!resolvedUnitId && !department) {
          resolvedUnitId = derivedUnitIds[0];
        } else if (resolvedUnitId && !derivedUnitIds.includes(String(resolvedUnitId))) {
          return res.status(400).json({
            success: false,
            message: "The selected unit is not part of the current class posting schedule",
          });
        }
      }
    }

    if (clinicalRotation) {
      const postingExists = await ClinicalRotationModel.findById(clinicalRotation).select("_id").lean();
      if (!postingExists) {
        return res.status(404).json({
          success: false,
          message: "Selected posting not found",
        });
      }
    }

    // Validation: require either a unit or a department
    if (!activityType || !title || !date || !startTime || (!resolvedUnitId && !department) || !supervisor || !clinicalRotation) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: activityType, title, date, startTime, supervisor, posting, and either unit or department",
      });
    }

    // Verify supervisor exists
    const supervisorExists = await User.findById(supervisor);
    if (!supervisorExists) {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found",
      });
    }

    // Verify unit exists if provided
    let unitExists = null;
    if (resolvedUnitId) {
      unitExists = await HospitalUnitModel.findById(resolvedUnitId);
      if (!unitExists) {
        return res.status(404).json({
          success: false,
          message: "Unit not found",
        });
      }
    }

    // Verify academic year exists
    const academicYearExists = await AcademicYear.findById(activeAcademicYearId);
    if (!academicYearExists) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found",
      });
    }

    const clinicalAttendance = new ClinicalAttendance({
      activityType,
      title,
      description,
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      unit: resolvedUnitId || null,
      department: department || "",
      location,
      room,
      supervisor,
      expectedStudents: expectedStudents || [],
      checkInMethod: checkInMethod || "manual",
      requiresApproval: requiresApproval || false,
      clinicalRotation: clinicalRotation || null,
      academicYear: activeAcademicYearId,
      learningOutcomes: learningOutcomes || [],
      createdBy: (req as any).user?._id,
      status: "planned",
    });

    await clinicalAttendance.save();
    await clinicalAttendance.populate([
      { path: "supervisor", select: "firstName lastName email" },
      { path: "unit", select: "name" },
      { path: "createdBy", select: "firstName lastName" },
    ]);

    res.status(201).json({
      success: true,
      message: "Clinical attendance session created successfully",
      data: clinicalAttendance,
    });
  } catch (error: any) {
    console.error("Error creating clinical attendance session:", error);
    res.status(500).json({
      success: false,
      message: "Error creating clinical attendance session",
      error: error.message,
    });
  }
};

// Check-in a student to a clinical session
export const checkInStudent = async (req: Request, res: Response) => {
  try {
    const { sessionId, studentId, notes } = req.body;

    if (!sessionId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: sessionId, studentId",
      });
    }

    const session = await ClinicalAttendance.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Clinical attendance session not found",
      });
    }

    // Check if student already checked in
    const existingRecord = session.attendees.find(
      (attendee) => attendee.student.toString() === studentId
    );

    if (existingRecord && existingRecord.checkInTime) {
      return res.status(400).json({
        success: false,
        message: "Student already checked in",
      });
    }

    const checkInTime = new Date();
    const status =
      checkInTime > session.startTime ? "late" : "present";

    if (existingRecord) {
      existingRecord.checkInTime = checkInTime;
      existingRecord.status = status;
      existingRecord.notes = notes || existingRecord.notes;
    } else {
      session.attendees.push({
        student: studentId,
        status,
        checkInTime,
        notes,
      } as any);
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: "Student checked in successfully",
      data: session,
    });
  } catch (error: any) {
    console.error("Error during check-in:", error);
    res.status(500).json({
      success: false,
      message: "Error during check-in",
      error: error.message,
    });
  }
};

// Check-out a student from a clinical session
export const checkOutStudent = async (req: Request, res: Response) => {
  try {
    const { sessionId, studentId } = req.body;

    if (!sessionId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: sessionId, studentId",
      });
    }

    const session = await ClinicalAttendance.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Clinical attendance session not found",
      });
    }

    const attendeeRecord = session.attendees.find(
      (attendee) => attendee.student.toString() === studentId
    );

    if (!attendeeRecord) {
      return res.status(404).json({
        success: false,
        message: "Student not found in this session",
      });
    }

    const checkOutTime = new Date();
    attendeeRecord.checkOutTime = checkOutTime;

    if (attendeeRecord.checkInTime) {
      const durationMs =
        checkOutTime.getTime() - attendeeRecord.checkInTime.getTime();
      attendeeRecord.duration = Math.round(durationMs / 60000); // convert to minutes
    }

    // Update session end time if not set
    if (!session.endTime) {
      session.endTime = checkOutTime;
      const durationMs =
        checkOutTime.getTime() - session.startTime.getTime();
      session.duration = Math.round(durationMs / 60000);
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: "Student checked out successfully",
      data: session,
    });
  } catch (error: any) {
    console.error("Error during check-out:", error);
    res.status(500).json({
      success: false,
      message: "Error during check-out",
      error: error.message,
    });
  }
};

// Get all clinical attendance sessions (with filters)
export const getClinicalAttendanceSessions = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      unit,
      supervisor,
      status,
      startDate,
      endDate,
      academicYear,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = buildClinicalAttendanceFilter({
      unit: typeof unit === "string" ? unit : undefined,
      supervisor: typeof supervisor === "string" ? supervisor : undefined,
      status: typeof status === "string" ? status : undefined,
      startDate: typeof startDate === "string" ? startDate : undefined,
      endDate: typeof endDate === "string" ? endDate : undefined,
      academicYear: typeof academicYear === "string" ? academicYear : undefined,
    });

    const skip = (Number(page) - 1) * Number(limit);

    const sessions = await ClinicalAttendance.find(filter)
      .populate([
        { path: "supervisor", select: "firstName lastName email" },
        { path: "unit", select: "name" },
        { path: "createdBy", select: "firstName lastName" },
        { path: "attendees.student", select: "firstName lastName" },
      ])
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ClinicalAttendance.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching clinical attendance sessions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching clinical attendance sessions",
      error: error.message,
    });
  }
};

export const generateQrAttendancePayload = async (
  req: Request,
  res: Response
) => {
  try {
    await cleanupExpiredOtpEntries();

    if (!enforceOtpRateLimit(req)) {
      return res.status(429).json({ success: false, message: "Too many OTP requests. Please wait a moment and try again." });
    }

    const { studentId, studentIdNumber, sessionId } = req.body;

    if (!studentId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: studentId, sessionId",
      });
    }

    const session = await ClinicalAttendance.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Clinical attendance session not found",
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const now = new Date();
    const validityMinutes = Math.max(30, Math.min(120, Math.round(((session.endTime ? new Date(session.endTime).getTime() : now.getTime() + 60 * 60 * 1000) - now.getTime()) / 60000 / 2)));
    const identityReference = getInstitutionIdentityReference({
      inn: student.inn,
      idNumber: studentIdNumber || student.idNumber,
      email: student.email,
    });
    const payload = {
      studentId: student._id.toString(),
      studentIdNumber: identityReference,
      sessionId: session._id.toString(),
      supervisorId: session.supervisor?.toString() || null,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + validityMinutes * 60000).toISOString(),
      nonce: crypto.randomUUID(),
      type: "clinical-attendance-qr",
    };

    const signedPayload = createSignedQrPayload(payload);

    // Generate a short OTP fallback (6 digits) and store mapping server-side
    let otp = String(Math.floor(100000 + Math.random() * 900000));
    try {
      await QrOtpModel.create({ otp, payload: signedPayload, expiresAt: new Date(payload.expiresAt) });
    } catch (err) {
      // retry a few times on collision
      let attempts = 0;
      let created = false;
      while (attempts < 3 && !created) {
        attempts += 1;
        const next = String(Math.floor(100000 + Math.random() * 900000));
        try {
          await QrOtpModel.create({ otp: next, payload: signedPayload, expiresAt: new Date(payload.expiresAt) });
          otp = next;
          created = true;
        } catch {}
      }
    }

    res.status(200).json({
      success: true,
      message: "QR payload generated successfully",
      data: {
        qrPayload: signedPayload,
        sessionId: session._id,
        expiresAt: payload.expiresAt,
        validityMinutes,
        otp,
      },
    });
  } catch (error: any) {
    console.error("Error generating QR payload:", error);
    res.status(500).json({
      success: false,
      message: "Error generating QR payload",
      error: error.message,
    });
  }
};

export const approveQrAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    await cleanupExpiredOtpEntries();

    if (!enforceOtpRateLimit(req)) {
      return res.status(429).json({ success: false, message: "Too many approval attempts. Please wait a moment and try again." });
    }

    const { qrPayload, status = "present", notes = "" } = req.body;

    if (!qrPayload) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: qrPayload",
      });
    }

    let parsedPayload: any;
    // Allow supervisors to paste either the full signed QR payload JSON string, or a 6-digit OTP generated by the student
    const otpMatch = typeof qrPayload === "string" && /^\d{6}$/.test(qrPayload.trim());
    if (otpMatch) {
      const found = await QrOtpModel.findOne({ otp: qrPayload.trim(), expiresAt: { $gt: new Date() } }).lean();
      if (!found) {
        return res.status(404).json({ success: false, message: "OTP not found or expired" });
      }
      try {
        parsedPayload = verifySignedQrPayload(found.payload);
        if (!parsedPayload) {
          return res.status(400).json({ success: false, message: "Invalid signed OTP payload stored on server" });
        }
        // delete OTP after use to prevent reuse
        await QrOtpModel.deleteOne({ _id: found._id }).catch(() => {});
      } catch (err) {
        return res.status(400).json({ success: false, message: "Invalid OTP payload stored on server" });
      }
    } else {
      parsedPayload = verifySignedQrPayload(qrPayload);
      if (!parsedPayload) {
        return res.status(400).json({ success: false, message: "Invalid or tampered QR payload" });
      }
    }
    const now = new Date();
    const expiresAt = parsedPayload.expiresAt ? new Date(parsedPayload.expiresAt) : null;
    if (expiresAt && now.getTime() > expiresAt.getTime()) {
      return res.status(410).json({
        success: false,
        message: "Attendance QR has expired",
      });
    }

    const session = await ClinicalAttendance.findById(parsedPayload.sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Clinical attendance session not found",
      });
    }

    const student = await User.findById(parsedPayload.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const existingRecord = session.attendees.find(
      (attendee) => attendee.student.toString() === parsedPayload.studentId
    );

    const checkInTime = new Date();
    const normalizedStatus = status === "approved_absent" ? "excused" : status === "absent" ? "absent" : "present";

    if (existingRecord) {
      existingRecord.status = normalizedStatus;
      existingRecord.checkInTime = checkInTime;
      existingRecord.notes = notes || existingRecord.notes || "Approved via QR";
    } else {
      session.attendees.push({
        student: parsedPayload.studentId,
        status: normalizedStatus,
        checkInTime,
        notes: notes || "Approved via QR",
      } as any);
    }

    session.presentCount = session.attendees.filter((a) => a.status === "present").length;
    session.absentCount = session.attendees.filter((a) => a.status === "absent").length;
    session.lateCount = session.attendees.filter((a) => a.status === "late").length;
    session.excusedCount = session.attendees.filter((a) => a.status === "excused").length;

    await session.save();

    res.status(200).json({
      success: true,
      message: "Attendance approved successfully",
      data: {
        studentId: student._id,
        studentIdNumber: parsedPayload.studentIdNumber,
        sessionId: session._id,
        status: normalizedStatus,
        checkedAt: checkInTime,
      },
    });
  } catch (error: any) {
    console.error("Error approving QR attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error approving QR attendance",
      error: error.message,
    });
  }
};

// Get attendance for a specific student
export const getStudentAttendanceRecord = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId, academicYear, unit } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: studentId",
      });
    }

    const filter: any = {
      "attendees.student": studentId,
    };

    if (academicYear) filter.academicYear = academicYear;
    if (unit) filter.unit = unit;

    const sessions = await ClinicalAttendance.find(filter)
      .populate([
        { path: "unit", select: "name" },
        { path: "supervisor", select: "firstName lastName" },
      ])
      .sort({ date: -1 });

    // Calculate statistics
    let present = 0,
      absent = 0,
      late = 0,
      excused = 0;
    let totalDuration = 0;

    sessions.forEach((session) => {
      const record = session.attendees.find(
        (a) => a.student.toString() === studentId
      );
      if (record) {
        if (record.status === "present") present++;
        if (record.status === "absent") absent++;
        if (record.status === "late") late++;
        if (record.status === "excused") excused++;
        if (record.duration) totalDuration += record.duration;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        sessions,
        statistics: {
          present,
          absent,
          late,
          excused,
          totalSessions: sessions.length,
          totalMinutesAttended: totalDuration,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching student attendance record:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student attendance record",
      error: error.message,
    });
  }
};

// Update attendance status for a student
export const updateStudentAttendanceStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { sessionId, studentId, status, notes } = req.body;

    if (!sessionId || !studentId || !status) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: sessionId, studentId, status",
      });
    }

    const session = await ClinicalAttendance.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Clinical attendance session not found",
      });
    }

    const attendeeRecord = session.attendees.find(
      (attendee) => attendee.student.toString() === studentId
    );

    if (!attendeeRecord) {
      return res.status(404).json({
        success: false,
        message: "Student not found in this session",
      });
    }

    attendeeRecord.status = status;
    if (notes) attendeeRecord.notes = notes;

    // Recalculate statistics
    session.presentCount = session.attendees.filter(
      (a) => a.status === "present"
    ).length;
    session.absentCount = session.attendees.filter(
      (a) => a.status === "absent"
    ).length;
    session.lateCount = session.attendees.filter(
      (a) => a.status === "late"
    ).length;
    session.excusedCount = session.attendees.filter(
      (a) => a.status === "excused"
    ).length;

    await session.save();

    res.status(200).json({
      success: true,
      message: "Attendance status updated successfully",
      data: session,
    });
  } catch (error: any) {
    console.error("Error updating attendance status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating attendance status",
      error: error.message,
    });
  }
};

// End clinical attendance session
export const endClinicalSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, feedback, proceduresPerformed, patientCount } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: sessionId",
      });
    }

    const session = await ClinicalAttendance.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Clinical attendance session not found",
      });
    }

    session.status = "completed";
    session.endTime = new Date();

    if (!session.duration && session.startTime && session.endTime) {
      const durationMs =
        session.endTime.getTime() - session.startTime.getTime();
      session.duration = Math.round(durationMs / 60000);
    }

    if (feedback) session.feedback = feedback;
    if (proceduresPerformed) session.proceduresPerformed = proceduresPerformed;
    if (patientCount) session.patientCount = patientCount;

    // Recalculate final statistics
    session.presentCount = session.attendees.filter(
      (a) => a.status === "present"
    ).length;
    session.absentCount = session.attendees.filter(
      (a) => a.status === "absent"
    ).length;
    session.lateCount = session.attendees.filter(
      (a) => a.status === "late"
    ).length;
    session.excusedCount = session.attendees.filter(
      (a) => a.status === "excused"
    ).length;

    await session.save();

    res.status(200).json({
      success: true,
      message: "Clinical attendance session completed successfully",
      data: session,
    });
  } catch (error: any) {
    console.error("Error ending clinical session:", error);
    res.status(500).json({
      success: false,
      message: "Error ending clinical session",
      error: error.message,
    });
  }
};

// Generate attendance report
export const generateAttendanceReport = async (
  req: Request,
  res: Response
) => {
  try {
    const { academicYear, unit, startDate, endDate, format = "json" } =
      req.query;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: academicYear",
      });
    }

    const filter: any = { academicYear };

    if (unit) filter.unit = unit;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    const sessions = await ClinicalAttendance.find(filter)
      .populate([
        { path: "attendees.student", select: "firstName lastName email" },
        { path: "unit", select: "name" },
        { path: "supervisor", select: "firstName lastName" },
      ])
      .sort({ date: -1 });

    const report = {
      totalSessions: sessions.length,
      totalParticipants: new Set(
        sessions.flatMap((s) => s.attendees.map((a) => a.student.toString()))
      ).size,
      activityBreakdown: {} as any,
      statistics: {
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalExcused: 0,
      },
      sessionDetails: sessions,
    };

    sessions.forEach((session) => {
      if (!report.activityBreakdown[session.activityType]) {
        report.activityBreakdown[session.activityType] = 0;
      }
      report.activityBreakdown[session.activityType]++;

      report.statistics.totalPresent += session.presentCount;
      report.statistics.totalAbsent += session.absentCount;
      report.statistics.totalLate += session.lateCount;
      report.statistics.totalExcused += session.excusedCount;
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("Error generating attendance report:", error);
    res.status(500).json({
      success: false,
      message: "Error generating attendance report",
      error: error.message,
    });
  }
};

// Delete clinical attendance session
export const deleteClinicalSession = async (
  req: Request,
  res: Response
) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: sessionId",
      });
    }

    const session = await ClinicalAttendance.findByIdAndDelete(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Clinical attendance session not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Clinical attendance session deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting clinical session:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting clinical session",
      error: error.message,
    });
  }
};
