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
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  recordAttendance
);
attendanceRouter.get("/me", protect, getMyAttendanceSummary);
attendanceRouter.get("/me/summary", protect, getMyAttendanceSummary);

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
 