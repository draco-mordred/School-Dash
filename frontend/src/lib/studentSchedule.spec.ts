// PR F — vitest suite for the student schedule pure helpers (PRs E1/E2).
import { describe, expect, it } from "vitest";
import {
  WEEKDAY_NAMES,
  getTodayDayLabel,
  getScheduleForDay,
  buildMonthViewDays,
  buildClinicalActivityMonthDays,
} from "./studentSchedule";

const mondaySchedule: any = { day: "Monday", periods: [{ _id: "p1" }] };

describe("getTodayDayLabel", () => {
  it("maps weekday numbers to names (Monday-first)", () => {
    // 2026-11-01 is a Sunday, 2026-11-02 a Monday, 2026-11-07 a Saturday
    expect(getTodayDayLabel(new Date(2026, 10, 2))).toBe("Monday");
    expect(getTodayDayLabel(new Date(2026, 10, 3))).toBe("Tuesday");
    expect(getTodayDayLabel(new Date(2026, 10, 7))).toBe("Saturday");
    expect(getTodayDayLabel(new Date(2026, 10, 1))).toBe("Sunday");
  });

  it("exposes the Monday-first weekday list", () => {
    expect(WEEKDAY_NAMES[0]).toBe("Monday");
    expect(WEEKDAY_NAMES[6]).toBe("Sunday");
  });
});

describe("getScheduleForDay", () => {
  it("matches case-insensitively", () => {
    const data: any[] = [{ day: "monday", periods: [] }];
    expect(getScheduleForDay(data, "Monday")).toBe(data[0]);
    expect(getScheduleForDay(data, "MONDAY")).toBe(data[0]);
  });

  it("returns undefined when nothing matches", () => {
    expect(getScheduleForDay([{ day: "Tuesday", periods: [] }] as any[], "Monday")).toBeUndefined();
    expect(getScheduleForDay(undefined, "Monday")).toBeUndefined();
  });
});

describe("buildMonthViewDays", () => {
  // November 2026: 30 days, the 1st is a Sunday -> 6 leading offset cells
  it("builds leading offset cells with dayNumber 0", () => {
    const cells = buildMonthViewDays({ year: 2026, month: 10 });
    expect(cells).toHaveLength(36);
    expect(cells.slice(0, 6).every((c) => c.dayNumber === 0 && !c.isCurrentMonth)).toBe(true);
    expect(cells[6].dayNumber).toBe(1);
  });

  it("marks hasLecture for EVERY matching weekday, not just today's", () => {
    const cells = buildMonthViewDays({ year: 2026, month: 10, scheduleData: [mondaySchedule] });
    const mondays = cells.filter((c) => c.isCurrentMonth && c.date.getDay() === 1);
    expect(mondays).toHaveLength(5); // Nov 2026 has 5 Mondays
    expect(mondays.every((c) => c.hasLecture)).toBe(true);
    const tuesdays = cells.filter((c) => c.isCurrentMonth && c.date.getDay() === 2);
    expect(tuesdays.every((c) => !c.hasLecture)).toBe(true);
  });

  it("absent wins when a day has mixed records; late/excused count as present", () => {
    const cells = buildMonthViewDays({
      year: 2026,
      month: 10,
      scheduleData: [mondaySchedule],
      attendanceRecords: [
        { date: "2026-11-02", status: "present" },
        { date: "2026-11-02", status: "absent" },
        { date: "2026-11-09", status: "late" },
        { date: "2026-11-16", status: "excused" },
      ],
    });
    const byDay: Record<number, string> = {};
    cells.filter((c) => c.isCurrentMonth).forEach((c) => { byDay[c.dayNumber] = c.status; });
    expect(byDay[2]).toBe("absent");
    expect(byDay[9]).toBe("present");
    expect(byDay[16]).toBe("present");
  });

  it("forces status unknown on days with no lectures", () => {
    const cells = buildMonthViewDays({
      year: 2026,
      month: 10,
      scheduleData: [mondaySchedule],
      attendanceRecords: [{ date: "2026-11-03", status: "present" }], // a Tuesday
    });
    const tuesday = cells.find((c) => c.isCurrentMonth && c.dayNumber === 3);
    expect(tuesday && tuesday.status).toBe("unknown");
  });

  it("flags the today cell", () => {
    const today = new Date(2026, 10, 2);
    const cells = buildMonthViewDays({ year: 2026, month: 10, today });
    expect(cells.find((c) => c.isCurrentMonth && c.dayNumber === 2)?.isToday).toBe(true);
    expect(cells.find((c) => c.isCurrentMonth && c.dayNumber === 3)?.isToday).toBe(false);
  });
});

describe("buildClinicalActivityMonthDays", () => {
  it("maps activities to their calendar day with enriched fields", () => {
    const cells = buildClinicalActivityMonthDays({
      year: 2026,
      month: 10,
      activities: [
        { _id: "a1", entryDate: "2026-11-05T09:00:00", unit: { name: "Antenatal Clinic" } } as any,
        { _id: "a2", entryDate: "2026-11-05T14:00:00", title: "Ward round" } as any,
      ],
    });
    const day5 = cells.find((c) => c.isCurrentMonth && c.dayNumber === 5);
    expect(day5 && day5.hasActivities).toBe(true);
    expect(day5 && day5.activityCount).toBe(2);
    expect(day5 && day5.activities[0].title).toBe("Antenatal Clinic"); // unit name fallback
    expect(day5 && day5.activities[1].title).toBe("Ward round");
    expect(day5 && day5.activities[0].supervisor).toBe("Supervisor pending");
    expect(day5 && day5.activities[0].status).toBe("pending");
  });

  it("derives status from clinical flags", () => {
    const cells = buildClinicalActivityMonthDays({
      year: 2026,
      month: 10,
      activities: [
        { _id: "a1", entryDate: "2026-11-05T09:00:00", clinicsAttended: true } as any,
        { _id: "a2", entryDate: "2026-11-06T09:00:00", callDutyCompleted: true } as any,
        { _id: "a3", entryDate: "2026-11-07T09:00:00", approvedBy: { name: "Dr. Bello" } } as any,
      ],
    });
    const get = (n: number) => cells.find((c) => c.isCurrentMonth && c.dayNumber === n);
    expect(get(5)?.activities[0].status).toBe("attended");
    expect(get(6)?.activities[0].status).toBe("partial");
    expect(get(7)?.activities[0].supervisor).toBe("Dr. Bello");
  });
});
