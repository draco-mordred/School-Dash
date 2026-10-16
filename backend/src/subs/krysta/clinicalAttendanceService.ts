import { Request, Response } from "express";
import crypto from "crypto";
import ClinicalAttendance from "../../models/clinicalAttendance";
import User from "../../models/user";
import HospitalUnitModel from "../../models/hospitalUnit";
import AcademicYear from "../../models/academicYear";
import ClassModel from "../../models/classes";
import RotationPlan from "../../models/rotationPlan";
import { deriveClinicalSessionSeedFromClass } from "../../utils/clinicalSessionSeed";
import { buildClinicalAttendanceFilter } from "../../utils/clinicalAttendanceQuery";
import QrOtpModel from "../../models/qrOtp";
import { createSignedQrPayload, verifySignedQrPayload } from "../../utils/qrSigning";
import { getInstitutionIdentityReference } from "../../utils/clinicalAttendanceIdentity";
import { resolveClinicalSessionPosting } from "../../utils/clinicalAttendancePosting";
import { emitSystemEvent } from "../../events";
import { getAvailableClinicalAttendanceGroupsForPosting } from "../../utils/clinicalAttendanceGroupSelection";
import { resolveStudentClinicalAssignments } from "../../utils/clinicalAttendanceAssignment";

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

const requestUser = (req: Request) => (req as any).user;

const requestUserId = (req: Request) => String(requestUser(req)?._id ?? "");

const isStudentRequest = (req: Request) => String(requestUser(req)?.role ?? "").toLowerCase() === "student";

const isExpectedStudent = (session: any, studentId: string) =>
  (session?.expectedStudents ?? []).some((student: any) => String(student?._id ?? student) === studentId);

const recalculateSessionCounts = (session: any) => {
  session.presentCount = session.attendees.filter((attendee: any) => attendee.status === "present").length;
  session.absentCount = session.attendees.filter((attendee: any) => attendee.status === "absent").length;
  session.lateCount = session.attendees.filter((attendee: any) => attendee.status === "late").length;
  session.excusedCount = session.attendees.filter((attendee: any) => attendee.status === "excused").length;
};

const serializeStudentAttendanceSession = (session: any, studentId: string) => {
  const sessionData = typeof session?.toObject === "function" ? session.toObject() : { ...session };
  delete sessionData.expectedStudents;
  sessionData.attendees = (sessionData.attendees ?? []).filter((attendee: any) =>
    String(attendee?.student?._id ?? attendee?.student) === studentId
  );
  return sessionData;
};

const expirePendingAttendancesIfNeeded = async (session: any) => {
  const now = new Date();
  const expiryBase = session?.endTime ? new Date(session.endTime) : session?.startTime ? new Date(session.startTime) : null;
  if (!expiryBase) {
    return false;
  }

  const expiryTime = new Date(expiryBase.getTime() + 2 * 60 * 60 * 1000);
  if (now.getTime() <= expiryTime.getTime()) {
    return false;
  }

  let changed = false;
  const attendeeIds = new Set((session.attendees ?? []).map((attendee: any) => String(attendee.student?._id ?? attendee.student)));
  for (const studentId of session.expectedStudents ?? []) {
    if (!attendeeIds.has(String(studentId))) {
      session.attendees.push({
        student: studentId,
        status: "absent",
        notes: "Marked absent after session window expired",
      } as any);
      changed = true;
    }
  }
  for (const attendee of session.attendees ?? []) {
    if (attendee?.status === "pending") {
      attendee.status = "absent";
      attendee.notes = attendee.notes || "Marked absent after session window expired";
      changed = true;
    }
  }

  if (session.status === "ongoing") {
    session.status = "completed";
    session.endTime = expiryTime;
    if (!session.duration && session.startTime) {
      session.duration = Math.max(0, Math.round((expiryTime.getTime() - new Date(session.startTime).getTime()) / 60000));
    }
    changed = true;
  }
  if (!changed) {
    return false;
  }
  recalculateSessionCounts(session);
  await session.save();
  return true;
};

