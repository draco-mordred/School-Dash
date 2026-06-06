import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Users, CalendarDays, CheckCircle2, XCircle, BarChart3, Bell } from "lucide-react";

// UI Imports
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Custom Components
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { LogbookOverviewChart } from "@/components/dashboard/logbook-overview-chart";
import { RotationProgressChart } from "@/components/dashboard/rotation-progress-chart";
import { UpcomingRotation } from "@/components/dashboard/upcoming-rotation";
import { RecentEntriesTable } from "@/components/dashboard/recent-entries-table";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Announcements } from "@/components/dashboard/announcements";

interface DashboardStatsData {
  totalProcedures?: number;
  approved?: number;
  pendingApproval?: number;
  rotationsCompleted?: number;
}

interface RoleStat {
  _id: string;
  count: number;
}

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

const roleLabels: Record<string, string> = {
  admin: "Admins",
  teacher: "Teachers",
  student: "Students",
  parent: "Parents",
};

const roleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" | null => {
  switch (role) {
    case "admin": return "destructive";
    case "teacher": return "default";
    case "student": return "secondary";
    case "parent": return "outline";
    default: return "secondary";
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<DashboardStatsData>({});
  const [roleStats, setRoleStats] = useState<RoleStat[]>([]);
  const [classStatuses, setClassStatuses] = useState<ClassStatus[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(true);

  // 1. Fetch Data Logic
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // THE REAL CALL
        const { data } = await api.get("/dashboard/stats");
        setStatsData(data);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user]);

  useEffect(() => {
    const fetchClassStatus = async () => {
      try {
        setNotificationLoading(true);
        const { data } = await api.get("/attendance/status");
        setClassStatuses(data.classes ?? []);
      } catch (error) {
        console.error("Failed to load notification status", error);
      } finally {
        setNotificationLoading(false);
      }
    };
    fetchClassStatus();
  }, []);

  // 2. Fetch role stats for admin
  useEffect(() => {
    if (user?.role !== "admin") return;
    const fetchRoleStats = async () => {
      try {
        const { data } = await api.get("/activities/role-stats");
        setRoleStats(data);
      } catch (error) {
        console.error("Failed to load role stats", error);
      }
    };
    fetchRoleStats();
  }, [user]);

  // 2. Loading State
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-100" />
          <Skeleton className="col-span-3 h-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}! Here is your daily academic overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Role specific actions */}
          {user?.role === "admin" && (
            <Button onClick={() => navigate("/users/students")}>
              Manage Students
            </Button>
          )}
          {user?.role === "teacher" && (
            <Button onClick={() => navigate("/lms/quizzes")}>
              Create Quiz
            </Button>
          )}
        </div>
      </div>

      {/* --- TOP ROW: STATS --- */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatsGrid
          data={{
            totalProcedures: statsData.totalProcedures ?? 94,
            approved: statsData.approved ?? 58,
            pendingApproval: statsData.pendingApproval ?? 21,
            rotationsCompleted: statsData.rotationsCompleted ?? 8,
          }}
        />
      </div>

      {/* --- ANALYTICS & PROGRESS ROW --- */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <LogbookOverviewChart />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <RotationProgressChart />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Bell className="h-4 w-4" />
                Notifications Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notificationLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3 text-sm">
                      <p className="text-muted-foreground">Active Timetables</p>
                      <p className="text-xl font-semibold">
                        {classStatuses.filter((cls) => cls.timetableStatus === "active").length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3 text-sm">
                      <p className="text-muted-foreground">Missing Timetables</p>
                      <p className="text-xl font-semibold">
                        {classStatuses.filter((cls) => cls.timetableStatus !== "active").length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3 text-sm col-span-2">
                      <p className="text-muted-foreground">Class Alerts</p>
                      <p className="text-xl font-semibold">
                        {classStatuses.filter((cls) => cls.absent > 0 || cls.late > 0 || cls.excused > 0).length}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Top alerts</p>
                    {classStatuses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No current notifications.</p>
                    ) : (
                      <ul className="space-y-2">
                        {classStatuses
                          .filter((cls) => cls.timetableStatus !== "active" || cls.absent > 0)
                          .slice(0, 3)
                          .map((cls) => (
                            <li key={cls.classId} className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3 text-sm">
                              <p className="font-medium">{cls.className}</p>
                              <p className="text-muted-foreground">
                                {cls.timetableStatus !== "active" ? "Timetable not generated." : ""}
                                {cls.timetableStatus !== "active" && cls.absent > 0 ? " " : ""}
                                {cls.absent > 0 ? `${cls.absent} absent today.` : ""}
                              </p>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <UpcomingRotation />
          {user?.role === "admin" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Users className="h-4 w-4" />
                  User Roles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {roleStats.length === 0 ? (
                  <Skeleton className="h-4 w-full" />
                ) : (
                  roleStats.map((stat) => (
                    <div key={stat._id} className="flex items-center justify-between">
                      <Badge variant={roleBadgeVariant(stat._id)} className="capitalize">
                        {roleLabels[stat._id] ?? stat._id}
                      </Badge>
                      <span className="font-semibold">{stat.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {(user?.role === "admin" || user?.role === "teacher") && (
            <AttendanceSummaryCard />
          )}
          {user?.role === "student" && (
            <StudentAttendanceCard />
          )}
        </div>
      </div>

      {/* --- BOTTOM ROW: DATA & QUICK ACTIONS --- */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <div>
          <RecentEntriesTable />
        </div>
        <div className="space-y-4">
          <QuickActions />
          <Announcements />
        </div>
      </div>
    </div>
  );
}

// ─── Admin/Teacher Attendance Summary Card ─────────────────────────
function AttendanceSummaryCard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ subject?: Array<{ name: string; code?: string }>; present: number; absent: number; late: number; excused: number }[]>([]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data } = await api.get("/attendance/subjects");
        setSummary(data.summary ?? []);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    void fetchSummary();
  }, []);

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, s) => ({
        present: acc.present + (s.present ?? 0),
        absent: acc.absent + (s.absent ?? 0),
        late: acc.late + (s.late ?? 0),
        excused: acc.excused + (s.excused ?? 0),
      }),
      { present: 0, absent: 0, late: 0, excused: 0 }
    );
  }, [summary]);

  const statusItems = [
    { label: "Present", value: totals.present, cls: "bg-green-500" },
    { label: "Absent", value: totals.absent, cls: "bg-red-500" },
    { label: "Late", value: totals.late, cls: "bg-yellow-500" },
    { label: "Excused", value: totals.excused, cls: "bg-blue-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <BarChart3 className="h-4 w-4" />
          Attendance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance records yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {statusItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${item.cls}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="font-semibold text-sm">{item.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center pt-1">
              {summary.length} subject{summary.length !== 1 ? "s" : ""} tracked
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Student Attendance Card ──────────────────────────────────────
function StudentAttendanceCard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ _id: string; count: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/attendance/me");
        setStats(data.stats ?? []);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    void fetchStats();
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    stats.forEach((s) => { map[s._id] = (map[s._id] ?? 0) + s.count; });
    return map;
  }, [stats]);

  const total = counts.present + counts.absent + counts.late + counts.excused;
  const statusItems = [
    { label: "Present", value: counts.present, cls: "bg-green-500" },
    { label: "Absent", value: counts.absent, cls: "bg-red-500" },
    { label: "Late", value: counts.late, cls: "bg-yellow-500" },
    { label: "Excused", value: counts.excused, cls: "bg-blue-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <BarChart3 className="h-4 w-4" />
          My Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance records yet.</p>
        ) : (
          <>
            {statusItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${item.cls}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.cls}`}
                    style={{ width: total ? `${Math.round((item.value / total) * 100)}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-1">
              {total} total records
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
