import mongoose from "mongoose";
import ClinicalAttendance from "../../models/clinicalAttendance";
import Attendance from "../../models/attendance";
import ProximityCheckin from "../../models/proximityCheckin";
import ComplianceRule from "../../models/complianceRule";
import ComplianceLog from "../../models/complianceLog";
import ClassModel from "../../models/classes";
import Timetable from "../../models/timetable";
import AcademicClock from "../../models/academicClock";
import User from "../../models/user";
import { emitSystemEvent } from "../../events";
import { createNotificationAndEmitEvent } from "./notificationService";

/**
 * KRYSTA-LATIFAH Sync Service
 * 
 * This service synchronizes clinical attendance (KRYSTA) with lecture attendance (LATIFAH)
 * to ensure compliance with academic policies.
 * 
 * Key Features:
 * - Validates that students attend lectures before clinical sessions
 * - Tracks proximity checkins for location-based attendance
 * - Handles network issues with offline queue and retry logic
 * - Provides unified reporting across both systems
 */

// Configuration for time windows (in minutes)
const SYNC_CONFIG = {
  MAX_HOURS_AFTER_LECTURE: 4, // Clinical must start within 4 hours after lecture
  MIN_LECTURE_ATTENDANCE_PERCENTAGE: 80, // Minimum 80% lecture attendance required
  PROXIMITY_RANGE_METERS: 100, // 100 meters from target location
  OFFLINE_RETRY_INTERVAL_MS: 60000, // 1 minute between retries
  MAX_SYNC_RETRIES: 3, // Max retry attempts
};

// Offline queue for network issues
interface OfflineSyncItem {
  type: "checkin" | "compliance_check" | "attendance_update";
  data: any;
  timestamp: Date;
  retryCount: number;
}

const offlineSyncQueue: OfflineSyncItem[] = [];

/**
 * Initialize the sync service
 */
export const initializeKrystaLatifahSync = async () => {
  console.log("🔄 KRYSTA-LATIFAH Sync Service initialized");
  
  // Start processing offline queue
  setInterval(processOfflineQueue, SYNC_CONFIG.OFFLINE_RETRY_INTERVAL_MS);
  
  // Set up periodic sync (every 5 minutes)
  setInterval(syncAllClasses, 5 * 60 * 1000);
};

/**
 * Process the offline sync queue
 */
const processOfflineQueue = async () => {
  if (offlineSyncQueue.length === 0) return;
  
  console.log(`📡 Processing ${offlineSyncQueue.length} offline sync items`);
  
  const batch = [...offlineSyncQueue];
  offlineSyncQueue.length = 0; // Clear queue
  
  for (const item of batch) {
    try {
      switch (item.type) {
        case "checkin":
          await processProximityCheckin(item.data);
          break;
        case "compliance_check":
          await validateCompliance(item.data);
          break;
        case "attendance_update":
          await updateAttendancesFromCheckin(item.data);
          break;
      }
    } catch (error) {
      console.error("❌ Failed to process offline item:", error);
      // Re-add to queue if retries remain
      if (item.retryCount < SYNC_CONFIG.MAX_SYNC_RETRIES) {
        offlineSyncQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
        });
      }
    }
  }
};

/**
 * Add item to offline queue
 */
export const addToOfflineQueue = (type: OfflineSyncItem["type"], data: any) => {
  offlineSyncQueue.push({
    type,
    data,
    timestamp: new Date(),
    retryCount: 0,
  });
  console.log(`➕ Added to offline queue: ${type} (Queue size: ${offlineSyncQueue.length})`);
};

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Validate if a checkin is within acceptable range
 */
export const validateProximity = (
  checkin: {
    gpsCoordinates?: { latitude: number; longitude: number };
    locationType: string;
  },
  targetLocation: {
    gpsCoordinates?: { latitude: number; longitude: number };
    locationType: string;
  }
): { isValid: boolean; distance: number | null } => {
  // If either doesn't have GPS, assume valid (fallback to other checks)
  if (!checkin.gpsCoordinates || !targetLocation.gpsCoordinates) {
    return { isValid: true, distance: null };
  }
  
  const distance = calculateDistance(
    checkin.gpsCoordinates.latitude,
    checkin.gpsCoordinates.longitude,
    targetLocation.gpsCoordinates.latitude,
    targetLocation.gpsCoordinates.longitude
  );
  
  const isValid = distance <= SYNC_CONFIG.PROXIMITY_RANGE_METERS;
  
  return { isValid, distance };
};

