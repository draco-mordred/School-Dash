import express from "express";

import {
  triggerExamGeneration,
  getExams,
  submitExam,
  getExamById,
  toggleExamStatus,
  getExamResult,
} from "../controllers/exam";

import { protect , authorize } from "../middleware/auth";

const examRouter = express.Router();

examRouter.post(
  "/generate",
  protect,
  authorize(["admin", "teacher"]),
  triggerExamGeneration
);
// STudent Routes
examRouter.post(
  "/:id/submit",
  protect,
  authorize(["admin", "student"]),
  submitExam
);

examRouter.patch(
  "/:id/status",
  protect,
  authorize(["admin", "teacher"]),
  toggleExamStatus
);

examRouter.get(
  "/:id/result",
  protect,
  authorize(["admin", "teacher", "student"]),
  getExamResult
);

examRouter.get(
  "/:id",
  protect,
  authorize(["admin", "teacher", "student"]),
  getExamById
);

examRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher", "student"]),
  getExams
);

export default examRouter;