import { describe, expect, test } from "bun:test";
import {
  classifyMessage,
  extractMentionEmail,
  stripMention,
  isStaffRole,
  countRecentSoftStrikes,
  countHardBlocks,
  nextPenaltyFor,
  isPenaltyActive,
  shouldPreserveDm,
  DM_RETENTION_DAYS,
} from "../src/utils/dmModeration";

describe("PR M2 — mention parsing", () => {
  test("extracts @email mention", () => {
    expect(extractMentionEmail("hey @student@unijos.edu.ng hello")).toBe("student@unijos.edu.ng");
  });
  test("extracts @+email mention", () => {
    expect(extractMentionEmail("hi @+teacher@school.edu ping")).toBe("teacher@school.edu");
  });
  test("returns null without a mention", () => {
    expect(extractMentionEmail("just a normal message")).toBeNull();
    expect(extractMentionEmail("")).toBeNull();
  });
  test("bare emails are not mentions", () => {
    expect(extractMentionEmail("email me at student@unijos.edu.ng")).toBeNull();
  });
  test("stripMention removes the mention but keeps the body", () => {
    expect(stripMention("@student@school.edu can we meet tomorrow?")).toBe("can we meet tomorrow?");
  });
});

describe("PR M2 — deterministic classification", () => {
  test("clean message passes", () => {
    expect(classifyMessage("See you at the ward round at 8am").verdict).toBe("pass");
  });
  test("mild profanity is a soft flag", () => {
    const result = classifyMessage("this shit is hard");
    expect(result.verdict).toBe("soft_flag");
    expect(result.rules).toContain("profanity");
  });
  test("threats are a hard block", () => {
    const result = classifyMessage("I will hurt you if you come to class");
    expect(result.verdict).toBe("hard_block");
    expect(result.rules).toContain("threats");
  });
  test("harassment is a hard block", () => {
    expect(classifyMessage("nobody likes you anyway").verdict).toBe("hard_block");
  });
  test("word boundaries: substring words do not trip rules", () => {
    expect(classifyMessage("classification of the shotgun approach").verdict).toBe("pass");
  });
  test("strict mode upgrades soft rules to hard (staff→student power imbalance)", () => {
    const result = classifyMessage("you are stupid for missing clinic", { strict: true });
    expect(result.verdict).toBe("hard_block");
    expect(result.rules).toContain("power_imbalance_escalation");
  });
  test("isStaffRole identifies staff roles", () => {
    expect(isStaffRole("teacher")).toBe(true);
    expect(isStaffRole("unitconsultant")).toBe(true);
    expect(isStaffRole("student")).toBe(false);
    expect(isStaffRole("admin")).toBe(false);
  });
});

describe("PR M2 — strike counting", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  test("counts only soft strikes within the 30-day window", () => {
    const history = [
      { kind: "soft_flag" as const, at: daysAgo(5) },
      { kind: "soft_flag" as const, at: daysAgo(10) },
      { kind: "soft_flag" as const, at: daysAgo(45) },
      { kind: "hard_block" as const, at: daysAgo(2) },
    ];
    expect(countRecentSoftStrikes(history, now)).toBe(2);
    expect(countHardBlocks(history)).toBe(1);
  });
});

describe("PR M2 — penalty ladder", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  test("L1: first soft flag is a written warning (no suspension)", () => {
    const p = nextPenaltyFor("soft_flag", [], now);
    expect(p.level).toBe(1);
    expect(p.suspensionHours).toBeNull();
    expect(p.referral).toBe(false);
  });
  test("L2: third soft flag in 30 days triggers a 24-72h suspension", () => {
    const history = [
      { kind: "soft_flag" as const, at: daysAgo(5) },
      { kind: "soft_flag" as const, at: daysAgo(10) },
    ];
    const p = nextPenaltyFor("soft_flag", history, now);
    expect(p.level).toBe(2);
    expect(p.suspensionHours).toBeGreaterThanOrEqual(24);
    expect(p.suspensionHours).toBeLessThanOrEqual(72);
  });
  test("L3: first hard block is a 7-day suspension", () => {
    const p = nextPenaltyFor("hard_block", [], now);
    expect(p.level).toBe(3);
    expect(p.suspensionHours).toBe(24 * 7);
  });
  test("L4: repeat hard block is a semester ban + disciplinary referral", () => {
    const history = [{ kind: "hard_block" as const, at: daysAgo(40) }];
    const p = nextPenaltyFor("hard_block", history, now);
    expect(p.level).toBe(4);
    expect(p.referral).toBe(true);
    expect(p.suspensionHours).toBeGreaterThanOrEqual(24 * 100);
  });
  test("soft strikes outside the window do not escalate to L2", () => {
    const history = [
      { kind: "soft_flag" as const, at: daysAgo(40) },
      { kind: "soft_flag" as const, at: daysAgo(60) },
    ];
    expect(nextPenaltyFor("soft_flag", history, now).level).toBe(1);
  });
});

describe("PR M2 — penalty state + preservation whitelist", () => {
  test("suspension is active only until the deadline", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    const until = new Date("2026-11-04T12:00:00Z");
    expect(isPenaltyActive({ suspensionUntil: until }, now)).toBe(true);
    expect(isPenaltyActive({ suspensionUntil: new Date("2026-11-01T00:00:00Z") }, now)).toBe(false);
    expect(isPenaltyActive({ suspensionUntil: null }, now)).toBe(false);
    expect(isPenaltyActive(null, now)).toBe(false);
  });
  test("flagged messages + open cases beat the weekly TTL", () => {
    expect(shouldPreserveDm({ verdict: "soft_flagged" })).toBe(true);
    expect(shouldPreserveDm({ verdict: "blocked" })).toBe(true);
    expect(shouldPreserveDm({ verdict: "delivered", hasOpenCase: true })).toBe(true);
    expect(shouldPreserveDm({ verdict: "delivered" })).toBe(false);
    expect(shouldPreserveDm({ verdict: "delivered", preserved: true })).toBe(true);
  });
  test("DM retention is 7 days", () => {
    expect(DM_RETENTION_DAYS).toBe(7);
  });
});
