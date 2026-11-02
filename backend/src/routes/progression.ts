import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  getProgressionPolicy,
  updateProgressionPolicy,
  getStudentProgression,
  getClassProgression,
  getMyProgression,
  decideStudentProgression,
} from "../controllers/progression";

// PR G3 — exam-cycle progression + clock-sync routes.
const progressionRouter = express.Router();

const staff = ["admin", "teacher", "unitconsultant", "unitresident"];

progressionRouter.get("/policy", protect, authorize(staff), getProgressionPolicy);
progressionRouter.put("/policy", protect, authorize(["admin"]), updateProgressionPolicy);
progressionRouter.get("/classes/:classId", protect, authorize(staff), getClassProgression);
progressionRouter.get("/students/:studentId", protect, authorize(staff), getStudentProgression);
progressionRouter.post(
  "/students/:studentId/stages/:stageId/decide",
  protect,
  authorize(["admin"]),
  decideStudentProgression
);
progressionRouter.get("/me", protect, authorize(["student"]), getMyProgression);

export default progressionRouter;
