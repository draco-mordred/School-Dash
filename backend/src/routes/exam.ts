import express from "express";

import {
  triggerExamGeneration,
  regradeExamSubmissions,
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
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  triggerExamGeneration
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