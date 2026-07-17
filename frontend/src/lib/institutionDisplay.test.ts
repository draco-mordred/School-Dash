import { describe, expect, it } from "vitest";
import { getInstitutionDisplayName, getInstitutionSubtitle } from "./institutionDisplay";

describe("institutionDisplay", () => {
  it("prefers the institution name and falls back to a placeholder when none exists", () => {
    expect(getInstitutionDisplayName({ name: "University of Jos", shortName: "UJ" })).toBe("University of Jos");
    expect(getInstitutionDisplayName({ shortName: "UJ" })).toBe("UJ");
    expect(getInstitutionDisplayName({})).toBe("Institution");
  });

  it("builds a concise subtitle from the configured institution context", () => {
    expect(getInstitutionSubtitle({ city: "Jos", state: "Plateau" }, "2025/2026")).toBe("Jos, Plateau · 2025/2026");
    expect(getInstitutionSubtitle({}, "2025/2026")).toBe("2025/2026");
  });
});
