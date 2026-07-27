import { useEffect, useMemo, useRef, useState, useCallback, type WheelEvent } from "react";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Search from "@/components/global/Search";
import FullCalendar from "@fullcalendar/react";
import type { schedule } from "@/types";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import DayTimetable from "@/components/calendar/DayTimetable";
import MonthViewCalendar from "@/components/calendar/MonthViewCalendar";
import DayPopupBubble from "@/components/calendar/DayPopupBubble";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";

type ClassItem = { _id: string; name: string };
type ApiClassItem = { _id: string; name: string };
type ApiRotationEvent = {
  id?: string;
  scheduleId?: string;
  postingId?: string;
  postingName?: string;
  startDate?: string;
  endDate?: string;
  status?: KnownStatus;
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
  status?: "planned" | "ongoing" | "completed" | "assigned" | "cancelled" | "default";
};

type DayLineItemsMap = Record<string, { timetable?: DayLineItem; clinical?: DayLineItem; optional?: DayLineItem }>;

const statusMetadata: Record<string, { label: string; badgeClasses: string; dotClass: string; borderClass: string }> = {
  active: { label: "Active", badgeClasses: "bg-emerald-100 text-emerald-700 border-emerald-200", dotClass: "bg-emerald-500", borderClass: "border-emerald-500" },
  planned: { label: "Planned", badgeClasses: "bg-sky-100 text-sky-700 border-sky-200", dotClass: "bg-sky-500", borderClass: "border-sky-500" },
  ongoing: { label: "Ongoing", badgeClasses: "bg-amber-100 text-amber-700 border-amber-200", dotClass: "bg-amber-500", borderClass: "border-amber-500" },
  completed: { label: "Completed", badgeClasses: "bg-emerald-100 text-emerald-700 border-emerald-200", dotClass: "bg-emerald-500", borderClass: "border-emerald-500" },
  cancelled: { label: "Cancelled", badgeClasses: "bg-rose-100 text-rose-700 border-rose-200", dotClass: "bg-rose-500", borderClass: "border-rose-500" },
  assigned: { label: "Assigned", badgeClasses: "bg-violet-100 text-violet-700 border-violet-200", dotClass: "bg-violet-500", borderClass: "border-violet-500" },
  default: { label: "Scheduled", badgeClasses: "bg-slate-100 text-slate-700 border-slate-200", dotClass: "bg-slate-500", borderClass: "border-slate-500" },
};

