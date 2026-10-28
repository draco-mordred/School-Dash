import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserDialog from "@/components/users/UserDialog";
import {
  isMonday,
  isWeekend,
  pickNewWeekGreeting,
  pickWeekendGreeting,
  WEEKDAY_NAMES_FULL,
} from "@/lib/scheduleGreetings";
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

// ─── Notification Categories (admin view) ─────────────────────────────
type NotifCategory =
  | "all"
  | "approvals"
  | "attendance"
  | "timetable"
  | "alerts"
  | "general";

const NOTIF_CATEGORIES: Array<{
  key: NotifCategory;
  label: string;
  description: string;
}> = [
  { key: "all", label: "All", description: "Every notification, newest and unread first." },
  {
    key: "approvals",
    label: "Approvals & Registrations",
    description:
      "New registrations and users awaiting approval or class assignment.",
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Attendance-related notifications and alerts.",
  },
  {
    key: "timetable",
    label: "Timetable",
    description: "Timetable generation and schedule notifications.",
  },
  {
    key: "alerts",
    label: "Alerts",
    description: "Errors and warnings that need attention.",
  },
  {
    key: "general",
    label: "General",
    description: "Info, success and system notices.",
  },
];

const categorizeNotification = (n: any): NotifCategory => {
  if (n?.metadata?.pendingUserId || n?.metadata?.newUserId) return "approvals";
  const type = String(n?.type || "").toLowerCase();
  if (type === "attendance") return "attendance";
  if (type === "timetable") return "timetable";
  if (type === "error" || type === "warning") return "alerts";
  return "general";
};

const countByCategory = (notifs: any[]): Record<string, number> => {
  const counts: Record<string, number> = {
    all: notifs.length,
    approvals: 0,
    attendance: 0,
    timetable: 0,
    alerts: 0,
    general: 0,
  };
  for (const n of notifs) counts[categorizeNotification(n)] += 1;
  return counts;
};

