// PR E2 — the student-only content that used to live on the generic
// /dashboard, now rendered at the BOTTOM of the student portal (the
// portal itself is visually unchanged). Renders null for non-students.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Clock3, Stethoscope } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { W11Icon } from "@/components/icons/W11Icon";
import { getScheduleForDay, getTodayDayLabel, WEEKDAY_NAMES } from "@/lib/studentSchedule";
import { buildTimelineWindowView } from "@/lib/rotationScheduleViews";
import ActivityDashboard from "@/components/activities/ActivityDashboard";
import type { schedule } from "@/types";

// Meta line under a period title (same logic as StudentSection's).
const getPeriodMetaLine = (period: any) => {
  const optionalLabel = String(period?.displayLabel ?? "").toLowerCase();
  const isOptional =
    period?.isOptional || /tutorials?|presentations?|call\s*duty/.test(optionalLabel);
  if (isOptional) return "Based on Unit assignment";
  if (period?.isClinical) return "Clinical posting — check your posting schedule";
  if (!period?.subject?.name) return "No activity";
  const code = period.subject?.code ? `${period.subject.code} · ` : "";
  return `${code}${period.lecturer?.name ?? "Lecturer not assigned"}`;
};

interface CourseGroup {
  label: string;
  code: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export default function StudentDashboardCards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStudent = user?.role === "student";

  const [team, setTeam] = useState<any>(null);
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [rotationStats, setRotationStats] = useState<{ name: string; value: number; color: string }[] | null>(null);
  const [upcomingWindows, setUpcomingWindows] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<schedule[]>([]);
  const [scheduleView, setScheduleView] = useState<"today" | "week">("today");
  const [loading, setLoading] = useState(true);

  const classId = useMemo(() => {
    const studentClass = (user as any)?.studentClass ?? (user as any)?.studentClasses;
    if (studentClass && typeof studentClass === "object") return studentClass._id;
    return typeof studentClass === "string" ? studentClass : null;
  }, [user]);
  const todayLabel = useMemo(() => getTodayDayLabel(), []);