const enforceOtpRateLimit = (req: Request) => {
  const key = `${req.ip ?? "unknown"}:${requestUserId(req) || "anonymous"}`;
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
      checkInMethod,
      requiresApproval,
      clinicalRotation,
      academicYear,
      classId,
      learningOutcomes,
      groupId,
    } = req.body;
    const { department } = req.body;
    const selectedGroupId = groupId || req.body.supervisorGroupId || null;

    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true }).select("_id").lean();
    let activeAcademicYearId = academicYear || currentAcademicYear?._id?.toString() || "";
    const currentUserId = requestUserId(req);
    const classRoster: string[] = [];

    if (!classId || !clinicalRotation || !selectedGroupId || !currentUserId) {
      return res.status(400).json({ success: false, message: "A class, active posting, and supervised group are required" });
    }

    let resolvedUnitId = unit || "";
    let derivedUnitIds: string[] = [];
    let resolvedUnitLabel = "";

    if (classId) {
      const classDoc = await ClassModel.findById(classId).select("_id academicYear students").lean();
      if (!classDoc) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }
      const classAcademicYearId = String((classDoc as any).academicYear ?? "");
      if (academicYear && classAcademicYearId && String(academicYear) !== classAcademicYearId) {
        return res.status(400).json({ success: false, message: "The selected academic year does not match the class" });
      }
      if (classAcademicYearId) activeAcademicYearId = classAcademicYearId;
      classRoster.push(...((classDoc as any).students ?? []).map((studentId: any) => String(studentId?._id ?? studentId)));

      const schedules = await RotationPlan.find({ class: classId }).select("postings meta").lean();
      const postingUnitNames = new Set<string>();
      const postingDepartmentNames = new Set<string>();

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
          if (typeof objectValue.departmentName === "string" && objectValue.departmentName.trim()) {
            postingDepartmentNames.add(objectValue.departmentName.trim());
            return;
          }
          if (typeof objectValue.department === "string" && objectValue.department.trim()) {
            postingDepartmentNames.add(objectValue.department.trim());
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
          addUnitName(window?.departmentName || window?.department || window?.departmentCode);
        }

        const postings = Array.isArray(schedule.postings) ? schedule.postings : [];
        for (const posting of postings) {
          const groups = Array.isArray(posting?.groups) ? posting.groups : [];
          const postingDepartments = Array.isArray(posting?.meta?.departments) ? posting.meta.departments : [];

          for (const dept of postingDepartments) {
            addUnitName(dept?.departmentName || dept?.department || dept?.departmentCode);
          }

          for (const group of groups) {
            const groupData = group?.group || group || {};
            const unitName = groupData.unitName || groupData.unit?.name || groupData.name || groupData.unit;
            addUnitName(unitName);
            addUnitName(groupData.departmentName || groupData.department || groupData.departmentCode);
          }
        }
      }

      const serverSeed = await deriveClinicalSessionSeedFromClass({
        academicYearId: activeAcademicYearId,
        unitNames: Array.from(postingUnitNames),
        departmentNames: Array.from(postingDepartmentNames),
      });

      derivedUnitIds = serverSeed.unitIds;
      if (!resolvedUnitId && derivedUnitIds.length > 0) {
        resolvedUnitId = derivedUnitIds[0];
      }
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
      const postingExists = await resolveClinicalSessionPosting(clinicalRotation, classId);
      if (!postingExists) {
        console.warn("Clinical attendance session created without a resolved posting reference", {
          clinicalRotation,
          classId,
        });
      }
    }

    const matchingSchedule = await RotationPlan.findOne({
      class: classId,
      $or: [{ _id: clinicalRotation }, { "postings._id": clinicalRotation }],
    }).select("_id class postings meta").lean();
    const matchingPostings = Array.isArray(matchingSchedule?.postings) ? matchingSchedule.postings : [];
    const matchingPosting = matchingPostings.find((posting: any) => String(posting?._id) === String(clinicalRotation))
      ?? (String(matchingSchedule?._id) === String(clinicalRotation) && matchingPostings.length === 1 ? matchingPostings[0] : null);
    if (!matchingSchedule || !matchingPosting) {
      return res.status(400).json({ success: false, message: "The selected posting does not belong to this class" });
    }

    const activityStart = new Date(startTime);
    const selection = getAvailableClinicalAttendanceGroupsForPosting(matchingPosting, matchingSchedule, activityStart, requestUser(req));
    const supervisedGroup = selection.groups.find((group) => group.id === selectedGroupId);
    if (!supervisedGroup) {
      return res.status(403).json({ success: false, message: "You are not the assigned supervisor for this posting group" });
    }
    const resolvedSupervisorId = currentUserId;
    const teamStudentIds = [...new Set(classRoster.flatMap((studentId) => {
      const studentAssignments = resolveStudentClinicalAssignments([matchingSchedule], studentId, activityStart);
      if (studentAssignments.length !== 1) return [];
      const assignment = studentAssignments[0];
      return assignment.postingId === String(matchingPosting?._id) && assignment.groupId === supervisedGroup.id
        ? assignment.studentIds
        : [];
    }))];
    if (teamStudentIds.length === 0) {
      return res.status(400).json({ success: false, message: "No students are assigned to this active posting group" });
    }

    if (!activityType || !title || !date || !startTime || (!resolvedUnitId && !department) || !resolvedSupervisorId || !clinicalRotation) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: activityType, title, date, startTime, supervisor, posting, and either unit or department",
      });
    }

    const supervisorExists = await User.findById(resolvedSupervisorId);
    if (!supervisorExists) {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found",
      });
    }

    let unitExists = null;
    if (resolvedUnitId) {
      const normalizedUnitId = String(resolvedUnitId).trim();
      const maybeObjectId = normalizedUnitId.length === 24 && /^[a-fA-F0-9]{24}$/.test(normalizedUnitId)
        ? normalizedUnitId
        : null;

      if (maybeObjectId) {
        unitExists = await HospitalUnitModel.findById(maybeObjectId).lean();
      } else {
        const escapedUnitId = normalizedUnitId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        unitExists = await HospitalUnitModel.findOne({
          $or: [
            { code: normalizedUnitId },
            { id: normalizedUnitId },
            { name: normalizedUnitId },
            { name: { $regex: new RegExp(escapedUnitId, "i") } },
          ],
        }).lean();
      }

      if (!unitExists) {
        resolvedUnitLabel = normalizedUnitId;
      }
    }

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
      unit: unitExists ? unitExists._id : null,
      unitLabel: resolvedUnitLabel || "",
      department: department || "",
      location,
      room,
      supervisor: resolvedSupervisorId,
      supervisorName: supervisorExists?.name ? String(supervisorExists.name).trim() : "",
      supervisorEmail: supervisorExists?.email || "",
      supervisorGroupId: supervisedGroup.id,
      supervisorGroupLabel: supervisedGroup.label,
      supervisorGroupCode: supervisedGroup.code,
      supervisorGroupType: supervisedGroup.type,
      expectedStudents: teamStudentIds,
      attendees: teamStudentIds.map((studentId) => ({ student: studentId, status: "pending" })),
      checkInMethod: checkInMethod || "manual",
      requiresApproval: requiresApproval || false,
      clinicalRotation: matchingPosting._id,
      classId,
      academicYear: activeAcademicYearId,
      learningOutcomes: learningOutcomes || [],
      createdBy: (req as any).user?._id,
      status: activityStart <= new Date() && (!endTime || new Date(endTime) > new Date()) ? "ongoing" : "planned",
    });

    await clinicalAttendance.save();
    await clinicalAttendance.populate([
      { path: "supervisor", select: "firstName lastName email" },
      { path: "unit", select: "name" },
      { path: "createdBy", select: "firstName lastName" },
    ]);

    emitSystemEvent("clinicalAttendance.session.created", {
      sessionId: clinicalAttendance._id.toString(),
      academicYear: activeAcademicYearId,
      classId: classId || null,
      unitId: unitExists?._id?.toString() || null,
      supervisor: resolvedSupervisorId.toString(),
    });

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

