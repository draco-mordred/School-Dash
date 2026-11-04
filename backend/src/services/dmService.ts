// ─── PR M2 — DM service: send/moderate/auto-clear/transparency ──────────
// Privacy model (locked design point 5, HYBRID): DMs are private by default —
// no admin browsing/searching of DM content. Moderation scans server-side at
// pre-send time; ONLY flagged messages + a small context window ever attach
// to an escalation report, and every admin access to flagged content is
// itself TINASHA-logged (case.accessedBy + ActivitiesLog).

import mongoose from "mongoose";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import User from "../models/user";
import DmMessage from "../models/dmMessage";
import DmCase from "../models/dmCase";
import DmChatSetting from "../models/dmChatSetting";
import ActivitiesLog from "../models/activitieslog";
import { createNotificationIfUnique } from "../utils/notificationUtils";
import { getMistralApiKeys, getGoogleApiKeys } from "./mordredEngine";
import {
  classifyMessage,
  extractMentionEmail,
  isStaffRole,
  isPenaltyActive,
  nextPenaltyFor,
  ModerationHistoryEntry,
  ModerationVerdict,
  DM_RETENTION_DAYS,
} from "../utils/dmModeration";

const CONTEXT_WINDOW_SIZE = 3;

const notifyUser = async (
  userId: any,
  role: string,
  title: string,
  message: string,
  metadata: Record<string, unknown> = {}
) => {
  try {
    await createNotificationIfUnique({
      userId,
      role,
      title,
      message,
      type: "system",
      actorName: "DALE AI",
      actorRole: String(role || "student"),
      metadata,
    });
  } catch (err) {
    console.warn("DALE DM notification failed:", (err as Error).message);
  }
};

const notifyAllAdmins = async (title: string, message: string, metadata: Record<string, unknown> = {}) => {
  try {
    const admins: any[] = await User.find({ role: "admin", isActive: true }).select("_id").lean();
    await Promise.all(
      admins.map((admin) =>
        createNotificationIfUnique({
          userId: admin._id,
          role: "admin",
          title,
          message,
          type: "system",
          actorName: "DALE AI",
          actorRole: "admin",
          metadata: { ...metadata, repeatAllowed: true },
        })
      )
    );
  } catch (err) {
    console.warn("DALE DM admin notification failed:", (err as Error).message);
  }
};

// ─── AI escalation pass (user-confirmed M2 flow) ───────────────────────
// Deterministic rules run FIRST; when they flag a message (or a staff→student
// DM needs a stricter look), the provider chain evaluates it too. The AI can
// UPGRADE a soft flag to hard, never downgrade a hard block (fail-safe). If
// every provider key fails, the deterministic verdict stands.
// PR M15 — normalize a recipient email: strip leading @/@+, trim, lowercase.
const normalizeDmEmail = (raw: unknown) =>
  String(raw ?? "").trim().replace(/^[+@]+/, "").toLowerCase();

export const aiModerate = async (
  text: string,
  strict: boolean
): Promise<{ verdict: ModerationVerdict; reasons: string[] } | null> => {
  const mistralKeys = getMistralApiKeys();
  const googleKeys = getGoogleApiKeys();
  if (mistralKeys.length === 0 && googleKeys.length === 0) return null;

  const prompt = [
    "You are a school chat moderation engine. Classify this direct message between users of a medical school LMS.",
    strict
      ? "The sender is a staff member and the recipient is a student: apply STRICTER thresholds (power imbalance)."
      : "",
    "Reply with STRICT JSON only: {\"verdict\":\"pass|soft|hard\",\"reasons\":[\"...\"]}",
    "pass = safe. soft = mildly inappropriate (profanity, insults, spam). hard = threats, harassment, sexual content or intimidation.",
    "Message:",
    text,
  ]
    .filter(Boolean)
    .join("\n");

  const parse = (raw: string): { verdict: ModerationVerdict; reasons: string[] } | null => {
    try {
      const cleaned = String(raw).replace(/```json/g, "").replace(/```/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start < 0 || end <= start) return null;
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      const verdict = String(parsed?.verdict ?? "").toLowerCase();
      if (!["pass", "soft", "hard"].includes(verdict)) return null;
      return {
        verdict: verdict === "soft" ? "soft_flag" : verdict === "hard" ? "hard_block" : "pass",
        reasons: Array.isArray(parsed?.reasons) ? parsed.reasons.map(String) : [],
      };
    } catch {
      return null;
    }
  };

  for (const apiKey of mistralKeys) {
    try {
      const mistral = createMistral({ apiKey });
      const { text: out } = await generateText({
        model: mistral(process.env.MORDRED_MISTRAL_MODEL || "mistral-small-latest"),
        prompt,
        temperature: 0,
      });
      const parsed = parse(out);
      if (parsed) return parsed;
    } catch (err) {
      console.warn("DALE DM AI moderation (mistral key) failed:", (err as Error).message);
    }
  }
  for (const apiKey of googleKeys) {
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { text: out } = await generateText({
        model: google(process.env.MORDRED_MODEL || "gemini-3.8-flash"),
        prompt,
        temperature: 0,
      });
      const parsed = parse(out);
      if (parsed) return parsed;
    } catch (err) {
      console.warn("DALE DM AI moderation (google key) failed:", (err as Error).message);
    }
  }
  return null;
};

