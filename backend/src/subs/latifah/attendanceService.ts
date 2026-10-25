
import { type Request, type Response } from "express";
import mongoose from "mongoose";
import Attendance from "../../models/attendance";
import Course from "../../models/courses";
import User from "../../models/user";
import { logActivity } from "../../utils/activitieslog";
import { inngest } from "../../inngest";
import Class from "../../models/classes";
import { createNotificationAndEmitEvent } from "../tinasha/notificationService";
import { emitSystemEvent, subscribeSystemEvent } from "../../events";
import { AttendanceGenerationError, generateSessionRecords } from "./attendanceGeneration";

export {
  AttendanceGenerationError,
  generateSessionRecords,
  validateAttendanceGenerationInput,
} from "./attendanceGeneration";

// Thin HTTP wrapper around the shared generation core (see attendanceGeneration.ts).
// Kept as the direct fallback used in local development when Inngest is unavailable.
export const generateAttendanceForClassSession = async (req: Request, res: Response) => {
  try {
    const result = await generateSessionRecords({
      ...(req.body as any),
      requesterId: (req as any).user?._id?.toString(),
    });
    res
      .status(201)
      .json({ message: result.message, attendanceRecords: result.attendanceRecords });
  } catch (error: any) {
    if (error instanceof AttendanceGenerationError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const recordAttendance = async (req: Request, res: Response) => {
  try {
    const { student, course, class: classId, academicYear, status, notes, subject: subjectId, date } = req.body;
    const lecturer = (req as any).user._id;

    if (!student || !course || !classId || !academicYear || !status) {
      return res.status(400).json({ message: "Missing required attendance fields." });
    }

    // Keep manual records consistent with generated ones: store the subject
    // (when provided) and always derive dayOfWeek so week/subject views include them.
    const dateObj = date ? new Date(date) : new Date();
    const dayMap: Record<number, string> = {
      0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
      4: "Thursday", 5: "Friday", 6: "Saturday",
    };
    const dayName = dayMap[dateObj.getDay()];

    const record = await Attendance.create({
      student,
      lecturer,
      course,
      ...(subjectId ? { subject: subjectId } : {}),
      class: classId,
      academicYear,
      date: dateObj,
      dayOfWeek: dayName,
      status,
      notes,
    });

    await logActivity({
      userId: lecturer,
      action: "Recorded attendance",
      details: `Attendance for student ${student} on ${new Date(record.date).toDateString()} set to ${status}`,
    });

    emitSystemEvent("attendance.recorded", {
      attendanceId: String(record._id),
      student: String(student),
      lecturer: String(lecturer),
      course: String(course),
      status,
      date: record.date.toISOString(),
    });

    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getMyAttendanceSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const requestedPage = Number.parseInt(String(req.query.page ?? "1"), 10);
    const requestedLimit = Number.parseInt(String(req.query.limit ?? "50"), 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;

    if (userRole === "student") {
      const stats = await Attendance.aggregate([
        { $match: { student: userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const attendedExpression = {
        $or: [
          { $in: ["$status", ["present", "late"]] },
          {
            $and: [
              { $eq: ["$status", "excused"] },
              {
                $or: [
                  { $eq: ["$excuseRequestStatus", "approved"] },
                  { $ne: [{ $ifNull: ["$approvedBy", null] }, null] },
                  { $eq: ["$hodApproval", "approved"] },
                ],
              },
            ],
          },
        ],
      };
      const [attendanceSummary, total] = await Promise.all([
        Attendance.aggregate([
          { $match: { student: userId } },
          {
            $group: {
              _id: { course: "$course", subject: "$subject" },
              totalSessions: { $sum: 1 },
              attendedSessions: {
                $sum: { $cond: [attendedExpression, 1, 0] },
              },
              lastAttendanceDate: { $max: "$date" },
            },
          },
        ]),
        Attendance.countDocuments({ student: userId }),
      ]);

      const courseIds = [...new Set(attendanceSummary.map((item: any) => String(item._id.course)))];
      const courses = await Course.find({ _id: { $in: courseIds } })
        .select("name code subjects")
        .lean();
      const coursesById = new Map(courses.map((course: any) => [String(course._id), course]));

      const records = await Attendance.find({ student: userId })
        .populate("course", "name code courseID subjects")
        .populate("subject", "name code subjectID subjectUID")
        .populate("class", "name")
        .populate("lecturer", "name email")
        .populate("approvedBy", "name email")
        .populate("excuseReviewedBy", "name email")
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const subjectSummary = attendanceSummary.map((item: any) => {
        const course = coursesById.get(String(item._id.course));
        const subject = course?.subjects?.find(
          (candidate: any) => String(candidate._id) === String(item._id.subject),
        );
        return {
          courseId: String(item._id.course),
          subjectId: item._id.subject ? String(item._id.subject) : null,
          courseName: course?.name ?? "Unassigned course",
          courseCode: course?.code,
          subjectName: subject?.name ?? (item._id.subject ? "Unassigned subject" : "Unassigned subject"),
          totalSessions: item.totalSessions,
          attendedSessions: item.attendedSessions,
          lastAttendanceDate: item.lastAttendanceDate,
        };
      });

      res.json({
        stats,
        records,
        total,
        page,
        limit,
        subjectSummary,
      });
      return;
    }

    const filter = userRole === "admin" ? {} : { lecturer: userId };

    const stats = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const records = await Attendance.find(filter)
      .populate("course", "name code courseID subjects")
      .populate("subject", "name code subjectID subjectUID")
      .populate("class", "name")
      .populate("student", "name idNumber email")
      .populate("lecturer", "name email")
      .populate("approvedBy", "name email")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Attendance.countDocuments(filter);
    res.json({ stats, records, total, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getStudentAttendanceSummary = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const stats = await Attendance.aggregate([
      { $match: { student: studentId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const records = await Attendance.find({ student: studentId })
      .populate("course", "name code courseID subjects")
      .populate("subject", "name code subjectID subjectUID")
      .populate("class", "name")
      .populate("lecturer", "name email")
      .sort({ date: -1 })
      .limit(50);

    res.json({ stats, records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getStudentNotificationsSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const user = await import("../../models/user").then(m => m.default.findById(userId).select("studentClasses name"));
    const classId = user?.studentClasses;
    if (!classId) {
      return res.json({ className: null, academicYear: null, timetable: [], todayLectures: [], totalAttended: 0, totalClasses: 0, percentage: 0, weeklyAlerts: [] });
    }

    const ClassModel = (await import("../../models/classes")).default;
    const Timetable = (await import("../../models/timetable")).default;

    const cls = await ClassModel.findById(classId).populate("academicYear", "name").select("name academicYear");
    const timetable = await Timetable.findOne({ class: classId }).select("schedule");

    const dayMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = dayMap[new Date().getDay()];

    const todaySchedule = timetable?.schedule.find((s: any) => s.day === todayName);
    const todayLectures = (todaySchedule?.periods ?? []).map((p: any) => ({
      subject: (p as any).subject,
      lecturer: (p as any).lecturer,
      startTime: (p as any).startTime,
      endTime: (p as any).endTime,
    }));

    const subjectIds = new Set<string>();
    const lecturerIds = new Set<string>();
    const addIdsFromPeriods = (periods: any[]) => {
      for (const p of periods || []) {
        if (p?.subject) subjectIds.add(String(p.subject));
        if (p?.lecturer) lecturerIds.add(String(p.lecturer));
      }
    };
    addIdsFromPeriods(todaySchedule?.periods ?? []);
    for (const s of (timetable?.schedule ?? [])) addIdsFromPeriods(s.periods ?? []);

    const subjectsArr = subjectIds.size ? await Course.find({ _id: { $in: Array.from(subjectIds) } }).select("name") : [];
    const lecturersArr = lecturerIds.size ? await User.find({ _id: { $in: Array.from(lecturerIds) } }).select("name") : [];
    const subjMap = new Map(subjectsArr.map((c: any) => [String(c._id), { _id: c._id, name: c.name }]));
    const lectMap = new Map(lecturersArr.map((u: any) => [String(u._id), { _id: u._id, name: u.name }]));

    const resolvePeriod = (p: any) => ({
      subject: p?.subject && subjMap.get(String(p.subject)) ? subjMap.get(String(p.subject)) : p.subject,
      lecturer: p?.lecturer && lectMap.get(String(p.lecturer)) ? lectMap.get(String(p.lecturer)) : p.lecturer,
      startTime: p?.startTime,
      endTime: p?.endTime,
    });

    const resolvedTodayLectures = (todaySchedule?.periods ?? []).map(resolvePeriod);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const weekAttendance = await Attendance.find({
      student: userId,
      date: { $gte: monday, $lte: friday },
    }).select("status course date dayOfWeek lecturer");

    // Attended = present + late (matches the overview KPI rule; excused is tracked separately)
    const totalAttended = await Attendance.countDocuments({ student: userId, status: { $in: ["present", "late"] } });
    const totalClasses = await Attendance.countDocuments({ student: userId });

    const attendanceMap = new Map<string, string>();
    weekAttendance.forEach((a: any) => {
      const key = `${a.course?._id ?? a.course}-${a.dayOfWeek}`;
      attendanceMap.set(key, a.status);
    });

    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const weeklyAlerts = weekDays.map((day) => {
      const daySchedule = timetable?.schedule.find((s: any) => s.day === day);
      const lectures = (daySchedule?.periods ?? []).map((p: any) => {
        const key = `${(p as any).subject?._id ?? (p as any).subject}-${day}`;
        const resolved = resolvePeriod(p);
        return {
          subject: resolved.subject,
          lecturer: resolved.lecturer,
          startTime: resolved.startTime,
          endTime: resolved.endTime,
          status: attendanceMap.get(key) ?? null,
        };
      });
      return { day, lectures };
    });

    res.json({
      className: cls?.name ?? null,
      academicYear: cls?.academicYear?.name ?? null,
      timetable: timetable?.schedule ?? [],
      todayDay: todayName,
      todayLectures: resolvedTodayLectures,
      totalAttended,
      totalClasses,
      percentage: totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0,
      weeklyAlerts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getCourseClassAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    // Role-aware scoping: admins see institution-wide data, others only their own records
    const filter = (req as any).user.role === "admin" ? {} : { lecturer: userId };
    const summary = await Attendance.aggregate([
      { $match: filter },
      { $group: {
        _id: { course: "$course", class: "$class" },
        present: {
          $sum: {
            $cond: [{ $eq: ["$status", "present"] }, 1, 0],
          },
        },
        absent: {
          $sum: {
            $cond: [{ $eq: ["$status", "absent"] }, 1, 0],
          },
        },
        late: {
          $sum: {
            $cond: [{ $eq: ["$status", "late"] }, 1, 0],
          },
        },
        excused: {
          $sum: {
            $cond: [{ $eq: ["$status", "excused"] }, 1, 0],
          },
        },
      }},
      {
        $lookup: {
          from: "courses",
          localField: "_id.course",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      { 
        $lookup: {
          from: "classes",
          localField: "_id.class",
          foreignField: "_id",
          as: "class",
        },
      },
      { $unwind: "$class" },
      { $project: { _id: 0, course: 1, class: 1, present: 1, absent: 1, late: 1, excused: 1 } },
    ]);

    const formattedSummary = summary.map((item: any) => ({
      courseName: item.course.name,
      className: item.class.name,
      present: item.present,
      absent: item.absent,
      late: item.late,
      excused: item.excused,
    }));
    return res.json(formattedSummary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const approveExcusedAbsence = async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const userId = (req as any).user._id;
    const { decision, reviewNote = "" } = req.body ?? {};
    const attendanceRecord = await Attendance.findById(attendanceId);

    if (!attendanceRecord) {
      return res.status(404).json({ message: "Attendance record not found" });
    };
    const normalizedDecision = decision ?? "approved";
    if (!["approved", "rejected"].includes(normalizedDecision)) {
      return res.status(400).json({ message: "decision must be approved or rejected" });
    }
    if (normalizedDecision === "rejected" && attendanceRecord.excuseRequestStatus !== "pending") {
      return res.status(400).json({ message: "Only pending excuse requests can be rejected" });
    }
    if (
      normalizedDecision === "approved" &&
      attendanceRecord.excuseRequestStatus !== "pending" &&
      attendanceRecord.status !== "excused"
    ) {
      return res.status(400).json({ message: "Only pending requests or excused absences can be approved" });
    }
    attendanceRecord.approvedBy = userId;
    attendanceRecord.hodApproval = "approved";
    attendanceRecord.hodApprovalDate = new Date();
    await attendanceRecord.save();
    await logActivity({
      userId,
      action: normalizedDecision === "approved" ? "Approved excused absence" : "Rejected excused absence",
      details: `${normalizedDecision === "approved" ? "Approved" : "Rejected"} excused absence for attendance record ID: ${attendanceId}`,
    });
    res.json({ message: `Excuse request ${normalizedDecision}`, attendanceRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  };
};

export const requestExcusedAbsence = async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const userId = (req as any).user._id;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason || reason.length > 1000) {
      return res.status(400).json({ message: "A reason of 1 to 1000 characters is required" });
    }

    const attendanceRecord = await Attendance.findOne({
      _id: attendanceId,
      student: userId,
    });
    if (!attendanceRecord) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    if (attendanceRecord.status !== "absent") {
      return res.status(400).json({ message: "Only absences can be submitted for excuse approval" });
    }
    if (attendanceRecord.excuseRequestStatus === "pending") {
      return res.status(409).json({ message: "An excuse request is already pending" });
    }

    attendanceRecord.excuseRequestStatus = "pending";
    attendanceRecord.excuseReason = reason;
    attendanceRecord.excuseReviewNote = "";
    attendanceRecord.excuseReviewedBy = null;
    attendanceRecord.excuseReviewedAt = null;
    attendanceRecord.hodApproval = null;
    attendanceRecord.hodApprovalDate = null;
    await attendanceRecord.save();
    await logActivity({
      userId,
      action: "Requested excused absence",
      details: `Submitted an excuse request for attendance record ID: ${attendanceId}`,
    });
    res.status(201).json({ message: "Excuse request submitted", attendanceRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getPendingExcuseRequests = async (_req: Request, res: Response) => {
  try {
    const records = await Attendance.find({ excuseRequestStatus: "pending" })
      .populate("student", "name email idNumber")
      .populate("course", "name code")
      .populate("subject", "name code subjectID subjectUID")
      .populate("class", "name")
      .populate("lecturer", "name email")
      .sort({ updatedAt: 1 })
      .limit(100);
    res.json({ records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getStudentAttendanceRecords = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, status, page = 1, limit = 20 } = req.query;
    const filter: any = { student: studentId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }
    if (status) {
      filter.status = status;
    }

    const records = await Attendance.find(filter)
      .populate("course", "name code courseID subjects")
      .populate("subject", "name code subjectID subjectUID")
      .populate("class", "name")
      .populate("lecturer", "name email")
      .sort({ date: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await Attendance.countDocuments(filter);

    res.json({ records, total, page: +page, limit: +limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  };
};

export const getClassSessionAttendance = async (req: Request, res: Response) => {
  try {
    const { classId, courseId, date, subjectId } = req.query;
    if (!classId || !courseId || !date) {
      res.status(400).json({ message: "classId, courseId, and date are required." });
      return;
    }
    const dateObj = new Date(date as string);
    dateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const filter: any = {
      class: classId,
      course: courseId,
      date: { $gte: dateObj, $lt: nextDay },
    };
    if (subjectId) {
      filter.subject = subjectId;
    }

    const records = await Attendance.find(filter)
      .populate("student", "name email idNumber")
      .populate("course", "name code subjects.subjectID")
      .populate("subject", "name code subjectID subjectUID")
      .populate("class", "name")
      .populate("lecturer", "name email")
      .sort({ "student.name": 1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const bulkUpdateAttendance = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ message: "updates array is required." });
      return;
    }
    const userId = (req as any).user._id;
    const results = await Promise.all(
      updates.map(async ({ attendanceId, status, notes, lecturerApproval, hodApproval }: { attendanceId: string; status?: string; notes?: string; lecturerApproval?: "approved" | "not-approved"; hodApproval?: "approved" | "not-approved" }) => {
        const existing = await Attendance.findById(attendanceId);
        if (!existing) return null;
        const updateData: any = {};
        if (status !== undefined) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (lecturerApproval !== undefined) {
          updateData.lecturerApproval = lecturerApproval;
          updateData.lecturerApprovalDate = new Date();
        }
        if (hodApproval !== undefined) {
          updateData.hodApproval = hodApproval;
          updateData.hodApprovalDate = new Date();
          // Keep the student-visible approval state (approvedBy) in sync:
          // the student view reads approvedBy, not hodApproval.
          if (hodApproval === "approved") {
            updateData.approvedBy = userId;
          } else {
            updateData.approvedBy = null;
          }
        }
        const record = await Attendance.findByIdAndUpdate(
          attendanceId,
          updateData,
          { returnDocument: 'after', runValidators: true }
        );
        if (record && status !== undefined && existing.status !== status) {
          emitSystemEvent("attendance.status.changed", {
            attendanceId: String(record._id),
            student: String(record.student ?? ""),
            course: String(record.course ?? ""),
            date: record.date instanceof Date ? record.date.toISOString() : String(record.date ?? ""),
            previousStatus: String(existing.status ?? ""),
            status,
          });
        }
        return record;
      })
    );
    await logActivity({
      userId,
      action: "Bulk updated attendance statuses",
      details: `Updated ${results.length} attendance record(s)`,
    });
    res.json({ message: "Attendance updated", results });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const triggerAttendanceGeneration = async (req: Request, res: Response) => {
  try {
    const { courseId, classId, academicYearId, date, subjectId } = req.body;
    if (!courseId || !classId || !academicYearId || !date || !subjectId) {
      res.status(400).json({ message: "courseId, classId, academicYearId, subjectId, and date are required." });
      return;
    }

    const localDevNoInngest = process.env.NODE_ENV !== "production" && !process.env.INNGEST_EVENT_KEY;
    if (localDevNoInngest) {
      console.warn("Skipping Inngest in local development because INNGEST_EVENT_KEY is not set.");
      return await generateAttendanceForClassSession(req, res);
    }

    const userId = (req as any).user._id?.toString();
    await inngest.send({
      name: "attendance/generate",
      data: { courseId, classId, academicYearId, date, subjectId, userId },
    });

    res.status(202).json({ message: "Attendance generation started.", status: "processing" });
  } catch (error: any) {
    const errorString = typeof error?.message === "string" ? error.message : JSON.stringify(error);
    const shouldFallback =
      process.env.NODE_ENV !== "production" &&
      (!process.env.INNGEST_EVENT_KEY ||
        error?.code === "ConnectionRefused" ||
        String(error?.path || "").includes("8288") ||
        /NO_EVENT_KEY_SET|ECONNREFUSED|ConnectionRefused|connect.*8288/i.test(errorString));

    if (shouldFallback) {
      console.warn("Inngest unavailable, falling back to direct attendance generation.", error);
      return await generateAttendanceForClassSession(req, res);
    }

    console.error("Attendance generation failed:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const checkTimetableExists = async (req: Request, res: Response) => {
  try {
    const { classId, academicYearId } = req.query;
    if (!classId || !academicYearId) {
      res.status(400).json({ message: "classId and academicYearId are required." });
      return;
    }
    const Timetable = (await import("../../models/timetable")).default;
    const timetable = await Timetable.findOne({
      class: classId,
      academicYear: academicYearId,
    }).select("_id");

    res.json({ exists: !!timetable });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteAttendanceSession = async (req: Request, res: Response) => {
  try {
    const { classId, courseId, date, subjectId } = req.query;
    if (!classId || !courseId || !date) {
      res.status(400).json({ message: "classId, courseId, and date are required." });
      return;
    }
    const dateObj = new Date(date as string);
    dateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const filter: any = {
      class: classId,
      course: courseId,
      date: { $gte: dateObj, $lt: nextDay },
    };
    if (subjectId) {
      filter.subject = subjectId;
    }

    const result = await Attendance.deleteMany(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No attendance records found for the requested session." });
    }

    await logActivity({
      userId: (req as any).user._id,
      action: "Deleted attendance session",
      details: `Deleted ${result.deletedCount} attendance record(s) for class ${classId}, course ${courseId}, date ${new Date(date as string).toDateString()}${subjectId ? `, subject ${subjectId}` : ""}`,
    });

    res.json({ message: "Attendance session deleted", deletedCount: result.deletedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteAttendanceRecords = async (req: Request, res: Response) => {
  try {
    const { attendanceIds } = req.body;
    if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return res.status(400).json({ message: "attendanceIds array is required." });
    }

    const result = await Attendance.deleteMany({ _id: { $in: attendanceIds } });
    await logActivity({
      userId: (req as any).user._id,
      action: "Deleted attendance records",
      details: `Deleted ${result.deletedCount} attendance record(s).`,
    });
    res.json({ message: "Attendance records deleted", deletedCount: result.deletedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getAllAttendanceLists = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { classId, courseId, date } = req.query;

    const filter: any = {};
    if (classId) filter.class = classId;
    if (courseId) filter.course = courseId;
    if (date) {
      const dateObj = new Date(date as string);
      dateObj.setHours(0, 0, 0, 0);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: dateObj, $lt: nextDay };
    }

    if (userRole !== "admin") {
      filter.lecturer = userId;
    }

    const records = await Attendance.find(filter)
      .populate("course", "name code courseID subjects")
      .populate("subject", "name code subjectID subjectUID")
      .populate("class", "name")
      .populate("student", "name idNumber email")
      .populate("lecturer", "name email")
      .populate("approvedBy", "name email")
      .sort({ date: -1 });

    const enrichedRecords = records.map((record: any) => {
      const courseDoc = record.course;
      const subjectId = record.subject ? String(record.subject) : "";
      const matchingSubject = courseDoc?.subjects?.find((subject: any) => {
        return (
          String(subject?._id) === subjectId ||
          String(subject?.subjectUID) === subjectId ||
          String(subject?.subjectID) === subjectId ||
          String(subject?.code ?? "") === subjectId
        );
      });

      const resolvedSubject = matchingSubject
        ? {
            _id: matchingSubject._id,
            name: matchingSubject.name,
            code: matchingSubject.code,
            subjectID: matchingSubject.subjectID,
            subjectUID: matchingSubject.subjectUID,
          }
        : null;

      const subjectName = resolvedSubject?.name || (record.subject && typeof record.subject === "object" ? record.subject.name : null) || "Untitled subject";
      const courseName = courseDoc?.name || "Attendance session";
      const dateLabel = new Date(record.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return {
        ...record.toObject(),
        subject: resolvedSubject || record.subject,
        sessionName: `${courseName} • ${subjectName} • ${dateLabel}`,
      };
    });

    res.json({ records: enrichedRecords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getSubjectsAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    // Role-aware scoping: admins see institution-wide data, others only their own records
    const filter = (req as any).user.role === "admin" ? {} : { lecturer: userId };
    const summary = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$course",
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      { 
        $project: {
          _id: 1,
          subject: [{ name: "$course.name", code: "$course.code" }],
          present: 1,
          absent: 1,
          late: 1,
          excused: 1,
        },
      },
    ]);

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getClassesAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const ClassModel = (await import("../../models/classes")).default;
    const Timetable = (await import("../../models/timetable")).default;

    const classes = await ClassModel.find()
      .populate("academicYear", "name")
      .select("name academicYear courses")
      .sort({ name: 1 });

    // Batched: one timetable query + one aggregation instead of N x 2 queries
    const [timetables, attendanceStats] = await Promise.all([
      Timetable.find({ class: { $in: classes.map((cls: any) => cls._id) } }).select("class"),
      Attendance.aggregate([
        {
          $group: {
            _id: { class: "$class", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const timetableClassIds = new Set(timetables.map((t: any) => String(t.class)));
    const statsByClass = new Map<string, Record<string, number>>();
    attendanceStats.forEach((s: any) => {
      const key = String(s._id.class);
      if (!statsByClass.has(key)) statsByClass.set(key, {});
      statsByClass.get(key)![s._id.status] = s.count;
    });

    const classesWithStatus = classes.map((cls: any) => {
      const statusMap = statsByClass.get(String(cls._id)) ?? {};
      return {
        classId: cls._id,
        className: cls.name,
        academicYear: cls.academicYear?.name ?? "N/A",
        timetableStatus: timetableClassIds.has(String(cls._id)) ? "active" : "not set",
        present: statusMap.present ?? 0,
        absent: statusMap.absent ?? 0,
        late: statusMap.late ?? 0,
        excused: statusMap.excused ?? 0,
      };
    });

    res.json({ classes: classesWithStatus });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getWeeklyCourseAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const matchFilter: any = {
      date: { $gte: monday, $lte: friday },
    };
    if (userRole !== "admin") {
      matchFilter.lecturer = userId;
    }

    const raw = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            course: "$course",
            dayOfWeek: "$dayOfWeek",
          },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id.course",
          foreignField: "_id",
          as: "courseDoc",
        },
      },
      { $unwind: "$courseDoc" },
      {
        $project: {
          _id: 0,
          courseId: "$_id.course",
          courseName: "$courseDoc.name",
          courseCode: "$courseDoc.code",
          dayOfWeek: "$_id.dayOfWeek",
          present: 1,
          absent: 1,
          late: 1,
          excused: 1,
        },
      },
      { $sort: { courseName: 1, dayOfWeek: 1 } },
    ]);

    res.json({ records: raw, weekStart: monday.toISOString(), weekEnd: friday.toISOString() });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



// ── TINASHA wiring: student notifications for attendance events ──
// Notifies a student when they are marked absent or excused.
// createNotificationIfUnique has a 5-minute duplicate window, so toggling
// a status back and forth will not spam the student.
const notifyStudentOfAttendance = async (payload: {
  student?: string;
  course?: string;
  status?: string;
  date?: string;
}) => {
  const { student, course, status, date } = payload;
  if (!student) return;
  if (status !== "absent" && status !== "excused") return;

  let courseLabel = "your class";
  if (course) {
    try {
      const courseDoc = await Course.findById(course).select("name code");
      if (courseDoc) courseLabel = courseDoc.name ?? courseDoc.code ?? courseLabel;
    } catch {
      // fall back to the generic label
    }
  }

  const dateLabel = date ? new Date(date).toDateString() : new Date().toDateString();

  await createNotificationAndEmitEvent({
    userId: new mongoose.Types.ObjectId(student),
    role: "student",
    title: status === "absent" ? "Marked absent" : "Excused absence recorded",
    message: `You were marked ${status} for ${courseLabel} on ${dateLabel}. If this is incorrect, contact your lecturer.`,
    type: "attendance",
    link: "/attendance",
  });
};

subscribeSystemEvent("attendance.recorded", async (payload) => {
  try {
    await notifyStudentOfAttendance(payload.data as any);
  } catch (error) {
    console.error("attendance.recorded handler failed:", error);
  }
});

subscribeSystemEvent("attendance.status.changed", async (payload) => {
  try {
    await notifyStudentOfAttendance(payload.data as any);
  } catch (error) {
    console.error("attendance.status.changed handler failed:", error);
  }
});
