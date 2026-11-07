import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  invalidateAdminData,
  useAdminClassOptions,
  useAdminRotationEvents,
  useAdminTimetable,
} from "@/lib/adminData";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Search from "@/components/global/Search";
import type { schedule } from "@/types";
import DayTimelineWindows from "@/components/calendar/DayTimelineWindows";
import MonthViewCalendar from "@/components/calendar/MonthViewCalendar";
import DayPopupBubble from "@/components/calendar/DayPopupBubble";
import DayGroupsBoard from "@/components/calendar/DayGroupsBoard";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";

type ClassItem = { _id: string; name: string };
type ApiRotationEvent = {
  id?: string;
  scheduleId?: string;
  postingId?: string;
  postingName?: string;
  startDate?: string;
  endDate?: string;
  status?: KnownStatus;
  completed?: boolean;
  supervisorName?: string;
};
type PostingWindow = {
  id: string;
  scheduleId?: string;
  postingId?: string;
  postingName?: string;
  startDate: string;
  endDate: string;
  status?: KnownStatus;
  supervisorName?: string;
  supervisorId?: string;
  completed?: boolean;
};

type SelectedEvent = {
  id: string;
  title: string;
  start?: Date | null;
  end?: Date | null;
  startDate?: string;
  endDate?: string;
  scheduleId?: string;
  extendedProps?: { status?: KnownStatus; scheduleId?: string };
  status?: KnownStatus;
  postingId?: string;
  postingName?: string;
  supervisorName?: string;
};

type DayLineItem = {
  id: string;
  title: string;
  postingName: string;
  time: string;
  type: "timetable" | "clinical" | "optional" | "other";
  status?:
    | "planned"
    | "ongoing"
    | "completed"
    | "assigned"
    | "cancelled"
    | "default";
};

type DayLineItemsMap = Record<
  string,
  { timetable?: DayLineItem; clinical?: DayLineItem; optional?: DayLineItem }
>;

const statusMetadata: Record<
  string,
  { label: string; badgeClasses: string; dotClass: string; borderClass: string }
> = {
  active: {
    label: "Active",
    badgeClasses: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
    borderClass: "border-emerald-500",
  },
  planned: {
    label: "Planned",
    badgeClasses: "bg-sky-100 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
    borderClass: "border-sky-500",
  },
  ongoing: {
    label: "Ongoing",
    badgeClasses: "bg-amber-100 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
    borderClass: "border-amber-500",
  },
  completed: {
    label: "Completed",
    badgeClasses: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
    borderClass: "border-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    badgeClasses: "bg-rose-100 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
    borderClass: "border-rose-500",
  },
  assigned: {
    label: "Assigned",
    badgeClasses: "bg-violet-100 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
    borderClass: "border-violet-500",
  },
  upcoming: {
    label: "Upcoming",
    badgeClasses: "bg-indigo-100 text-indigo-700 border-indigo-200",
    dotClass: "bg-indigo-500",
    borderClass: "border-indigo-500",
  },
  default: {
    label: "Scheduled",
    badgeClasses: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-500",
    borderClass: "border-slate-500",
  },
};

