import express from "express";

import {
  triggerExamGeneration,
  regradeExamSubmissions,
  createExam,
  getExams,
  submitExam,
  getExamById,
  toggleExamStatus,
  getExamResult,
  deleteExam,
  generateExamQuestions,
  deleteExamQuestion,
} from "../controllers/exam";

import { protect , authorize } from "../middleware/auth";

const examRouter = express.Router();

examRouter.post(
  "/generate",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  triggerExamGeneration
);

// Create/Publish a manual exam (teacher/admin)
examRouter.post(
  "/",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  createExam
);
// STudent Routes
examRouter.post(
  "/:id/submit",
  protect,
  authorize(["admin", "student"]),
  submitExam
);

// Admin-only: regrade all submissions for an exam (re-scores with corrected answer key)
examRouter.post(
  "/:id/regrade",
  protect,
  authorize(["admin"]),
  regradeExamSubmissions
);

// Teacher/admin: generate (append) more AI questions for an existing exam
examRouter.post(
  "/:id/generate-questions",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  generateExamQuestions
);

// Teacher/admin: delete a single question from an exam
examRouter.delete(
  "/:id/questions/:questionId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  deleteExamQuestion
);

examRouter.patch(
  "/:id/status",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  toggleExamStatus
);

examRouter.delete(
  "/:id",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  deleteExam
);


examRouter.get(
  "/:id/result",
  protect,
  authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
  getExamResult
);

examRouter.get(
  "/:id",
  protect,
  authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
  getExamById
);

examRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
  getExams
);

export default examRouter;