const worse = (a: ModerationVerdict, b: ModerationVerdict): ModerationVerdict => {
  const rank: Record<ModerationVerdict, number> = { pass: 0, soft_flag: 1, hard_block: 2 };
  return rank[a] >= rank[b] ? a : b;
};

// ─── Freeze / suspension checks ───────────────────────────────────────
export const getSenderModerationState = async (userId: any, now = new Date()) => {
  const openHard = await DmCase.findOne({ user: userId, kind: "hard_block", status: "open" }).lean();
  const frozen = Boolean(openHard);
  const history: ModerationHistoryEntry[] = await DmCase.find({ user: userId })
    .select("kind createdAt")
    .lean();
  const resolved = await DmCase.find({
    user: userId,
    status: "resolved",
    "resolution.suspensionUntil": { $ne: null },
  })
    .sort({ "resolution.resolvedAt": -1 })
    .limit(1)
    .lean();
  const activeSuspension = resolved[0] ?? null;
  const suspended = isPenaltyActive({ suspensionUntil: (activeSuspension as any)?.resolution?.suspensionUntil ?? null }, now);
  return {
    frozen,
    frozenCaseId: openHard ? String((openHard as any)._id) : null,
    suspended,
    suspensionUntil: suspended ? (activeSuspension as any)?.resolution?.suspensionUntil ?? null : null,
    history,
  };
};

// ─── Chat settings (admin opt-in transparency) ────────────────────────
export const getChatEnabled = async (userId: any): Promise<boolean> => {
  const setting = await DmChatSetting.findOne({ user: userId }).lean();
  return Boolean((setting as any)?.chatEnabled);
};

export const setChatEnabled = async (userId: any, enabled: boolean) => {
  await DmChatSetting.findOneAndUpdate(
    { user: userId },
    { $set: { chatEnabled: enabled === true } },
    { upsert: true, new: true }
  );
  return enabled === true;
};

// ─── Send + moderate a DM ─────────────────────────────────────────────
export interface SendDmResult {
  status: "delivered" | "soft_flagged" | "blocked" | "unavailable" | "frozen" | "suspended";
  recipientName?: string;
  rules?: string[];
  penalty?: { level: number; label: string; suspensionUntil: Date | null } | null;
  caseId?: string;
  caution?: string;
}