const statusOptions = [
  { key: "planned", label: "Planned" },
  { key: "ongoing", label: "Ongoing" },
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "assigned", label: "Assigned" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

type KnownStatus =
  | "planned"
  | "ongoing"
  | "active"
  | "completed"
  | "assigned"
  | "upcoming"
  | "cancelled"
  | "default";

const normalizeStatus = (status?: string): KnownStatus => {
  if (status && statusOptions.some((option) => option.key === status)) {
    return status as KnownStatus;
  }
  return "default";
};

const computeEventStatus = (event: PostingWindow): KnownStatus => {
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const rawStatus = String(event.status || "").toLowerCase();

  if (rawStatus === "cancelled" || rawStatus === "canceled") return "cancelled";
  if (rawStatus === "completed" || event.completed) return "completed";
  if (rawStatus === "assigned") return "assigned";
  if (rawStatus === "upcoming") return "upcoming";
  if (now >= start && now <= end) return "active";
  if (end < now) return "completed";
  if (rawStatus === "planned") return "planned";
  return "default";
};

const canCancelActivity = (event: PostingWindow) => {
  if (computeEventStatus(event) === "cancelled") return false;
  const now = new Date();
  const start = new Date(event.startDate);
  const diffMs = start.getTime() - now.getTime();
  return diffMs >= 2 * 60 * 60 * 1000 && diffMs <= 48 * 60 * 60 * 1000;
};

export default function ClinicalSchedules() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [events, setEvents] = useState<PostingWindow[]>([]);
  const [timetableClinicalPeriodTime, setTimetableClinicalPeriodTime] =
    useState<{ startTime: string; endTime: string } | null>(null);
  const [timetableSchedule, setTimetableSchedule] = useState<schedule[]>([]);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toISOString(),
  );
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(
    null,
  );
  const [openDetails, setOpenDetails] = useState(false);
  const [supervisorOptions, setSupervisorOptions] = useState<
    Array<{ _id: string; name: string; role?: string }>
  >([]);
  const [assignSupervisorId, setAssignSupervisorId] = useState<string>("");
  useEffect(() => {
    if (!openDetails) return;
    let cancelled = false;
    Promise.all(
      ["unitconsultant", "unitresident", "teacher"].map((role) =>
        api
          .get("/users", { params: { role, limit: 200 } })
          .then((res) => res.data?.users ?? [])
          .catch(() => []),
      ),
    ).then((results) => {
      if (cancelled) return;
      const all = (results as any[]).flat();
      const seen = new Set<string>();
      const unique = all.filter(
        (u: { _id?: string }) =>
          u?._id && !seen.has(u._id) && seen.add(u._id),
      );
      setSupervisorOptions(
        unique.map((u: any) => ({
          _id: u._id,
          name: u.name || u.fullName || u.email || u._id,
          role: u.role,
        })),
      );
      setAssignSupervisorId("");
    });
    return () => {
      cancelled = true;
    };
  }, [openDetails]);

  // Full posting layout (department groups -> unit groups) for the
  // selected class, from GET /rotation-schedules/class/:classId/posting-layout.
  // Loaded in EVERY view — the day board AND the posting list's current
  // posting / active groups strip both read it.
  useEffect(() => {
    if (!selectedClass) return;
    let cancelled = false;
    setPostingLayoutLoading(true);
    api
      .get(`/rotation-schedules/class/${selectedClass}/posting-layout`)
      .then((res) => {
        if (!cancelled) setPostingLayout(res.data?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setPostingLayout(null);
      })
      .finally(() => {
        if (!cancelled) setPostingLayoutLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, selectedClass]);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(
    null,
  );
  const [postingLayout, setPostingLayout] = useState<any>(null);
  const [postingLayoutLoading, setPostingLayoutLoading] = useState(false);
  const classesResource = useAdminClassOptions();
  const timetableResource = useAdminTimetable(selectedClass);
  const scheduleRange = useMemo(() => {
    if (!selectedClass) return null;
    const current = new Date(currentDate);
    if (Number.isNaN(current.getTime())) return null;
    let start: Date;
    let end: Date;
    if (view === "day") {
      start = new Date(current);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else if (view === "week") {
      const day = current.getDay();
      start = new Date(current);
      start.setDate(current.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
    } else {
      start = new Date(current.getFullYear(), current.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    }
    return { start, end };
  }, [currentDate, selectedClass, view]);
  const eventsResource = useAdminRotationEvents(
    selectedClass,
    scheduleRange?.start ?? null,
    scheduleRange?.end ?? null,
  );
  const loadingClasses = classesResource.isLoading;

  // Popup & timetable state
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [popupAnchorEl, setPopupAnchorEl] = useState<HTMLElement | null>(null);
  const [isDayHovered, setIsDayHovered] = useState(false);
  const [isPopupHovered, setIsPopupHovered] = useState(false);

  const hoveredDaySchedule = useMemo(() => {
    if (!hoveredDay) return null;
    const dayOfWeek = hoveredDay.toLocaleDateString("en-US", {
      weekday: "long",
    });
    return (
      timetableSchedule.find(
        (day) => day.day.toLowerCase() === dayOfWeek.toLowerCase(),
      ) ?? null
    );
  }, [hoveredDay, timetableSchedule]);

  const popupLectures = useMemo(() => {
    if (!hoveredDaySchedule) return [];
    return hoveredDaySchedule.periods
      .filter((p) => !p.isClinical && !p.isOptional)
      .map((p) => ({
        time: `${p.startTime} - ${p.endTime}`,
        subject: p.subject?.name,
        code: p.subject?.code,
        lecturer: p.lecturer?.name,
      }));
  }, [hoveredDaySchedule]);

  const popupOptionalLectures = useMemo(() => {
    if (!hoveredDaySchedule) return [];
    return hoveredDaySchedule.periods
      .filter((p) => p.isOptional)
      .map((p) => ({
        time: `${p.startTime} - ${p.endTime}`,
        subject: p.displayLabel || p.subject?.name || "Optional Activity",
        code: p.subject?.code,
        lecturer: p.lecturer?.name,
      }));
  }, [hoveredDaySchedule]);

  const popupClinicalPostings = useMemo(() => {
    if (!hoveredDay) return [];
    const dayStart = new Date(
      hoveredDay.getFullYear(),
      hoveredDay.getMonth(),
      hoveredDay.getDate(),
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const formatTime = (iso: string) =>
      new Date(iso).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    return events
      .filter(
        (evt) =>
          new Date(evt.startDate) < dayEnd && new Date(evt.endDate) >= dayStart,
      )
      .map((evt) => ({
        id: evt.id || "",
        time: `${formatTime(evt.startDate)} – ${formatTime(evt.endDate)}`,
        postingName: evt.postingName || "Clinical Activity",
        status: computeEventStatus(evt),
      }));
  }, [hoveredDay, events]);

  const handleExport = () => {
    const rows = ["Posting Window,Status,Start,End"];
    filteredEvents.forEach((event) => {
      rows.push(
        [
          event.postingName || "Unknown",
          event.status || "Scheduled",
          new Date(event.startDate).toLocaleString(),
          new Date(event.endDate).toLocaleString(),
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      );
    });
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "clinical-schedule-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDateChange = (value: string) => {
    setCurrentDate(value);
  };

  useEffect(() => {
    if (classesResource.error) {
      console.error("Failed to load classes", classesResource.error);
      return;
    }
    if (!classesResource.data) return;
    const list = classesResource.data
      .filter((item): item is typeof item & { _id: string; name: string } =>
        typeof item._id === "string" && typeof item.name === "string",
      )
      .map((item) => ({ _id: item._id, name: item.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setClasses(list);
    setSelectedClass((current) => current && list.some((item) => item._id === current)
      ? current
      : list[0]?._id ?? null);
  }, [classesResource.data, classesResource.error]);

  useEffect(() => {
    if (timetableResource.error) {
      console.error("Failed to load class timetable", timetableResource.error);
      setTimetableSchedule([]);
      setTimetableClinicalPeriodTime(null);
      return;
    }
    const rawSchedule = timetableResource.data?.schedule;
    const nextSchedule = Array.isArray(rawSchedule) ? rawSchedule as schedule[] : [];
    setTimetableSchedule(nextSchedule);
    const firstClinical = nextSchedule
      .flatMap((day) => day.periods)
      .find((period) => period.isClinical || period.displayLabel?.toLowerCase().includes("clinical"));
    setTimetableClinicalPeriodTime(
      firstClinical?.startTime && firstClinical.endTime
        ? { startTime: firstClinical.startTime, endTime: firstClinical.endTime }
        : null,
    );
  }, [timetableResource.data, timetableResource.error]);

  useEffect(() => {
    if (eventsResource.error) {
      console.error("Failed to load rotation schedule events", eventsResource.error);
      setEvents([]);
      return;
    }
    if (!eventsResource.data) return;
    const isRotationEvent = (item: unknown): item is ApiRotationEvent =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === "string" &&
      typeof (item as Record<string, unknown>).startDate === "string" &&
      typeof (item as Record<string, unknown>).endDate === "string";
    setEvents(eventsResource.data.filter(isRotationEvent).map((event) => ({
      id: event.id,
      scheduleId: event.scheduleId,
      postingId: event.postingId || event.postingName,
      postingName: event.postingName,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      completed: event.completed,
      supervisorName: event.supervisorName,
    })));
  }, [eventsResource.data, eventsResource.error]);

  const eventsWithTimetableTime = useMemo(() => {
    if (!timetableClinicalPeriodTime) return events;

    const parseDateOnly = (dateStr: string) => {
      const datePart = dateStr.split("T")[0];
      const [year, month, day] = datePart.split("-").map(Number);
      if ([year, month, day].some((num) => !Number.isFinite(num))) {
        return new Date(dateStr);
      }
      return new Date(year, month - 1, day);
    };

    return events.map((event) => {
      const hasTimeInfo =
        event.startDate.includes("T") &&
        !event.startDate.match(/T00:00(:00)?(\.000)?Z?$/);
      if (hasTimeInfo) return event;

      const [startHour, startMinute] = timetableClinicalPeriodTime.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = timetableClinicalPeriodTime.endTime
        .split(":")
        .map(Number);
      const rawStart = parseDateOnly(event.startDate);
      const rawEnd = parseDateOnly(event.endDate);
      const start = new Date(rawStart);
      start.setHours(startHour, startMinute, 0, 0);
      const end = new Date(rawEnd);
      end.setHours(endHour, endMinute, 0, 0);
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      return {
        ...event,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    });
  }, [events, timetableClinicalPeriodTime]);

  // Pseudo events from the CLASS TIMETABLE for the selected day, so the
  // existing day calendar shows lectures and clinical periods in their
  // proper time frames alongside the posting windows. Weekends with no
  // timetable periods produce nothing (weekend rule respected).
  const dayTimetableEvents = useMemo(() => {
    const d = new Date(currentDate);
    if (Number.isNaN(d.getTime())) return [];
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "long" });
    const scheduleForDay = timetableSchedule.find(
      (day) => day.day.toLowerCase() === dayLabel.toLowerCase(),
    );
    const periods = scheduleForDay?.periods ?? [];
    const toISO = (time: string) => {
      const dd = new Date(d);
      const [h, m] = time.split(":").map(Number);
      dd.setHours(h || 0, m || 0, 0, 0);
      return dd.toISOString();
    };
    return periods.map((period, idx) => ({
      id: `tt-${d.toISOString().split("T")[0]}-${idx}`,
      postingName:
        (period.isClinical
          ? "Clinical: "
          : period.isOptional
            ? "Optional: "
            : "Lecture: ") +
        (period.displayLabel ||
          period.subject?.name ||
          period.subject?.code ||
          "Class session"),
      startDate: toISO(period.startTime),
      endDate: toISO(period.endTime),
      status: period.isClinical
        ? "planned"
        : period.isOptional
          ? "default"
          : "assigned",
      supervisorName: period.lecturer?.name,
    }));
  }, [currentDate, timetableSchedule]);

  const filteredEvents = eventsWithTimetableTime.filter((event) => {
    const searchMatches =
      !searchText ||
      event.postingName?.toLowerCase().includes(searchText.toLowerCase());
    const statusMatches =
      statusFilter === "all" || (event.status || "default") === statusFilter;
    const postingMatches =
      !selectedPostingId || event.postingId === selectedPostingId;
    return searchMatches && statusMatches && postingMatches;
  });

  const dayViewEvents = useMemo(
    () => [...filteredEvents, ...dayTimetableEvents],
    [filteredEvents, dayTimetableEvents],
  );

  const monthDayLineItems = useMemo<DayLineItemsMap>(() => {
    const lineItems: DayLineItemsMap = {};
    const current = new Date(currentDate);
    const year = current.getFullYear();
    const month = current.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    const getKey = (date: Date) => date.toISOString().split("T")[0];
    const getDayOfWeek = (date: Date) =>
      date.toLocaleDateString("en-US", { weekday: "long" });

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayKey = getKey(date);
      const dayOfWeek = getDayOfWeek(date);
      const scheduleForDay = timetableSchedule.find(
        (scheduleDay) => scheduleDay.day === dayOfWeek,
      );
      if (scheduleForDay) {
        const timetablePeriod = scheduleForDay.periods.find(
          (period) => !period.isClinical && !period.isOptional,
        );
        const optionalPeriod = scheduleForDay.periods.find(
          (period) => period.isOptional,
        );

        if (timetablePeriod) {
          lineItems[dayKey] = {
            ...lineItems[dayKey],
            timetable: {
              id: `${dayKey}-timetable`,
              title:
                timetablePeriod.subject?.name ||
                timetablePeriod.displayLabel ||
                timetablePeriod.subject?.code ||
                "Class",
              postingName:
                timetablePeriod.subject?.name ||
                timetablePeriod.displayLabel ||
                timetablePeriod.subject?.code ||
                "Class",
              time: `${timetablePeriod.startTime} - ${timetablePeriod.endTime}`,
              type: "timetable",
            },
          };
        }

        if (optionalPeriod) {
          lineItems[dayKey] = {
            ...lineItems[dayKey],
            optional: {
              id: `${dayKey}-optional`,
              title:
                optionalPeriod.displayLabel ||
                optionalPeriod.subject?.name ||
                "Optional Activity",
              postingName:
                optionalPeriod.displayLabel ||
                optionalPeriod.subject?.name ||
                "Optional Activity",
              time: `${optionalPeriod.startTime} - ${optionalPeriod.endTime}`,
              type: "optional",
            },
          };
        }
      }

      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayEvents = filteredEvents.filter((event) => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        return eventStart < dayEnd && eventEnd >= dayStart;
      });

      if (dayEvents.length > 0) {
        const event = dayEvents[0];
        lineItems[dayKey] = {
          ...lineItems[dayKey],
          clinical: {
            id: event.id || `${dayKey}-clinical`,
            title: event.postingName || "Clinical Posting",
            postingName: event.postingName || "Clinical Posting",
            time: new Date(event.startDate).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            type: "clinical",
            status: computeEventStatus(event),
          },
        };
      }
    }

    return lineItems;
  }, [currentDate, filteredEvents, timetableSchedule]);

  const weekSchedule = useMemo(() => {
    const date = new Date(currentDate);
    const monday = new Date(date);
    const dayIndex = (date.getDay() + 6) % 7; // ensure Monday start
    monday.setDate(date.getDate() - dayIndex);
    monday.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);

      const dayLabel = dayDate.toLocaleDateString(undefined, {
        weekday: "long",
      });
      const dateLabel = dayDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const dayKey = dayDate.toISOString().split("T")[0];
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

      const scheduleForDay = timetableSchedule.find(
        (scheduleDay) =>
          scheduleDay.day.toLowerCase() === dayLabel.toLowerCase(),
      );
      const timetablePeriod = scheduleForDay?.periods.find(
        (period) => !period.isClinical && !period.isOptional,
      );
      const optionalPeriods =
        scheduleForDay?.periods.filter((period) => period.isOptional) ?? [];
      const clinicalPostings = filteredEvents
        .filter((event) => {
          const eventDate = new Date(event.startDate);
          return (
            eventDate.getFullYear() === dayDate.getFullYear() &&
            eventDate.getMonth() === dayDate.getMonth() &&
            eventDate.getDate() === dayDate.getDate()
          );
        })
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        )
        .map((event) => ({
          ...event,
          status: computeEventStatus(event),
          canCancel: canCancelActivity(event),
        }));

      return {
        dayDate,
        dayLabel,
        dateLabel,
        dayKey,
        isWeekend,
        timetablePeriod,
        optionalPeriods,
        clinicalPostings,
      };
    });
  }, [currentDate, filteredEvents, timetableSchedule]);

  // The class's CURRENT posting + the unit groups whose windows occur
  // within the 4-week window that today falls into (2 weeks back, 2
  // weeks ahead) — powers the "Current posting" strip in the posting
  // list card.
  const currentPostingInfo = useMemo(() => {
    const postings = postingLayout?.postings ?? [];
    const nowMs = Date.now();
    const windowStartMs = nowMs - 14 * 24 * 60 * 60 * 1000;
    const windowEndMs = nowMs + 14 * 24 * 60 * 60 * 1000;
    const current =
      postings.find(
        (p: any) =>
          p?.startDate &&
          p?.endDate &&
          new Date(p.startDate).getTime() <= nowMs &&
          nowMs <= new Date(p.endDate).getTime(),
      ) ?? null;
    if (!current) return null;
    const groups: Array<{
      key: string;
      label: string;
      deptName: string;
      supervisorName: string;
      studentCount: number;
      rangeLabel: string;
      activeNow: boolean;
      startMs: number;
    }> = [];
    for (const dept of current.departments ?? []) {
      for (const ug of dept.unitGroups ?? []) {
        for (const w of ug.windows ?? []) {
          if (!w?.startDate || !w?.endDate) continue;
          const sMs = new Date(w.startDate).getTime();
          const eMs = new Date(w.endDate).getTime();
          if (eMs < windowStartMs || sMs > windowEndMs) continue;
          groups.push({
            key:
              dept.departmentGroupIndex +
              "-" +
              ug.unitGroupIndex +
              "-" +
              w.startDate,
            label: ug.label || w.unitName || "Unit group",
            deptName: dept.name || "Department",
            supervisorName: w.supervisorName || "Supervisor unassigned",
            studentCount: Array.isArray(w.studentIds)
              ? w.studentIds.length
              : 0,
            rangeLabel:
              new Date(w.startDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }) +
              " \u2013 " +
              new Date(w.endDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
            activeNow: sMs <= nowMs && nowMs <= eMs,
            startMs: sMs,
          });
        }
      }
    }
    groups.sort((a, b) => a.startMs - b.startMs);
    return { current, groups: groups.slice(0, 12) };
  }, [postingLayout]);

  const groupedByPosting = useMemo(() => {
    const map = new Map<string, PostingWindow[]>();
    for (const e of filteredEvents) {
      const key = e.postingName || String(e.postingId || "Unknown");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const isActiveList = (windows: PostingWindow[]) =>
      windows.some(
        (w) =>
          new Date(w.startDate).getTime() <= Date.now() &&
          Date.now() <= new Date(w.endDate).getTime(),
      );
    return Array.from(map.entries()).sort(
      (a, b) => Number(isActiveList(b[1])) - Number(isActiveList(a[1])),
    );
  }, [filteredEvents]);

  const statusCounts = useMemo(() => {
    return filteredEvents.reduce<Record<string, number>>((acc, event) => {
      const status = event.status || "default";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredEvents]);

  const currentDateLabel = useMemo(() => {
    const date = new Date(currentDate);
    if (view === "month") {
      return date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }
    if (view === "week") {
      const start = new Date(date);
      const day = (date.getDay() + 6) % 7;
      start.setDate(date.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 4);
      return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [currentDate, view]);

  const goToToday = () => {
    setCurrentDate(new Date().toISOString());
  };

  const openPrintView = () => {
    window.print();
  };

  const stepDate = (direction: 1 | -1) => {
    const d = new Date(currentDate);
    if (Number.isNaN(d.getTime())) {
      setCurrentDate(new Date().toISOString());
      return;
    }
    if (view === "month") {
      d.setMonth(d.getMonth() + direction);
    } else {
      d.setDate(d.getDate() + direction);
    }
    setCurrentDate(d.toISOString());
  };
  const goToPrev = () => stepDate(-1);
  const goToNext = () => stepDate(1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clinical Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A calendar of each class's lectures and clinical activities.
          </p>
        </div>

      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Class selection</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pick a class and review its schedule.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              defaultValue={selectedClass || undefined}
              onValueChange={(v) => setSelectedClass(v)}
            >
              <TabsList className="mx-auto flex w-full max-w-full flex-wrap justify-center gap-2 overflow-x-auto pb-1 sm:flex-nowrap">
                {loadingClasses ? (
                  <div className="px-4 py-2">Loading…</div>
                ) : (
                  classes.map((c) => (
                    <TabsTrigger
                      key={c._id}
                      value={c._id}
                      className="min-w-[120px] whitespace-nowrap text-sm"
                    >
                      {c.name}
                    </TabsTrigger>
                  ))
                )}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Schedule controls</CardTitle>
              <p className="text-sm text-muted-foreground">
                Navigate the calendar, jump to the active posting, and focus
                what matters.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExport}>
                Export
              </Button>
              <Button size="sm" variant="outline" onClick={openPrintView}>
                Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const nowMs = Date.now();
                  const active = eventsWithTimetableTime.find(
                    (w) =>
                      new Date(w.startDate).getTime() <= nowMs &&
                      nowMs <= new Date(w.endDate).getTime(),
                  );
                  if (!active) {
                    toast.info("No active posting window covers today");
                    return;
                  }
                  setCurrentDate(new Date(active.startDate).toISOString());
                  setSelectedPostingId(active.postingId ?? null);
                }}
              >
                Jump to active posting
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Search
                value={searchText}
                onChange={setSearchText}
                placeholder="Search postings..."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <div className="h-5 w-5 rounded-md bg-muted/30" />
                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">
                      Jump to date
                    </span>
                    <Input
                      type="date"
                      value={currentDate.split("T")[0]}
                      onChange={(event) => handleDateChange(event.target.value)}
                      className="max-w-[200px]"
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Status filter
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-3 w-full">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Posting list</CardTitle>
              <p className="text-sm text-muted-foreground">
                Browse posting groups and focus the schedule.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredEvents.length} windows</span>
              <span className="hidden sm:inline">·</span>
              <button
                className="text-primary underline"
                type="button"
                onClick={() => setSelectedPostingId(null)}
              >
                Clear selection
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentPostingInfo && (
              <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-700">
                      Current posting
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {currentPostingInfo.current?.postingName ??
                        "No active posting covers today"}
                    </p>
                  </div>
                  {currentPostingInfo.current?.startDate &&
                    currentPostingInfo.current?.endDate && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          currentPostingInfo.current.startDate,
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {" \u2013 "}
                        {new Date(
                          currentPostingInfo.current.endDate,
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Active groups (4-week window around today)
                  </p>
                  {currentPostingInfo.groups.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No unit groups occur within the current 4-week window.
                    </p>
                  ) : (
                    currentPostingInfo.groups.map((g) => (
                      <div
                        key={g.key}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-foreground">
                            {g.label}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {g.deptName}
                          </span>
                          {g.activeNow && (
                            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Active now
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{g.studentCount} students</span>
                          <span>\u00b7</span>
                          <span>{g.supervisorName}</span>
                          <span>\u00b7</span>
                          <span>{g.rangeLabel}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {groupedByPosting.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No postings match these filters.
              </div>
            ) : (
              <div className="grid gap-3">
                {groupedByPosting.map(([postingName, windows]) => {
                  const postingId = windows[0]?.postingId ?? postingName;
                  const status = windows[0]?.status || "default";
                  const meta = statusMetadata[status] ?? statusMetadata.default;
                  const nowMs = Date.now();
                  const isActive = windows.some(
                    (w) =>
                      new Date(w.startDate).getTime() <= nowMs &&
                      nowMs <= new Date(w.endDate).getTime(),
                  );
                  return (
                    <button
                      key={postingName}
                      type="button"
                      onClick={() => setSelectedPostingId(postingId)}
                      className={`group w-full rounded-md border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg ${isActive ? "border-emerald-500/70 ring-1 ring-emerald-500/40" : ""} ${selectedPostingId === postingId ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/80"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">
                            {postingName}
                          </p>
                          {isActive && (
                            <span className="inline-flex w-fit items-center rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Active now
                            </span>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {windows.length} window
                              {windows.length === 1 ? "" : "s"}
                            </span>
                            <span className={"inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold " + meta.badgeClasses}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
                          {new Date(windows[0].startDate).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}{" "}
                          –{" "}
                          {new Date(windows[0].endDate).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </div>
                        <div className="rounded-2xl bg-muted/5 p-3 text-[11px] text-muted-foreground">
                          Supervisor: {windows[0]?.supervisorName ?? "TBD"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          id="classCalenderView"
          className="overflow-hidden rounded-3xl border border-border shadow-sm"
        >
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                {classes.find((c) => c._id === selectedClass)?.name ??
                  "Select a class"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentDateLabel}
              </p>
            </div>
            <div
              id="classCalenderViewControls"
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                size="sm"
                variant={view === "day" ? "default" : "outline"}
                onClick={() => setView("day")}
              >
                Day
              </Button>
              <Button
                size="sm"
                variant={view === "week" ? "default" : "outline"}
                onClick={() => setView("week")}
              >
                Week
              </Button>
              <Button
                size="sm"
                variant={view === "month" ? "default" : "outline"}
                onClick={() => setView("month")}
              >
                Month
              </Button>
              <Button size="sm" variant="outline" onClick={goToPrev}>
                Prev
              </Button>
              <Button size="sm" variant="outline" onClick={goToToday}>
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={goToNext}>
                Next
              </Button>
            </div>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-[0.14em]">
              Legend
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Lecture
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Other activity
            </span>
            {(() => {
              const present = Object.entries(statusCounts).filter(
                ([key]) => (statusCounts[key] ?? 0) > 0,
              );
              const keys = present.length
                ? present.map(([key]) => key)
                : ["planned", "ongoing", "completed"];
              return keys.map((key) => {
                const meta = statusMetadata[key] ?? statusMetadata.default;
                return (
                  <span key={key} className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
                    {meta.label} ({statusCounts[key] ?? 0})
                  </span>
                );
              });
            })()}
          </div>
          <CardContent className="p-0">
            <div className="min-h-[520px] overflow-hidden bg-background md:min-h-[700px] lg:min-h-[760px]">
              <div className="h-full relative">
                {view === "day" ? (
                  <>
                    <div className="border-b border-border">
                      <DayGroupsBoard
                        date={new Date(currentDate)}
                        layout={postingLayout}
                        loading={postingLayoutLoading}
                        dayTimetable={
                          timetableSchedule.find(
                            (day) =>
                              day.day.toLowerCase() ===
                              new Date(currentDate)
                                .toLocaleDateString("en-US", {
                                  weekday: "long",
                                })
                                .toLowerCase(),
                          ) ?? null
                        }
                      />
                    </div>
                    <DayTimelineWindows
                      events={dayViewEvents.map((e) => ({
                        id: e.id || "",
                        postingName: e.postingName || "Clinical activity",
                        startDate: e.startDate,
                        endDate: e.endDate,
                        status: normalizeStatus(e.status),
                        supervisorName: e.supervisorName,
                        isTimetable: (e.id || "").startsWith("tt-"),
                      }))}
                      date={currentDate}
                      onEventClick={(ev) => {
                        const full = dayViewEvents.find((x) => x.id === ev.id);
                        if (!full || !full.id || full.id.startsWith("tt-")) {
                          toast.info(
                            "Timetable periods come from the class timetable.",
                          );
                          return;
                        }
                        setSelectedEvent({
                          id: full.id,
                          title: full.postingName || "Clinical activity",
                          start: new Date(full.startDate),
                          end: new Date(full.endDate),
                          scheduleId: full.scheduleId,
                          postingId: full.postingId,
                          postingName: full.postingName,
                          status: normalizeStatus(full.status),
                          supervisorName: full.supervisorName,
                          extendedProps: {
                            status: normalizeStatus(full.status),
                            scheduleId: full.scheduleId,
                          },
                        });
                        setOpenDetails(true);
                      }}
                    />
                  </>
                ) : view === "month" ? (
                  <>
                    <div className="p-4">
                      <MonthViewCalendar
                        events={filteredEvents.map((e) => ({
                          id: e.id || "",
                          title: e.postingName || "",
                          start: e.startDate,
                          end: e.endDate,
                          extendedProps: { status: e.status },
                        }))}
                        currentDate={new Date(currentDate)}
                        dayLineItems={monthDayLineItems}
                        onDateSelect={(date) => {
                          setCurrentDate(date.toISOString());
                          setView("day");
                        }}
                        onMonthNavigate={(date) => {
                          setCurrentDate(date.toISOString());
                        }}
                        onDayHover={(
                          date,
                          _lineItems,
                          _activities,
                          anchorEl,
                        ) => {
                          setHoveredDay(date);
                          setPopupAnchorEl(anchorEl ?? null);
                          setIsDayHovered(true);
                        }}
                        onDayLeave={() => {
                          setIsDayHovered(false);
                        }}
                      />
                    </div>
                    <DayPopupBubble
                      date={hoveredDay || new Date()}
                      lectures={popupLectures}
                      optionalLectures={popupOptionalLectures}
                      clinicalPostings={popupClinicalPostings}
                      isVisible={
                        !!hoveredDay && (isDayHovered || isPopupHovered)
                      }
                      anchorEl={popupAnchorEl}
                      onClose={() => {
                        setHoveredDay(null);
                        setIsDayHovered(false);
                        setIsPopupHovered(false);
                      }}
                      onMouseEnter={() => setIsPopupHovered(true)}
                      onMouseLeave={() => setIsPopupHovered(false)}
                    />
                  </>
                ) : view === "week" ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {weekSchedule.map((day) => (
                      <div
                        key={day.dayKey}
                        className={`overflow-hidden rounded-[28px] border p-5 shadow-sm ${day.isWeekend ? "border-emerald-300/30 bg-emerald-950/50" : "border-border bg-card"}`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {day.dayLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {day.dateLabel}
                            </p>
                          </div>
                          {day.isWeekend ? (
                            <Badge variant="secondary">Weekend</Badge>
                          ) : (
                            <Badge variant="outline">Weekday</Badge>
                          )}
                        </div>

                        {day.isWeekend && (
                          <div className="mt-4 rounded-3xl border border-emerald-500/20 bg-emerald-950/80 p-4 text-sm text-emerald-100">
                            Weekend — lectures are not scheduled. Clinical
                            postings below still follow the posting schedule.
                          </div>
                        )}

                        <div className="mt-5 space-y-4">
                          <div className="rounded-3xl border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                Timetable
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {day.timetablePeriod ? "Planned" : "Empty"}
                              </span>
                            </div>
                            {day.timetablePeriod ? (
                              <div className="mt-3 space-y-2">
                                <p className="text-sm font-medium text-foreground">
                                  {day.timetablePeriod.subject?.name ||
                                    day.timetablePeriod.displayLabel ||
                                    day.timetablePeriod.subject?.code ||
                                    "Class session"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {day.timetablePeriod.startTime} –{" "}
                                  {day.timetablePeriod.endTime}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {day.timetablePeriod.lecturer?.name ??
                                    "Lecturer TBD"}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-muted-foreground">
                                No scheduled class for this day.
                              </p>
                            )}
                          </div>

                          <div className="rounded-3xl border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                Clinical postings
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {day.clinicalPostings.length} item
                                {day.clinicalPostings.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            {day.clinicalPostings.length > 0 ? (
                              <div className="mt-3 space-y-3">
                                {day.clinicalPostings.map((event) => {
                                  const status = normalizeStatus(event.status);
                                  const meta =
                                    statusMetadata[status] ??
                                    statusMetadata.default;
                                  return (
                                    <div
                                      key={
                                        event.id ||
                                        `${day.dayKey}-clinical-${event.startDate}`
                                      }
                                      className="rounded-3xl border border-border bg-card p-3"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-foreground">
                                          {event.postingName ||
                                            "Clinical activity"}
                                        </p>
                                        <span
                                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.badgeClasses}`}
                                        >
                                          {meta.label}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        {new Date(
                                          event.startDate,
                                        ).toLocaleTimeString(undefined, {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: true,
                                        })}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-muted-foreground">
                                No clinical postings are scheduled.
                              </p>
                            )}
                          </div>

                          <div className="rounded-3xl border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                Other activities
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {day.optionalPeriods.length} item
                                {day.optionalPeriods.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            {day.optionalPeriods.length > 0 ? (
                              <div className="mt-3 space-y-3">
                                {day.optionalPeriods.map((period) => (
                                  <div
                                    key={`${day.dayKey}-optional-${period.startTime}-${period.endTime}`}
                                    className="rounded-3xl border border-border bg-card p-3"
                                  >
                                    <p className="text-sm font-semibold text-foreground">
                                      {period.displayLabel ||
                                        period.subject?.name ||
                                        "Optional activity"}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {period.startTime} – {period.endTime}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-muted-foreground">
                                No other activities planned for this day.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Posting window details</DialogTitle>
            <DialogDescription>
              View and manage the selected posting window.
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div>
                <strong>{selectedEvent.title}</strong>
              </div>
              <div>
                Start:{" "}
                {selectedEvent.start
                  ? new Date(selectedEvent.start).toLocaleString()
                  : selectedEvent.startDate
                    ? new Date(selectedEvent.startDate).toLocaleString()
                    : "Unknown"}
              </div>
              <div>
                End:{" "}
                {selectedEvent.end
                  ? new Date(selectedEvent.end).toLocaleString()
                  : selectedEvent.endDate
                    ? new Date(selectedEvent.endDate).toLocaleString()
                    : "Unknown"}
              </div>
              <div>
                Status:{" "}
                {selectedEvent.extendedProps?.status ||
                  selectedEvent.status ||
                  "Scheduled"}
              </div>
            </div>
          )}
          {selectedEvent && (
            <div className="mb-4">
              <label
                htmlFor="assign-supervisor"
                className="mb-1 block text-sm font-medium"
              >
                Assign supervisor
              </label>
              <Select
                value={assignSupervisorId}
                onValueChange={setAssignSupervisorId}
              >
                <SelectTrigger id="assign-supervisor" className="w-full">
                  <SelectValue placeholder="Select a supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisorOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No supervisors found
                    </div>
                  ) : (
                    supervisorOptions.map((sup) => (
                      <SelectItem key={sup._id} value={sup._id}>
                        {sup.name}
                        {sup.role ? " (" + sup.role + ")" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDetails(false)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                if (!selectedEvent) return;
                try {
                  const eid = selectedEvent.id;
                  const parts = eid.split("-");
                  const idx = Number(parts.pop());
                  const scheduleId = parts.join("-");
                  if (!scheduleId || isNaN(idx))
                    throw new Error("Invalid event id");
                  await api.patch(
                    `/rotation-schedules/${scheduleId}/windows/${idx}`,
                    { markComplete: true },
                  );
                  setEvents((prev) =>
                    prev.map((ev) =>
                      ev.id === eid
                        ? { ...ev, status: "completed", completed: true }
                        : ev,
                    ),
                  );
                  invalidateAdminData("rotation-schedules");
                  toast.success("Posting window marked complete");
                  setOpenDetails(false);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to mark posting window complete");
                }
              }}
            >
              Mark Complete
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!selectedEvent) return;
                const sup = assignSupervisorId;
                if (!sup) {
                  toast.error("Select a supervisor first");
                  return;
                }
                try {
                  const eid = selectedEvent.id;
                  const parts = eid.split("-");
                  const idx = Number(parts.pop());
                  const scheduleId = parts.join("-");
                  if (!scheduleId || isNaN(idx))
                    throw new Error("Invalid event id");
                  await api.patch(
                    `/rotation-schedules/${scheduleId}/windows/${idx}`,
                    { supervisorId: sup },
                  );
                  setEvents((prev) =>
                    prev.map((ev) =>
                      ev.id === eid
                        ? { ...ev, supervisorId: sup, status: "assigned" }
                        : ev,
                    ),
                  );
                  invalidateAdminData("rotation-schedules");
                  toast.success("Supervisor assigned");
                  setOpenDetails(false);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to assign supervisor");
                }
              }}
            >
              Assign Supervisor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
