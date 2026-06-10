import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CalendarCheck,
  Users,
  AlertCircle,
  RefreshCw,
  Clock,
  BookOpen,
  TrendingUp,
} from "lucide-react";

// ─── Shared ClassStatus (admin/teacher view) ──────────────────────────
interface ClassStatus {
  classId: string;
  className: string;
  academicYear: string;
  timetableStatus: "active" | "not set";
  present: number;
  absent: number;
  late: number;
  excused: number;
}

// ─── Student Notifications Data ───────────────────────────────────────
interface LectureEntry {
  subject: any;
  lecturer: any;
  startTime: string;
  endTime: string;
  status: string | null;
}

interface DayAlerts {
  day: string;
  lectures: LectureEntry[];
}

interface StudentNotifData {
  className: string | null;
  academicYear: string | null;
  timetable: any[];
  todayDay: string;
  todayLectures: LectureEntry[];
  totalAttended: number;
  totalClasses: number;
  percentage: number;
  weeklyAlerts: DayAlerts[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const statusColors: Record<string, string> = {
  present: "bg-green-500/15 text-green-600",
  absent: "bg-red-500/15 text-red-600",
  late: "bg-yellow-500/15 text-yellow-600",
  excused: "bg-blue-500/15 text-blue-600",
};

export default function Notifications() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const { notifications, unreadCount, markAllAsRead, markAsRead, isLoading: notifsLoading } = useNotifications(1, 20);
  const [systemNotifications, setSystemNotifications] = useState<any[] | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);

