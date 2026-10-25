
import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  recordAttendance,
  getMyAttendanceSummary,
  approveExcusedAbsence,
  requestExcusedAbsence,
  getPendingExcuseRequests,
  getCourseClassAttendance,
  getStudentAttendanceRecords,
  triggerAttendanceGeneration,
  getClassSessionAttendance,
  bulkUpdateAttendance,
  deleteAttendanceSession,
  deleteAttendanceRecords,
  checkTimetableExists,
  getSubjectsAttendance,
  getAllAttendanceLists,
  getClassesAttendanceStatus,
  getWeeklyCourseAttendance,
  getStudentNotificationsSummary,
  getStudentAttendanceSummary,
} from "../controllers/attendance";
import {
  getActiveSessions,
  submitCheckIn,
  submitLecturerCheckIn,
} from "../controllers/attendanceCheckin";
import {
  getMyLectureSessions,
  createComplaint,
  getComplaints,
  resolveComplaint,
} from "../controllers/attendanceComplaints";
import { getUnifiedAttendance } from "../controllers/attendanceUnified";

const attendanceRouter = express.Router();

attendanceRouter.post(
  "/record",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  recordAttendance
);
attendanceRouter.get("/me", protect, getMyAttendanceSummary);
attendanceRouter.get("/me/summary", protect, getMyAttendanceSummary);

attendanceRouter.post(
  "/:attendanceId/excuse-request",
  protect,
  authorize(["student"]),
  requestExcusedAbsence
);

attendanceRouter.get(
  "/excuse-requests/pending",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getPendingExcuseRequests
);

attendanceRouter.post(
  "/approve-excused/:attendanceId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  approveExcusedAbsence
);

attendanceRouter.get(
  "/courses/:courseId/classes/:classId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
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
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  triggerAttendanceGeneration
);

attendanceRouter.get(
  "/session",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getClassSessionAttendance
);

attendanceRouter.delete(
  "/session",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  deleteAttendanceSession
);

attendanceRouter.delete(
  "/records",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  deleteAttendanceRecords
);

attendanceRouter.patch(
  "/bulk",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  bulkUpdateAttendance
);

attendanceRouter.get(
  "/timetable-check",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  checkTimetableExists
);

attendanceRouter.get(
  "/subjects",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getSubjectsAttendance
);

attendanceRouter.get(
  "/lists",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
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
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getWeeklyCourseAttendance
);

attendanceRouter.get(
  "/active-sessions",
  protect,
  authorize(["student"]),
  getActiveSessions
);

attendanceRouter.post(
  "/check-in",
  protect,
  authorize(["student"]),
  submitCheckIn
);

attendanceRouter.post(
  "/lecturer-check-in",
  protect,
  authorize(["teacher"]),
  submitLecturerCheckIn
);

attendanceRouter.get(
  "/my-sessions",
  protect,
  authorize(["teacher"]),
  getMyLectureSessions
);

attendanceRouter.post(
  "/complaints",
  protect,
  authorize(["student"]),
  createComplaint
);

attendanceRouter.get(
  "/complaints",
  protect,
  authorize(["student", "teacher", "admin"]),
  getComplaints
);

attendanceRouter.post(
  "/complaints/:id/resolve",
  protect,
  authorize(["teacher"]),
  resolveComplaint
);

attendanceRouter.get(
  "/student-notifications",
  protect,
  authorize(["student"]),
  getStudentNotificationsSummary
);

// Phase K (D16): central unified attendance read endpoint.
attendanceRouter.get(
  "/unified",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident", "student", "parent"]),
  getUnifiedAttendance
);

export default attendanceRouter;
 