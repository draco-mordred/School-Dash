import { Request, Response } from "express";
import ClinicalAttendance from "../models/clinicalAttendance";
import User from "../models/user";
import Unit from "../models/hospitalUnit";
import AcademicYear from "../models/academicYear";

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
      learningOutcomes,
    } = req.body;

    // Validation
    if (!activityType || !title || !date || !startTime || !unit || !supervisor) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: activityType, title, date, startTime, unit, supervisor",
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

    // Verify unit exists
    const unitExists = await Unit.findById(unit);
    if (!unitExists) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    // Verify academic year exists
    const academicYearExists = await AcademicYear.findById(academicYear);
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
      unit,
      location,
      room,
      supervisor,
      expectedStudents: expectedStudents || [],
      checkInMethod: checkInMethod || "manual",
      requiresApproval: requiresApproval || false,
      clinicalRotation: clinicalRotation || null,
      academicYear,
      learningOutcomes: learningOutcomes || [],
      createdBy: req.userId,
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

    const filter: any = {};

    if (unit) filter.unit = unit;
    if (supervisor) filter.supervisor = supervisor;
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

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
