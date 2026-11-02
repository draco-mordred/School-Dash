import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  getProgressionPolicy,
  updateProgressionPolicy,
  getStudentProgression,
  decideStudentProgression,
  getMyProgression,
} from "../controllers/progression";

// PR G3 — progression / clock-sync routes.
const progressionRouter = express.Router();

const staff = ["admin", "teacher", "unitconsultant", "unitresident"];

progressionRouter.get("/policy", protect, authorize(staff), getProgressionPolicy);
progressionRouter.put("/policy", protect, authorize(["admin"]), updateProgressionPolicy);
progressionRouter.get("/students/:studentId", protect, authorize(staff), getStudentProgression);
progressionRouter.post("/students/:studentId/decide", protect, authorize(["admin"]), decideStudentProgression);
progressionRouter.get("/my", protect, authorize(["student"]), getMyProgression);

export default progressionRouter;
