import { describe, expect, it } from "vitest";
import { shouldRenderVercelMonitoring } from "./VercelMonitoring";

describe("shouldRenderVercelMonitoring", () => {
  it("returns false outside production", () => {
    expect(shouldRenderVercelMonitoring(false)).toBe(false);
  });

  it("returns true in production", () => {
    expect(shouldRenderVercelMonitoring(true)).toBe(true);
  });
});
