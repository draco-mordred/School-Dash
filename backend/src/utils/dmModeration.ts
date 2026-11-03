// ─── PR M2 — DM moderation: deterministic rule engine + penalty ladder ───
// Pure functions only (no DB, no AI) so the whole ladder is unit-testable.
// Deterministic rules classify FIRST; the service may then escalate to an
// AI evaluation pass (Mistral → Gemini chain) for a second opinion before
// enforcing a penalty (user-confirmed M2 flow).

export type ModerationVerdict = "pass" | "soft_flag" | "hard_block";

export interface MessageClassification {
  verdict: ModerationVerdict;
  rules: string[];
}

export interface PenaltyDecision {
  level: 1 | 2 | 3 | 4;
  label: string;
  /** null = no suspension, just a written warning */
  suspensionHours: number | null;
  referral: boolean;
}

export interface ModerationHistoryEntry {
  kind: "soft_flag" | "hard_block";
  at: Date | string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Deterministic keyword rule sets (role-based, per locked design point 8).
// HARD = not delivered + chat-wide freeze + auto escalation report.
const HARD_RULES: Record<string, string[]> = {
  threats: [
    "kill you",
    "kill yourself",
    "i will hurt you",
    "i'll hurt you",
    "beat you up",
    "you will die",
    "you'll die",
    "end your life",
  ],
  harassment: [
    "you are worthless",
    "nobody likes you",
    "nobody would miss you",
    "you should disappear",
    "send nudes",
    "i will find you",
  ],
};

// SOFT = delivered + sender caution + logged; 3 strikes in 30 days escalates.
const SOFT_RULES: Record<string, string[]> = {
  profanity: ["fuck", "shit", "damn", "bastard", "wtf", "asshole", "bitch"],
  insults: ["stupid", "idiot", "fool", "moron", "dumb", "useless person"],
  spam: ["buy now", "click this link", "make money fast", "forex signals", "betting tips", "crypto giveaway"],
};

const containsAny = (text: string, phrases: string[]): string[] => {
  const matched: string[] = [];
  for (const phrase of phrases) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase.toLowerCase())}([^a-z0-9]|$)`, "i");
    if (pattern.test(text)) matched.push(phrase);
  }
  return matched;
};

export const extractMentionEmail = (text: string): string | null => {
  if (!text) return null;
  // Supports "@user@school.edu", "@+user@school.edu" and "@user@school.edu"
  const match = text.match(/@\+?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (!match) return null;
  return match[1].toLowerCase();
};

export const stripMention = (text: string): string => {
  return String(text ?? "")
    .replace(/@\+?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
    .trim();
};

export const isStaffRole = (role?: string): boolean =>
  ["teacher", "unitconsultant", "unitresident"].includes(String(role ?? "").trim().toLowerCase());

// Classify a message with the deterministic rule engine.
// `strict` (staff→student power-imbalance sensitivity): every soft rule is
// treated as hard, and mild profanity/insults are never delivered.
export const classifyMessage = (
  text: string,
  options: { strict?: boolean } = {}
): MessageClassification => {
  const normalized = ` ${String(text ?? "").toLowerCase().replace(/\s+/g, " ")} `;
  const hardRules: string[] = [];
  const softRules: string[] = [];

  for (const [rule, phrases] of Object.entries(HARD_RULES)) {
    if (containsAny(normalized, phrases).length > 0) hardRules.push(rule);
  }
  for (const [rule, phrases] of Object.entries(SOFT_RULES)) {
    if (containsAny(normalized, phrases).length > 0) softRules.push(rule);
  }

  if (hardRules.length > 0) {
    return { verdict: "hard_block", rules: hardRules };
  }
  if (softRules.length > 0) {
    return options.strict
      ? { verdict: "hard_block", rules: [...softRules, "power_imbalance_escalation"] }
      : { verdict: "soft_flag", rules: softRules };
  }
  return { verdict: "pass", rules: [] };
};

export const STRIKE_WINDOW_DAYS = 30;

export const countRecentSoftStrikes = (
  history: ModerationHistoryEntry[],
  now: Date = new Date()
): number => {
  const cutoff = now.getTime() - STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return history.filter(
    (entry) => entry.kind === "soft_flag" && new Date(entry.at).getTime() >= cutoff
  ).length;
};

export const countHardBlocks = (history: ModerationHistoryEntry[]): number =>
  history.filter((entry) => entry.kind === "hard_block").length;

// Penalty ladder (locked design point 9):
//   L1 first soft flag        → written warning + acknowledgment
//   L2 3 soft flags / 30 days → 24-72h chat suspension (48h default)
//   L3 first hard block       → 7-day chat suspension
//   L4 repeat hard block / threats → semester-long ban + disciplinary referral
// Admins may deviate with a recorded reason at resolution time.
export const nextPenaltyFor = (
  verdict: Exclude<ModerationVerdict, "pass">,
  history: ModerationHistoryEntry[],
  now: Date = new Date()
): PenaltyDecision => {
  if (verdict === "hard_block") {
    if (countHardBlocks(history) >= 1) {
      return {
        level: 4,
        label: "Semester-long chat ban + referral to the institutional disciplinary committee",
        suspensionHours: 24 * 120,
        referral: true,
      };
    }
    return { level: 3, label: "7-day chat suspension", suspensionHours: 24 * 7, referral: false };
  }
  const softInWindow = countRecentSoftStrikes(history, now);
  if (softInWindow + 1 >= 3) {
    return { level: 2, label: "24-72h chat suspension", suspensionHours: 48, referral: false };
  }
  return { level: 1, label: "Written warning", suspensionHours: null, referral: false };
};

export interface ActivePenalty {
  suspensionUntil: Date | string | null;
}

export const isPenaltyActive = (
  penalty: ActivePenalty | null | undefined,
  now: Date = new Date()
): boolean => {
  if (!penalty?.suspensionUntil) return false;
  return new Date(penalty.suspensionUntil).getTime() > now.getTime();
};

// Weekly auto-clear preservation whitelist (locked design point 6):
// flagged messages, escalation evidence and pending-report cases beat the TTL.
export const shouldPreserveDm = (dm: {
  verdict: string;
  preserved?: boolean;
  hasOpenCase?: boolean;
}): boolean => {
  if (dm.preserved) return true;
  if (dm.verdict === "soft_flag" || dm.verdict === "soft_flagged" || dm.verdict === "blocked") return true;
  if (dm.hasOpenCase) return true;
  return false;
};

export const DM_RETENTION_DAYS = 7;
