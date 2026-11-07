import { type Request, type Response } from "express";
import { normalizeRole } from "../middleware/auth";
import {
  sendDm,
  sendDmFromMention,
  getMyConversations,
  getThread,
  setTyping,
  togglePinMessage,
  togglePreserveMessage,
  getMyModerationStatus,
  submitAppeal,
  adminListCases,
  adminGetCase,
  adminResolveCase,
  getChatEnabled,
  setChatEnabled,
  getAdminTransparencyFeed,
} from "../services/dmService";
import { extractMentionEmail } from "../utils/dmModeration";

const genericFailure = (message: string) => ({ message });

export const sendDmController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { to, message } = req.body ?? {};
    const targetEmail = String(to ?? "").trim();
    if (!targetEmail || !String(message ?? "").trim()) {
      return res.status(400).json({ message: "Both 'to' (email) and 'message' are required." });
    }
    const result = await sendDm(user, targetEmail, String(message));
    // Generic "user not available" prevents email enumeration.
    if (result.status === "unavailable") {
      return res.status(200).json({ status: "unavailable", message: result.caution || "User not available." });
    }
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json(genericFailure(error?.message || "Unable to send the message."));
  }
};

export const listConversations = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { conversations, typingFrom } = await getMyConversations(user?._id);
    return res.status(200).json({ conversations, typingFrom });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Unable to load conversations." });
  }
};

export const getThreadController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const partnerId = String(req.params.userId ?? "").trim();
    if (!partnerId) return res.status(400).json({ message: "userId is required." });
    const messages = await getThread(user?._id, partnerId);
    return res.status(200).json({ messages });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Unable to load the conversation." });
  }
};

export const myModerationStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const status = await getMyModerationStatus(user?._id);
    return res.status(200).json(status);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Unable to load moderation status." });
  }
};

export const appealCase = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { caseId, text } = req.body ?? {};
    if (!caseId || !String(text ?? "").trim()) {
      return res.status(400).json({ message: "caseId and appeal text are required." });
    }
    const result = await submitAppeal(user?._id, String(caseId), String(text));
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Unable to submit the appeal." });
  }
};

export const updateChatEnabled = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const enabled = req.body?.enabled === true;
    const role = normalizeRole(user?.role);
    // Design point 7: for ADMINS this opts into chat transparency (their
    // system-level actions become visible to other admins). For other roles
    // it simply toggles DM availability.
    await setChatEnabled(user?._id, enabled);
    return res.status(200).json({
      chatEnabled: enabled,
      transparencyNote:
        role === "admin" && enabled
          ? "You have enabled your chat. Your system-level actions are now visible to other administrators (mutual oversight)."
          : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Unable to update the setting." });
  }
};

export const myChatEnabled = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const enabled = await getChatEnabled(user?._id);
    return res.status(200).json({ chatEnabled: enabled });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Unable to load the setting." });
  }
};

// ─── Instant-feel: typing indicator + message pin/save ──────────────
export const typingIndicator = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const recipientId = String(req.body?.recipientId ?? "").trim();
    if (!recipientId) return res.status(400).json({ message: "recipientId is required." });
    setTyping(user?._id, recipientId);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Unable to record typing." });
  }
};

export const pinMessageController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const messageId = String(req.params.messageId ?? "");
    const pinned = req.body?.pinned === true;
    const result = await togglePinMessage(user?._id, messageId, pinned);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Unable to update the pin." });
  }
};

export const preserveMessageController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const messageId = String(req.params.messageId ?? "");
    const preserve = req.body?.preserve === true;
    const result = await togglePreserveMessage(user?._id, messageId, preserve);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Unable to update the saved state." });
  }
};

// ─── Admin moderation queue ───────────────────────────────────────────
export const adminCases = async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status ?? "").trim() || undefined;
    const cases = await adminListCases(status);
    return res.status(200).json({ cases });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Unable to load the moderation queue." });
  }
};

export const adminCaseDetail = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const detail = await adminGetCase(user?._id, String(req.params.caseId ?? ""));
    return res.status(200).json(detail);
  } catch (error: any) {
    return res.status(404).json({ message: error?.message || "Case not found." });
  }
};

export const adminCaseResolve = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const caseId = String(req.params.caseId ?? "");
    const { penaltyLevel, suspensionHours, deviationReason, note, unfreeze } = req.body ?? {};
    const result = await adminResolveCase(user?._id, caseId, {
      penaltyLevel,
      suspensionHours,
      deviationReason,
      note,
      unfreeze,
    });
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Unable to resolve the case." });
  }
};

export const adminTransparency = async (req: Request, res: Response) => {
  try {
    const feed = await getAdminTransparencyFeed(50);
    return res.status(200).json(feed);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Unable to load the transparency feed." });
  }
};

// Re-exported for the MORDRED chat integration (mention handling).
export const handleMentionInChat = async (user: any, message: string) => {
  const email = extractMentionEmail(message);
  if (!email) return null;
  return sendDmFromMention(user, message);
};