const filterByCategory = (notifs: any[], category: NotifCategory) => {
  const filtered =
    category === "all"
      ? notifs
      : notifs.filter((n) => categorizeNotification(n) === category);
  return filtered.slice().sort((a: any, b: any) => {
    if (!!a.unreadForUser !== !!b.unreadForUser)
      return a.unreadForUser ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

function CategoryPills(props: {
  counts: Record<string, number>;
  active: NotifCategory;
  onSelect: (c: NotifCategory) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {NOTIF_CATEGORIES.map((cat) => {
        const count = props.counts[cat.key] ?? 0;
        const active = props.active === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => props.onSelect(cat.key)}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted")
            }
          >
            {cat.label}
            <span
              className={
                "rounded-full px-1.5 text-[10px] " +
                (active ? "bg-primary-foreground/20" : "bg-muted")
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    isLoading: notifsLoading,
  } = useNotifications(1, 20);
  const [systemNotifications, setSystemNotifications] = useState<any[] | null>(
    null,
  );
  const [systemLoading, setSystemLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [assignNotifId, setAssignNotifId] = useState<string | null>(null);
  const [adminNotifCategory, setAdminNotifCategory] =
    useState<NotifCategory>("all");

  // Use an IntersectionObserver to mark notifications as read only when the
  // "New System Notifications" card is visible to the user. This prevents
  // clearing the badge prematurely.
  const newNotifsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!newNotifsRef.current) return;
    if (unreadCount <= 0) return;

    const el = newNotifsRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void markAllAsRead();
            obs.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [unreadCount, markAllAsRead]);

  useEffect(() => {
    const fetchSystem = async () => {
      try {
        setSystemLoading(true);
        const endpoint = isStudent
          ? "/notifications?limit=200"
          : "/notifications/system?limit=200";
        const { data } = await api.get(endpoint);
        // Deduplicate by type + createdAt and sort so unreadForUser are first
        const raw: any[] = data.notifications || [];
        const seen = new Map<string, any>();
        for (const n of raw) {
          const key = `${n.type}:${new Date(n.createdAt).toISOString()}`;
          if (!seen.has(key)) seen.set(key, n);
        }
        const deduped = Array.from(seen.values()).map((n) => ({ ...n }));
        const items = deduped.sort((a: any, b: any) => {
          if (a.unreadForUser === b.unreadForUser)
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
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
  }, [isStudent]);

  // Handler after editing user (refresh system notifications and status)
  const onUserEditSuccess = async (removedNotificationId?: string | null) => {
    try {
      if (
        editingUser?.approvalStatus === "pending" ||
        editingUser?.isActive === false
      ) {
        try {
          await api.post(`/users/${editingUser._id}/approve`);
        } catch (approveErr) {
          console.error("Failed to approve pending user", approveErr);
        }
      }

      // optimistic removal for snappier UX
      if (removedNotificationId) {
        setSystemNotifications((prev) =>
          (prev || []).filter((s) => s._id !== removedNotificationId),
        );
      }
      const { data } = await api.get("/notifications/system?limit=200");
      setSystemNotifications((data.notifications || []).slice(0, 200));
    } catch (e) {
      console.error("Failed to refresh system notifications", e);
    }
    void fetchStatusIfNeeded();
    setEditOpen(false);
    setEditingUser(null);
    setAssignNotifId(null);
  };

  // fetchStatus is defined inside AdminNotifications; create a lightweight bridge
  const fetchStatusIfNeeded = async () => {
    try {
      await api.get("/attendance/status");
    } catch {}
  };

  useEffect(() => {
    if (!editOpen) {
      setAssignNotifId(null);
      setEditingUser(null);
    }
  }, [editOpen]);

  const adminAllNotifs = systemNotifications || [];
  const adminNotifCounts = countByCategory(adminAllNotifs);
  const adminActiveCat =
    NOTIF_CATEGORIES.find((c) => c.key === adminNotifCategory) ??
    NOTIF_CATEGORIES[0];
  const adminVisibleNotifs = filterByCategory(
    adminAllNotifs,
    adminNotifCategory,
  );

  return (
    <>
      <div
        data-tour="student-notifications"
        id="page-notifications"
        className="flex w-full flex-col gap-4 px-6 py-6"
      >
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
                  <CardTitle className="text-base">
                    New System Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {systemLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : (
                    (systemNotifications || []).slice(0, 10).map((n) => (
                      <button
                        key={n._id}
                        onClick={async () => {
                          try {
                            if (n.unreadForUser) await markAsRead(n._id);
                          } catch {}
                          if (n.link) window.location.href = n.link;
                        }}
                        className={`w-full text-left border rounded-md p-3 ${n.unreadForUser ? "bg-yellow-50" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {n.title}{" "}
                              {n.unreadForUser && (
                                <Badge className="ml-2">New</Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {n.message}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground ml-3 shrink-0">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
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
                  <CardTitle className="text-base">
                    New System Notifications
                  </CardTitle>
                  <CategoryPills
                    counts={adminNotifCounts}
                    active={adminNotifCategory}
                    onSelect={setAdminNotifCategory}
                  />
                  <p className="text-xs text-muted-foreground">
                    {adminActiveCat.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {systemLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : (
                    <>
                      {adminVisibleNotifs.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No notifications in this category.
                        </p>
                      )}
                      {adminVisibleNotifs.slice(0, 10).map((n) => (
                      <div
                        key={n._id}
                        className={`border rounded-md p-3 ${n.unreadForUser ? "bg-yellow-50" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {n.title}{" "}
                              {n.unreadForUser && (
                                <Badge className="ml-2">New</Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {n.message}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground ml-3 shrink-0 text-right flex flex-col items-end gap-2">
                            <div>{new Date(n.createdAt).toLocaleString()}</div>
                            {/* If this notification references a pending user, allow review and approval */}
                            {(n.metadata?.pendingUserId ||
                              n.metadata?.newUserId) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const userId =
                                    n.metadata?.pendingUserId ||
                                    n.metadata?.newUserId;
                                  const ok = window.confirm(
                                    n.metadata?.pendingUserId
                                      ? "Review and approve this registration?"
                                      : "Open assign dialog for this new user?",
                                  );
                                  if (!ok) return;
                                  try {
                                    const { data } = await api.get(
                                      `/users/${userId}`,
                                    );
                                    setEditingUser(data);
                                    setAssignNotifId(n._id);
                                    setEditOpen(true);
                                    try {
                                      if (n.unreadForUser)
                                        await markAsRead(n._id);
                                    } catch {}
                                  } catch (err) {
                                    console.error(
                                      "Failed to fetch user for review",
                                      err,
                                    );
                                  }
                                }}
                              >
                                {n.metadata?.pendingUserId
                                  ? "Review & approve"
                                  : "Assign class"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <AdminNotifications />
          </>
        )}
      </div>
      <NotificationsWrapperDialog
        editingUser={editingUser}
        open={editOpen}
        setOpen={setEditOpen}
        assignNotifId={assignNotifId}
        onSuccess={onUserEditSuccess}
      />
    </>
  );
}

// Render the user edit dialog at module level so it can be toggled
function NotificationsWrapperDialog(props: any) {
  const { editingUser, open, setOpen, onSuccess, assignNotifId } = props || {};
  if (!editingUser) return null;
  return (
    <UserDialog
      open={open}
      setOpen={setOpen}
      editingUser={editingUser}
      role={editingUser.role}
      onSuccess={() => onSuccess && onSuccess(assignNotifId)}
    />
  );
}

// ─── Student View ──────────────────────────────────────────────────────
function StudentNotifications() {
  const { user } = useAuth();
  const [data, setData] = useState<StudentNotifData | null>(null);
  const [clinicalSessions, setClinicalSessions] = useState<any[]>([]);
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
    // Clinical sessions for the student's active posting week — these are
    // merged into the schedule card alongside lecture periods.
    try {
      const { data: teamRes } = await api.get("/clinical-attendance/my-team");
      setClinicalSessions(
        Array.isArray(teamRes?.data?.weekActivities)
          ? teamRes.data.weekActivities
          : [],
      );
    } catch {
      setClinicalSessions([]);
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
            <p className="text-xs text-muted-foreground">
              Academic Year {data.academicYear ?? "—"}
            </p>
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
                {" "}
                of {data.totalClasses}
              </span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full bg-green-500 transition-all w-[${data.percentage}%]`}
                />
              </div>
              <span className="text-sm font-semibold">{data.percentage}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Timetables Card (shows today's lectures summary) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Lectures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold">
              {data.todayLectures.length}
            </p>
            <p className="text-xs text-muted-foreground">{data.todayDay}</p>
          </CardContent>
        </Card>

        {/* Attendance Alerts Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Attendance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {data.weeklyAlerts.reduce(
                (acc, d) =>
                  acc +
                  d.lectures.filter((l) => l.status && l.status !== "present")
                    .length,
                0,
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
              {/* New-week greeting (the week starts on Monday in this
                  region) */}
              {isMonday(new Date()) ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                  {pickNewWeekGreeting(user?._id)}
                </div>
              ) : null}

              {/* Today + the next two calendar days, merging lecture
                  periods and clinical sessions. Weekend days follow the
                  no-lecture rule and show a friendly weekend greeting. */}
              {(() => {
                const localDateKey = (d: Date) =>
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

                return [0, 1, 2].map((offset) => {
                  const dayDate = new Date();
                  dayDate.setHours(0, 0, 0, 0);
                  dayDate.setDate(dayDate.getDate() + offset);
                  const dayName = WEEKDAY_NAMES_FULL[dayDate.getDay()];
                  const dayHeading = `${dayName}${offset === 0 ? " · Today" : ` · ${dayDate.toLocaleDateString("en", { month: "short", day: "numeric" })}`}`;

                  if (isWeekend(dayDate)) {
                    return (
                      <div key={`day-${offset}`}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          {dayHeading} · Weekend
                        </p>
                        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-4 text-center">
                          <p className="text-sm text-muted-foreground italic">
                            {pickWeekendGreeting(user?._id, dayDate)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const daySchedule = data.timetable.find(
                    (s: any) =>
                      typeof s?.day === "string" &&
                      s.day.toLowerCase() === dayName.toLowerCase(),
                  );
                  const lectures = (daySchedule?.periods ?? [])
                    .slice()
                    .sort((a: any, b: any) =>
                      String(a.startTime).localeCompare(String(b.startTime)),
                    );
                  const clinical = clinicalSessions
                    .filter((s: any) => {
                      if (!s?.date) return false;
                      const sessionDate = new Date(s.date);
                      return (
                        localDateKey(sessionDate) === localDateKey(dayDate)
                      );
                    })
                    .sort((a: any, b: any) =>
                      String(a.startTime).localeCompare(String(b.startTime)),
                    );
                  const alertsForDay =
                    data.weeklyAlerts.find(
                      (a) => a.day.toLowerCase() === dayName.toLowerCase(),
                    )?.lectures ?? [];
                  const nothingScheduled =
                    lectures.length === 0 && clinical.length === 0;

                  return (
                    <div key={`day-${offset}`}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        {dayHeading}
                      </p>
                      {nothingScheduled ? (
                        <p className="text-xs text-muted-foreground italic py-1">
                          No lectures or clinical sessions
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {lectures.map((lec: any, i: number) => {
                            const alertEntry = alertsForDay[i];
                            const status = alertEntry?.status ?? null;
                            return (
                              <div
                                key={`lecture-${i}`}
                                className="flex items-center gap-3 border rounded-md px-3 py-2 text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {typeof lec.subject === "object"
                                      ? (lec.subject?.name ?? "—")
                                      : (lec.subject ?? "—")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {typeof lec.lecturer === "object" &&
                                    lec.lecturer?.name
                                      ? lec.lecturer.name
                                      : (lec.lecturer ?? "—")}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {lec.startTime} – {lec.endTime}
                                    </span>
                                  </div>
                                </div>
                                {status && (
                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${
                                      statusColors[status] ??
                                      "bg-muted text-foreground"
                                    }`}
                                  >
                                    {status}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {clinical.map((session: any, i: number) => (
                            <div
                              key={`clinical-${i}`}
                              className="flex items-center gap-3 border rounded-md px-3 py-2 text-sm border-l-4 border-l-green-500 bg-green-500/5"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {session.title || "Clinical session"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {session.unitLabel ||
                                    session.activityType ||
                                    "Clinical"}
                                </p>
                                {session.startTime ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {session.startTime}
                                      {session.endTime
                                        ? ` – ${session.endTime}`
                                        : ""}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-600 shrink-0">
                                CLINICAL
                              </span>
                            </div>
                          ))}
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
          {data.weeklyAlerts.every((d) =>
            d.lectures.every((l) => !l.status || l.status === "present"),
          ) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No attendance alerts. All lectures marked present.
            </p>
          ) : (
            <div className="space-y-4">
              {data.weeklyAlerts.map((dayAlert) => {
                const hasAlerts = dayAlert.lectures.some(
                  (l) => l.status && l.status !== "present",
                );
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
                                {typeof lec.subject === "object"
                                  ? (lec.subject?.name ?? "—")
                                  : "—"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {lec.startTime} – {lec.endTime}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${
                                statusColors[lec.status ?? ""] ??
                                "bg-muted text-foreground"
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
  const [systemNotificationsAdmin, setSystemNotificationsAdmin] = useState<
    any[] | null
  >(null);
  const [sysLoading, setSysLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [notifCategory, setNotifCategory] = useState<NotifCategory>("all");

  const totalClasses = classes.length;
  const activeTimetables = classes.filter(
    (cls) => cls.timetableStatus === "active",
  ).length;
  const missingTimetables = totalClasses - activeTimetables;
  const classesWithAttendanceAlerts = classes.filter(
    (cls) => cls.absent > 0 || cls.late > 0 || cls.excused > 0,
  );

  const allAdminNotifs = systemNotificationsAdmin || [];
  const notifCounts = countByCategory(allAdminNotifs);
  const activeNotifCat =
    NOTIF_CATEGORIES.find((c) => c.key === notifCategory) ??
    NOTIF_CATEGORIES[0];
  const visibleAdminNotifs = filterByCategory(allAdminNotifs, notifCategory);

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

  const fetchSystemNotificationsAdmin = async () => {
    try {
      setSysLoading(true);
      const { data } = await api.get("/notifications/system?limit=200");
      setSystemNotificationsAdmin(data.notifications || []);
    } catch (err) {
      console.error("Failed to load system notifications for admin", err);
    } finally {
      setSysLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
    void fetchSystemNotificationsAdmin();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteSelected = async () => {
    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Delete ${ids.length} selected notification(s)? This will remove them from the system.`,
    );
    if (!ok) return;
    try {
      await Promise.all(ids.map((id) => api.delete(`/notifications/${id}`)));
      setSystemNotificationsAdmin((prev) =>
        (prev || []).filter((n) => !ids.includes(n._id)),
      );
      setSelectedIds({});
    } catch (err) {
      console.error("Failed to delete selected notifications", err);
    }
  };

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
            <CardTitle className="text-sm font-medium">
              Active Timetables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeTimetables}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Attendance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {classesWithAttendanceAlerts.length}
            </p>
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
                  <div className="text-xs text-muted-foreground">
                    {cls.academicYear}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                      <span>Timetable</span>
                    </div>
                    <Badge
                      variant={
                        cls.timetableStatus === "active"
                          ? "default"
                          : "secondary"
                      }
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
                      {
                        label: "Present",
                        value: cls.present,
                        color: "bg-green-500",
                      },
                      {
                        label: "Absent",
                        value: cls.absent,
                        color: "bg-red-500",
                      },
                      {
                        label: "Late",
                        value: cls.late,
                        color: "bg-yellow-500",
                      },
                      {
                        label: "Excused",
                        value: cls.excused,
                        color: "bg-blue-500",
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between border rounded px-2 py-1"
                      >
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
              <CardTitle className="text-base">
                Other Important Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {classesWithAttendanceAlerts.length === 0 &&
              missingTimetables === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No urgent notifications. All classes are up to date.
                </p>
              ) : (
                <div className="space-y-3">
                  {missingTimetables > 0 && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-3 text-sm">
                      <p className="font-medium">
                        {missingTimetables} classes need timetable generation
                      </p>
                      <p className="text-muted-foreground">
                        Please generate timetables to avoid attendance and
                        schedule gaps.
                      </p>
                    </div>
                  )}
                  {classesWithAttendanceAlerts.map((cls) => (
                    <div
                      key={cls.classId}
                      className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3 text-sm"
                    >
                      <p className="font-medium">
                        {cls.className} has attendance alerts
                      </p>
                      <p className="text-muted-foreground">
                        {[
                          cls.absent > 0 && `${cls.absent} absent`,
                          cls.late > 0 && `${cls.late} late`,
                          cls.excused > 0 && `${cls.excused} excused`,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No alerts"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  System Notifications
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Manage system-wide notifications
                </div>
                <CategoryPills
                  counts={notifCounts}
                  active={notifCategory}
                  onSelect={setNotifCategory}
                />
                <p className="text-xs text-muted-foreground">
                  {activeNotifCat.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchSystemNotificationsAdmin()}
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={deleteSelected}
                >
                  Delete Selected
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sysLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : visibleAdminNotifs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No system notifications
                </p>
              ) : (
                <div className="space-y-2">
                  {visibleAdminNotifs.map((n) => (
                    <div
                      key={n._id}
                      className="flex items-start gap-3 border rounded-md p-3"
                      style={{
                        backgroundColor: n.unreadForUser
                          ? "#fef3c7"
                          : "transparent",
                        overflow: "auto",
                      }}
                    >
                      <input
                        aria-label={`Select notification ${n.title}`}
                        type="checkbox"
                        checked={!!selectedIds[n._id]}
                        onChange={() => toggleSelect(n._id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{n.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {n.message}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground ml-3 shrink-0">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const ok = window.confirm(
                              "Delete this notification?",
                            );
                            if (!ok) return;
                            try {
                              await api.delete(`/notifications/${n._id}`);
                              setSystemNotificationsAdmin((prev) =>
                                (prev || []).filter((s) => s._id !== n._id),
                              );
                            } catch (err) {
                              console.error(
                                "Failed to delete notification",
                                err,
                              );
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
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