export const sendDm = async (
  sender: any,
  recipientEmail: string,
  text: string,
  now = new Date()
): Promise<SendDmResult> => {
  const body = String(text ?? "").trim();
  if (!body) throw new Error("Message text is required.");

  // 1. Freeze / suspension gates (chat-wide).
  const state = await getSenderModerationState(sender?._id, now);
  if (state.frozen) {
    return {
      status: "frozen",
      caseId: state.frozenCaseId ?? undefined,
      caution:
        "Your chat is frozen pending an administrator's review of a flagged message. You can read but not send.",
    };
  }
  if (state.suspended) {
    return {
      status: "suspended",
      suspensionUntil: undefined,
      penalty: { level: 0, label: "suspension", suspensionUntil: state.suspensionUntil },
      caution: `Your chat is suspended until ${new Date(state.suspensionUntil as any).toLocaleString()}.`,
    } as SendDmResult;
  }

  // 2. Resolve recipient. Generic responses prevent email enumeration.
  const recipient: any = await User.findOne({
    email: normalizeDmEmail(recipientEmail),
    isActive: { $ne: false },
  })
    .collation({ locale: "en", strength: 2 })
    .select("name email role")
    .lean();
  if (!recipient) {
    return { status: "unavailable", caution: "User not available." };
  }

  // 3. DM defaults: students/staff receive DMs by default; admins are opt-in
  // (chat disabled by default) EXCEPT from other admins, who can always reach them.
  const senderRole = String(sender?.role ?? "").trim().toLowerCase();
  const recipientRole = String(recipient.role ?? "").trim().toLowerCase();
  if (recipientRole === "admin") {
    const adminChatEnabled = await getChatEnabled(recipient._id);
    if (!adminChatEnabled && senderRole !== "admin") {
      return { status: "unavailable", caution: "This administrator has DMs turned off. Admins receive DMs on opt-in — they can enable theirs in chat settings. Admins can always reach each other." };
    }
  }

  // 4. Staff→student DMs allowed but under VERY strict watch (design 10).
  const strict = isStaffRole(senderRole) && recipientRole === "student";

  // 5. Deterministic rules first, AI escalation second (user-confirmed flow).
  const deterministic = classifyMessage(body, { strict });
  let verdict = deterministic.verdict;
  let rules = [...deterministic.rules];
  if (verdict !== "pass" || strict) {
    const ai = await aiModerate(body, strict);
    if (ai) {
      verdict = worse(verdict, ai.verdict);
      for (const reason of ai.reasons) if (!rules.includes(reason)) rules.push(reason);
    }
  }

  // 6. Persist the message. Flagged/blocked messages are preserved forever
  //    (whitelist beats the weekly clear); clean ones expire in 7 days.
  const flagged = verdict !== "pass";
  const dm = await DmMessage.create({
    sender: sender._id,
    recipient: recipient._id,
    text: body,
    verdict: verdict === "pass" ? "delivered" : verdict === "soft_flag" ? "soft_flagged" : "blocked",
    rules,
    preserved: flagged,
    expiresAt: flagged ? null : new Date(now.getTime() + DM_RETENTION_DAYS * 24 * 60 * 60 * 1000),
  });

  // 7. Delivery + penalty ladder.
  if (verdict === "pass") {
    await notifyUser(
      recipient._id,
      recipientRole,
      "New DALE direct message",
      `${sender?.name ?? "Someone"} sent you a direct message. Open DALE chat to read it.`,
      { source: "dm", dmId: String(dm._id) }
    );
    return { status: "delivered", recipientName: recipient.name ?? "the user" };
  }

  // Small context window for the escalation report (privacy: ONLY this).
  const contextDocs: any[] = await DmMessage.find({
    $or: [
      { sender: sender._id, recipient: recipient._id },
      { sender: recipient._id, recipient: sender._id },
    ],
    _id: { $ne: dm._id },
  })
    .sort({ createdAt: -1 })
    .limit(CONTEXT_WINDOW_SIZE)
    .lean();

  const penalty = nextPenaltyFor(verdict, state.history, now);
  const suspensionUntil = penalty.suspensionHours
    ? new Date(now.getTime() + penalty.suspensionHours * 60 * 60 * 1000)
    : null;

  const createdCase: any = await DmCase.create({
    kind: verdict === "soft_flag" ? "soft_flag" : "hard_block",
    user: sender._id,
    dm: dm._id,
    rules,
    contextWindow: contextDocs.map((doc) => ({
      sender: doc.sender ?? null,
      text: doc.text ?? "",
      at: doc.createdAt ?? now,
    })),
    status: "open",
    chatFrozen: verdict === "hard_block",
    strikeCountAtCreation: state.history.filter((h) => h.kind === "soft_flag").length,
    escalationReportSent: false,
    penalty: {
      level: penalty.level,
      label: penalty.label,
      suspensionUntil,
      referral: penalty.referral,
    },
  });

  await DmMessage.updateOne({ _id: dm._id }, { $set: { caseId: createdCase._id } });

  if (verdict === "soft_flag") {
    // Delivered + sender caution + logged. Auto-escalates at L2 (3 in 30d).
    await notifyUser(
      recipient._id,
      recipientRole,
      "New DALE direct message",
      `${sender?.name ?? "Someone"} sent you a direct message. Open DALE chat to read it.`,
      { source: "dm", dmId: String(dm._id) }
    );
    const caution =
      penalty.level >= 2
        ? `Your message was flagged (${rules.join(", ")}) and you now have 3 flags in 30 days: your chat is suspended for 48 hours. You can appeal this decision.`
        : `Your message was flagged by our moderation system (${rules.join(", ")}) and a written warning has been recorded. Please keep conversations respectful.`;
    await notifyUser(sender._id, senderRole, "DALE moderation: message flagged", caution, {
      source: "dm-moderation",
      caseId: String(createdCase._id),
      repeatAllowed: true,
    });
    await notifyAllAdmins(
      "DALE moderation: flagged direct message",
      `A direct message was soft-flagged (${rules.join(", ")}). Penalty: ${penalty.label}. Review it in the moderation queue.`,
      { source: "dm-moderation", caseId: String(createdCase._id) }
    );
    return { status: "soft_flagged", recipientName: recipient.name ?? "the user", rules, penalty: penalty.level >= 2 ? { level: penalty.level, label: penalty.label, suspensionUntil } : null, caseId: String(createdCase._id), caution };
  }

  // hard_block: NOT delivered. Sender chat-FROZEN chat-wide pending admin
  // resolution + auto escalation report with the message + rule tripped.
  const hardCaution =
    `Your message was blocked (${rules.join(", ")}) and NOT delivered. Your chat is frozen ` +
    `pending administrator review — you can read but not send. Suggested penalty: ${penalty.label}. ` +
    `You may submit one written appeal.`;
  await notifyUser(sender._id, senderRole, "DALE moderation: message blocked", hardCaution, {
    source: "dm-moderation",
    caseId: String(createdCase._id),
    repeatAllowed: true,
  });
  await notifyAllAdmins(
    "DALE moderation: BLOCKED direct message — action required",
    `A message was hard-blocked (${rules.join(", ")}). The sender's chat is frozen pending your resolution. Escalation report (message + context window) is in the moderation queue.`,
    { source: "dm-moderation", caseId: String(createdCase._id) }
  );
  await DmCase.updateOne({ _id: createdCase._id }, { $set: { escalationReportSent: true } });

  return {
    status: "blocked",
    rules,
    penalty: { level: penalty.level, label: penalty.label, suspensionUntil },
    caseId: String(createdCase._id),
    caution: "Your message was blocked by moderation and not delivered. Your chat is frozen pending admin review.",
  };
};