const statusOptions = [
  { key: "planned", label: "Planned" },
  { key: "ongoing", label: "Ongoing" },
  { key: "active", label: "Active" },
  { key: "assigned", label: "Assigned" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

type KnownStatus = "planned" | "ongoing" | "active" | "completed" | "assigned" | "cancelled" | "default";

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
  if (rawStatus === "completed") return "completed";
  if (rawStatus === "assigned") return "assigned";
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
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [events, setEvents] = useState<PostingWindow[]>([]);
  const [timetableClinicalPeriodTime, setTimetableClinicalPeriodTime] = useState<{ startTime: string; endTime: string } | null>(null);
  const [timetableSchedule, setTimetableSchedule] = useState<schedule[]>([]);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString());
  const calendarRef = useRef<InstanceType<typeof FullCalendar> | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  
  // Popup & timetable state
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<DOMRect | null>(null);
  const [isDayHovered, setIsDayHovered] = useState(false);
  const [isPopupHovered, setIsPopupHovered] = useState(false);

  const hoveredDaySchedule = useMemo(() => {
    if (!hoveredDay) return null;
    const dayOfWeek = hoveredDay.toLocaleDateString("en-US", { weekday: "long" });
    return timetableSchedule.find((day) => day.day.toLowerCase() === dayOfWeek.toLowerCase()) ?? null;
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
    return events
      .filter((evt) => {
        const eventStart = new Date(evt.startDate);
        return (
          eventStart.getFullYear() === hoveredDay.getFullYear() &&
          eventStart.getMonth() === hoveredDay.getMonth() &&
          eventStart.getDate() === hoveredDay.getDate()
        );
      })
      .map((evt) => ({
        id: evt.id || "",
        time: new Date(evt.startDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
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
        ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "clinical-schedule-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDateChange = (value: string) => {
    setCurrentDate(value);
    calendarRef.current?.getApi()?.gotoDate(value);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingClasses(true);
        const { data } = await api.get("/classes?page=1&limit=500");
        const isClass = (item: unknown): item is ApiClassItem =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>)._id === "string" &&
          typeof (item as Record<string, unknown>).name === "string";

        const list = Array.isArray(data?.classes)
          ? data.classes.filter(isClass).map((c: ApiClassItem) => ({ _id: c._id, name: c.name }))
          : [];
        list.sort((a: ClassItem, b: ClassItem) => a.name.localeCompare(b.name));
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0]._id);
      } catch (err) {
        console.error("Failed to load classes", err);
      } finally {
        setLoadingClasses(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    const loadRange = async () => {
      try {
        const timetableRes = await api.get(`/timetables/${selectedClass}`);
        const timetableSchedule: schedule[] = Array.isArray(timetableRes.data?.schedule)
          ? timetableRes.data.schedule
          : [];
        setTimetableSchedule(timetableSchedule);
        const firstClinical = timetableSchedule
          .flatMap((day) => day.periods)
          .find((period) => period.isClinical || period.displayLabel?.toLowerCase().includes("clinical"));
        if (firstClinical && firstClinical.startTime && firstClinical.endTime) {
          setTimetableClinicalPeriodTime({ startTime: firstClinical.startTime, endTime: firstClinical.endTime });
        } else {
          setTimetableClinicalPeriodTime(null);
        }

        const cur = new Date(currentDate);
        let start: Date, end: Date;
        if (view === 'day') {
          start = new Date(cur.setHours(0,0,0,0));
          end = new Date(start); end.setDate(end.getDate()+1);
        } else if (view === 'week') {
          const day = cur.getDay();
          start = new Date(cur); start.setDate(cur.getDate() - day);
          start.setHours(0,0,0,0);
          end = new Date(start); end.setDate(start.getDate()+7);
        } else {
          start = new Date(cur.getFullYear(), cur.getMonth(), 1);
          end = new Date(start.getFullYear(), start.getMonth()+1, 1);
        }

        const qs = `?classId=${selectedClass}&start=${start.toISOString()}&end=${end.toISOString()}`;
        const { data } = await api.get(`/rotation-schedules/events${qs}`);
        const isRotationEvent = (item: unknown): item is ApiRotationEvent =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).id === "string" &&
          typeof (item as Record<string, unknown>).startDate === "string" &&
          typeof (item as Record<string, unknown>).endDate === "string";

        const evt = Array.isArray(data?.events) ? data.events.filter(isRotationEvent) : [];
        setEvents(
          evt.map((e: ApiRotationEvent) => ({
            id: e.id,
            scheduleId: e.scheduleId,
            postingId: e.postingId || e.postingName,
            postingName: e.postingName,
            startDate: e.startDate,
            endDate: e.endDate,
            status: e.status,
            supervisorName: e.supervisorName,
          }))
        );

      } catch (err) {
        console.error('Failed to load rotation schedule events', err);
        setEvents([]);
        setTimetableClinicalPeriodTime(null);
      }
    };
    loadRange();
  }, [selectedClass, view, currentDate]);


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
      const hasTimeInfo = event.startDate.includes("T") && !event.startDate.match(/T00:00(:00)?(\.000)?Z?$/);
      if (hasTimeInfo) return event;

      const [startHour, startMinute] = timetableClinicalPeriodTime.startTime.split(":").map(Number);
      const [endHour, endMinute] = timetableClinicalPeriodTime.endTime.split(":").map(Number);
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

  const filteredEvents = eventsWithTimetableTime.filter((event) => {
    const searchMatches = !searchText || event.postingName?.toLowerCase().includes(searchText.toLowerCase());
    const statusMatches = statusFilter === "all" || (event.status || "default") === statusFilter;
    const postingMatches = !selectedPostingId || event.postingId === selectedPostingId;
    return searchMatches && statusMatches && postingMatches;
  });

  const monthDayLineItems = useMemo<DayLineItemsMap>(() => {
    const lineItems: DayLineItemsMap = {};
    const current = new Date(currentDate);
    const year = current.getFullYear();
    const month = current.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    const getKey = (date: Date) => date.toISOString().split("T")[0];
    const getDayOfWeek = (date: Date) => date.toLocaleDateString("en-US", { weekday: "long" });

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayKey = getKey(date);
      const dayOfWeek = getDayOfWeek(date);
      const scheduleForDay = timetableSchedule.find((scheduleDay) => scheduleDay.day === dayOfWeek);
      if (scheduleForDay) {
        const timetablePeriod = scheduleForDay.periods.find((period) => !period.isClinical && !period.isOptional);
        const optionalPeriod = scheduleForDay.periods.find((period) => period.isOptional);

        if (timetablePeriod) {
          lineItems[dayKey] = {
            ...lineItems[dayKey],
            timetable: {
              id: `${dayKey}-timetable`,
              title: timetablePeriod.subject?.name || timetablePeriod.displayLabel || timetablePeriod.subject?.code || "Class",
              postingName: timetablePeriod.subject?.name || timetablePeriod.displayLabel || timetablePeriod.subject?.code || "Class",
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
              title: optionalPeriod.displayLabel || optionalPeriod.subject?.name || "Optional Activity",
              postingName: optionalPeriod.displayLabel || optionalPeriod.subject?.name || "Optional Activity",
              time: `${optionalPeriod.startTime} - ${optionalPeriod.endTime}`,
              type: "optional",
            },
          };
        }
      }

      const dayEvents = filteredEvents.filter((event) => {
        const eventDate = new Date(event.startDate);
        return (
          eventDate.getFullYear() === date.getFullYear() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getDate() === date.getDate()
        );
      });

      if (dayEvents.length > 0) {
        const event = dayEvents[0];
        lineItems[dayKey] = {
          ...lineItems[dayKey],
          clinical: {
            id: event.id || `${dayKey}-clinical`,
            title: event.postingName || "Clinical Posting",
            postingName: event.postingName || "Clinical Posting",
            time: new Date(event.startDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
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

    return Array.from({ length: 5 }, (_, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);

      const dayLabel = dayDate.toLocaleDateString(undefined, { weekday: 'long' });
      const dateLabel = dayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const dayKey = dayDate.toISOString().split('T')[0];

      const scheduleForDay = timetableSchedule.find((scheduleDay) => scheduleDay.day.toLowerCase() === dayLabel.toLowerCase());
      const timetablePeriod = scheduleForDay?.periods.find((period) => !period.isClinical && !period.isOptional);
      const optionalPeriods = scheduleForDay?.periods.filter((period) => period.isOptional) ?? [];
      const clinicalPostings = filteredEvents
        .filter((event) => {
          const eventDate = new Date(event.startDate);
          return (
            eventDate.getFullYear() === dayDate.getFullYear() &&
            eventDate.getMonth() === dayDate.getMonth() &&
            eventDate.getDate() === dayDate.getDate()
          );
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
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
        timetablePeriod,
        optionalPeriods,
        clinicalPostings,
      };
    });
  }, [currentDate, filteredEvents, timetableSchedule]);

  const groupedByPosting = useMemo(() => {
    const map = new Map<string, PostingWindow[]>();
    for (const e of filteredEvents) {
      const key = e.postingName || String(e.postingId || "Unknown");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
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
    if (view === 'month') {
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const start = new Date(date);
      const day = (date.getDay() + 6) % 7;
      start.setDate(date.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 4);
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }, [currentDate, view]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    if (view === 'day') {
      api.changeView('timeGridDay');
    } else if (view === 'week') {
      api.changeView('timeGridWeek');
    } else {
      api.changeView('dayGridMonth');
    }
    api.gotoDate(currentDate);
  }, [view, currentDate]);

  const scrollTimer = useRef<number | null>(null);
  const dayViewContainerRef = useRef<HTMLDivElement | null>(null);

  const goToToday = () => {
    calendarRef.current?.getApi()?.today();
    setCurrentDate(new Date().toISOString());
  };

  const openPrintView = () => {
    window.print();
  };
  const goToPrev = () => calendarRef.current?.getApi()?.prev();
  const goToNext = () => calendarRef.current?.getApi()?.next();

  const handleDayViewScroll = useCallback((deltaY: number, nativeEvent?: WheelEvent) => {
    if (view !== 'day' || Math.abs(deltaY) < 10) return;
    // if nativeEvent provided, we can preventDefault because listener will be non-passive
    try { 
      nativeEvent?.preventDefault(); 
    } catch {
      // Ignore any preventDefault errors
    }
    if (scrollTimer.current) return;

    if (deltaY > 0) {
      goToNext();
    } else {
      goToPrev();
    }

    scrollTimer.current = window.setTimeout(() => {
      scrollTimer.current = null;
    }, 300);
  }, [view]);

  useEffect(() => {
    const el = dayViewContainerRef.current;
    if (!el) return;
    const wheelHandler = (e: WheelEvent) => handleDayViewScroll(e.deltaY, e);
    // add native listener with passive: false so preventDefault is allowed
    el.addEventListener('wheel', wheelHandler as unknown as EventListener, { passive: false });
    return () => el.removeEventListener('wheel', wheelHandler as unknown as EventListener);
  }, [view, handleDayViewScroll]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clinical Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">View schedule windows by class, posting, and timeline.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={view === 'day' ? 'default' : 'ghost'} onClick={() => setView('day')}>Day</Button>
          <Button variant={view === 'week' ? 'default' : 'ghost'} onClick={() => setView('week')}>Week</Button>
          <Button variant={view === 'month' ? 'default' : 'ghost'} onClick={() => setView('month')}>Month</Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Class selection</CardTitle>
              <p className="text-sm text-muted-foreground">Pick a class and review its schedule.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue={selectedClass || undefined} onValueChange={(v) => setSelectedClass(v)}>
              <TabsList className="flex max-w-full flex-wrap gap-2 overflow-x-auto pb-1 pr-2 sm:flex-nowrap">
                {loadingClasses ? (
                  <div className="px-4 py-2">Loading…</div>
                ) : (
                  classes.map((c) => (
                    <TabsTrigger key={c._id} value={c._id} className="min-w-[120px] whitespace-nowrap text-sm">
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
              <p className="text-sm text-muted-foreground">Search postings, filter statuses, and export the current schedule.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExport}>
                Export
              </Button>
              <Button size="sm" variant="outline" onClick={openPrintView}>
                Print
              </Button>
              <Button size="sm" variant="outline">
                Quick action
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Search value={searchText} onChange={setSearchText} placeholder="Search postings..." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <div className="h-5 w-5 rounded-md bg-muted/30" />
                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Jump to date</span>
                    <Input type="date" value={currentDate.split("T")[0]} onChange={(event) => handleDateChange(event.target.value)} className="max-w-[200px]" />
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <div className="text-xs font-medium uppercase text-muted-foreground">Status filters</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>All</Button>
                    {statusOptions.map((option) => (
                      <Button key={option.key} size="sm" variant={statusFilter === option.key ? "default" : "outline"} onClick={() => setStatusFilter(option.key)}>{option.label}</Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Posting list</CardTitle>
              <p className="text-sm text-muted-foreground">Browse posting groups and focus the schedule.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredEvents.length} windows</span>
              <span className="hidden sm:inline">·</span>
              <button className="text-primary underline" type="button" onClick={() => setSelectedPostingId(null)}>Clear selection</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedByPosting.length === 0 ? (
              <div className="text-sm text-muted-foreground">No postings match these filters.</div>
            ) : (
              <div className="grid gap-3">
                {groupedByPosting.map(([postingName, windows]) => {
                  const postingId = windows[0]?.postingId ?? postingName;
                  const status = windows[0]?.status || "default";
                  const meta = statusMetadata[status] ?? statusMetadata.default;
                  return (
                    <button
                      key={postingName}
                      type="button"
                      onClick={() => setSelectedPostingId(postingId)}
                      className={`group w-full rounded-md border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg ${selectedPostingId === postingId ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/80"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">{postingName}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{windows.length} window{windows.length === 1 ? "" : "s"}</span>
                            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${meta.color}">{meta.label}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">{statusCounts[status] ?? windows.length}</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
                          {new Date(windows[0].startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(windows[0].endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="rounded-2xl bg-muted/5 p-3 text-[11px] text-muted-foreground">
                          Supervisor: {windows[0]?.supervisorName ?? 'TBD'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {statusOptions.map((option) => {
              const meta = statusMetadata[option.key] ?? statusMetadata.default;
              return (
                <div key={option.key} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <span className={`inline-block h-3 w-3 rounded-full ${meta.dotClass}`}></span>
                  <div>
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{statusCounts[option.key] ?? 0} windows</p>
                  </div>
                </div>
              );
            })}
            <div className="rounded-2xl border border-border bg-background p-3">
              <p className="text-sm font-medium">Tip</p>
              <p className="mt-2 text-sm text-muted-foreground">Click a posting to filter the calendar. Click any day in month view to jump into day details.</p>
            </div>
          </CardContent>
        </Card>

        <Card id="classCalenderView" className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{classes.find((c) => c._id === selectedClass)?.name ?? 'Select a class'}</CardTitle>
              <p className="text-sm text-muted-foreground">{currentDateLabel}</p>
            </div>
            <div id="classCalenderViewControls" className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={view === 'day' ? 'default' : 'outline'} onClick={() => setView('day')}>Day</Button>
              <Button size="sm" variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>Week</Button>
              <Button size="sm" variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')}>Month</Button>
              <Button size="sm" variant="outline" onClick={goToPrev}>Prev</Button>
              <Button size="sm" variant="outline" onClick={goToToday}>Today</Button>
              <Button size="sm" variant="outline" onClick={goToNext}>Next</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[520px] overflow-hidden bg-background md:min-h-[700px] lg:min-h-[760px]">
              <div ref={dayViewContainerRef} className="h-full relative">
                {view === 'day' ? (
                          <DayTimetable
                            events={filteredEvents}
                            date={currentDate}
                            onEventClick={(ev) => {
                              setSelectedEvent({
                                id: ev.id || "",
                                title: ev.postingName || "Clinical activity",
                                start: new Date(ev.startDate),
                                end: new Date(ev.endDate),
                                scheduleId: ev.scheduleId,
                                postingId: ev.postingId,
                                postingName: ev.postingName,
                                status: normalizeStatus(ev.status),
                                supervisorName: ev.supervisorName,
                                extendedProps: { status: normalizeStatus(ev.status), scheduleId: ev.scheduleId },
                              });
                              setOpenDetails(true);
                            }}
                    onEventDrop={async (ev, newStartISO, newEndISO) => {
                      try {
                        const eid = ev.id as string;
                        const parts = eid.split('-');
                        const idx = Number(parts.pop());
                        const scheduleId = parts.join('-');
                        if (!scheduleId || isNaN(idx)) throw new Error('Invalid event id');
                        const payload = { startDate: newStartISO, endDate: newEndISO };
                        await api.patch(`/rotation-schedules/${scheduleId}/windows/${idx}`, payload);
                        setEvents((prev) => prev.map((e) => (e.id === eid ? { ...e, startDate: payload.startDate, endDate: payload.endDate } : e)));
                      } catch (err) {
                        console.error('Reschedule failed', err);
                      }
                    }}
                    onDateChange={handleDateChange}
                  />
                ) : view === 'month' ? (
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
                        }}
                        onDayHover={(date, _lineItems, _activities, anchorRect) => {
                          setHoveredDay(date);
                          setPopupAnchorRect(anchorRect ?? null);
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
                      isVisible={!!hoveredDay && (isDayHovered || isPopupHovered)}
                      anchorRect={popupAnchorRect}
                      onClose={() => {
                        setHoveredDay(null);
                        setIsDayHovered(false);
                        setIsPopupHovered(false);
                      }}
                      onMouseEnter={() => setIsPopupHovered(true)}
                      onMouseLeave={() => setIsPopupHovered(false)}
                    />
                  </>
                ) : view === 'week' ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {weekSchedule.map((day) => (
                      <div
                        key={day.dayKey}
                        className={`overflow-hidden rounded-[28px] border p-5 shadow-sm ${day.isWeekend ? 'border-emerald-300/30 bg-emerald-950/50' : 'border-border bg-card'}`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{day.dayLabel}</p>
                            <p className="text-xs text-muted-foreground">{day.dateLabel}</p>
                          </div>
                          {day.isWeekend ? (
                            <Badge variant="secondary">Weekend</Badge>
                          ) : (
                            <Badge variant="outline">Weekday</Badge>
                          )}
                        </div>

                        {day.isWeekend && (
                          <div className="mt-4 rounded-3xl border border-emerald-500/20 bg-emerald-950/80 p-4 text-sm text-emerald-100">
                            Merry weekend! Rest is important for academic optimal performance.
                          </div>
                        )}

                        <div className="mt-5 space-y-4">
                          <div className="rounded-3xl border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Timetable</p>
                              <span className="text-xs text-muted-foreground">{day.timetablePeriod ? 'Planned' : 'Empty'}</span>
                            </div>
                            {day.timetablePeriod ? (
                              <div className="mt-3 space-y-2">
                                <p className="text-sm font-medium text-foreground">{day.timetablePeriod.subject?.name || day.timetablePeriod.displayLabel || day.timetablePeriod.subject?.code || 'Class session'}</p>
                                <p className="text-sm text-muted-foreground">{day.timetablePeriod.startTime} – {day.timetablePeriod.endTime}</p>
                                <p className="text-sm text-muted-foreground">{day.timetablePeriod.lecturer?.name ?? 'Lecturer TBD'}</p>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-muted-foreground">No scheduled class for this day.</p>
                            )}
                          </div>

                          <div className="rounded-3xl border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Clinical postings</p>
                              <span className="text-xs text-muted-foreground">{day.clinicalPostings.length} item{day.clinicalPostings.length === 1 ? '' : 's'}</span>
                            </div>
                            {day.clinicalPostings.length > 0 ? (
                              <div className="mt-3 space-y-3">
                                {day.clinicalPostings.map((event) => {
                                  const status = normalizeStatus(event.status);
                                  const meta = statusMetadata[status] ?? statusMetadata.default;
                                  return (
                                    <div key={event.id || `${day.dayKey}-clinical-${event.startDate}`} className="rounded-3xl border border-border bg-card p-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-foreground">{event.postingName || 'Clinical activity'}</p>
                                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.badgeClasses}`}>{meta.label}</span>
                                      </div>
                                      <p className="mt-2 text-sm text-muted-foreground">{new Date(event.startDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-muted-foreground">No clinical postings are scheduled.</p>
                            )}
                          </div>

                          <div className="rounded-3xl border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Other activities</p>
                              <span className="text-xs text-muted-foreground">{day.optionalPeriods.length} item{day.optionalPeriods.length === 1 ? '' : 's'}</span>
                            </div>
                            {day.optionalPeriods.length > 0 ? (
                              <div className="mt-3 space-y-3">
                                {day.optionalPeriods.map((period) => (
                                  <div key={`${day.dayKey}-optional-${period.startTime}-${period.endTime}`} className="rounded-3xl border border-border bg-card p-3">
                                    <p className="text-sm font-semibold text-foreground">{period.displayLabel || period.subject?.name || 'Optional activity'}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{period.startTime} – {period.endTime}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-muted-foreground">No other activities planned for this day.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                    initialView={view === 'week' ? 'timeGridWeek' : 'timeGridDay'}
                    headerToolbar={false}
                    height="100%"
                    contentHeight="auto"
                    aspectRatio={1.4}
                    dayMaxEvents={true}
                    eventDisplay="block"
                    selectable
                    nowIndicator
                    stickyHeaderDates={true}
                    firstDay={1}
                    views={{
                      timeGridDay: {
                        titleFormat: { weekday: 'long', month: 'short', day: 'numeric' },
                        dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' },
                        slotLabelFormat: { hour: 'numeric', minute: '2-digit', omitZeroMinute: true, hour12: false },
                        slotDuration: '00:30:00',
                        slotMinTime: '06:00:00',
                        slotMaxTime: '22:00:00',
                        allDaySlot: false,
                      },
                      timeGridWeek: {
                        titleFormat: { month: 'short', year: 'numeric' },
                        dayHeaderFormat: { weekday: 'short', day: 'numeric' },
                        slotLabelFormat: { hour: 'numeric', minute: '2-digit', omitZeroMinute: true, hour12: false },
                        slotDuration: '00:30:00',
                        slotMinTime: '06:00:00',
                        slotMaxTime: '22:00:00',
                        allDaySlot: true,
                      },
                    }}
                    events={filteredEvents.map((e) => ({ id: e.id, title: e.postingName || "Clinical posting", start: e.startDate, end: e.endDate, extendedProps: { status: e.status, scheduleId: e.scheduleId } }))}
                    eventContent={(info) => {
                      const status = info.event.extendedProps.status || "default";
                      const meta = statusMetadata[status] ?? statusMetadata.default;
                      return (
                        <div className={`flex flex-col gap-1 rounded-md border bg-card p-2.5 shadow-sm text-[11px] leading-tight ${meta.borderClass}`}>
                          <span className={`inline-flex max-w-full items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClasses}`}>
                            {meta.label}
                          </span>
                          <div className="truncate font-medium">{info.event.title}</div>
                          {info.timeText && <div className="text-[10px] text-muted-foreground">{info.timeText}</div>}
                        </div>
                      );
                    }}
                    eventDidMount={(info) => {
                      const status = info.event.extendedProps.status || "default";
                      const meta = statusMetadata[status] ?? statusMetadata.default;
                      info.el.setAttribute("title", `${info.event.title} — ${meta.label}${info.timeText ? ` (${info.timeText})` : ""}`);
                    }}
                    datesSet={(arg) => setCurrentDate(arg.startStr)}
                    dateClick={(info) => {
                      setCurrentDate(info.dateStr);
                      setView('day');
                    }}
                    eventClick={(info) => {
                      setSelectedEvent({
                        id: info.event.id,
                        title: info.event.title,
                        start: info.event.start,
                        end: info.event.end,
                        scheduleId: info.event.extendedProps?.scheduleId,
                        extendedProps: info.event.extendedProps,
                      });
                      setOpenDetails(true);
                    }}
                    eventDrop={async (info) => {
                      try {
                        const eid = info.event.id as string;
                        const parts = eid.split('-');
                        const idx = Number(parts.pop());
                        const scheduleId = parts.join('-');
                        if (!scheduleId || isNaN(idx)) throw new Error('Invalid event id');
                        const startDate = info.event.start?.toISOString();
                        const endDate = info.event.end?.toISOString();
                        if (!startDate || !endDate) throw new Error('Invalid event dates');
                        const payload = { startDate, endDate };
                        await api.patch(`/rotation-schedules/${scheduleId}/windows/${idx}`, payload);
                        setEvents((prev) => prev.map((ev) => (ev.id === eid ? { ...ev, startDate, endDate } : ev)));
                      } catch (err) {
                        console.error('Reschedule failed', err);
                        if ("revert" in info && typeof info.revert === "function") {
                          info.revert();
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Posting window details</DialogTitle>
            <DialogDescription>View and manage the selected posting window.</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div><strong>{selectedEvent.title}</strong></div>
              <div>
                Start: {selectedEvent.start ? new Date(selectedEvent.start).toLocaleString() : selectedEvent.startDate ? new Date(selectedEvent.startDate).toLocaleString() : 'Unknown'}
              </div>
              <div>
                End: {selectedEvent.end ? new Date(selectedEvent.end).toLocaleString() : selectedEvent.endDate ? new Date(selectedEvent.endDate).toLocaleString() : 'Unknown'}
              </div>
              <div>Status: {selectedEvent.extendedProps?.status || selectedEvent.status || 'Scheduled'}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDetails(false)}>Close</Button>
            <Button onClick={async () => {
              if (!selectedEvent) return;
              try {
                const eid = selectedEvent.id;
                const parts = eid.split('-');
                const idx = Number(parts.pop());
                const scheduleId = parts.join('-');
                if (!scheduleId || isNaN(idx)) throw new Error('Invalid event id');
                await api.patch(`/rotation-schedules/${scheduleId}/windows/${idx}`, { markComplete: true });
                setEvents((prev) => prev.map((ev) => (ev.id === eid ? { ...ev, status: 'completed', completed: true } : ev)));
                setOpenDetails(false);
              } catch (err) {
                console.error(err);
              }
            }}>Mark Complete</Button>
            <Button variant="outline" onClick={async () => {
              if (!selectedEvent) return;
              const sup = window.prompt('Enter supervisorId to assign:');
              if (!sup) return;
              try {
                const eid = selectedEvent.id;
                const parts = eid.split('-');
                const idx = Number(parts.pop());
                const scheduleId = parts.join('-');
                if (!scheduleId || isNaN(idx)) throw new Error('Invalid event id');
                await api.patch(`/rotation-schedules/${scheduleId}/windows/${idx}`, { supervisorId: sup });
                setEvents((prev) => prev.map((ev) => (ev.id === eid ? { ...ev, supervisorId: sup, status: 'assigned' } : ev)));
                setOpenDetails(false);
              } catch (err) {
                console.error(err);
              }
            }}>Assign Supervisor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