  useEffect(() => {
    if (!isStudent) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [teamRes, attendanceRes, rotationRes, timetableRes] = await Promise.allSettled([
          api.get("/clinical-attendance/my-team"),
          api.get("/attendance/me"),
          classId ? api.get("/rotation-schedules", { params: { classId } }) : Promise.resolve({ data: { schedules: [] } }),
          classId ? api.get(`/timetables/${classId}`) : Promise.resolve({ data: { schedule: [] } }),
        ]);
        if (cancelled) return;
        if (teamRes.status === "fulfilled") setTeam(teamRes.value.data?.data?.team ?? null);

        if (attendanceRes.status === "fulfilled") {
          const records = attendanceRes.value.data?.records ?? [];
          const groupMap: Record<string, CourseGroup> = {};
          records.forEach((rec: any) => {
            const code = rec.course?.code ?? rec.course?.name ?? "Unknown";
            const prefix = code.replace(/[^A-Za-z]/g, "").split("").slice(0, 3).join("") || code.slice(0, 3);
            if (!groupMap[prefix]) {
              groupMap[prefix] = { label: prefix, code, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            }
            groupMap[prefix][rec.status] = (groupMap[prefix][rec.status] ?? 0) + 1;
            groupMap[prefix].total += 1;
          });
          setCourseGroups(Object.values(groupMap));
        }

        if (rotationRes.status === "fulfilled") {
          const data = rotationRes.value.data;
          const schedules = Array.isArray(data?.schedules) ? data.schedules : Array.isArray(data) ? data : [];
          const studentId = user?._id ? String(user._id) : "";
          const counts: Record<string, number> = { completed: 0, active: 0, upcoming: 0 };
          const upcoming: any[] = [];
          schedules.forEach((s: any) => {
            const timeline = Array.isArray(s?.meta?.timeline) ? s.meta.timeline : [];
            timeline.forEach((window: any, index: number) => {
              const view = buildTimelineWindowView(s, window, index, studentId);
              if (!view.matchesStudent) return;
              if (view.status === "completed") counts.completed += 1;
              else if (view.status === "current") counts.active += 1;
              else {
                counts.upcoming += 1;
                upcoming.push(view);
              }
            });
          });
          const total = counts.completed + counts.active + counts.upcoming || 1;
          setRotationStats([
            { name: "Completed", value: Math.round((counts.completed / total) * 100), color: "#AD6BEE" },
            { name: "In Progress", value: Math.round((counts.active / total) * 100), color: "#A6D49F" },
            { name: "Upcoming", value: Math.round((counts.upcoming / total) * 100), color: "#C3D405" },
          ]);
          upcoming.sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0));
          setUpcomingWindows(upcoming.slice(0, 3));
        }

        if (timetableRes.status === "fulfilled") {
          setScheduleData(timetableRes.value.data?.schedule ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [classId, isStudent, user?._id]);

  if (!isStudent) return null;

  const window = team?.window;
  const daysElapsed = team?.daysElapsed ?? null;
  const daysTotal = team?.daysTotal ?? null;
  const todaySchedule = getScheduleForDay(scheduleData, todayLabel);

  const tools = [
    { id: "my-attendance", title: "My Attendance", icon: "bar-chart", onClick: () => navigate("/attendance") },
    { id: "my-timetable", title: "Timetable", icon: "clock", onClick: () => navigate("/timetable") },
    { id: "my-courses", title: "Courses", icon: "book-open", onClick: () => navigate("/courses") },
  ];

  return (
    <div className="mt-6 space-y-6">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        My dashboard
      </h2>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Clinical posting + rotation progress */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" /> Clinical posting
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Your current clinical posting and rotation progress</p>
                </div>
                <button onClick={() => navigate("/student/clinicals/attendance")} className="text-xs font-medium text-primary hover:underline">
                  View All
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold">{team?.postingName ?? "No active posting"}</p>
                  {window?.startDate && window?.endDate ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(window.startDate).toLocaleDateString("en", { dateStyle: "medium" })} –{" "}
                      {new Date(window.endDate).toLocaleDateString("en", { dateStyle: "medium" })}
                      {daysTotal ? ` · day ${daysElapsed ?? 0} of ${daysTotal}` : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Updates automatically once a posting starts.</p>
                  )}
                </div>
                {rotationStats ? (
                  <div className="flex items-center gap-4">
                    <div className="relative h-[80px] w-[80px]">
                      <ResponsiveContainer width={80} height={80}>
                        <PieChart>
                          <Pie data={rotationStats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={22} outerRadius={36} paddingAngle={2}>
                            {rotationStats.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [`${value}%`, name]}
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1">
                      {rotationStats.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-xs text-muted-foreground">{entry.name} — {entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {upcomingWindows.length > 0 ? (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium uppercase tracking-[.2em] text-muted-foreground">Next postings</p>
                    {upcomingWindows.map((w) => (
                      <div key={w.id} className="rounded-lg border border-border p-2">
                        <p className="text-xs font-medium">{w.departmentName} · {w.unitGroupLabel}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {w.startDate?.toLocaleDateString("en", { dateStyle: "medium" })} – {w.endDate?.toLocaleDateString("en", { dateStyle: "medium" })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Attendance by subject pies */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold">Attendance by Subject</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Attendance across your course subject groups</p>
                </div>
                <button onClick={() => navigate("/attendance")} className="text-xs font-medium text-primary hover:underline">
                  View All
                </button>
              </div>
              <div className="p-5">
                {courseGroups.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {courseGroups.map((group) => {
                      const total = group.total || 1;
                      const presentPct = Math.round((group.present / total) * 100);
                      const chartData = [
                        { name: "Present", value: group.present, fill: "#22c55e" },
                        { name: "Absent", value: group.absent, fill: "#ef4444" },
                        { name: "Late", value: group.late, fill: "#eab308" },
                        { name: "Excused", value: group.excused, fill: "#3b82f6" },
                      ].filter((d) => d.value > 0);
                      return (
                        <div key={group.label} className="shrink-0 w-44 flex flex-col items-center rounded-lg border border-border p-4 space-y-3">
                          <span className="text-sm font-semibold">{group.label}</span>
                          <div className="relative h-[80px] w-[80px]">
                            <ResponsiveContainer width={80} height={80}>
                              <PieChart>
                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={22} outerRadius={36} paddingAngle={2}>
                                  {chartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.fill} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number, name: string) => [`${value}`, name]}
                                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                className={
                                  "text-xs font-bold " +
                                  (presentPct >= 75
                                    ? "text-green-600 dark:text-green-400"
                                    : presentPct >= 50
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400")
                                }
                              >
                                {presentPct}%
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                            {chartData.map((d) => (
                              <div key={d.name} className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                                <span className="text-[10px] text-muted-foreground">{d.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No attendance records found for your courses.</p>
                )}
              </div>
            </div>
          </div>

          {/* My schedule — Today | Week */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">My schedule</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Your lectures and sessions</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={scheduleView === "today" ? "default" : "outline"} onClick={() => setScheduleView("today")}>Today</Button>
                <Button size="sm" variant={scheduleView === "week" ? "default" : "outline"} onClick={() => setScheduleView("week")}>Week</Button>
              </div>
            </div>
            <div className="p-5">
              {scheduleView === "today" ? (
                todaySchedule?.periods?.length ? (
                  <div className="grid gap-3">
                    {todaySchedule.periods.map((period: any) => (
                      <div key={period._id} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                              <p className="font-semibold">{period.subject?.name ?? period.displayLabel ?? "Open period"}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{getPeriodMetaLine(period)}</p>
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
                  <p className="text-sm text-muted-foreground py-4 text-center">There are no lectures scheduled for {todayLabel} yet.</p>
                )
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {WEEKDAY_NAMES.map((dayName) => {
                    const daySchedule = getScheduleForDay(scheduleData, dayName);
                    const periods = daySchedule?.periods ?? [];
                    const isToday = dayName === todayLabel;
                    return (
                      <div key={dayName} className={"rounded-2xl border p-4 " + (isToday ? "border-primary/40 bg-primary/5" : "border-border/70 bg-background")}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{dayName}</p>
                          {isToday ? <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase text-primary">Today</span> : null}
                        </div>
                        {periods.length ? (
                          <div className="mt-3 space-y-2">
                            {periods.map((period: any) => (
                              <div key={period._id} className="rounded-xl border border-border/70 bg-muted/40 p-2">
                                <p className="text-sm font-medium">{period.subject?.name ?? period.displayLabel ?? "Open period"}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{period.startTime} – {period.endTime}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{getPeriodMetaLine(period)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground">No lectures scheduled.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Student tools tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tools.map((tile) => (
              <button
                key={tile.id}
                onClick={tile.onClick}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <W11Icon glyph={tile.icon as any} />
                <span className="text-sm font-medium">{tile.title}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Activities feed */}
      <ActivityDashboard />
    </div>
  );
}