// Mention-driven send from inside the DALE chat (design point 4).
export const sendDmFromMention = async (
  sender: any,
  message: string,
  now = new Date()
): Promise<SendDmResult> => {
  const email = extractMentionEmail(message);
  if (!email) throw new Error("No @email mention found.");
  const { stripMention } = await import("../utils/dmModeration");
  const body = stripMention(message) || "(message)";
  return sendDm(sender, email, body, now);
};

// ─── Reads (participants only — no admin browsing of DMs) ──────────────
export const getMyConversations = async (userId: any) => {
  const dms: any[] = await DmMessage.find({
    $or: [{ sender: userId }, { recipient: userId }],
    verdict: { $ne: "blocked" },
  })
    .sort({ createdAt: -1 })
    .limit(300)
    .populate("sender", "name email role")
    .populate("recipient", "name email role")
    .lean();
  const byPartner = new Map<string, any>();
  for (const dm of dms) {
    const partnerId = String(dm.sender?._id) === String(userId) ? String(dm.recipient?._id) : String(dm.sender?._id);
    if (!partnerId || byPartner.has(partnerId)) continue;
    const partner = String(dm.sender?._id) === String(userId) ? dm.recipient : dm.sender;
    byPartner.set(partnerId, {
      partnerId,
      partnerName: partner?.name ?? "Unknown",
      partnerEmail: partner?.email ?? "",
      partnerRole: partner?.role ?? "",
      lastMessage: String(dm.text ?? "").slice(0, 120),
      lastAt: dm.createdAt,
    });
  }
  return Array.from(byPartner.values());
};

export const getThread = async (userId: any, partnerId: string) => {
  const dms: any[] = await DmMessage.find({
    $or: [
      { sender: userId, recipient: partnerId },
      { sender: partnerId, recipient: userId },
    ],
    verdict: { $ne: "blocked" },
  })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();
  return dms.map((dm) => ({
    _id: dm._id,
    fromMe: String(dm.sender) === String(userId),
    text: dm.text,
    verdict: dm.verdict,
    at: dm.createdAt,
  }));
};

