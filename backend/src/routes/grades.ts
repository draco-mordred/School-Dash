import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  getGradingPolicy,
  updateGradingPolicy,
  recomputeCourse,
  getCourseResults,
  releaseCourseResults,
  getMyResults,
} from "../controllers/grades";

// PR G1 — grading/GPA routes.
const gradesRouter = express.Router();

const staff = ["admin", "teacher", "unitconsultant", "unitresident"];

gradesRouter.get("/policy", protect, authorize(staff), getGradingPolicy);
gradesRouter.put("/policy", protect, authorize(["admin"]), updateGradingPolicy);
gradesRouter.post("/courses/:courseId/recompute", protect, authorize(staff), recomputeCourse);
gradesRouter.get("/courses/:courseId", protect, authorize(staff), getCourseResults);
gradesRouter.post("/courses/:courseId/release", protect, authorize(["admin"]), releaseCourseResults);
gradesRouter.get("/my", protect, authorize(["student"]), getMyResults);

export default gradesRouter;
