import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  buildClinicalActivityMonthDays,
  buildMonthViewDays,
  getScheduleForDay,
  getTodayDayLabel,
  type StudentScheduleViewMode,
} from "@/lib/studentSchedule";
import { buildTimelineWindowView, selectStudentPostingWindow } from "@/lib/rotationScheduleViews";
import { resolveActiveAcademicClockPhase } from "@/lib/academicClock";
import type { schedule } from "@/types";

interface StudentSectionProps {
  title: string;
  description: string;
}

interface StudentAttendanceRecordLike {
  date?: string | Date | null;
  status?: string | null;
}

interface ClinicalActivityLike {
  _id: string;
  entryDate: string;
  unit?: { name?: string; department?: string } | null;
  umbrellaCategory?: string;
  clinicsAttended?: boolean;
  wardRoundsAttended?: string;
  callDutyCompleted?: boolean;
  approvedBy?: { name?: string; designation?: string } | null;
  approvedAt?: string;
  title?: string;
  status?: "attended" | "partial" | "pending";
  supervisor?: string;
  timeLabel?: string;
}

const formatDateKey = (value: Date | string) => {
  const normalized = value instanceof Date ? value : new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().split("T")[0];
};

export default function StudentSection({ title, description }: StudentSectionProps) {
  const location = useLocation();
  const { user } = useAuth();
  const isSchedulePage = location.pathname.includes("/student/schedule") || title.toLowerCase().includes("today");
  const isClinicalCalendarView = location.pathname.includes("/student/schedule/calendar");
  const isClinicalDailyView = location.pathname.includes("/student/schedule/daily-activities");
  const isClinicalTeamView = location.pathname.includes("/student/clinicals/team");
  const isClinicalHistoryView = location.pathname.includes("/student/clinicals/history");
  const isStudentUpcomingView = location.pathname.includes("/student/schedule/upcoming");
  const isClinicalScheduleView = isClinicalCalendarView || isClinicalDailyView;
  const isRotationScheduleView = isClinicalTeamView || isClinicalHistoryView || isStudentUpcomingView || isClinicalCalendarView || isClinicalDailyView;

  const [viewMode, setViewMode] = useState<StudentScheduleViewMode>("day");
  const [scheduleData, setScheduleData] = useState<schedule[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendanceRecordLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotationWindows, setRotationWindows] = useState<any[]>([]);
  const [rotationLoading, setRotationLoading] = useState(false);
  const [rotationError, setRotationError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clinicalActivities, setClinicalActivities] = useState<ClinicalActivityLike[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [clinicalError, setClinicalError] = useState<string | null>(null);
  const [selectedClinicalDate, setSelectedClinicalDate] = useState(new Date());
  const [studentAcademicClock, setStudentAcademicClock] = useState<any | null>(null);

  const classId = useMemo(() => {
    const studentClass = user?.studentClass ?? user?.studentClasses;

    if (typeof studentClass === "object" && studentClass !== null) {
      return studentClass._id;
    }

    return typeof studentClass === "string" ? studentClass : null;
  }, [user]);

  const todayLabel = useMemo(() => getTodayDayLabel(), []);

  useEffect(() => {
    if (!classId) {
      setStudentAcademicClock(null);
      return;
    }

    let isMounted = true;
    const loadAcademicClock = async () => {
      try {
        const { data } = await api.get("/academic-clocks", { params: { classId } });
        const clocks = Array.isArray(data?.clocks) ? data.clocks : [];
        if (isMounted) {
          setStudentAcademicClock(clocks[0] ?? null);
        }
      } catch {
        if (isMounted) {
          setStudentAcademicClock(null);
        }
      }
    };

    void loadAcademicClock();
    return () => {
      isMounted = false;
    };
  }, [classId]);

  useEffect(() => {
    if (!isSchedulePage) {
      setLoading(false);
      return;
    }

    if (isRotationScheduleView) {
      const fetchRotationScheduleData = async () => {
        if (!classId) {
          setRotationWindows([]);
          setRotationLoading(false);
          setRotationError(null);
          return;
        }

        try {
          setRotationLoading(true);
          setRotationError(null);
          const { data } = await api.get("/rotation-schedules", { params: { classId } });
          const schedules = Array.isArray(data?.schedules) ? data.schedules : Array.isArray(data) ? data : [];
          const studentId = user?._id ? String(user._id) : "";

          const normalizedWindows = schedules.flatMap((schedule: any) => {
            const timeline = Array.isArray(schedule?.meta?.timeline) ? schedule.meta.timeline : [];
            return timeline.flatMap((window: any, index: number) => {
              const view = buildTimelineWindowView(schedule, window, index, studentId);
              if (!view.matchesStudent) {
                return [];
              }

              return [{
                ...view,
                progress: view.startDate && view.endDate
                  ? Math.min(100, Math.max(0, Math.round(((new Date().getTime() - view.startDate.getTime()) / Math.max(1, view.endDate.getTime() - view.startDate.getTime())) * 100)))
                  : 0,
              }];
            });
          });

          normalizedWindows.sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0));
          setRotationWindows(normalizedWindows);
        } catch {
          setRotationError("Unable to load your posting schedule right now.");
          setRotationWindows([]);
        } finally {
          setRotationLoading(false);
          setLoading(false);
        }
      };

      void fetchRotationScheduleData();
      return;
    }

    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError(null);

        const [timetableRes, attendanceRes] = await Promise.all([
          classId ? api.get(`/timetables/${classId}`) : Promise.resolve({ data: { schedule: [] } }),
          api.get("/attendance/me").catch(() => ({ data: { records: [] } })),
        ]);

        setScheduleData(timetableRes.data?.schedule ?? []);
        setAttendanceRecords((attendanceRes.data?.records ?? []) as StudentAttendanceRecordLike[]);
      } catch {
        setError("Unable to load your timetable right now.");
        setScheduleData([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchSchedule();
  }, [classId, isClinicalScheduleView, isRotationScheduleView, isSchedulePage, user?._id]);

  const selectedDaySchedule = useMemo(() => getScheduleForDay(scheduleData, todayLabel), [scheduleData, todayLabel]);
  const monthLabel = useMemo(() => currentMonth.toLocaleDateString("en", { month: "long", year: "numeric" }), [currentMonth]);

  const monthDays = useMemo(
    () =>
      buildMonthViewDays({
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth(),
        scheduleData,
        attendanceRecords,
        activeDayName: todayLabel,
        today: new Date(),
      }),
    [attendanceRecords, currentMonth, scheduleData, todayLabel],
  );

  const clinicalMonthDays = useMemo(
    () =>
      buildClinicalActivityMonthDays({
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth(),
        activities: clinicalActivities,
        today: selectedClinicalDate,
      }),
    [clinicalActivities, currentMonth, selectedClinicalDate],
  );

  const dayActivities = useMemo(() => {
    const key = formatDateKey(selectedClinicalDate);
    return clinicalActivities.filter((activity) => formatDateKey(activity.entryDate) === key);
  }, [clinicalActivities, selectedClinicalDate]);

  if (!isSchedulePage) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section is currently being expanded with student-facing resources and schedule support.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/student-portal">Back to Portal</Link>
              </Button>
              <Button asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isRotationScheduleView) {
    const studentClassName = typeof user?.studentClass === "object" && user.studentClass !== null
      ? user.studentClass.name
      : typeof user?.studentClasses === "object" && user.studentClasses !== null && !Array.isArray(user.studentClasses)
        ? user.studentClasses.name
        : null;
    const resolvedActivePhase = resolveActiveAcademicClockPhase(studentAcademicClock, studentClassName, new Date());
    const activePhaseId = resolvedActivePhase.phaseId;
    const activePhaseName = resolvedActivePhase.phasePlan.find((phase) => phase.id === activePhaseId)?.name ?? null;
    const phaseAwareWindows = [...rotationWindows].filter((window) => !activePhaseId || !window.phaseId || window.phaseId === activePhaseId);
    const upcomingWindow = [...phaseAwareWindows].find((window) => window.status === "upcoming") || phaseAwareWindows[0] || null;
    const currentWindow = selectStudentPostingWindow(phaseAwareWindows, activePhaseId) || null;
    // show only the last two completed posting windows in history
    const historyWindows = [...phaseAwareWindows].filter((window) => window.status === "completed").slice(-2).reverse();

    const rotationContent = (
      rotationLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : rotationError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {rotationError}
        </div>
      ) : !classId ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
          Your student class could not be resolved yet. Please refresh and try again.
        </div>
      ) : isStudentUpcomingView ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Next posting window</p>
            {upcomingWindow ? (
              <>
                <h3 className="mt-2 text-xl font-semibold">{upcomingWindow.postingName}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{upcomingWindow.departmentName} · {upcomingWindow.departmentGroupLabel} · {upcomingWindow.unitGroupLabel}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Starts</p>
                    <p className="mt-1 font-medium">{upcomingWindow.startDate.toLocaleDateString("en", { dateStyle: "medium" })}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Ends</p>
                    <p className="mt-1 font-medium">{upcomingWindow.endDate.toLocaleDateString("en", { dateStyle: "medium" })}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No upcoming posting windows were found for your class yet.</p>
            )}
          </div>
        </div>
      ) : isClinicalTeamView ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Your current posting group</p>
            {currentWindow ? (
              <>
                <h3 className="mt-2 text-xl font-semibold">{currentWindow.postingName}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{currentWindow.departmentName} · {currentWindow.departmentGroupLabel} · {currentWindow.unitGroupLabel}</p>
                <p className="mt-2 text-sm text-muted-foreground">Active phase: {currentWindow.phaseName || activePhaseName || (activePhaseId ? activePhaseId.replace("phase", "Phase ") : "Current posting")}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Window</p>
                    <p className="mt-1 font-medium">{currentWindow.startDate.toLocaleDateString("en", { dateStyle: "medium" })} – {currentWindow.endDate.toLocaleDateString("en", { dateStyle: "medium" })}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Team size</p>
                    <p className="mt-1 font-medium">{currentWindow.groupStudents?.length ?? currentWindow.studentCount} students</p>
                  </div>
                </div>
                {currentWindow.groupStudents && currentWindow.groupStudents.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Team members</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentWindow.groupStudents.map((student: any, index: number) => (
                        <span key={`${student?.name ?? student ?? "student"}-${index}`} className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm">
                          {typeof student === "string" ? student : student?.name || student?.fullName || `Student ${index + 1}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">No team members were found for your active posting group yet.</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">There is no active posting window for your current posting.</p>
            )}
          </div>
        </div>
      ) : isClinicalHistoryView ? (
        <div className="space-y-4">
          {historyWindows.length ? (
            historyWindows.map((window) => (
              <div key={window.id} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{window.postingName}</p>
                    <h3 className="mt-1 text-lg font-semibold">{window.departmentName} · {window.departmentGroupLabel} · {window.unitGroupLabel}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Completed from {window.startDate.toLocaleDateString("en", { dateStyle: "medium" })} to {window.endDate.toLocaleDateString("en", { dateStyle: "medium" })}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Duration: {window.durationLabel} · Students: {window.studentCount} · Supervisor: {window.supervisorName}</p>
                  </div>
                  <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-600">History</span>
                </div>
                {window.groupStudents && window.groupStudents.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Team members</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {window.groupStudents.map((student: any, index: number) => (
                        <span key={`${student?.name ?? student ?? "student"}-${index}`} className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm">
                          {typeof student === "string" ? student : student?.name || student?.fullName || `Student ${index + 1}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              No completed posting windows were found yet.
            </div>
          )}
        </div>
      ) : isClinicalDailyView ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Today’s focus</p>
            {currentWindow ? (
              <>
                <h3 className="mt-2 text-xl font-semibold">{currentWindow.departmentName} · {currentWindow.departmentGroupLabel} · {currentWindow.unitGroupLabel}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{currentWindow.postingName}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Window</p>
                    <p className="mt-1 font-medium">{currentWindow.startDate.toLocaleDateString("en", { dateStyle: "medium" })} – {currentWindow.endDate.toLocaleDateString("en", { dateStyle: "medium" })}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Next task</p>
                    <p className="mt-1 font-medium">Review the posting objectives for this unit and complete your logbook entry.</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">There is no active posting window for today.</p>
            )}
          </div>
        </div>
      ) : isClinicalCalendarView ? (
        <div className="space-y-4">
          {rotationWindows.length ? (
            rotationWindows.map((window) => (
              <div key={window.id} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{window.postingName}</p>
                    <h3 className="mt-1 text-lg font-semibold">{window.departmentName} · {window.departmentGroupLabel} · {window.unitGroupLabel}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{window.startDate.toLocaleDateString("en", { dateStyle: "medium" })} – {window.endDate.toLocaleDateString("en", { dateStyle: "medium" })}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Duration: {window.durationLabel} · Students: {window.studentCount} · Supervisor: {window.supervisorName}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${window.status === "current" ? "bg-emerald-500/10 text-emerald-600" : window.status === "upcoming" ? "bg-sky-500/10 text-sky-600" : "bg-slate-500/10 text-slate-600"}`}>
                    {window.status === "current" ? "Current" : window.status === "upcoming" ? "Upcoming" : "Completed"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              No posting windows were found for your class.
            </div>
          )}
        </div>
      ) : null
    );

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/student-portal">Back to Portal</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {rotationContent}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {!isClinicalScheduleView ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={viewMode === "day" ? "default" : "outline"} onClick={() => setViewMode("day")}>
                Today
              </Button>
              <Button size="sm" variant={viewMode === "month" ? "default" : "outline"} onClick={() => setViewMode("month")}>
                Month
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">
                {isClinicalCalendarView ? `Clinical calendar · ${monthLabel}` : isClinicalDailyView ? `Clinical activities · ${selectedClinicalDate.toLocaleDateString("en", { month: "short", day: "numeric" })}` : viewMode === "day" ? `Today · ${todayLabel}` : `Month view · ${monthLabel}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {isClinicalCalendarView
                  ? "Your approved clinical activities for the selected month."
                  : isClinicalDailyView
                    ? "A focused view of the day’s clinical activities, supervisors, and attendance status."
                    : viewMode === "day"
                      ? "Your lectures and sessions for the current day."
                      : "Lecture days for the selected month with attendance markers."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/student-portal">Back to Portal</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </div>

          {loading || (isClinicalScheduleView && clinicalLoading) ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error || clinicalError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error ?? clinicalError}
            </div>
          ) : !classId && !isClinicalScheduleView ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              Your student class could not be resolved yet. Please refresh and try again.
            </div>
          ) : isClinicalCalendarView ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm font-medium text-muted-foreground">Hover a day to view the clinical activity summary.</div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {clinicalMonthDays.map((cell, index) => {
                  const statusTone = cell.hasActivities
                    ? cell.activities[0]?.status === "attended"
                      ? "bg-emerald-500"
                      : cell.activities[0]?.status === "partial"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    : "bg-transparent";

                  return (
                    <button
                      key={`${cell.date.toISOString()}-${index}`}
                      type="button"
                      onClick={() => {
                        if (cell.dayNumber > 0) {
                          setSelectedClinicalDate(cell.date);
                        }
                      }}
                      className={`group min-h-28 rounded-2xl border p-3 text-left transition ${cell.hasActivities ? "border-primary/30 bg-primary/5" : "border-border/70 bg-background"} ${cell.isToday ? "ring-2 ring-primary/50" : ""} ${!cell.isCurrentMonth ? "opacity-50" : ""}`}
                      disabled={cell.dayNumber <= 0}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{cell.dayNumber > 0 ? cell.dayNumber : ""}</span>
                        {cell.hasActivities ? <span className={`h-2.5 w-2.5 rounded-full ${statusTone}`} /> : null}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {cell.hasActivities ? `${cell.activityCount} activity${cell.activityCount > 1 ? "ies" : "y"}` : cell.dayNumber > 0 ? "—" : ""}
                      </div>
                      {cell.hasActivities ? (
                        <div className="mt-2 hidden rounded-xl border border-border/70 bg-background/95 p-2 text-left text-[11px] shadow-sm group-hover:block group-focus-within:block">
                          <p className="font-medium text-foreground">{cell.activities[0]?.title}</p>
                          <p className="mt-1 text-muted-foreground">{cell.activities[0]?.supervisor}</p>
                          <p className="mt-1 text-muted-foreground">{cell.activities[0]?.timeLabel}</p>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : isClinicalDailyView ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setSelectedClinicalDate(new Date(selectedClinicalDate.getFullYear(), selectedClinicalDate.getMonth(), selectedClinicalDate.getDate() - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setSelectedClinicalDate(new Date(selectedClinicalDate.getFullYear(), selectedClinicalDate.getMonth(), selectedClinicalDate.getDate() + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {selectedClinicalDate.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-4">
                {dayActivities.length ? (
                  <div className="space-y-3">
                    {dayActivities.map((activity) => (
                      <div key={activity._id} className="rounded-2xl border border-border/70 bg-muted/40 p-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                              <p className="font-semibold">{activity.title}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{activity.umbrellaCategory ?? "Clinical activity"}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock3 className="h-4 w-4" />
                            <span>{activity.timeLabel}</span>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Attendance</p>
                            <p className="mt-1 font-medium">{activity.status === "attended" ? "Attended" : activity.status === "partial" ? "Partial" : "Pending"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Supervisor</p>
                            <p className="mt-1 font-medium">{activity.supervisor}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Ward rounds</p>
                            <p className="mt-1 font-medium">{activity.wardRoundsAttended ?? "Pending"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                    There are no clinical activities logged for {selectedClinicalDate.toLocaleDateString("en", { month: "short", day: "numeric" })} yet.
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === "day" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>{todayLabel}</span>
              </div>

              {selectedDaySchedule?.periods?.length ? (
                <div className="grid gap-3">
                  {selectedDaySchedule.periods.map((period) => (
                    <div key={period._id} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <p className="font-semibold">{period.subject?.name ?? period.displayLabel ?? "Open period"}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {period.subject?.code ? `${period.subject.code} · ` : ""}
                            {period.lecturer?.name ?? "Lecturer not assigned"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          <span>{period.startTime} – {period.endTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                  There are no lectures scheduled for {todayLabel} yet.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm font-medium text-muted-foreground">Legend: green = attended, red = missed, gray = pending</div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((cell, index) => {
                  const dotTone = cell.status === "absent" ? "bg-red-500" : cell.status === "present" ? "bg-green-500" : "bg-slate-300";
                  return (
                    <div
                      key={`${cell.date.toISOString()}-${index}`}
                      className={`min-h-24 rounded-2xl border p-3 ${cell.hasLecture ? "border-primary/30 bg-primary/5" : "border-border/70 bg-background"} ${cell.isToday ? "ring-2 ring-primary/50" : ""} ${!cell.isCurrentMonth ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{cell.dayNumber > 0 ? cell.dayNumber : ""}</span>
                        {cell.hasLecture ? <span className={`h-2.5 w-2.5 rounded-full ${dotTone}`} /> : null}
                      </div>
                      <div className="mt-3 text-[11px] text-muted-foreground">
                        {cell.hasLecture ? "Lecture" : cell.dayNumber > 0 ? "—" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