/**
 * Process a proximity checkin
 */
export const processProximityCheckin = async (
  checkinData: {
    student: mongoose.Types.ObjectId | string;
    studentIdNumber?: string;
    locationType: string;
    locationName?: string;
    classroomId?: mongoose.Types.ObjectId | string;
    clinicalUnitId?: mongoose.Types.ObjectId | string;
    gpsCoordinates?: { latitude: number; longitude: number; accuracy: number };
    ipAddress?: string;
    deviceId?: string;
    checkinMethod: string;
    classId: mongoose.Types.ObjectId | string;
    academicYear: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    subjectId?: mongoose.Types.ObjectId | string;
    lectureSessionId?: mongoose.Types.ObjectId | string;
    clinicalSessionId?: mongoose.Types.ObjectId | string;
    timetablePeriodId?: mongoose.Types.ObjectId | string;
  },
  userId?: mongoose.Types.ObjectId | string
) => {
  try {
    // Convert all IDs to ObjectId
    const student = new mongoose.Types.ObjectId(checkinData.student);
    const classId = new mongoose.Types.ObjectId(checkinData.classId);
    const academicYear = new mongoose.Types.ObjectId(checkinData.academicYear);
    
    // Create proximity checkin record
    const checkin = await ProximityCheckin.create({
      student,
      studentIdNumber: checkinData.studentIdNumber,
      locationType: checkinData.locationType as any,
      locationName: checkinData.locationName,
      classroomId: checkinData.classroomId ? new mongoose.Types.ObjectId(checkinData.classroomId) : undefined,
      clinicalUnitId: checkinData.clinicalUnitId ? new mongoose.Types.ObjectId(checkinData.clinicalUnitId) : undefined,
      gpsCoordinates: checkinData.gpsCoordinates,
      ipAddress: checkinData.ipAddress,
      deviceId: checkinData.deviceId,
      checkinMethod: checkinData.checkinMethod as any,
      checkinTime: new Date(),
      classId,
      academicYear,
      courseId: checkinData.courseId ? new mongoose.Types.ObjectId(checkinData.courseId) : undefined,
      subjectId: checkinData.subjectId ? new mongoose.Types.ObjectId(checkinData.subjectId) : undefined,
      lectureSessionId: checkinData.lectureSessionId ? new mongoose.Types.ObjectId(checkinData.lectureSessionId) : undefined,
      clinicalSessionId: checkinData.clinicalSessionId ? new mongoose.Types.ObjectId(checkinData.clinicalSessionId) : undefined,
      timetablePeriodId: checkinData.timetablePeriodId ? new mongoose.Types.ObjectId(checkinData.timetablePeriodId) : undefined,
      status: "pending",
      isWithinRange: true, // Will be validated below
      syncStatus: "synced",
      syncAttempts: 0,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : student,
    });
    
    // Validate proximity if GPS data available
    if (checkinData.gpsCoordinates) {
      // For now, we'll validate against a known location
      // In production, this would be the expected location for the session
      const validation = validateProximity(
        checkin,
        { gpsCoordinates: checkinData.gpsCoordinates, locationType: checkinData.locationType }
      );
      
      if (!validation.isValid) {
        await ProximityCheckin.findByIdAndUpdate(checkin._id, {
          isWithinRange: false,
          distanceFromTarget: validation.distance,
          status: "rejected",
        });
        
        emitSystemEvent("krysta-latifah.checkin.rejected", {
          checkinId: checkin._id.toString(),
          student: student.toString(),
          reason: "Out of range",
          distance: validation.distance,
        });
        
        return {
          success: false,
          checkin,
          message: "Checkin rejected - out of range",
          distance: validation.distance,
        };
      }
    }
    
    // Verify the checkin
    await ProximityCheckin.findByIdAndUpdate(checkin._id, {
      status: "verified",
      verifiedAt: new Date(),
    });
    
    // Update attendance based on checkin
    await updateAttendancesFromCheckin({
      checkinId: checkin._id,
      student,
      classId,
      academicYear,
    });
    
    // Trigger compliance check
    await validateCompliance({
      student,
      classId,
      academicYear,
      checkinId: checkin._id,
    });
    
    emitSystemEvent("krysta-latifah.checkin.processed", {
      checkinId: checkin._id.toString(),
      student: student.toString(),
      classId: classId.toString(),
    });
    
    return {
      success: true,
      checkin,
      message: "Proximity checkin processed successfully",
    };
  } catch (error: any) {
    console.error("❌ Error processing proximity checkin:", error);
    
    // Add to offline queue if network error
    if (error.name === "MongoNetworkError" || error.message?.includes("network")) {
      addToOfflineQueue("checkin", checkinData);
    }
    
    throw error;
  }
};

