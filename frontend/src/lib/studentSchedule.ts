import type { schedule } from "@/types";

export type StudentScheduleViewMode = "day" | "month";
export type AttendanceStatus = "present" | "absent" | "late" | "excused" | "unknown";

export interface StudentMonthDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasLecture: boolean;
  status: AttendanceStatus;
}

export interface StudentClinicalActivityLike {
  _id: string;
  entryDate: string;
  title?: string;
  unit?: { name?: string; department?: string } | null;
  umbrellaCategory?: string;
  clinicsAttended?: boolean;
  wardRoundsAttended?: string;
  callDutyCompleted?: boolean;
  approvedBy?: { name?: string; designation?: string } | null;
  approvedAt?: string;
  status?: "attended" | "partial" | "pending";
  supervisor?: string;
  timeLabel?: string;
}

export interface StudentClinicalMonthDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasActivities: boolean;
  activityCount: number;
  activities: StudentClinicalActivityLike[];
}

export interface StudentAttendanceRecordLike {
  date?: string | Date | null;
  status?: string | null;
}

export const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const getTodayDayLabel = (date = new Date()) => {
  const dayIndex = date.getDay();
  const normalized = dayIndex === 0 ? 6 : dayIndex - 1;
  return WEEKDAY_NAMES[normalized];
};

export const getScheduleForDay = (scheduleData: schedule[] | undefined, dayLabel: string) => {
  const normalized = dayLabel.toLowerCase();
  return scheduleData?.find((entry) => entry.day.toLowerCase() === normalized);
};

const normalizeAttendanceStatus = (status?: string | null): AttendanceStatus => {
  switch (status?.toLowerCase()) {
    case "present":
    case "late":
    case "excused":
      return "present";
    case "absent":
      return "absent";
    default:
      return "unknown";
  }
};

const formatDateKey = (value: Date | string) => {
  const normalized = value instanceof Date ? value : new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().split("T")[0];
};

export const buildMonthViewDays = ({
  year,
  month,
  scheduleData,
  attendanceRecords,
  activeDayName,
  today = new Date(),
}: {
  year: number;
  month: number;
  scheduleData?: schedule[];
  attendanceRecords?: StudentAttendanceRecordLike[];
  activeDayName: string;
  today?: Date;
}): StudentMonthDay[] => {
  const normalizedActiveDay = activeDayName.toLowerCase();
  const attendanceMap = new Map<string, AttendanceStatus>();

  attendanceRecords?.forEach((record) => {
    if (!record.date) return;
    const dateValue = new Date(record.date);
    if (Number.isNaN(dateValue.getTime())) return;
    attendanceMap.set(formatDateKey(dateValue), normalizeAttendanceStatus(record.status));
  });

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDayOfMonth.getDay() + 6) % 7;

  const cells: StudentMonthDay[] = [];

  for (let index = 0; index < offset; index += 1) {
    cells.push({
      date: new Date(year, month, index - offset + 1),
      dayNumber: 0,
      isCurrentMonth: false,
      isToday: false,
      hasLecture: false,
      status: "unknown",
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dayLabel = WEEKDAY_NAMES[(date.getDay() + 6) % 7];
    const normalizedDayLabel = dayLabel.toLowerCase();
    const hasLecture = normalizedDayLabel === normalizedActiveDay;
    const dateKey = formatDateKey(date);
    const status = attendanceMap.get(dateKey) ?? "unknown";

    cells.push({
      date,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: formatDateKey(date) === formatDateKey(today),
      hasLecture,
      status: hasLecture ? status : "unknown",
    });
  }

  return cells;
};

export const buildClinicalActivityMonthDays = ({
  year,
  month,
  activities = [],
  today = new Date(),
}: {
  year: number;
  month: number;
  activities?: StudentClinicalActivityLike[];
  today?: Date;
}): StudentClinicalMonthDay[] => {
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDayOfMonth.getDay() + 6) % 7;
  const cells: StudentClinicalMonthDay[] = [];

  for (let index = 0; index < offset; index += 1) {
    cells.push({
      date: new Date(year, month, index - offset + 1),
      dayNumber: 0,
      isCurrentMonth: false,
      isToday: false,
      hasActivities: false,
      activityCount: 0,
      activities: [],
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const matchingActivities = activities
      .filter((activity) => formatDateKey(activity.entryDate) === dateKey)
      .map((activity) => ({
        ...activity,
        title: activity.title ?? activity.unit?.name ?? activity.umbrellaCategory ?? "Clinical activity",
        supervisor: activity.supervisor ?? activity.approvedBy?.name ?? "Supervisor pending",
        timeLabel: activity.timeLabel ?? (activity.entryDate ? new Date(activity.entryDate).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }) : "Time pending"),
        status: activity.status ?? (activity.clinicsAttended ? "attended" : activity.callDutyCompleted || activity.wardRoundsAttended ? "partial" : "pending"),
      }));

    cells.push({
      date,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: formatDateKey(date) === formatDateKey(today),
      hasActivities: matchingActivities.length > 0,
      activityCount: matchingActivities.length,
      activities: matchingActivities,
    });
  }

  return cells;
};
