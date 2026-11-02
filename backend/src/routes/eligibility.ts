import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  getEligibilityPolicy,
  updateEligibilityPolicy,
  getStudentClearance,
  upsertStudentClearance,
  getMyClearance,
  setCourseGradeOverride,
} from "../controllers/eligibility";

// PR G2 — exam-eligibility / result-release-gate routes.
const eligibilityRouter = express.Router();

const staff = ["admin", "teacher", "unitconsultant", "unitresident"];

eligibilityRouter.get("/policy", protect, authorize(staff), getEligibilityPolicy);
eligibilityRouter.put("/policy", protect, authorize(["admin"]), updateEligibilityPolicy);
eligibilityRouter.get("/students/:studentId", protect, authorize(staff), getStudentClearance);
eligibilityRouter.put("/students/:studentId", protect, authorize(["admin"]), upsertStudentClearance);
eligibilityRouter.get("/me", protect, authorize(["student"]), getMyClearance);
eligibilityRouter.post(
  "/grades/:courseId/students/:studentId/override",
  protect,
  authorize(["admin"]),
  setCourseGradeOverride
);

export default eligibilityRouter;
