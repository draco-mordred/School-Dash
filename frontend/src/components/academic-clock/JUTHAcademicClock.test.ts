import { describe, expect, it } from "vitest";
import { getAcademicClockHeading } from "./JUTHAcademicClock";

describe("getAcademicClockHeading", () => {
  it("uses the institution name in the clock heading", () => {
    expect(getAcademicClockHeading("University of Jos")).toBe("University of Jos Class Clocks");
  });

  it("falls back to Institution when no name is provided", () => {
    expect(getAcademicClockHeading()).toBe("Institution Class Clocks");
  });
});
