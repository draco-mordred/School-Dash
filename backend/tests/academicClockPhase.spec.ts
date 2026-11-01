import { describe, expect, test } from "bun:test";
import {
  phaseRequiresPostingSchedule,
  hasConfiguredAcademicClockPhases,
  resolveAcademicClockPhase,
  resolveClockPhaseWindowById,
} from "../src/utils/academicClockPhase";

// PR F — tests for the class-clock phase math behind PR #54 (clock-synced
// posting generation) and the phase-required-posting heuristics.
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_DAYS = 30; // academic clock months are 30 days

describe("phaseRequiresPostingSchedule", () => {
  test("explicit postingType means a posting is required", () => {
    expect(phaseRequiresPostingSchedule({ postingType: "OG_PEDS" })).toBe(true);
  });

  test("clinical keywords in the phase name match", () => {
    expect(phaseRequiresPostingSchedule({ name: "O&G senior postings" })).toBe(true);
    expect(phaseRequiresPostingSchedule({ name: "Paediatrics rotation" })).toBe(true);
    expect(phaseRequiresPostingSchedule({ name: "Electives & community health" })).toBe(true);
  });

  test("clinical sub-postings count even with a plain name", () => {
    expect(phaseRequiresPostingSchedule({ name: "Block A", subPostings: ["Ward rounds"] })).toBe(true);
  });

  test("pure lecture phase does not require a posting", () => {
    expect(phaseRequiresPostingSchedule({ name: "Lectures and tutorials" })).toBe(false);
  });

  test("explicit boolean overrides the keyword heuristic", () => {
    expect(phaseRequiresPostingSchedule({ name: "Clinical postings", requiresPostingSchedule: false })).toBe(false);
    expect(phaseRequiresPostingSchedule({ name: "Lectures", requiresPostingSchedule: true })).toBe(true);
  });

  test("null/undefined phases are safe", () => {
    expect(phaseRequiresPostingSchedule(null)).toBe(false);
    expect(phaseRequiresPostingSchedule(undefined)).toBe(false);
  });
});

describe("hasConfiguredAcademicClockPhases", () => {
  test("object config with entries", () => {
    expect(hasConfiguredAcademicClockPhases({ p1: { name: "P1", duration: 3 } })).toBe(true);
  });

  test("array config with entries", () => {
    expect(hasConfiguredAcademicClockPhases([{ id: "p1", name: "P1", duration: 3 }])).toBe(true);
  });

  test("empty or missing config", () => {
    expect(hasConfiguredAcademicClockPhases({})).toBe(false);
    expect(hasConfiguredAcademicClockPhases([])).toBe(false);
    expect(hasConfiguredAcademicClockPhases(null)).toBe(false);
    expect(hasConfiguredAcademicClockPhases(undefined)).toBe(false);
  });
});

