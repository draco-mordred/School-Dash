import { describe, expect, it } from "vitest";
import { shouldShowAdminDashboardSkeleton } from "../lib/dashboardState";

describe("shouldShowAdminDashboardSkeleton", () => {
  it("does not keep the admin dashboard in a skeleton when loading is done and data is still unavailable", () => {
    expect(shouldShowAdminDashboardSkeleton(true, true, true, null)).toBe(true);
    expect(shouldShowAdminDashboardSkeleton(false, true, true, null)).toBe(true);
    expect(shouldShowAdminDashboardSkeleton(false, true, false, null)).toBe(false);
    expect(shouldShowAdminDashboardSkeleton(false, true, false, { hello: "world" } as any)).toBe(false);
    expect(shouldShowAdminDashboardSkeleton(false, false, false, null)).toBe(false);
  });
});
