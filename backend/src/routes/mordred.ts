import { saveChatMessage, mordredsWords, trackMordredPerformance, dynamicAIInsights, getCourseSummary, createPostingAttendanceAlert } from "../controllers/mordred";
import { getProviderHealth } from "../controllers/mordredHealth";
import express from "express";
import { protect, authorize } from "../middleware/auth";

const mordredAIRouter = express.Router();

mordredAIRouter.post(
  "/save-message",
  protect,
  saveChatMessage
);

mordredAIRouter.post(
  "/chat/handle",
  protect,
  mordredsWords
);

mordredAIRouter.get(
  "/admin/diagnostics",
  protect,
  authorize(["admin"]),
  trackMordredPerformance
);

// NEW — live AI provider health: which keys the backend process can see +
// a real one-token test call per key with the true error messages.
mordredAIRouter.get(
  "/admin/provider-health",
  protect,
  authorize(["admin"]),
  getProviderHealth
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