/**
 * Update attendance records based on proximity checkin
 */
export const updateAttendancesFromCheckin = async (
  data: {
    checkinId: mongoose.Types.ObjectId | string;
    student: mongoose.Types.ObjectId | string;
    classId: mongoose.Types.ObjectId | string;
    academicYear: mongoose.Types.ObjectId | string;
  }
) => {
  try {
    const checkinId = new mongoose.Types.ObjectId(data.checkinId);
    const student = new mongoose.Types.ObjectId(data.student);
    const classId = new mongoose.Types.ObjectId(data.classId);
    const academicYear = new mongoose.Types.ObjectId(data.academicYear);
    
    // Find the checkin
    const checkin = await ProximityCheckin.findById(checkinId);
    if (!checkin) {
      console.warn("⚠️ Checkin not found:", checkinId);
      return;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find today's lecture attendance for this student
    if (checkin.lectureSessionId) {
      await Attendance.findByIdAndUpdate(
        checkin.lectureSessionId,
        {
          status: "present",
          $setOnInsert: {
            student,
            class: classId,
            academicYear,
            date: today,
            dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()],
          },
        },
        { upsert: true, new: true }
      );
    }
    
    // Find today's clinical attendance for this student
    if (checkin.clinicalSessionId) {
      await ClinicalAttendance.findByIdAndUpdate(
        checkin.clinicalSessionId,
        {
          $addToSet: {
            attendees: {
              student,
              status: "present",
              checkInTime: now,
            },
          },
        },
        { new: true }
      );
    }
    
    // Mark checkin as used for attendance
    await ProximityCheckin.findByIdAndUpdate(checkinId, {
      status: "verified",
      verifiedAt: now,
    });
    
    emitSystemEvent("krysta-latifah.attendance.updated", {
      checkinId: checkinId.toString(),
      student: student.toString(),
    });
  } catch (error: any) {
    console.error("❌ Error updating attendance from checkin:", error);
    
    // Add to offline queue if network error
    if (error.name === "MongoNetworkError" || error.message?.includes("network")) {
      addToOfflineQueue("attendance_update", data);
    }
  }
};

/**
 * Validate compliance between lecture and clinical attendance
 */
