import { useEffect, useMemo, useRef, useState, useCallback, type WheelEvent } from "react";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Search from "@/components/global/Search";
import { Download, Share2, PlusCircle, Calendar } from "lucide-react";
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
type PostingWindow = { id?: string; postingId?: string; postingName?: string; startDate: string; endDate: string; status?: string; supervisorName?: string };
type TimetableLecture = { time: string; subject?: string; code?: string; lecturer?: string };
type ClinicalPosting = { time: string; postingName: string; status: "planned" | "ongoing" | "completed" | "assigned" | "cancelled" | "default"; id: string };

const statusMetadata: Record<string, { label: string; badgeClasses: string; dotClass: string; borderClass: string }> = {
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
  { key: "assigned", label: "Assigned" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function ClinicalSchedules() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [events, setEvents] = useState<PostingWindow[]>([]);
  const [timetableClinicalPeriodTime, setTimetableClinicalPeriodTime] = useState<{ startTime: string; endTime: string } | null>(null);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString());
  const calendarRef = useRef<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  
  // Popup & timetable state
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [timetableCache, setTimetableCache] = useState<Map<string, TimetableLecture[]>>(new Map());
  const [popupLectures, setPopupLectures] = useState<TimetableLecture[]>([]);
  const [popupClinicalPostings, setPopupClinicalPostings] = useState<ClinicalPosting[]>([]);

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
        const list = Array.isArray(data?.classes) ? data.classes.map((c: any) => ({ _id: c._id, name: c.name })) : [];
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
        const evt = Array.isArray(data?.events) ? data.events : [];
        setEvents(evt.map((e: any) => ({
          id: e.id,
          scheduleId: e.scheduleId,
          postingId: e.postingId || e.postingName,
          postingName: e.postingName,
          startDate: e.startDate,
          endDate: e.endDate,
          status: e.status,
        })));

      } catch (err) {
        console.error('Failed to load rotation schedule events', err);
        setEvents([]);
        setTimetableClinicalPeriodTime(null);
      }
    };
    loadRange();
  }, [selectedClass, view, currentDate]);

  // Load timetable lectures for hovered day
  useEffect(() => {
    if (!hoveredDay || !selectedClass) {
      return;
    }

    const fetchTimetableLectures = async () => {
      try {
        const dayKey = hoveredDay.toISOString().split("T")[0];
        
        // Check cache first
        if (timetableCache.has(dayKey)) {
          setPopupLectures(timetableCache.get(dayKey) || []);
        } else {
          // Fetch and parse timetable
          const res = await api.get(`/timetables/${selectedClass}`);
          const timetableSchedule: schedule[] = Array.isArray(res.data?.schedule) ? res.data.schedule : [];
          
          // Find the day of week (0 = Sunday, 1 = Monday, etc.)
          const dayOfWeek = hoveredDay.toLocaleDateString("en-US", { weekday: "long" });
          const daySchedule = timetableSchedule.find((d) => d.day === dayOfWeek);
          
          if (daySchedule) {
            const lectures: TimetableLecture[] = daySchedule.periods
              .filter((p) => !p.isClinical && !p.isOptional)
              .map((p) => ({
                time: `${p.startTime} - ${p.endTime}`,
                subject: p.subject?.name,
                code: p.subject?.code,
                lecturer: p.lecturer?.name,
              }));
            
            setTimetableCache((prev) => new Map(prev).set(dayKey, lectures));
            setPopupLectures(lectures);
          } else {
            setPopupLectures([]);
          }
        }

        // Get clinical postings for this day from events
        const dayPostings: ClinicalPosting[] = events
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
            status: (evt.status || "default") as "planned" | "ongoing" | "completed" | "assigned" | "cancelled" | "default",
          }));

        setPopupClinicalPostings(dayPostings);
      } catch (err) {
        console.error("Failed to fetch timetable for hovered day:", err);
      }
    };

    fetchTimetableLectures();
  }, [hoveredDay, selectedClass, events, timetableCache]);

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

  const filteredEvents = useMemo(() => {
    return eventsWithTimetableTime.filter((event) => {
      const searchMatches = !searchText || event.postingName?.toLowerCase().includes(searchText.toLowerCase());
      const statusMatches = statusFilter === "all" || (event.status || "default") === statusFilter;
      const postingMatches = !selectedPostingId || event.postingId === selectedPostingId;
      return searchMatches && statusMatches && postingMatches;
    });
  }, [eventsWithTimetableTime, searchText, statusFilter, selectedPostingId]);

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
      const day = date.getDay();
      start.setDate(date.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
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
                <Download className="mr-2 h-4 w-4" />Export
              </Button>
              <Button size="sm" variant="outline" onClick={openPrintView}>
                <Share2 className="mr-2 h-4 w-4" />Print
              </Button>
              <Button size="sm" variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />Quick action
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Search value={searchText} onChange={setSearchText} placeholder="Search postings..." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
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
                        ...ev,
                        title: ev.postingName,
                        start: new Date(ev.startDate),
                        end: new Date(ev.endDate),
                        extendedProps: { status: ev.status, scheduleId: (ev as any).scheduleId },
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
                        setEvents((prev) => prev.map((e) => e.id === eid ? { ...e, startDate: payload.startDate!, endDate: payload.endDate! } : e));
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
                        onDateSelect={(date) => {
                          setCurrentDate(date.toISOString());
                        }}
                        onDayHover={(date) => {
                          setHoveredDay(date);
                        }}
                        onDayLeave={() => {
                          setHoveredDay(null);
                        }}
                      />
                    </div>
                    <DayPopupBubble
                      date={hoveredDay || new Date()}
                      lectures={popupLectures}
                      clinicalPostings={popupClinicalPostings}
                      isVisible={!!hoveredDay}
                      onClose={() => {
                        setHoveredDay(null);
                      }}
                    />
                  </>
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
                    events={filteredEvents.map((e) => ({ id: e.id, title: e.postingName, start: e.startDate, end: e.endDate, extendedProps: { status: e.status, scheduleId: (e as any).scheduleId } }))}
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
                        const payload = { startDate: info.event.start?.toISOString(), endDate: info.event.end?.toISOString() };
                        await api.patch(`/rotation-schedules/${scheduleId}/windows/${idx}`, payload);
                        setEvents((prev) => prev.map((ev) => ev.id === eid ? { ...ev, startDate: payload.startDate!, endDate: payload.endDate! } : ev));
                      } catch (err) {
                        console.error('Reschedule failed', err);
                        (info as any).revert?.();
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
                const eid = selectedEvent.id as string;
                const parts = eid.split('-');
                const idx = Number(parts.pop());
                const scheduleId = parts.join('-');
                if (!scheduleId || isNaN(idx)) throw new Error('Invalid event id');
                await api.patch(`/rotation-schedules/${scheduleId}/windows/${idx}`, { markComplete: true });
                setEvents((prev) => prev.map((ev) => ev.id === eid ? { ...ev, status: 'completed', completed: true } as any : ev));
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
                const eid = selectedEvent.id as string;
                const parts = eid.split('-');
                const idx = Number(parts.pop());
                const scheduleId = parts.join('-');
                if (!scheduleId || isNaN(idx)) throw new Error('Invalid event id');
                await api.patch(`/rotation-schedules/${scheduleId}/windows/${idx}`, { supervisorId: sup });
                setEvents((prev) => prev.map((ev) => ev.id === eid ? { ...ev, supervisorId: sup, status: 'assigned' } as any : ev));
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
