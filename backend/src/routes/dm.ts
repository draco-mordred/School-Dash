import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  sendDmController,
  listConversations,
  getThreadController,
  myModerationStatus,
  appealCase,
  updateChatEnabled,
  myChatEnabled,
  adminCases,
  adminCaseDetail,
  adminCaseResolve,
  adminTransparency,
} from "../controllers/dm";

const dmRouter = express.Router();

// ─── User DM routes (all roles) ──────────────────────────────────────
dmRouter.post("/send", protect, sendDmController);
dmRouter.get("/conversations", protect, listConversations);
dmRouter.get("/thread/:userId", protect, getThreadController);
dmRouter.get("/moderation/me", protect, myModerationStatus);
dmRouter.post("/moderation/appeal", protect, appealCase);
dmRouter.get("/chat-enabled", protect, myChatEnabled);
dmRouter.put("/chat-enabled", protect, updateChatEnabled);

// ─── Admin moderation queue + transparency ───────────────────────────
dmRouter.get("/admin/cases", protect, authorize(["admin"]), adminCases);
dmRouter.get("/admin/cases/:caseId", protect, authorize(["admin"]), adminCaseDetail);
dmRouter.post("/admin/cases/:caseId/resolve", protect, authorize(["admin"]), adminCaseResolve);
dmRouter.get("/admin/transparency", protect, authorize(["admin"]), adminTransparency);

export default dmRouter;