export const getAvailableClinicalAttendanceGroups = async (req: Request, res: Response) => {
  try {
    const { classId, postingId } = req.query as Record<string, string | undefined>;
    if (!classId || !postingId) {
      return res.status(400).json({ success: false, message: "classId and postingId are required" });
    }

    const schedule = await RotationPlan.findOne({ class: classId, $or: [{ _id: postingId }, { "postings._id": postingId }] }).select("postings meta").lean();
    const schedulePostings = Array.isArray(schedule?.postings) ? schedule.postings : [];
    const posting = schedulePostings
      ? schedule.postings.find((entry: any) => String(entry?._id) === String(postingId)) || null
      : null;
    const selectedPosting = posting || (String(schedule?._id) === String(postingId) && schedulePostings.length === 1 ? schedulePostings[0] : null);
    const selection = getAvailableClinicalAttendanceGroupsForPosting(selectedPosting, schedule, new Date(), {
      _id: (req as any).user?._id?.toString(),
      firstName: (req as any).user?.firstName,
      lastName: (req as any).user?.lastName,
      name: (req as any).user?.name || "",
      email: (req as any).user?.email || "",
    });

    return res.status(200).json({
      success: true,
      groups: selection.groups,
      usesUnits: selection.usesUnits,
      activePhase: selection.activePhase,
      message: selection.groups.length > 0
        ? "Select a supervised group for this posting."
        : "No supervised groups are available for the selected posting yet.",
    });
  } catch (error: any) {
    console.error("Error fetching clinical attendance groups", error);
    return res.status(500).json({ success: false, message: "Unable to load supervised groups" });
  }
};

