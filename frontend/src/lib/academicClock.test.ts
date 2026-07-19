// @ts-nocheck
import { describe, expect, it } from "vitest";

import { buildInitialPhasePlan, getClockPhaseId, normalizePhasePlan } from "./academicClock";

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

  it("uses a class-specific phase plan when provided", () => {
    const startDate = new Date("2024-01-01T00:00:00.000Z");
    const phaseTwoDate = new Date("2025-01-15T00:00:00.000Z");

    const classPhasePlan = [
      { id: "phase1", durationMonths: 12 },
      { id: "phase2", durationMonths: 2 },
    ] as const;

    expect(getClockPhaseId(startDate, phaseTwoDate, classPhasePlan)).toBe("phase2");
  });
});

describe("normalizePhasePlan", () => {
  it("returns an empty array for missing plan data", () => {
    expect(normalizePhasePlan(undefined)).toEqual([]);
  });

  it("fills missing values with safe defaults", () => {
    expect(normalizePhasePlan([{ id: "phase-1", name: "Custom", durationMonths: 3 } as any])).toEqual([
      {
        id: "phase-1",
        name: "Custom",
        durationMonths: 3,
        color: "#3B82F6",
        subPostings: [],
      },
    ]);
  });
});

describe("buildInitialPhasePlan", () => {
  it("returns no phases unless the user opts into the template", () => {
    expect(buildInitialPhasePlan({ className: "500 Level", useTemplate: false })).toEqual([]);
  });

  it("loads a class-level template plan when requested", () => {
    const plan = buildInitialPhasePlan({ className: "500 Level", useTemplate: true });

    expect(plan).toHaveLength(4);
    expect(plan[0]).toMatchObject({
      id: "phase1",
      name: expect.stringContaining("O&G"),
    });
  });

  it("preserves an existing saved plan", () => {
    const existingPlan = [
      {
        id: "phase-custom",
        name: "Custom phase",
        durationMonths: 3,
        color: "#123456",
        subPostings: ["One"],
      },
    ];

    expect(buildInitialPhasePlan({ className: "500 Level", useTemplate: true, existingPlan })).toEqual(existingPlan);
  });
});
