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
  const isClinicalScheduleView = isClinicalCalendarView || isClinicalDailyView;

  const [viewMode, setViewMode] = useState<StudentScheduleViewMode>("day");
  const [scheduleData, setScheduleData] = useState<schedule[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendanceRecordLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clinicalActivities, setClinicalActivities] = useState<ClinicalActivityLike[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [clinicalError, setClinicalError] = useState<string | null>(null);
  const [selectedClinicalDate, setSelectedClinicalDate] = useState(new Date());

  const classId = useMemo(() => {
    const studentClass = user?.studentClass ?? user?.studentClasses;

    if (typeof studentClass === "object" && studentClass !== null) {
      return studentClass._id;
    }

    return typeof studentClass === "string" ? studentClass : null;
  }, [user]);

  const todayLabel = useMemo(() => getTodayDayLabel(), []);

  useEffect(() => {
    if (!isSchedulePage) {
      setLoading(false);
      return;
    }

    if (isClinicalScheduleView) {
      const fetchClinicalActivities = async () => {
        if (!user?._id) {
          setClinicalActivities([]);
          setClinicalLoading(false);
          return;
        }

        try {
          setClinicalLoading(true);
          setClinicalError(null);

          const { data } = await api.get(`/clinical-rotations/active?studentId=${user._id}`);
          const rotations = data?.rotations ?? [];

          if (!rotations.length) {
            setClinicalActivities([]);
            return;
          }

          const results = await Promise.all(
            rotations.map(async (rotation: { _id: string }) => {
              try {
                const response = await api.get(`/activity-entries/logbook/${user._id}/${rotation._id}`);
                return response.data?.entries ?? [];
              } catch {
                return [];
              }
            }),
          );

          const normalizedActivities = results.flatMap((entryList) =>
            (entryList as ClinicalActivityLike[]).map((activity) => ({
              ...activity,
              title: activity.unit?.name ?? activity.umbrellaCategory ?? "Clinical activity",
              supervisor: activity.approvedBy?.name ?? "Supervisor pending",
              timeLabel: activity.entryDate
                ? new Date(activity.entryDate).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
                : "Time pending",
              status: activity.clinicsAttended
                ? "attended"
                : activity.callDutyCompleted || activity.wardRoundsAttended
                  ? "partial"
                  : "pending",
            })),
          );

          setClinicalActivities(normalizedActivities);
        } catch {
          setClinicalError("Unable to load your clinical activities right now.");
          setClinicalActivities([]);
        } finally {
          setClinicalLoading(false);
        }
      };

      void fetchClinicalActivities();
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
  }, [classId, isClinicalScheduleView, isSchedulePage, user?._id]);

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