export const checkInStudent = async (req: Request, res: Response) => {
  try {
    const { sessionId, notes } = req.body;
    const studentId = isStudentRequest(req) ? requestUserId(req) : String(req.body.studentId ?? "");

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

    if (isStudentRequest(req) && (!studentId || !isExpectedStudent(session, studentId))) {
      return res.status(403).json({ success: false, message: "You are not assigned to this clinical session" });
    }
    if (!isStudentRequest(req) && String(session.supervisor) !== requestUserId(req) && String(requestUser(req)?.role) !== "admin") {
      return res.status(403).json({ success: false, message: "Only the assigned supervisor can manage this session" });
    }

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

    session.status = session.status === "planned" ? "ongoing" : session.status;
    recalculateSessionCounts(session);

    await session.save();

    emitSystemEvent("clinicalAttendance.student.checkedIn", {
      sessionId,
      studentId,
      status,
      checkInTime: checkInTime.toISOString(),
    });

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

export const checkOutStudent = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const studentId = isStudentRequest(req) ? requestUserId(req) : String(req.body.studentId ?? "");

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

    if (String(session.supervisor) !== requestUserId(req) && String(requestUser(req)?.role ?? "").toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Only the assigned supervisor can update attendance" });
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

    if (attendeeRecord.checkOutTime) {
      return res.status(400).json({ success: false, message: "Student already checked out" });
    }

    const checkOutTime = new Date();
    attendeeRecord.checkOutTime = checkOutTime;

    if (attendeeRecord.checkInTime) {
      const durationMs =
        checkOutTime.getTime() - attendeeRecord.checkInTime.getTime();
      attendeeRecord.duration = Math.round(durationMs / 60000);
    }

    recalculateSessionCounts(session);
    await session.save();

    emitSystemEvent("clinicalAttendance.student.checkedOut", {
      sessionId,
      studentId,
      checkOutTime: checkOutTime.toISOString(),
      durationMinutes: attendeeRecord.duration ?? null,
    });

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

    const studentId = isStudentRequest(req) ? requestUserId(req) : "";
    if (studentId) {
      filter.$and = [...(filter.$and ?? []), { $or: [{ expectedStudents: studentId }, { "attendees.student": studentId }] }];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const sessions = await ClinicalAttendance.find(filter)
      .populate([
        { path: "supervisor", select: "firstName lastName email name" },
        { path: "unit", select: "name" },
        { path: "createdBy", select: "firstName lastName" },
        { path: "attendees.student", select: "firstName lastName name inn idNumber" },
      ])
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    for (const session of sessions) {
      await expirePendingAttendancesIfNeeded(session);
    }

    const responseSessions = studentId
      ? sessions.map((session: any) => serializeStudentAttendanceSession(session, studentId))
      : sessions;

    const total = await ClinicalAttendance.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: responseSessions,
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

    const studentId = requestUserId(req);
    const { sessionId } = req.body;

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

    const now = new Date();
    const effectiveEndTime = session.endTime
      ? new Date(session.endTime)
      : new Date(new Date(session.startTime).getTime() + 2 * 60 * 60 * 1000);
    if (session.status !== "ongoing" || new Date(session.date).toDateString() !== now.toDateString() ||
        new Date(session.startTime).getTime() > now.getTime() ||
        effectiveEndTime.getTime() <= now.getTime() ||
        !isExpectedStudent(session, studentId)) {
      return res.status(403).json({ success: false, message: "QR generation is only available for your active clinical session" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!session.classId || !session.clinicalRotation) {
      return res.status(403).json({ success: false, message: "This session is not linked to an active class posting" });
    }
    const attendanceRecord = session.attendees.find((attendee: any) => String(attendee.student?._id ?? attendee.student) === studentId);
    if (attendanceRecord && attendanceRecord.status !== "pending") {
      return res.status(409).json({ success: false, message: "Your attendance has already been finalized for this session" });
    }
    const studentClassId = String((student as any).studentClasses ?? "");
    if (studentClassId !== String(session.classId)) {
      return res.status(403).json({ success: false, message: "This session does not belong to your class" });
    }
    const schedules = await RotationPlan.find({ class: studentClassId }).select("_id class postings meta").lean();
    const assignment = resolveStudentClinicalAssignments(schedules, studentId, new Date()).find((entry) =>
      [entry.postingId, entry.scheduleId].includes(String(session.clinicalRotation)) &&
      entry.groupId === String(session.supervisorGroupId)
    );
    if (!assignment) {
      return res.status(403).json({ success: false, message: "You are not assigned to this active posting group" });
    }

    const validityMinutes = Math.max(1, Math.min(120, Math.floor((effectiveEndTime.getTime() - now.getTime()) / 60000)));
    const identityReference = getInstitutionIdentityReference({
      inn: student.inn,
      idNumber: student.idNumber,
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

    let otp = "";
    for (let attempt = 0; attempt < 4 && !otp; attempt += 1) {
      const candidate = String(crypto.randomInt(100000, 1000000));
      try {
        await QrOtpModel.create({ otp: candidate, payload: signedPayload, expiresAt: new Date(payload.expiresAt) });
        otp = candidate;
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
      }
    }
    if (!otp) throw new Error("Unable to reserve a unique attendance OTP");

    emitSystemEvent("clinicalAttendance.qr.generated", {
      sessionId: session._id.toString(),
      studentId: student._id.toString(),
      expiresAt: payload.expiresAt,
      otpGenerated: Boolean(otp),
    });

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

    const { qrPayload, sessionId: selectedSessionId, status = "present", notes = "" } = req.body;

    if (!["present", "absent", "approved_absent"].includes(status)) {
      return res.status(400).json({ success: false, message: "Unsupported attendance status" });
    }

    if (!qrPayload) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: qrPayload",
      });
    }

    let parsedPayload: any;
    let otpRecord: any;
    const otpMatch = typeof qrPayload === "string" && /^\d{6}$/.test(qrPayload.trim());
    if (otpMatch) {
      otpRecord = await QrOtpModel.findOne({ otp: qrPayload.trim() }).lean();
      if (!otpRecord || new Date(otpRecord.expiresAt).getTime() <= Date.now()) {
        return res.status(404).json({ success: false, message: "OTP not found or expired" });
      }
      parsedPayload = verifySignedQrPayload(otpRecord.payload);
      if (!parsedPayload) return res.status(400).json({ success: false, message: "Invalid signed OTP payload stored on server" });
    } else {
      parsedPayload = verifySignedQrPayload(qrPayload);
      if (!parsedPayload) {
        return res.status(400).json({ success: false, message: "Invalid or tampered QR payload" });
      }
      otpRecord = await QrOtpModel.findOne({ payload: qrPayload }).lean();
      if (!otpRecord || new Date(otpRecord.expiresAt).getTime() <= Date.now()) {
        return res.status(410).json({ success: false, message: "Attendance QR has expired or was already used" });
      }
    }

    if (otpRecord.approvalStatus === "consumed") {
      if (String(otpRecord.approvedBy ?? "") !== requestUserId(req) && String(requestUser(req)?.role ?? "").toLowerCase() !== "admin") {
        return res.status(403).json({ success: false, message: "Only the approving supervisor can retry this approval" });
      }
      if (otpRecord.approvalResponse) return res.status(200).json(otpRecord.approvalResponse);
      return res.status(409).json({ success: false, message: "This attendance token has already been used" });
    }
    if (otpRecord.approvalStatus === "processing" && Date.now() - new Date(otpRecord.claimedAt ?? 0).getTime() < 120_000) {
      return res.status(409).json({ success: false, message: "This attendance approval is already being processed" });
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

    const authenticatedUser = requestUser(req);
    if (String(authenticatedUser?._id ?? "") !== String(session.supervisor) && String(authenticatedUser?.role ?? "").toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Only the assigned supervisor can approve this session" });
    }
    if (selectedSessionId && String(selectedSessionId) !== String(session._id)) {
      return res.status(409).json({ success: false, message: "The scanned QR belongs to a different session" });
    }
    if (session.status !== "ongoing") {
      return res.status(409).json({ success: false, message: "This clinical session is not active" });
    }
    if (session.expectedStudents?.length && !isExpectedStudent(session, String(parsedPayload.studentId))) {
      return res.status(403).json({ success: false, message: "This student is not assigned to the clinical session" });
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
    if (existingRecord && existingRecord.status !== "pending") {
      if (existingRecord.approvalNonce === parsedPayload.nonce && String(existingRecord.approvedBy ?? "") === requestUserId(req)) {
        const approvalResponse = {
          success: true,
          message: "Attendance approved successfully",
          data: {
            studentId: student._id,
            studentIdNumber: parsedPayload.studentIdNumber,
            sessionId: session._id,
            status: existingRecord.status,
            checkedAt: existingRecord.approvedAt ?? existingRecord.checkInTime,
          },
        };
        await QrOtpModel.updateOne(
          { _id: otpRecord._id, approvalStatus: "processing" },
          { $set: { approvalStatus: "consumed", approvedBy: requestUser(req)?._id, approvalResponse } }
        );
        return res.status(200).json(approvalResponse);
      }
      return res.status(409).json({ success: false, message: "Attendance is already finalized for this student" });
    }
    const normalizedStatus = status === "approved_absent" ? "excused" : status;

    const claimedOtp = await QrOtpModel.findOneAndUpdate(
      {
        _id: otpRecord._id,
        expiresAt: { $gt: now },
        $or: [
          { approvalStatus: { $in: [null, "available"] } },
          { approvalStatus: "processing", claimedAt: { $lt: new Date(now.getTime() - 120_000) } },
        ],
      },
      { $set: { approvalStatus: "processing", claimedAt: now } },
      { new: true }
    ).lean();
    if (!claimedOtp) {
      return res.status(409).json({ success: false, message: "This attendance token is already being processed or has been used" });
    }

    if (existingRecord) {
      existingRecord.status = normalizedStatus;
      existingRecord.checkInTime = checkInTime;
      existingRecord.notes = notes || existingRecord.notes || "Approved via QR";
      existingRecord.approvedBy = (req as any).user?._id || existingRecord.approvedBy || null;
      existingRecord.approvedByName = ((req as any).user?.firstName || (req as any).user?.name) ? `${(req as any).user?.firstName || ''} ${(req as any).user?.lastName || (req as any).user?.name || ''}`.trim() : existingRecord.approvedByName || '';
      existingRecord.approvedByEmail = (req as any).user?.email || existingRecord.approvedByEmail || '';
      existingRecord.approvedAt = checkInTime;
      existingRecord.approvalNonce = parsedPayload.nonce;
    } else {
      session.attendees.push({
        student: parsedPayload.studentId,
        status: normalizedStatus,
        checkInTime,
        notes: notes || "Approved via QR",
        approvedBy: (req as any).user?._id || null,
        approvedByName: ((req as any).user?.firstName || (req as any).user?.name) ? `${(req as any).user?.firstName || ''} ${(req as any).user?.lastName || (req as any).user?.name || ''}`.trim() : '',
        approvedByEmail: (req as any).user?.email || '',
        approvedAt: checkInTime,
        approvalNonce: parsedPayload.nonce,
      } as any);
    }

    recalculateSessionCounts(session);

    try {
      await session.save();
    } catch (error) {
      await QrOtpModel.updateOne(
        { _id: otpRecord._id, approvalStatus: "processing" },
        { $set: { approvalStatus: "available", claimedAt: null } }
      ).catch(() => {});
      throw error;
    }

    emitSystemEvent("clinicalAttendance.qr.approved", {
      sessionId: session._id.toString(),
      studentId: parsedPayload.studentId,
      status: normalizedStatus,
      supervisorId: (req as any).user?._id?.toString() || null,
      approvedAt: checkInTime.toISOString(),
    });

    const approvalResponse = {
      success: true,
      message: "Attendance approved successfully",
      data: {
        studentId: student._id,
        studentIdNumber: parsedPayload.studentIdNumber,
        sessionId: session._id,
        status: normalizedStatus,
        checkedAt: checkInTime,
      },
    };
    await QrOtpModel.updateOne(
      { _id: otpRecord._id, approvalStatus: "processing" },
      { $set: { approvalStatus: "consumed", approvedBy: requestUser(req)?._id, approvalResponse } }
    );
    res.status(200).json(approvalResponse);
  } catch (error: any) {
    console.error("Error approving QR attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error approving QR attendance",
      error: error.message,
    });
  }
};

export const getStudentClinicalAttendanceContext = async (req: Request, res: Response) => {
  try {
    const studentId = requestUserId(req);
    const student = await User.findById(studentId).select("studentClasses").lean();
    const classId = String((student as any)?.studentClasses ?? "");
    if (!classId) {
      return res.status(200).json({ success: true, data: { assignment: null, activeSession: null, sessions: [] } });
    }

    const schedules = await RotationPlan.find({ class: classId }).select("_id class name postings meta").lean();
    const assignments = resolveStudentClinicalAssignments(schedules, studentId, new Date());
    if (assignments.length > 1) {
      return res.status(409).json({ success: false, message: "Multiple active clinical posting groups are assigned to your account" });
    }
    const assignment = assignments[0] ?? null;
    if (!assignment) {
      return res.status(200).json({ success: true, data: { assignment: null, activeSession: null, sessions: [] } });
    }

    const postingIds = [...new Set([assignment.postingId, assignment.scheduleId].filter(Boolean))];
    const sessions = await ClinicalAttendance.find({
      clinicalRotation: { $in: postingIds },
      $or: [{ expectedStudents: studentId }, { "attendees.student": studentId }],
    })
      .populate([
        { path: "unit", select: "name" },
        { path: "supervisor", select: "firstName lastName name" },
        { path: "attendees.student", select: "firstName lastName" },
      ])
      .sort({ date: -1 });

    for (const session of sessions) {
      await expirePendingAttendancesIfNeeded(session);
    }

    const studentSessions = sessions.map((session: any) => serializeStudentAttendanceSession(session, studentId));

    const now = new Date();
    const activeSession = studentSessions.find((session: any) =>
      session.status === "ongoing" &&
      String(session.supervisorGroupId ?? "") === assignment.groupId &&
      new Date(session.date).toDateString() === now.toDateString() &&
      new Date(session.startTime).getTime() <= now.getTime() &&
      (!session.endTime || new Date(session.endTime).getTime() > now.getTime())
    ) ?? null;

    const { studentIds: _studentIds, ...publicAssignment } = assignment;
    return res.status(200).json({
      success: true,
      data: { assignment: publicAssignment, activeSession, sessions: studentSessions },
    });
  } catch (error: any) {
    console.error("Error fetching student clinical attendance context:", error);
    return res.status(500).json({ success: false, message: "Unable to load your clinical attendance" });
  }
};

export const getStudentAttendanceRecord = async (
  req: Request,
  res: Response
) => {
  try {
    const { academicYear, unit } = req.query;
    const studentId = isStudentRequest(req) ? requestUserId(req) : String(req.query.studentId ?? "");

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
        { path: "supervisor", select: "firstName lastName name" },
      ])
      .sort({ date: -1 });

    for (const session of sessions) {
      await expirePendingAttendancesIfNeeded(session);
    }

    const responseSessions = isStudentRequest(req)
      ? sessions.map((session: any) => serializeStudentAttendanceSession(session, studentId))
      : sessions;

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
        sessions: responseSessions,
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

export const updateStudentAttendanceStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { sessionId, studentId, status, notes } = req.body;

    if (!["present", "absent", "late", "excused", "on-leave", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Unsupported attendance status" });
    }

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

    if (String(session.supervisor) !== requestUserId(req) && String(requestUser(req)?.role ?? "").toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Only the assigned supervisor can update attendance" });
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
    if (["present", "late"].includes(status) && !attendeeRecord.checkInTime) attendeeRecord.checkInTime = new Date();
    if (["absent", "excused", "on-leave", "pending"].includes(status)) attendeeRecord.checkInTime = null;
    attendeeRecord.approvedBy = requestUser(req)?._id ?? attendeeRecord.approvedBy;
    attendeeRecord.approvedAt = new Date();
    recalculateSessionCounts(session);

    await session.save();

    emitSystemEvent("clinicalAttendance.status.updated", {
      sessionId,
      studentId,
      status,
      notes,
    });

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

    if (String(session.supervisor) !== requestUserId(req) && String(requestUser(req)?.role ?? "").toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Only the assigned supervisor can end this session" });
    }

    const existingStudentIds = new Set(session.attendees.map((attendee: any) => String(attendee.student?._id ?? attendee.student)));
    for (const studentId of session.expectedStudents ?? []) {
      if (!existingStudentIds.has(String(studentId))) {
        session.attendees.push({ student: studentId, status: "absent", notes: "Marked absent when session ended" } as any);
      }
    }
    session.attendees.forEach((attendee: any) => {
      if (attendee.status === "pending") {
        attendee.status = "absent";
        attendee.notes = attendee.notes || "Marked absent when session ended";
      }
    });
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

    recalculateSessionCounts(session);

    await session.save();

    emitSystemEvent("clinicalAttendance.session.completed", {
      sessionId,
      durationMinutes: session.duration,
      endTime: session.endTime.toISOString(),
    });

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
        { path: "attendees.student", select: "firstName lastName name inn idNumber email" },
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

    emitSystemEvent("clinicalAttendance.report.generated", {
      academicYear: academicYear?.toString(),
      unit: unit?.toString() || null,
      recordCount: sessions.length,
      format: String(format),
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

    emitSystemEvent("clinicalAttendance.session.deleted", {
      sessionId,
    });

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
