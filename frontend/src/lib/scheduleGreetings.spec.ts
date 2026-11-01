// PR F — vitest suite for the deterministic greeting pickers (PR #44).
import { describe, expect, it } from "vitest";
import {
  WEEKEND_GREETINGS,
  NEW_WEEK_GREETINGS,
  pickWeekendGreeting,
  pickNewWeekGreeting,
  isWeekend,
  isMonday,
  WEEKDAY_NAMES_FULL,
} from "./scheduleGreetings";

describe("greeting pools", () => {
  it("have the documented sizes with no duplicates", () => {
    expect(WEEKEND_GREETINGS).toHaveLength(50);
    expect(new Set(WEEKEND_GREETINGS).size).toBe(50);
    expect(NEW_WEEK_GREETINGS).toHaveLength(12);
    expect(new Set(NEW_WEEK_GREETINGS).size).toBe(12);
  });
});

describe("pickWeekendGreeting", () => {
  const day = new Date(2026, 10, 7); // Saturday

  it("is deterministic for the same user on the same day", () => {
    expect(pickWeekendGreeting("u1", day)).toBe(pickWeekendGreeting("u1", day));
  });

  it("always returns a greeting from the pool", () => {
    expect(WEEKEND_GREETINGS).toContain(pickWeekendGreeting("u1", day));
    expect(WEEKEND_GREETINGS).toContain(pickWeekendGreeting(null, day));
  });

  it("varies across users and days", () => {
    const perUser = ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"].map((u) => pickWeekendGreeting(u, day));
    expect(new Set(perUser).size).toBeGreaterThanOrEqual(2);
    const perDay = [0, 1, 2, 3, 4, 5].map((d) => pickWeekendGreeting("u1", new Date(2026, 10, 7 + d)));
    expect(new Set(perDay).size).toBeGreaterThanOrEqual(2);
  });
});

describe("pickNewWeekGreeting", () => {
  const monday = new Date(2026, 10, 2); // Monday

  it("is deterministic and drawn from the new-week pool", () => {
    expect(pickNewWeekGreeting("u1", monday)).toBe(pickNewWeekGreeting("u1", monday));
    expect(NEW_WEEK_GREETINGS).toContain(pickNewWeekGreeting("u1", monday));
    expect(NEW_WEEK_GREETINGS).toContain(pickNewWeekGreeting(undefined, monday));
  });
});

describe("day helpers", () => {
  it("flags weekends and Mondays", () => {
    expect(isWeekend(new Date(2026, 10, 7))).toBe(true);  // Saturday
    expect(isWeekend(new Date(2026, 10, 8))).toBe(true);  // Sunday
    expect(isWeekend(new Date(2026, 10, 2))).toBe(false); // Monday
    expect(isMonday(new Date(2026, 10, 2))).toBe(true);
    expect(isMonday(new Date(2026, 10, 7))).toBe(false);
  });

  it("exposes the Sunday-first weekday list", () => {
    expect(WEEKDAY_NAMES_FULL[0]).toBe("Sunday");
    expect(WEEKDAY_NAMES_FULL[6]).toBe("Saturday");
  });
});
