import { type Request, type Response } from "express";
import Attendance from "../models/attendance";
import Course from "../models/courses";
import User from "../models/user";
import { logActivity } from "../utils/activitieslog";
import { inngest } from "../inngest";

//Fisrt we need to generate an Attendance for a class so that the teacher can record attendance for that class session, then we can update the attendance records for each student in that class session. We also need to implement a way to approve excused absences, and to get attendance records for a specific student, with pagination and filtering by date range and status (present, absent, late, excused). This should be consistent wtth the getMyAttendanceSummary controller, but with more detailed records and pagination support. The endpoint should be GET /api/attendance/student/:studentId?startDate=&endDate=&status=&page=&limit=
// Request should be sent to inngest to biuld the attendance sheet

// @ desc Generate attendance records for a class session
// @ route POST /api/attendance/generate
// @ access Private (Teacher/Admin)
export const generateAttendanceForClassSession = async (req: Request, res: Response) => {
  try {
    const { courseId, classId, academicYearId, date } = req.body;
    const lecturer = (req as any).user._id;
    if (!courseId || !classId || !academicYearId || !date) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    const dateObj = new Date(date);
    const dayMap: Record<number, string> = {
      0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
      4: "Thursday", 5: "Friday", 6: "Saturday",
    };
    const dayName = dayMap[dateObj.getDay()];
    if (dayName === "Saturday" || dayName === "Sunday") {
      return res.status(400).json({ message: "Attendance cannot be generated on weekends." });
    }

    const course = await Course.findById(courseId).populate("students", "_id");
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    // Check for duplicates
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const existing = await Attendance.findOne({
      class: classId,
      course: courseId,
      date: { $gte: startOfDay, $lt: endOfDay },
    });
    if (existing) {
      return res.status(409).json({ message: "Attendance records already exist for this class, course, and date." });
    }

    // generate attendance records for each student in the course for the given class session
    const attendanceRecords = await Promise.all(course.students.map(async (studentId) => {
      const record = await Attendance.create({
        student: studentId,
        lecturer,
        course: courseId,
        class: classId,
        academicYear: academicYearId,
        date: dateObj,
        dayOfWeek: dayName,
        status: "present", // default to present, can be updated later by the teacher
      });
      return record;
    }));

    await logActivity({
      userId: lecturer,
      action: "Generated attendance for class session",
      details: `Generated attendance for course ID: ${courseId}, class ID: ${classId} on ${new Date(date).toDateString()}`,
    });
    res.status(201).json({ message: "Attendance generated for class session", attendanceRecords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const recordAttendance = async (req: Request, res: Response) => {
  try {
    const { student, course, class: classId, academicYear, status, notes } = req.body;
    const lecturer = (req as any).user._id;

    if (!student || !course || !classId || !academicYear || !status) {
      return res.status(400).json({ message: "Missing required attendance fields." });
    }

    const record = await Attendance.create({
      student,
      lecturer,
      course,
      class: classId,
      academicYear,
      status,
      notes, 
    });

    await logActivity({
      userId: lecturer,
      action: "Recorded attendance",
      details: `Attendance for student ${student} on ${new Date(record.date).toDateString()} set to ${status}`,
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

      const records = await Attendance.find({ student: userId })
        .populate("course", "name code courseID")
        .populate("class", "name")
        .populate("lecturer", "name email")
        .sort({ date: -1 })
        .limit(50);

      res.json({ stats, records });
      return;
    }

    // Teacher or parent: return all records for that lecturer
    const stats = await Attendance.aggregate([
      { $match: { lecturer: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const records = await Attendance.find({ lecturer: userId })
      .populate("course", "name code courseID")
      .populate("class", "name")
      .populate("student", "name idNumber email")
      .populate("approvedBy", "name email")
      .sort({ date: -1 })
      .limit(50);

    res.json({ stats, records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// export const getSubjectsAttendance = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user._id;
//     const summary = await Attendance.aggregate([
//       { $match: { teacher: userId } },
//       {
//         $group: {
//           _id: "$subject",
//           present: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "present"] }, 1, 0],
//             },
//           },
//           absent: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "absent"] }, 1, 0],
//             },
//           },
//           late: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "late"] }, 1, 0],
//             },
//           },
//           excused: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "excused"] }, 1, 0],
//             },
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "courses",
//           localField: "_id",
//           foreignField: "_id",
//           as: "subject",
//         },
//       },
//       { $unwind: "$subject" },
//     ]);

//     res.json({ summary });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error", error });
//   }
// };



// The function getSubjectsAttendance should be updated to group by course instead of subject, and should also include the class information in the grouping. The response should return an array of objects, each containing the course name, class name, and attendance stats (present, absent, late, excused) for that course and class combination. The aggregation pipeline should be modified to group by both course and class, and the lookup stage should be updated to join with both the courses and classes collections to retrieve the necessary information for the response. We want to get the status for class teacher and the class students to show who was present or absent for this class session.

export const getCourseClassAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const summary = await Attendance.aggregate([
      { $match: { lecturer: userId } },
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
    // now to return what we found in a more readable format, we can map the summary to include only the necessary information
    const formattedSummary = summary.map(item => ({
      courseName: item.course.name,
      className: item.class.name,
      present: item.present,
      absent: item.absent,
      late: item.late,
      excused: item.excused,
    }));
    return res.json(formattedSummary);
    // res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
}

export const approveExcusedAbsence = async (
  req: Request, 
  res: Response) => {
  try {
    const { attendanceId } = req.params;
    const userId = (req as any).user._id;
    const attendanceRecord = await Attendance.findById(attendanceId);

    if (!attendanceRecord) {
      return res.status(404).json({ message: "Attendance record not found" });
    };
    // now we process and obtain all attendance for excused students only and show who approved it and when, we can also add a note to the record to explain why it was excused
    if (attendanceRecord.status !== "excused") {
      return res.status(400).json({ message: "Only excused absences can be approved" });
    }
    attendanceRecord.approvedBy = userId;
    await attendanceRecord.save();
    await logActivity({
      userId,
      action: "Approved excused absence",
      details: `Approved excused absence for attendance record ID: ${attendanceId}`,
    });
    res.json({ message: "Excused absence approved successfully", attendanceRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  };
}

// create a controller to get attendance records for a specific student, with pagination and filtering by date range and status (present, absent, late, excused). This should be consistent wtth the getMyAttendanceSummary controller, but with more detailed records and pagination support. The endpoint should be GET /api/attendance/student/:studentId?startDate=&endDate=&status=&page=&limit=

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
      .populate("course", "name code courseID")
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

// @desc    Get attendance records for a class session (class + course + date)
// @route   GET /api/attendance/session?classId=&courseId=&date=
// @access  Private (Admin/Teacher)
export const getClassSessionAttendance = async (req: Request, res: Response) => {
  try {
    const { classId, courseId, date } = req.query;
    if (!classId || !courseId || !date) {
      res.status(400).json({ message: "classId, courseId, and date are required." });
      return;
    }
    const dateObj = new Date(date as string);
    dateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const records = await Attendance.find({
      class: classId,
      course: courseId,
      date: { $gte: dateObj, $lt: nextDay },
    })
      .populate("student", "name email idNumber")
      .populate("course", "name code")
      .populate("class", "name")
      .populate("lecturer", "name email")
      .sort({ "student.name": 1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Update attendance status for multiple records
// @route   PATCH /api/attendance/bulk
// @access  Private (Admin/Teacher)
export const bulkUpdateAttendance = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ message: "updates array is required." });
      return;
    }
    const userId = (req as any).user._id;
    const results = await Promise.all(
      updates.map(async ({ attendanceId, status, notes }: { attendanceId: string; status: string; notes?: string }) => {
        const existing = await Attendance.findById(attendanceId);
        if (!existing) return null;
        const updateData: any = { status };
        if (notes !== undefined) updateData.notes = notes;
        const record = await Attendance.findByIdAndUpdate(
          attendanceId,
          updateData,
          { new: true, runValidators: true }
        );
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

// @desc    Trigger async attendance generation via Inngest
// @route   POST /api/attendance/generate
// @access  Private (Admin/Teacher)
export const triggerAttendanceGeneration = async (req: Request, res: Response) => {
  try {
    const { courseId, classId, academicYearId, date } = req.body;
    if (!courseId || !classId || !academicYearId || !date) {
      res.status(400).json({ message: "courseId, classId, academicYearId, and date are required." });
      return;
    }
    const userId = (req as any).user._id?.toString();
    await inngest.send({
      name: "attendance/generate",
      data: { courseId, classId, academicYearId, date, userId },
    });
    res.status(202).json({ message: "Attendance generation started.", status: "processing" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Check if a class has a timetable for an academic year
// @route   GET /api/attendance/timetable-check?classId=&academicYearId=
// @access  Private (Admin/Teacher)
export const checkTimetableExists = async (req: Request, res: Response) => {
  try {
    const { classId, academicYearId } = req.query;
    if (!classId || !academicYearId) {
      res.status(400).json({ message: "classId and academicYearId are required." });
      return;
    }
    const Timetable = (await import("../models/timetable")).default;
    const timetable = await Timetable.findOne({
      class: classId,
      academicYear: academicYearId,
    }).select("_id");

    res.json({ exists: !!timetable });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get all attendance records (admin/teacher can see all sessions for any class)
// @route   GET /api/attendance/lists
// @access  Private (Admin/Teacher)
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

    // If admin: return all records (optionally filtered)
    // If teacher: return only records where they are the lecturer
    if (userRole !== "admin") {
      filter.lecturer = userId;
    }

    const records = await Attendance.find(filter)
      .populate("course", "name code courseID")
      .populate("class", "name")
      .populate("student", "name idNumber email")
      .populate("lecturer", "name email")
      .populate("approvedBy", "name email")
      .sort({ date: -1 })
      .limit(100);

    res.json({ records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get attendance grouped by subject for the current user's courses
// @route   GET /api/attendance/subjects
// @access  Private (Admin/Teacher)
export const getSubjectsAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const summary = await Attendance.aggregate([
      { $match: { lecturer: userId } },
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

// @desc    Get timetable and attendance status for each class
// @route   GET /api/attendance/status
// @access  Private (Admin)
export const getClassesAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const ClassModel = (await import("../models/classes")).default;
    const Timetable = (await import("../models/timetable")).default;

    const classes = await ClassModel.find()
      .populate("academicYear", "name")
      .select("name academicYear courses")
      .sort({ name: 1 });

    const classesWithStatus = await Promise.all(
      classes.map(async (cls) => {
        const [timetable, attendanceStats] = await Promise.all([
          Timetable.findOne({ class: cls._id }).select("_id"),
          Attendance.aggregate([
            { $match: { class: cls._id } },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]),
        ]);

        const statusMap: Record<string, number> = {};
        attendanceStats.forEach((s) => { statusMap[s._id] = s.count; });

        return {
          classId: cls._id,
          className: cls.name,
          academicYear: cls.academicYear?.name ?? "N/A",
          timetableStatus: !!timetable ? "active" : "not set",
          present: statusMap.present ?? 0,
          absent: statusMap.absent ?? 0,
          late: statusMap.late ?? 0,
          excused: statusMap.excused ?? 0,
        };
      })
    );

    res.json({ classes: classesWithStatus });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get current week's daily attendance grouped by course
// @route   GET /api/attendance/weekly
// @access  Private (Admin/Teacher)
export const getWeeklyCourseAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    // Get Monday of current week
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