  // Use an IntersectionObserver to mark notifications as read only when the
  // "New System Notifications" card is visible to the user. This prevents
  // clearing the badge prematurely.
  const newNotifsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!newNotifsRef.current) return;
    if (unreadCount <= 0) return;

    const el = newNotifsRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          void markAllAsRead();
          obs.disconnect();
        }
      });
    }, { threshold: 0.2 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [unreadCount, markAllAsRead]);

  useEffect(() => {
    const fetchSystem = async () => {
      try {
        setSystemLoading(true);
        const { data } = await api.get("/notifications/system?limit=200");
        // Deduplicate by type + createdAt and sort so unreadForUser are first
        const raw: any[] = data.notifications || [];
        const seen = new Map<string, any>();
        for (const n of raw) {
          const key = `${n.type}:${new Date(n.createdAt).toISOString()}`;
          if (!seen.has(key)) seen.set(key, n);
        }
        const deduped = Array.from(seen.values()).map((n) => ({ ...n }));
        const items = deduped.sort((a: any, b: any) => {
          if (a.unreadForUser === b.unreadForUser) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return a.unreadForUser ? -1 : 1;
        });
        setSystemNotifications(items);
      } catch (e) {
        console.error("Failed to fetch system notifications", e);
      } finally {
        setSystemLoading(false);
      }
    };
    void fetchSystem();
  }, []);

  return (
    <div className="flex w-full flex-col gap-4 px-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {isStudent ? "My Notifications" : "Class Status Overview"}
        </h2>
      </div>

      {isStudent ? (
        <>
          {/* Student class info and academic year card above system notifications */}
          <StudentNotifications />

          {/* New system notifications card (system-wide) */}
          <div ref={newNotifsRef as any}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">New System Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {systemLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (systemNotifications || [])
                    .slice(0, 10)
                    .map((n) => (
                      <button
                        key={n._id}
                        onClick={async () => {
                          try { if (n.unreadForUser) await markAsRead(n._id); } catch {}
                          if (n.link) window.location.href = n.link;
                        }}
                        className={`w-full text-left border rounded-md p-3 ${n.unreadForUser ? "bg-yellow-50" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{n.title} {n.unreadForUser && <Badge className="ml-2">New</Badge>}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1">{n.message}</p>
                          </div>
                          <div className="text-xs text-muted-foreground ml-3 shrink-0">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* New system notifications card (system-wide) */}
          <div ref={newNotifsRef as any}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">New System Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {systemLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (systemNotifications || [])
                    .slice(0, 10)
                    .map((n) => (
                      <div key={n._id} className={`border rounded-md p-3 ${n.unreadForUser ? "bg-yellow-50" : ""}`}>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{n.title} {n.unreadForUser && <Badge className="ml-2">New</Badge>}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1">{n.message}</p>
                          </div>
                          <div className="text-xs text-muted-foreground ml-3 shrink-0">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
              </CardContent>
            </Card>
          </div>

          <AdminNotifications />
        </>
      )}
    </div>
  );
}

// ─── Student View ──────────────────────────────────────────────────────
function StudentNotifications() {
  const [data, setData] = useState<StudentNotifData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get("/attendance/student-notifications");
      setData(res);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3"><Skeleton className="h-4 w-32" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const hasTimetable = data.timetable && data.timetable.length > 0;

  return (
    <div className="space-y-4">
      {/* Class info banner */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{data.className ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Academic Year {data.academicYear ?? "—"}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchData()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Total Classes Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {data.totalAttended}
              <span className="text-base font-normal text-muted-foreground">
                {" "}of {data.totalClasses}
              </span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{data.percentage}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Timetables Card (shows today's lectures summary) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today&apos;s Lectures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold">{data.todayLectures.length}</p>
            <p className="text-xs text-muted-foreground">{data.todayDay}</p>
          </CardContent>
        </Card>

        {/* Attendance Alerts Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Attendance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {data.weeklyAlerts.reduce(
                (acc, d) => acc + d.lectures.filter((l) => l.status && l.status !== "present").length,
                0
              )}
            </p>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Timetable Card — weekly lecture schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Weekly Timetable
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasTimetable ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No timetable available for your class.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Only show today and tomorrow */}
              {(() => {
                const todayName = data.todayDay || (() => {
                  const jsDay = new Date().getDay();
                  // map JS day (0=Sun) to our DAYS (Monday..Friday)
                  const map: Record<number, string> = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 0: "Monday", 6: "Monday"};
                  return map[jsDay] || DAYS[0];
                })();
                const idx = DAYS.indexOf(todayName);
                const tomorrowName = DAYS[(idx + 1) % DAYS.length];
                const daysToShow = [todayName, tomorrowName];

                return daysToShow.map((day) => {
                  const daySchedule = data.timetable.find((s: any) => s.day === day);
                  const lectures = daySchedule?.periods ?? [];
                  const alertsForDay = data.weeklyAlerts.find((a) => a.day === day)?.lectures ?? [];
                  return (
                    <div key={day}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{day}</p>
                      {lectures.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-1">No lectures</p>
                      ) : (
                        <div className="space-y-1">
                          {lectures.map((lec: any, i: number) => {
                            const alertEntry = alertsForDay[i];
                            const status = alertEntry?.status ?? null;
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-3 border rounded-md px-3 py-2 text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{typeof lec.subject === "object" ? lec.subject?.name ?? "—" : (lec.subject ?? "—")}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {typeof lec.lecturer === "object" && lec.lecturer?.name ? lec.lecturer.name : (lec.lecturer ?? "—")}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{lec.startTime} – {lec.endTime}</span>
                                  </div>
                                </div>
                                {status && (
                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${
                                      statusColors[status] ?? "bg-muted text-foreground"
                                    }`}
                                  >
                                    {status}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Alerts Card — all lectures for the week by day with status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Attendance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.weeklyAlerts.every((d) => d.lectures.every((l) => !l.status || l.status === "present")) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No attendance alerts. All lectures marked present.
            </p>
          ) : (
            <div className="space-y-4">
              {data.weeklyAlerts.map((dayAlert) => {
                const hasAlerts = dayAlert.lectures.some((l) => l.status && l.status !== "present");
                if (!hasAlerts) return null;
                return (
                  <div key={dayAlert.day}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      {dayAlert.day}
                    </p>
                    <div className="space-y-1">
                      {dayAlert.lectures
                        .filter((l) => l.status && l.status !== "present")
                        .map((lec, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 border rounded-md px-3 py-2 text-sm border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {typeof lec.subject === "object" ? lec.subject?.name ?? "—" : "—"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{lec.startTime} – {lec.endTime}</span>
                              </div>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${
                                statusColors[lec.status ?? ""] ?? "bg-muted text-foreground"
                              }`}
                            >
                              {lec.status}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Admin/Teacher View (existing) ────────────────────────────────────
function AdminNotifications() {
  const [classes, setClasses] = useState<ClassStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const totalClasses = classes.length;
  const activeTimetables = classes.filter((cls) => cls.timetableStatus === "active").length;
  const missingTimetables = totalClasses - activeTimetables;
  const classesWithAttendanceAlerts = classes.filter(
    (cls) => cls.absent > 0 || cls.late > 0 || cls.excused > 0
  );

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/attendance/status");
      setClasses(data.classes ?? []);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalClasses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Timetables</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeTimetables}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Attendance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{classesWithAttendanceAlerts.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>No class data available.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <Card key={cls.classId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{cls.className}</CardTitle>
                  <div className="text-xs text-muted-foreground">{cls.academicYear}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                      <span>Timetable</span>
                    </div>
                    <Badge
                      variant={cls.timetableStatus === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {cls.timetableStatus === "active" ? "Active" : "Not Set"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Attendance</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Present", value: cls.present, color: "bg-green-500" },
                      { label: "Absent", value: cls.absent, color: "bg-red-500" },
                      { label: "Late", value: cls.late, color: "bg-yellow-500" },
                      { label: "Excused", value: cls.excused, color: "bg-blue-500" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between border rounded px-2 py-1">
                        <div className="flex items-center gap-1">
                          <div className={`h-2 w-2 rounded-full ${color}`} />
                          <span className="text-xs">{label}</span>
                        </div>
                        <span className="text-xs font-semibold">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Other Important Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {classesWithAttendanceAlerts.length === 0 && missingTimetables === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No urgent notifications. All classes are up to date.
                </p>
              ) : (
                <div className="space-y-3">
                  {missingTimetables > 0 && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-3 text-sm">
                      <p className="font-medium">{missingTimetables} classes need timetable generation</p>
                      <p className="text-muted-foreground">
                        Please generate timetables to avoid attendance and schedule gaps.
                      </p>
                    </div>
                  )}
                  {classesWithAttendanceAlerts.map((cls) => (
                    <div
                      key={cls.classId}
                      className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3 text-sm"
                    >
                      <p className="font-medium">{cls.className} has attendance alerts</p>
                      <p className="text-muted-foreground">
                        {[cls.absent > 0 && `${cls.absent} absent`, cls.late > 0 && `${cls.late} late`, cls.excused > 0 && `${cls.excused} excused`].filter(Boolean).join(", ") || "No alerts"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
