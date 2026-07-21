import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  createClinicalAttendanceSession,
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
} from "../controllers/clinicalAttendance";

const clinicalAttendanceRouter = express.Router();

// Create a new clinical attendance session (Supervisor/Admin only)
clinicalAttendanceRouter.post(
  "/session/create",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  createClinicalAttendanceSession
);

// QR attendance generation for students
clinicalAttendanceRouter.post(
  "/qr/generate",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident", "student"]),
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
  authorize(["admin", "teacher", "unitconsultant", "student"]),
  checkInStudent
);

// Check-out a student
clinicalAttendanceRouter.post(
  "/check-out",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "student"]),
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
