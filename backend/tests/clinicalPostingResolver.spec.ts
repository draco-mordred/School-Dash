import { describe, expect, test } from "bun:test";
import {
  currentNudgeIndex,
  findGroupWindowForStudent,
  groupStudentIds,
  timeOnDay,
  windowCovers,
  NUDGE_LEAD_MS,
  NUDGE_INTERVAL_MS,
} from "../src/subs/latifah/clinicalPostingResolver";

const MINUTE_MS = 60 * 1000;

const groupRef = (over: any = {}) => ({
  group: {
    name: "Emergency O&G",
    students: [
      { _id: "6a11ce37d5f05867ff11aae4", name: "Success Oladele" },
      { _id: "6a11ce37d5f05867ff11aae5", name: "Chidi Okafor" },
    ],
  },
  assigned: [
    { startDate: "2026-01-05T00:00:00.000Z", endDate: "2026-02-02T00:00:00.000Z" },
    { startDate: "2026-10-20T00:00:00.000Z", endDate: "2026-10-31T00:00:00.000Z" },
  ],
  supervisor: "507f1f77bcf86cd799439099",
  supervisorName: "Dr. Ada",
  ...over,
});

describe("groupStudentIds (H1)", () => {
  test("extracts ids from student objects", () => {
    expect(groupStudentIds(groupRef())).toEqual([
      "6a11ce37d5f05867ff11aae4",
      "6a11ce37d5f05867ff11aae5",
    ]);
  });

  test("accepts plain-id entries", () => {
    const ids = groupStudentIds({ group: { students: ["abc123", { _id: "def456" }] } });
    expect(ids).toEqual(["abc123", "def456"]);
  });

  test("returns empty for missing/malformed groups", () => {
    expect(groupStudentIds({})).toEqual([]);
    expect(groupStudentIds(null)).toEqual([]);
    expect(groupStudentIds({ group: { students: "nope" } })).toEqual([]);
  });
});

describe("windowCovers (H1)", () => {
  test("inclusive on both boundaries", () => {
    const w = [{ startDate: "2026-10-20T00:00:00.000Z", endDate: "2026-10-31T00:00:00.000Z" }];
    expect(windowCovers(w, new Date("2026-10-20T00:00:00.000Z"))).toBe(true);
    expect(windowCovers(w, new Date("2026-10-31T00:00:00.000Z"))).toBe(true);
    expect(windowCovers(w, new Date("2026-10-19T23:59:59.000Z"))).toBe(false);
    expect(windowCovers(w, new Date("2026-10-31T00:00:01.000Z"))).toBe(false);
  });

  test("no windows means not covered", () => {
    expect(windowCovers([], new Date())).toBe(false);
    expect(windowCovers(undefined, new Date())).toBe(false);
  });
});

describe("findGroupWindowForStudent (H1)", () => {
  test("matches a member inside an assigned window", () => {
    const hit = findGroupWindowForStudent(
      [groupRef()],
      "6a11ce37d5f05867ff11aae4",
      new Date("2026-10-25T00:00:00.000Z"),
    );
    expect(hit).not.toBeNull();
    expect(hit!.groupRef.group.name).toBe("Emergency O&G");
  });

  test("ignores non-members", () => {
    const hit = findGroupWindowForStudent(
      [groupRef()],
      "ffffffffffffffffffffffff",
      new Date("2026-10-25T00:00:00.000Z"),
    );
    expect(hit).toBeNull();
  });

  test("ignores members whose window has expired", () => {
    const hit = findGroupWindowForStudent(
      [groupRef()],
      "6a11ce37d5f05867ff11aae4",
      new Date("2026-06-01T00:00:00.000Z"),
    );
    expect(hit).toBeNull();
  });
});

describe("timeOnDay (H3)", () => {
  test("builds a same-day local Date from HH:MM", () => {
    const d = timeOnDay("14:30", new Date(2026, 9, 26));
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });

  test("rejects malformed times", () => {
    expect(timeOnDay("25:00", new Date())).toBeNull();
    expect(timeOnDay("", new Date())).toBeNull();
    expect(timeOnDay("noon", new Date())).toBeNull();
  });
});

describe("currentNudgeIndex (H3)", () => {
  const end = new Date(2026, 9, 26, 16, 0); // 16:00 local

  test("null before 15 minutes before the scheduled end", () => {
    expect(currentNudgeIndex(new Date(end.getTime() - NUDGE_LEAD_MS - 1), end)).toBeNull();
    expect(currentNudgeIndex(new Date(end.getTime() - 60 * MINUTE_MS), end)).toBeNull();
  });

  test("slot 0 from 15-minutes-before until 15 minutes after the end", () => {
    expect(currentNudgeIndex(new Date(end.getTime() - NUDGE_LEAD_MS), end)).toBe(0);
    expect(currentNudgeIndex(new Date(end.getTime() - 5 * MINUTE_MS), end)).toBe(0);
    expect(currentNudgeIndex(end, end)).toBe(0);
  });

  test("slot 1 at end + 15 min, slot 2 at end + 45 min", () => {
    expect(
      currentNudgeIndex(new Date(end.getTime() - NUDGE_LEAD_MS + NUDGE_INTERVAL_MS), end),
    ).toBe(1);
    expect(
      currentNudgeIndex(new Date(end.getTime() - NUDGE_LEAD_MS + 2 * NUDGE_INTERVAL_MS), end),
    ).toBe(2);
  });

  test("null past the 4-hour cap after the scheduled end", () => {
    expect(currentNudgeIndex(new Date(end.getTime() + 4 * 60 * MINUTE_MS - 1), end)).not.toBeNull();
    expect(currentNudgeIndex(new Date(end.getTime() + 4 * 60 * MINUTE_MS + 1), end)).toBeNull();
  });
});