describe("resolveAcademicClockPhase", () => {
  const clock = {
    clockStartDate: "2026-01-01T00:00:00.000Z",
    phaseConfig: [
      { id: "p1", name: "Phase 1", duration: 2 },
      { id: "p2", name: "Phase 2", duration: 3 },
      { id: "p3", name: "Phase 3", duration: 1 },
    ],
  };

  test("sequential windows are duration x 30 days, contiguous", () => {
    const start = new Date(clock.clockStartDate);
    const r1 = resolveAcademicClockPhase(clock, new Date(start.getTime() + DAY_MS));
    expect(r1.phaseId).toBe("p1");
    expect(r1.startsAt && r1.startsAt.getTime()).toBe(start.getTime());
    expect(r1.endsAt && r1.endsAt.getTime()).toBe(start.getTime() + 2 * MONTH_DAYS * DAY_MS);

    // one day into phase 2
    const r2 = resolveAcademicClockPhase(clock, new Date(start.getTime() + (2 * MONTH_DAYS + 1) * DAY_MS));
    expect(r2.phaseId).toBe("p2");
    expect(r2.startsAt && r2.startsAt.getTime()).toBe(start.getTime() + 2 * MONTH_DAYS * DAY_MS);

    // last day of the whole clock (still inside p3)
    const r3 = resolveAcademicClockPhase(clock, new Date(start.getTime() + (6 * MONTH_DAYS - 1) * DAY_MS));
    expect(r3.phaseId).toBe("p3");
  });

  test("before the first phase resolves to the first phase", () => {
    const r = resolveAcademicClockPhase(clock, new Date("2025-01-01T00:00:00.000Z"));
    expect(r.phaseId).toBe("p1");
  });

  test("after the last phase resolves to the last phase", () => {
    const r = resolveAcademicClockPhase(clock, new Date("2030-01-01T00:00:00.000Z"));
    expect(r.phaseId).toBe("p3");
  });

  test("a paused clock freezes at clockPausedAt", () => {
    const pausedAt = new Date("2026-02-15T00:00:00.000Z");
    const r = resolveAcademicClockPhase({ ...clock, clockIsPaused: true, clockPausedAt: pausedAt.toISOString() }, new Date("2027-06-01T00:00:00.000Z"));
    expect(r.phaseId).toBe("p1"); // 45 days in is still inside the 60-day first phase
  });

  test("no start date falls back to the stored phase with null windows", () => {
    const r = resolveAcademicClockPhase({ clockPhase: "p2", phaseConfig: clock.phaseConfig }, new Date());
    expect(r.phaseId).toBe("p2");
    expect(r.startsAt).toBeNull();
    expect(r.endsAt).toBeNull();
  });

  test("zero-duration phases are skipped", () => {
    const r = resolveAcademicClockPhase({
      clockStartDate: "2026-01-01T00:00:00.000Z",
      phaseConfig: [
        { id: "bad", name: "Broken", duration: 0 },
        { id: "good", name: "Good", duration: 2 },
      ],
    }, new Date("2026-01-05T00:00:00.000Z"));
    expect(r.phaseId).toBe("good");
  });
});

describe("resolveClockPhaseWindowById", () => {
  const clock = {
    clockStartDate: "2026-01-01T00:00:00.000Z",
    phaseConfig: [
      { id: "p1", name: "Phase 1", duration: 2 },
      { id: "p2", name: "Phase 2", duration: 3 },
    ],
  };

  test("resolves the second phase window regardless of now", () => {
    const w = resolveClockPhaseWindowById(clock, "p2");
    expect(w).not.toBeNull();
    const start = new Date(clock.clockStartDate).getTime();
    expect(w && w.startsAt.getTime()).toBe(start + 2 * MONTH_DAYS * DAY_MS);
    expect(w && w.endsAt.getTime()).toBe(start + 5 * MONTH_DAYS * DAY_MS);
    expect(w && w.name).toBe("Phase 2");
  });

  test("object-style phase config also resolves by key", () => {
    const w = resolveClockPhaseWindowById(
      { clockStartDate: "2026-01-01T00:00:00.000Z", phaseConfig: { pA: { name: "A", duration: 1 } } },
      "pA",
    );
    expect(w && w.name).toBe("A");
  });

  test("unknown phase id returns null", () => {
    expect(resolveClockPhaseWindowById(clock, "nope")).toBeNull();
  });

  test("null/undefined phase id returns null", () => {
    expect(resolveClockPhaseWindowById(clock, null)).toBeNull();
    expect(resolveClockPhaseWindowById(clock, undefined)).toBeNull();
  });

  test("no start date returns null", () => {
    expect(resolveClockPhaseWindowById({ phaseConfig: clock.phaseConfig }, "p1")).toBeNull();
  });

  test("durationMonths key is accepted as an alias", () => {
    const w = resolveClockPhaseWindowById(
      { clockStartDate: "2026-01-01T00:00:00.000Z", phaseConfig: [{ id: "m", durationMonths: 2 }] },
      "m",
    );
    expect(w && w.endsAt.getTime() - w.startsAt.getTime()).toBe(2 * MONTH_DAYS * DAY_MS);
  });
});
