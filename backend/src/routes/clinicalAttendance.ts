import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  createClinicalAttendanceSession,
  getAvailableClinicalAttendanceGroups,
  checkInStudent,
  checkOutStudent,
  getClinicalAttendanceSessions,
  getStudentAttendanceRecord,
  updateStudentAttendanceStatus,
  endClinicalSession,
  generateAttendanceReport,
  deleteClinicalSession,
  generateQrAttendancePayload,
  approveQrAttendance,
  getStudentClinicalAttendanceContext,
} from "../controllers/clinicalAttendance";

const clinicalAttendanceRouter = express.Router();

// Create a new clinical attendance session (Supervisor/Admin only)
clinicalAttendanceRouter.post(
  "/session/create",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  createClinicalAttendanceSession
);

clinicalAttendanceRouter.get(
  "/groups/available",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getAvailableClinicalAttendanceGroups
);

// (dev-only route removed)

// QR attendance generation for students
clinicalAttendanceRouter.post(
  "/qr/generate",
  protect,
  authorize(["student"]),
  generateQrAttendancePayload
);

// QR attendance approval by supervisors
clinicalAttendanceRouter.post(
  "/qr/approve",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  approveQrAttendance
);

// Check-in a student
clinicalAttendanceRouter.post(
  "/check-in",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  checkInStudent
);

// Check-out a student
clinicalAttendanceRouter.post(
  "/check-out",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  checkOutStudent
);

// Get all clinical attendance sessions (with filters)
clinicalAttendanceRouter.get(
  "/sessions",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident", "student"]),
  getClinicalAttendanceSessions
);

// Get student attendance record
clinicalAttendanceRouter.get(
  "/student-context",
  protect,
  authorize(["student"]),
  getStudentClinicalAttendanceContext
);

clinicalAttendanceRouter.get(
  "/student-record",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "student"]),
  getStudentAttendanceRecord
);

// Update student attendance status
clinicalAttendanceRouter.put(
  "/attendance-status",
  protect,
  authorize(["admin", "teacher", "unitconsultant"]),
  updateStudentAttendanceStatus
);

// End clinical session
clinicalAttendanceRouter.post(
  "/session/end",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  endClinicalSession
);

// Generate attendance report
clinicalAttendanceRouter.get(
  "/report",
  protect,
  authorize(["admin", "teacher", "unitconsultant"]),
  generateAttendanceReport
);

// Delete clinical session
clinicalAttendanceRouter.delete(
  "/session/:sessionId",
  protect,
  authorize(["admin", "teacher"]),
  deleteClinicalSession
);

export default clinicalAttendanceRouter;
