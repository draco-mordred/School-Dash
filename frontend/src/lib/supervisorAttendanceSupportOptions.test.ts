import { describe, expect, it } from "vitest";
import { loadSupervisorAttendanceSupportOptions } from "./supervisorAttendanceSupportOptions";

describe("loadSupervisorAttendanceSupportOptions", () => {
  it("falls back to empty values when a support-options request fails", async () => {
    const result = await loadSupervisorAttendanceSupportOptions(
      async () => {
        throw new Error("classes unavailable");
      },
      async () => ({ data: { year: { _id: "year-123" } } }),
    );

    expect(result.classes).toEqual([]);
    expect(result.currentAcademicYearId).toBe("year-123");
  });
});
