import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  recordAttendance,
  getMyAttendanceSummary,
  approveExcusedAbsence,
  getCourseClassAttendance,
  getStudentAttendanceRecords,
  triggerAttendanceGeneration,
  generateAttendanceForClassSession,
  getClassSessionAttendance,
  bulkUpdateAttendance,
  checkTimetableExists,
  getSubjectsAttendance,
  getAllAttendanceLists,
  getClassesAttendanceStatus,
  getWeeklyCourseAttendance,
  getStudentNotificationsSummary,
  getStudentAttendanceSummary,
} from "../controllers/attendance";

const attendanceRouter = express.Router();

attendanceRouter.post(
  "/record",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  recordAttendance
);
attendanceRouter.get("/me", protect, getMyAttendanceSummary);
attendanceRouter.get("/me/summary", protect, getMyAttendanceSummary);

attendanceRouter.post(  
  "/approve-excused/:attendanceId",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  approveExcusedAbsence
);

attendanceRouter.get(
  "/courses/:courseId/classes/:classId",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  getCourseClassAttendance
);

attendanceRouter.get(
  "/students/:studentId",
  protect,
  authorize(["admin", "teacher", "parent", "student"]),
  getStudentAttendanceRecords
);

attendanceRouter.get(
  "/student/:studentId/summary",
  protect,
  authorize(["admin", "teacher", "parent"]),
  getStudentAttendanceSummary
);

attendanceRouter.post(
  "/generate",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  triggerAttendanceGeneration
);

attendanceRouter.get(
  "/session",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  getClassSessionAttendance
);

attendanceRouter.patch(
  "/bulk",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  bulkUpdateAttendance
);

attendanceRouter.get(
  "/timetable-check",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  checkTimetableExists
);

attendanceRouter.get(
  "/subjects",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  getSubjectsAttendance
);

attendanceRouter.get(
  "/lists",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  getAllAttendanceLists
);

attendanceRouter.get(
  "/status",
  protect,
  authorize(["admin", "teacher", "parent"]),
  getClassesAttendanceStatus
);

attendanceRouter.get(
  "/weekly",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  getWeeklyCourseAttendance
);

attendanceRouter.get(
  "/student-notifications",
  protect,
  authorize(["student"]),
  getStudentNotificationsSummary
);

export default attendanceRouter;
 