import express from "express";

import {
  triggerExamGeneration,
  getExams,
  submitExam,
  getExamById,
  toggleExamStatus,
  getExamResult,
  deleteExam,
} from "../controllers/exam";

import { protect , authorize } from "../middleware/auth";

const examRouter = express.Router();

examRouter.post(
  "/generate",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
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
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  toggleExamStatus
);

examRouter.delete(
  "/:id",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  deleteExam
);


examRouter.get(
  "/:id/result",
  protect,
  authorize(["admin", "teacher", "student", "unit_consultant", "unit_resident"]),
  getExamResult
);

examRouter.get(
  "/:id",
  protect,
  authorize(["admin", "teacher", "student", "unit_consultant", "unit_resident"]),
  getExamById
);

examRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher", "student", "unit_consultant", "unit_resident"]),
  getExams
);

export default examRouter;