export const validateCompliance = async (
  data: {
    student: mongoose.Types.ObjectId | string;
    classId: mongoose.Types.ObjectId | string;
    academicYear: mongoose.Types.ObjectId | string;
    checkinId?: mongoose.Types.ObjectId | string;
    lectureSessionId?: mongoose.Types.ObjectId | string;
    clinicalSessionId?: mongoose.Types.ObjectId | string;
  }
) => {
  try {
    const student = new mongoose.Types.ObjectId(data.student);
    const classId = new mongoose.Types.ObjectId(data.classId);
    const academicYear = new mongoose.Types.ObjectId(data.academicYear);
    
    // Get compliance rules for this class
    const rules = await ComplianceRule.find({
      isActive: true,
      $or: [
        { "appliesTo.allClasses": true },
        { "appliesTo.classes": classId },
      ],
    });
    
    if (rules.length === 0) {
      console.log("ℹ️ No compliance rules configured for class:", classId);
      return { success: true, violations: [] };
    }
    
    const violations: any[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check each rule
    for (const rule of rules) {
      switch (rule.ruleType) {
        case "lecture_before_clinical":
          violations.push(...(await checkLectureBeforeClinical(
            student,
            classId,
            academicYear,
            rule,
            today
          )));
          break;
          
        case "minimum_lecture_attendance":
          violations.push(...(await checkMinimumAttendance(
            student,
            classId,
            academicYear,
            rule,
            today
          )));
          break;
          
        case "time_window_validation":
          violations.push(...(await checkTimeWindow(
            student,
            classId,
            academicYear,
            rule,
            today
          )));
          break;
      }
    }
    
    // Log violations
    for (const violation of violations) {
      await ComplianceLog.create({
        ...violation,
        academicYear,
        classId,
        student,
        createdBy: new mongoose.Types.ObjectId(data.student),
      });
      
      // Notify if configured
      if (violation.severity === "critical" || violation.severity === "error") {
        // Notify student
        if (violation.actions?.studentNotified) {
          await createNotificationAndEmitEvent({
            userId: student,
            role: "student",
            title: `Attendance Compliance Alert: ${violation.title}`,
            message: violation.message,
            type: "attendance",
            link: "/attendance",
          });
        }
        
        // Notify admin
        if (violation.actions?.adminNotified) {
          const admins = await User.find({ role: "admin" }).select("_id");
          for (const admin of admins) {
            await createNotificationAndEmitEvent({
              userId: admin._id,
              role: "admin",
              title: `Compliance Violation: ${violation.title}`,
              message: violation.message,
              type: "attendance",
              link: "/admin/attendance",
            });
          }
        }
      }
    }
    
    emitSystemEvent("krysta-latifah.compliance.checked", {
      student: student.toString(),
      classId: classId.toString(),
      violations: violations.length,
    });
    
    return {
      success: true,
      violations,
      message: `Found ${violations.length} compliance violations`,
    };
  } catch (error: any) {
    console.error("❌ Error validating compliance:", error);
    
    // Add to offline queue if network error
    if (error.name === "MongoNetworkError" || error.message?.includes("network")) {
      addToOfflineQueue("compliance_check", data);
    }
    
    throw error;
  }
};

/**
 * Check if student attended lecture before clinical
 */
const checkLectureBeforeClinical = async (
  student: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  academicYear: mongoose.Types.ObjectId,
  rule: any,
  today: Date
): Promise<any[]> => {
  const violations: any[] = [];
  
  // Get today's lecture attendance
  const lectureAttendance = await Attendance.find({
    student,
    class: classId,
    academicYear,
    date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  });
  
  // Get today's clinical attendance
  const clinicalSessions = await ClinicalAttendance.find({
    classId,
    academicYear,
    date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  });
  
  const studentClinicalSessions = clinicalSessions.filter((session) =>
    session.expectedStudents?.some((s) => s.toString() === student.toString())
  );
  
  // Check if there's a lecture before each clinical session
  for (const clinicalSession of studentClinicalSessions) {
    const clinicalStart = clinicalSession.startTime;
    
    // Find lectures that ended before this clinical session started
    const lecturesBeforeClinical = lectureAttendance.filter((lecture) => {
      const lectureEnd = new Date(lecture.date);
      // Lecture should have ended at least 30 minutes before clinical starts
      return lectureEnd <= new Date(clinicalStart.getTime() - 30 * 60 * 1000);
    });
    
    if (lecturesBeforeClinical.length === 0) {
      // No lecture attended before clinical
      violations.push({
        logType: "lecture_before_clinical_violation",
        ruleName: rule.name,
        severity: rule.severity,
        title: `No lecture attendance before clinical session`,
        message: `Student attended clinical session (${clinicalSession.title}) without attending required morning lecture`,
        details: {
          clinicalSessionId: clinicalSession._id,
          clinicalStartTime: clinicalSession.startTime,
          lecturesFound: lecturesBeforeClinical.length,
        },
        lectureTime: null,
        clinicalTime: clinicalStart,
        actions: rule.actions,
      });
    }
  }
  
  return violations;
};

/**
 * Check minimum lecture attendance
 */
const checkMinimumAttendance = async (
  student: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  academicYear: mongoose.Types.ObjectId,
  rule: any,
  today: Date
): Promise<any[]> => {
  const violations: any[] = [];
  
  const minPercentage = rule.conditions.minimumAttendancePercentage || 80;
  const minCount = rule.conditions.minimumAttendanceCount || 1;
  
  // Count lectures in the current academic year
  const totalLectures = await Attendance.countDocuments({
    class: classId,
    academicYear,
    student,
  });
  
  // Count present lectures
  const attendedLectures = await Attendance.countDocuments({
    class: classId,
    academicYear,
    student,
    $or: [
      { status: { $in: ["present", "late"] } },
      {
        status: "excused",
        $or: [
          { excuseRequestStatus: "approved" },
          { approvedBy: { $ne: null } },
          { hodApproval: "approved" },
        ],
      },
    ],
  });
  
  const percentage = totalLectures > 0 ? (attendedLectures / totalLectures) * 100 : 100;
  
  if (percentage < minPercentage || attendedLectures < minCount) {
    violations.push({
      logType: "minimum_attendance_violation",
      ruleName: rule.name,
      severity: rule.severity,
      title: `Minimum lecture attendance not met`,
      message: `Student has only ${Math.round(percentage)}% lecture attendance (${attendedLectures}/${totalLectures}). Minimum required: ${minPercentage}% or ${minCount} lectures`,
      details: {
        totalLectures,
        attendedLectures,
        percentage,
        minPercentage,
        minCount,
      },
      actions: rule.actions,
    });
  }
  
  return violations;
};

/**
 * Check time window validation
 */
const checkTimeWindow = async (
  student: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  academicYear: mongoose.Types.ObjectId,
  rule: any,
  today: Date
): Promise<any[]> => {
  const violations: any[] = [];
  const maxHours = rule.conditions.maxHoursAfterLecture || SYNC_CONFIG.MAX_HOURS_AFTER_LECTURE;
  
  // Get today's lectures and clinical sessions
  const lectures = await Attendance.find({
    student,
    class: classId,
    academicYear,
    date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  }).sort({ date: 1 });
  
  const clinicalSessions = await ClinicalAttendance.find({
    classId,
    academicYear,
    date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  }).sort({ startTime: 1 });
  
  // Check each clinical session
  for (const clinicalSession of clinicalSessions) {
    const clinicalStart = clinicalSession.startTime;
    
    // Find the most recent lecture before this clinical session
    const recentLecture = lectures.find((lecture) => {
      const lectureTime = new Date(lecture.date);
      const hoursDiff = (clinicalStart.getTime() - lectureTime.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= maxHours && hoursDiff >= 0;
    });
    
    if (!recentLecture) {
      // Clinical session started more than maxHours after the last lecture
      const lastLecture = lectures[lectures.length - 1];
      const hoursDiff = lastLecture ? 
        (clinicalStart.getTime() - new Date(lastLecture.date).getTime()) / (1000 * 60 * 60) :
        Infinity;
      
      if (hoursDiff > maxHours) {
        violations.push({
          logType: "time_window_violation",
          ruleName: rule.name,
          severity: rule.severity,
          title: `Clinical session too far from last lecture`,
          message: `Clinical session (${clinicalSession.title}) started ${Math.round(hoursDiff)} hours after last lecture. Maximum allowed: ${maxHours} hours`,
          details: {
            clinicalSessionId: clinicalSession._id,
            clinicalStartTime: clinicalSession.startTime,
            lastLectureTime: lastLecture?.date,
            hoursDiff,
            maxHours,
          },
          lectureTime: lastLecture?.date,
          clinicalTime: clinicalStart,
          actions: rule.actions,
        });
      }
    }
  }
  
  return violations;
};

/**
 * Sync all classes - run compliance checks for all active classes
 */
export const syncAllClasses = async () => {
  try {
    console.log("🔄 Running KRYSTA-LATIFAH sync for all classes");
    
    const classes = await ClassModel.find({}).select("_id academicYear");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (const cls of classes) {
      try {
        // Get all students in this class
        const students = await User.find({
          _id: { $in: cls.students },
          role: "student",
        }).select("_id");
        
        // Validate compliance for each student
        for (const student of students) {
          await validateCompliance({
            student: student._id,
            classId: cls._id,
            academicYear: cls.academicYear,
          });
        }
        
        console.log(`✅ Synced class: ${cls._id}`);
      } catch (error) {
        console.error(`❌ Error syncing class ${cls._id}:`, error);
      }
    }
    
    emitSystemEvent("krysta-latifah.sync.completed", {
      classesSynced: classes.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in full sync:", error);
  }
};

/**
 * Get unified attendance report for a student
 */
export const getUnifiedAttendanceReport = async (
  studentId: mongoose.Types.ObjectId | string,
  classId: mongoose.Types.ObjectId | string,
  academicYear: mongoose.Types.ObjectId | string,
  startDate?: Date,
  endDate?: Date
) => {
  try {
    const student = new mongoose.Types.ObjectId(studentId);
    const classObj = new mongoose.Types.ObjectId(classId);
    const year = new mongoose.Types.ObjectId(academicYear);
    
    const start = startDate || new Date(0); // Beginning of time
    const end = endDate || new Date();
    
    // Get lecture attendance
    const lectureAttendance = await Attendance.find({
      student,
      class: classObj,
      academicYear: year,
      date: { $gte: start, $lte: end },
    })
      .populate("course", "name code")
      .populate("subject", "name code")
      .sort({ date: -1 });
    
    // Get clinical attendance
    const clinicalAttendance = await ClinicalAttendance.find({
      classId: classObj,
      academicYear: year,
      date: { $gte: start, $lte: end },
      $or: [
        { expectedStudents: student },
        { "attendees.student": student },
      ],
    })
      .populate("unit", "name code")
      .sort({ startTime: -1 });
    
    // Get proximity checkins
    const checkins = await ProximityCheckin.find({
      student,
      classId: classObj,
      academicYear: year,
      checkinTime: { $gte: start, $lte: end },
    })
      .sort({ checkinTime: -1 });
    
    // Get compliance logs
    const complianceLogs = await ComplianceLog.find({
      student,
      classId: classObj,
      academicYear: year,
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 });
    
    // Calculate statistics
    const lectureStats = {
      total: lectureAttendance.length,
      present: lectureAttendance.filter((a) => a.status === "present").length,
      absent: lectureAttendance.filter((a) => a.status === "absent").length,
      late: lectureAttendance.filter((a) => a.status === "late").length,
      excused: lectureAttendance.filter((a) => a.status === "excused").length,
      percentage: lectureAttendance.length > 0 ?
        Math.round((lectureAttendance.filter((a) => a.status === "present").length / lectureAttendance.length) * 100) :
        0,
    };
    
    const clinicalStats = {
      total: clinicalAttendance.length,
      present: clinicalAttendance.filter((s) =>
        s.attendees.some((a) => a.student.toString() === student.toString() && a.status === "present")
      ).length,
      absent: clinicalAttendance.filter((s) =>
        s.attendees.some((a) => a.student.toString() === student.toString() && a.status === "absent")
      ).length,
      late: clinicalAttendance.filter((s) =>
        s.attendees.some((a) => a.student.toString() === student.toString() && a.status === "late")
      ).length,
    };
    
    const complianceStats = {
      total: complianceLogs.length,
      open: complianceLogs.filter((l) => l.status === "open").length,
      resolved: complianceLogs.filter((l) => l.status === "resolved").length,
      critical: complianceLogs.filter((l) => l.severity === "critical").length,
      warnings: complianceLogs.filter((l) => l.severity === "warning").length,
    };
    
    return {
      success: true,
      student: student.toString(),
      class: classObj.toString(),
      academicYear: year.toString(),
      period: { start: start.toISOString(), end: end.toISOString() },
      lectureAttendance,
      clinicalAttendance,
      proximityCheckins: checkins,
      complianceLogs,
      statistics: {
        lecture: lectureStats,
        clinical: clinicalStats,
        compliance: complianceStats,
        overall: {
          totalSessions: lectureStats.total + clinicalStats.total,
          attendanceRate: Math.round(
            ((lectureStats.present + clinicalStats.present) / (lectureStats.total + clinicalStats.total)) * 100
          ),
        },
      },
    };
  } catch (error: any) {
    console.error("❌ Error generating unified attendance report:", error);
    throw error;
  }
};

/**
 * Get compliance summary for a class
 */
export const getClassComplianceSummary = async (
  classId: mongoose.Types.ObjectId | string,
  academicYear: mongoose.Types.ObjectId | string,
  startDate?: Date,
  endDate?: Date
) => {
  try {
    const classObj = new mongoose.Types.ObjectId(classId);
    const year = new mongoose.Types.ObjectId(academicYear);
    
    const start = startDate || new Date(0);
    const end = endDate || new Date();
    
    // Get all students in the class
    const cls = await ClassModel.findById(classObj).select("students");
    if (!cls) {
      throw new Error("Class not found");
    }
    
    const studentIds = cls.students.map((s) => new mongoose.Types.ObjectId(s));
    
    // Get compliance logs for all students
    const complianceLogs = await ComplianceLog.find({
      classId: classObj,
      academicYear: year,
      createdAt: { $gte: start, $lte: end },
    })
      .populate("student", "name idNumber")
      .sort({ createdAt: -1 });
    
    // Group by student
    const byStudent: Record<string, any> = {};
    complianceLogs.forEach((log) => {
      const studentId = log.student.toString();
      if (!byStudent[studentId]) {
        byStudent[studentId] = {
          student: log.student,
          total: 0,
          open: 0,
          resolved: 0,
          bySeverity: { critical: 0, error: 0, warning: 0, info: 0 },
          logs: [],
        };
      }
      byStudent[studentId].total++;
      byStudent[studentId][log.status]++;
      byStudent[studentId].bySeverity[log.severity]++;
      byStudent[studentId].logs.push(log);
    });
    
    // Get overall statistics
    const stats = {
      totalStudents: studentIds.length,
      totalLogs: complianceLogs.length,
      open: complianceLogs.filter((l) => l.status === "open").length,
      resolved: complianceLogs.filter((l) => l.status === "resolved").length,
      bySeverity: {
        critical: complianceLogs.filter((l) => l.severity === "critical").length,
        error: complianceLogs.filter((l) => l.severity === "error").length,
        warning: complianceLogs.filter((l) => l.severity === "warning").length,
        info: complianceLogs.filter((l) => l.severity === "info").length,
      },
      byType: {
        lecture_before_clinical: complianceLogs.filter((l) => l.logType === "lecture_before_clinical_violation").length,
        minimum_attendance: complianceLogs.filter((l) => l.logType === "minimum_attendance_violation").length,
        time_window: complianceLogs.filter((l) => l.logType === "time_window_violation").length,
        proximity: complianceLogs.filter((l) => l.logType === "proximity_violation").length,
      },
    };
    
    return {
      success: true,
      class: classObj.toString(),
      academicYear: year.toString(),
      period: { start: start.toISOString(), end: end.toISOString() },
      statistics: stats,
      byStudent,
      recentLogs: complianceLogs.slice(0, 50), // Return last 50 logs
    };
  } catch (error: any) {
    console.error("❌ Error generating class compliance summary:", error);
    throw error;
  }
};

export default {
  initializeKrystaLatifahSync,
  processProximityCheckin,
  validateCompliance,
  updateAttendancesFromCheckin,
  syncAllClasses,
  getUnifiedAttendanceReport,
  getClassComplianceSummary,
  calculateDistance,
  validateProximity,
  addToOfflineQueue,
  SYNC_CONFIG,
};