// ─── User moderation self-view + appeal ───────────────────────────────
export const getMyModerationStatus = async (userId: any) => {
  const state = await getSenderModerationState(userId);
  const cases: any[] = await DmCase.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("kind rules status penalty appeal createdAt")
    .lean();
  return {
    frozen: state.frozen,
    frozenCaseId: state.frozenCaseId,
    suspended: state.suspended,
    suspensionUntil: state.suspensionUntil,
    softStrikesInWindow: state.history.filter(
      (h) => h.kind === "soft_flag" && new Date(h.at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length,
    cases: cases.map((c) => ({
      _id: c._id,
      kind: c.kind,
      rules: c.rules,
      status: c.status,
      penalty: c.penalty,
      appeal: c.appeal,
      createdAt: c.createdAt,
    })),
  };
};

export const submitAppeal = async (userId: any, caseId: string, appealText: string) => {
  const text = String(appealText ?? "").trim();
  if (!text) throw new Error("An appeal message is required.");
  const found: any = await DmCase.findOne({ _id: caseId, user: userId });
  if (!found) throw new Error("Case not found.");
  if ((found as any).appeal?.text) throw new Error("An appeal has already been submitted for this case.");
  (found as any).appeal = { text, submittedAt: new Date() };
  await (found as any).save();
  await notifyAllAdmins(
    "DALE moderation: appeal submitted",
    `A user submitted a written appeal for a moderation case. Review it in the moderation queue.`,
    { source: "dm-moderation", caseId: String(found._id), repeatAllowed: true }
  );
  return { submitted: true, caseId: String(found._id) };
};

// ─── Admin moderation queue ───────────────────────────────────────────
// Privacy: the list NEVER contains message text. Detail access (flagged
// message + context window) is logged on the case + in the ActivitiesLog
// (TINASHA audit) every single time.
export const adminListCases = async (status?: string) => {
  const filter = status === "open" || status === "resolved" ? { status } : {};
  const cases: any[] = await DmCase.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "name email role")
    .select("kind rules status chatFrozen penalty appeal createdAt strikeCountAtCreation")
    .lean();
  return cases.map((c) => ({
    _id: c._id,
    kind: c.kind,
    rules: c.rules,
    status: c.status,
    chatFrozen: c.chatFrozen,
    penalty: c.penalty,
    appeal: c.appeal ? { submittedAt: c.appeal.submittedAt, text: c.appeal.text } : null,
    user: c.user ? { _id: (c.user as any)._id, name: (c.user as any).name, email: (c.user as any).email, role: (c.user as any).role } : null,
    createdAt: c.createdAt,
    strikeCountAtCreation: c.strikeCountAtCreation,
  }));
};

export const adminGetCase = async (adminId: any, caseId: string) => {
  const found: any = await DmCase.findById(caseId)
    .populate("user", "name email role")
    .populate("dm")
    .lean();
  if (!found) throw new Error("Case not found.");
  // TINASHA audit — log EVERY admin access to flagged content.
  await DmCase.updateOne(
    { _id: caseId },
    { $push: { accessedBy: { admin: adminId, at: new Date() } } }
  );
  await ActivitiesLog.create({
    user: new mongoose.Types.ObjectId(String(adminId)),
    action: "DALE moderation case content viewed",
    details: `Admin viewed flagged DM case ${caseId} (kind: ${found.kind}, rules: ${(found.rules ?? []).join(", ")}).`,
  });
  return {
    _id: found._id,
    kind: found.kind,
    rules: found.rules,
    status: found.status,
    chatFrozen: found.chatFrozen,
    penalty: found.penalty,
    resolution: found.resolution,
    appeal: found.appeal,
    createdAt: found.createdAt,
    user: found.user,
    message: (found.dm as any)?.text ?? null,
    contextWindow: (found.contextWindow ?? []).map((item: any) => ({
      text: item.text,
      at: item.at,
    })),
    accessedByCount: (found.accessedBy ?? []).length,
  };
};

export const adminResolveCase = async (
  adminId: any,
  caseId: string,
  input: {
    penaltyLevel?: number;
    suspensionHours?: number | null;
    deviationReason?: string;
    note?: string;
    unfreeze?: boolean;
  },
  now = new Date()
) => {
  const found: any = await DmCase.findById(caseId);
  if (!found) throw new Error("Case not found.");
  if (found.status === "resolved") throw new Error("Case already resolved.");
  if (input.deviationReason !== undefined && !String(input.deviationReason ?? "").trim() && (input.penaltyLevel ?? found.penalty?.level ?? 1) !== found.penalty?.level) {
    throw new Error("A deviation reason is required when changing the suggested penalty.");
  }

  const level = Number(input.penaltyLevel ?? found.penalty?.level ?? 1);
  if (![1, 2, 3, 4].includes(level)) throw new Error("penaltyLevel must be 1, 2, 3 or 4.");
  const hours = input.suspensionHours !== undefined ? input.suspensionHours : (found.penalty?.suspensionUntil && found.penalty.suspensionUntil > now ? Math.ceil((new Date(found.penalty.suspensionUntil).getTime() - now.getTime()) / 36e5) : null);
  const suspensionUntil = hours ? new Date(now.getTime() + Number(hours) * 60 * 60 * 1000) : null;

  found.status = "resolved";
  found.chatFrozen = input.unfreeze === false ? true : false;
  found.resolution = {
    penaltyLevel: level,
    suspensionUntil,
    deviationReason: input.deviationReason ? String(input.deviationReason).trim() : null,
    note: input.note ? String(input.note).trim() : null,
    resolvedBy: adminId,
    resolvedAt: now,
  };
  await found.save();

  const user: any = await User.findById(found.user).select("name role").lean();
  const penaltyLabels: Record<number, string> = {
    1: "written warning",
    2: `${hours ?? 48}h chat suspension`,
    3: `${hours ?? 168}h chat suspension`,
    4: "semester-long chat ban + referral to the institutional disciplinary committee",
  };
  const userMessage =
    `A moderator has resolved your moderation case: ${penaltyLabels[level]}` +
    (suspensionUntil ? ` (until ${suspensionUntil.toLocaleString()})` : "") +
    (input.note ? `. Note: ${input.note}` : "") +
    (found.appeal?.text ? `. Your appeal was reviewed.` : "");
  await notifyUser(found.user, String(user?.role ?? "student"), "DALE moderation: case resolved", userMessage, {
    source: "dm-moderation",
    caseId: String(found._id),
    repeatAllowed: true,
  });

  return {
    resolved: true,
    caseId: String(found._id),
    penaltyLevel: level,
    suspensionUntil,
  };
};

// ─── Admin transparency (design point 7) ──────────────────────────────
// An admin who enables their own chat/DMs has their system-level actions
// made visible to other admins (credibility + mutual oversight).
export const getAdminTransparencyFeed = async (limit = 50) => {
  const transparentAdmins: any[] = await DmChatSetting.find({ chatEnabled: true })
    .select("user")
    .lean();
  const adminIds = transparentAdmins.map((s) => s.user);
  if (adminIds.length === 0) return { transparentAdmins: [], actions: [] };
  const actions: any[] = await ActivitiesLog.find({ user: { $in: adminIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name email")
    .lean();
  return {
    transparentAdmins: adminIds.map(String),
    actions: actions.map((a) => ({
      _id: a._id,
      admin: (a.user as any)?.name ?? "Admin",
      action: a.action,
      details: a.details ?? null,
      at: a.createdAt,
    })),
  };
};

// ─── Weekly auto-clear (design point 6) ───────────────────────────────
// The TTL index removes un-preserved DMs; this sweep is the backstop that
// also double-checks preservation marks (flagged/escalation evidence and
// pending cases) BEFORE any deletion.
export const runDmAutoClear = async (now = new Date()) => {
  // 1. Preservation sweep: anything flagged or tied to an open case stays.
  const flagged = await DmMessage.updateMany(
    { $or: [{ verdict: { $in: ["soft_flagged", "blocked"] } }, { preserved: true }] },
    { $set: { preserved: true, expiresAt: null } }
  );
  const openCaseDms: any[] = await DmCase.find({ status: "open" }).select("dm").lean();
  const openIds = openCaseDms.map((c) => c.dm).filter(Boolean);
  if (openIds.length > 0) {
    await DmMessage.updateMany({ _id: { $in: openIds } }, { $set: { preserved: true, expiresAt: null } });
  }
  // 2. Backstop delete of anything expired that is NOT preserved.
  const cutoff = new Date(now.getTime() - DM_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await DmMessage.deleteMany({
    preserved: { $ne: true },
    createdAt: { $lt: cutoff },
  });
  return {
    preservedFlagged: flagged.modifiedCount ?? 0,
    preservedOpenCases: openIds.length,
    deleted: deleted.deletedCount ?? 0,
  };
};
