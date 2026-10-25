// successfully downloaded text file (SHA: 273871a9e1f9a1fbf11e17d451db91714970c0f6)
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
  "/student-notifications",
  protect,
  authorize(["student"]),
  getStudentNotificationsSummary
);

export default attendanceRouter;
 