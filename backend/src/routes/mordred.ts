import { saveChatMessage, mordredsWords, trackMordredPerformance, dynamicAIInsights, getCourseSummary, createPostingAttendanceAlert } from "../controllers/mordred";
import express from "express";
import { protect, authorize } from "../middleware/auth";

const mordredAIRouter = express.Router();

mordredAIRouter.post(
  "/save-message", 
  protect, 
  saveChatMessage
); //How can I test this in Thunder CLient: POST http://localhost:5000/api/mordred/save-message
// Body: {"message": "Hello, Mordred!"}
// Headers: {"Authorization": "Bearer <token>"}
// Note: Replace <token> with your actual token.
// Make sure to include the correct token in the Authorization header to authenticate the request.

mordredAIRouter.post(
  "/chat/handle", 
  protect,
  mordredsWords
); //How can I test this in Thunder CLient: POST http://localhost:5000/mordred/saveChatMessage
// Headers:

mordredAIRouter.get(
  "/admin/diagnostics",
  protect,
  authorize(["admin"]),
  trackMordredPerformance
);

mordredAIRouter.post(
  "/insights/attendance-alert",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident", "parent"]),
  createPostingAttendanceAlert
);

mordredAIRouter.get(
  "/insights",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident", "parent"]),
  dynamicAIInsights
);

mordredAIRouter.post(
  "/course-summary",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident", "parent"]),
  getCourseSummary
);

export default mordredAIRouter;