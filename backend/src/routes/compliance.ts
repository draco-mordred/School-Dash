import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  createComplianceRule,
  getAllComplianceRules,
  getComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  triggerComplianceCheck,
  getStudentViolations,
  getClassComplianceSummary,
  getUnifiedAttendanceReport,
  resolveComplianceViolation,
  escalateComplianceViolation,
  getComplianceDashboard,
} from "../controllers/compliance";

const complianceRouter = express.Router();

// Compliance Rules CRUD
complianceRouter.post(
  "/rules",
  protect,
  authorize(["admin"]),
  createComplianceRule
);

complianceRouter.get(
  "/rules",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getAllComplianceRules
);

complianceRouter.get(
  "/rules/:id",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getComplianceRule
);

complianceRouter.patch(
  "/rules/:id",
  protect,
  authorize(["admin"]),
  updateComplianceRule
);

complianceRouter.delete(
  "/rules/:id",
  protect,
  authorize(["admin"]),
  deleteComplianceRule
);

// Compliance Checks
complianceRouter.post(
  "/check",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident", "parent"]),
  triggerComplianceCheck
);

// Compliance Violations
complianceRouter.get(
  "/violations",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident", "parent"]),
  getStudentViolations
);

complianceRouter.patch(
  "/violations/:id",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident"]),
  resolveComplianceViolation
);

complianceRouter.post(
  "/violations/:id/escalate",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  escalateComplianceViolation
);

// Reports
complianceRouter.get(
  "/summary/:classId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getClassComplianceSummary
);

complianceRouter.get(
  "/report",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident", "parent"]),
  getUnifiedAttendanceReport
);

// Dashboard
complianceRouter.get(
  "/dashboard",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident"]),
  getComplianceDashboard
);

export default complianceRouter;
