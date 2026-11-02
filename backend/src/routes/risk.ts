import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  getMyRisk,
  getStudentRisk,
  getClassRisk,
  examOverlapCheck,
} from "../controllers/risk";

// PR H — predictive risk + overlap-warning routes.
const riskRouter = express.Router();

const staff = ["admin", "teacher", "unitconsultant", "unitresident"];

riskRouter.get("/me", protect, authorize(["student"]), getMyRisk);
riskRouter.get("/students/:studentId", protect, authorize(staff), getStudentRisk);
riskRouter.get("/classes/:classId", protect, authorize(staff), getClassRisk);
riskRouter.post("/exams/overlap-check", protect, authorize(staff), examOverlapCheck);

export default riskRouter;
