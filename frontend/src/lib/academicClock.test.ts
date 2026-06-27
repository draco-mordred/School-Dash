// @ts-nocheck
import { describe, expect, it } from "bun:test";

import { getClockPhaseId } from "./academicClock";

describe("getClockPhaseId", () => {
  it("returns phase2 once the clock has passed the first four months", () => {
    const startDate = new Date("2024-01-01T00:00:00.000Z");
    const specialtyStartDate = new Date("2024-05-01T00:00:00.000Z");

    expect(getClockPhaseId(startDate, specialtyStartDate)).toBe("phase2");
  });

  it("returns phase1 before the specialty postings phase begins", () => {
    const startDate = new Date("2024-01-01T00:00:00.000Z");
    const phaseOneDate = new Date("2024-03-01T00:00:00.000Z");

    expect(getClockPhaseId(startDate, phaseOneDate)).toBe("phase1");
  });
});
