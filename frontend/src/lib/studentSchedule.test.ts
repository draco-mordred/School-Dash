import { describe, expect, it } from "vitest";
import { buildClinicalActivityMonthDays, buildMonthViewDays, getTodayDayLabel } from "./studentSchedule";

describe("student schedule helpers", () => {
  it("returns the expected weekday label for a fixed date", () => {
    expect(getTodayDayLabel(new Date("2026-07-06T12:00:00.000Z"))).toBe("Monday");
  });

  it("marks matching lecture days and maps attendance statuses in month view", () => {
    const cells = buildMonthViewDays({
      year: 2026,
      month: 6,
      scheduleData: [{ day: "Monday", periods: [] }],
      attendanceRecords: [
        { date: "2026-07-06", status: "present" },
        { date: "2026-07-13", status: "absent" },
      ],
      activeDayName: "Monday",
      today: new Date("2026-07-06T12:00:00.000Z"),
    });

    const mondaySixth = cells.find((entry) => entry.dayNumber === 6);
    const mondayThirteenth = cells.find((entry) => entry.dayNumber === 13);

    expect(mondaySixth?.hasLecture).toBe(true);
    expect(mondaySixth?.status).toBe("present");
    expect(mondayThirteenth?.hasLecture).toBe(true);
    expect(mondayThirteenth?.status).toBe("absent");
  });

  it("groups clinical activities into month cells with summaries", () => {
    const cells = buildClinicalActivityMonthDays({
      year: 2026,
      month: 6,
      activities: [
        {
          _id: "1",
          entryDate: "2026-07-06T09:00:00.000Z",
          umbrellaCategory: "MEDICINE",
          unit: { name: "Ward 12", department: "Medicine" },
          clinicsAttended: true,
          wardRoundsAttended: "Completed",
          callDutyCompleted: false,
          approvedBy: { name: "Dr. Ada", designation: "Consultant" },
          approvedAt: "2026-07-06T11:00:00.000Z",
        },
      ],
      today: new Date("2026-07-06T12:00:00.000Z"),
    });

    const julySixth = cells.find((entry) => entry.dayNumber === 6);

    expect(julySixth?.hasActivities).toBe(true);
    expect(julySixth?.activityCount).toBe(1);
    expect(julySixth?.activities[0]?.title).toBe("Ward 12");
    expect(julySixth?.activities[0]?.status).toBe("attended");
  });
});
