import { useEffect, useState, lazy, Suspense, memo, useMemo, useRef, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar-context";
import { ChevronRight } from "lucide-react";
import { W11Icon, type W11Glyph } from "@/components/icons/W11Icon";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { AcademicSnapshot, ClinicalSnapshot } from "@/components/admin/dashboard/Snapshots";
import { shouldShowAdminDashboardSkeleton } from "@/lib/dashboardState";
const KPICards = lazy(() => import("@/components/admin/dashboard/KPICards").then(mod => ({ default: mod.KPICards })));
const OperationalAlerts = lazy(() => import("@/components/admin/dashboard/OperationalAlerts").then(mod => ({ default: mod.OperationalAlerts })));
const RecentActivityFeed = lazy(() => import("@/components/admin/dashboard/RecentActivityFeed").then(mod => ({ default: mod.RecentActivityFeed })));
const QuickActions = lazy(() => import("@/components/admin/dashboard/QuickActions").then(mod => ({ default: mod.QuickActions })));
const AnalyticsWidgets = lazy(() => import("@/components/admin/dashboard/AnalyticsWidgets").then(mod => ({ default: mod.AnalyticsWidgets })));
const AIInsightWidget = lazy(() => import("@/components/dashboard/ai-insight-widget").then(mod => ({ default: mod.AIInsightWidget })));

const DashboardChartShell = memo(function DashboardChartShell({ paused, children, className }: { paused: boolean; children: ReactNode; className?: string }) {
  if (paused) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10", className)}>
        <span className="text-[11px] font-medium text-muted-foreground/80">Updating layout…</span>
      </div>
    );
  }

  return <div className={cn("h-full w-full", className)}>{children}</div>;
});

const NotificationsCard = memo(function NotificationsCard() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, refetch, markAsRead } = useNotifications(1, 7);

  const openNotifications = () => navigate("/notifications");

  // Auto-refresh notifications every 5 minutes
  useEffect(() => {
    const id = setInterval(() => {
      void refetch();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refetch]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer" onClick={openNotifications}>
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Notifications</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Top {notifications?.length ?? 0} recent</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-6 w-full rounded" />
            <Skeleton className="h-6 w-full rounded" />
            <Skeleton className="h-6 w-full rounded" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No notifications</div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={async () => {
                  try { await markAsRead(n._id); } catch {}
                  if (n.link) window.location.href = n.link;
                  else navigate('/notifications');
                }}
                className={cn("w-full text-left p-3 hover:bg-muted flex items-start gap-3", !n.isRead && "bg-surface")}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="truncate font-medium text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground ml-2">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-1">{n.message}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Data interfaces ───────────────────────────────────────────
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

interface RoleStat {
  role: string;
  active: number;
  inactive: number;
}

interface QuickTile {
  id: string;
  title: string;
  description?: string;
  icon: W11Glyph;
  onClick: () => void;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

// ─── Tile helpers ───────────────────────────────────────────────
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

// ─── Main Dashboard ─────────────────────────────────────────────
const Dashboard = memo(function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: sidebarState } = useSidebar();
  const [pauseCharts, setPauseCharts] = useState(false);
  const previousSidebarStateRef = useRef(sidebarState);
  
  // Admin dashboard data
  const { data: adminDashboardData, loading: adminLoading } = useAdminDashboard();
  
  const [loading, setLoading] = useState(true);
  const [roleStats, setRoleStats] = useState<RoleStat[]>([]);
  const [classStatuses, setClassStatuses] = useState<ClassStatus[]>([]);
  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [childrenAttendance, setChildrenAttendance] = useState<Record<string, any>>({});
  const [studentCourseGroups, setStudentCourseGroups] = useState<any[]>([
    { label: "PED", code: "PED101", present: 28, absent: 4, late: 2, excused: 1, total: 35 },
    { label: "O&G", code: "O&G202", present: 30, absent: 2, late: 1, excused: 0, total: 33 },
    { label: "INT", code: "INT301", present: 25, absent: 6, late: 3, excused: 1, total: 35 },
    { label: "SUR", code: "SUR104", present: 20, absent: 8, late: 2, excused: 0, total: 30 },
    { label: "ANA", code: "ANA205", present: 32, absent: 1, late: 2, excused: 0, total: 35 },
  ]);

  // Chart data — mock logbook entries for Jan–Jun
  const logbookData = useMemo(() => [
    { month: "Jan", approved: 42, pending: 18 },
    { month: "Feb", approved: 55, pending: 12 },
    { month: "Mar", approved: 48, pending: 22 },
    { month: "Apr", approved: 67, pending: 9 },
    { month: "May", approved: 74, pending: 15 },
    { month: "Jun", approved: 58, pending: 25 },
  ], []);

  // Rotation progress — mock data
  const rotationData = useMemo(() => [
    { name: "Completed", value: 62, color: "#AD6BEE" },
    { name: "In Progress", value: 24, color: "#A6D49F" },
    { name: "Upcoming", value: 14, color: "#C3D405" },
  ], []);

  const [rotationStats, setRotationStats] = useState<typeof rotationData | null>(null);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);

  useEffect(() => {
    if (previousSidebarStateRef.current !== sidebarState) {
      setPauseCharts(true);
      const timerId = window.setTimeout(() => setPauseCharts(false), 260);
      return () => window.clearTimeout(timerId);
    }

    previousSidebarStateRef.current = sidebarState;
    return undefined;
  }, [sidebarState]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [roleRes, classRes] = await Promise.all([
          user?.role === "admin" ? api.get("/activities/role-stats") : Promise.resolve({ data: [] }),
          user?.role === "admin" || user?.role === "teacher" ? api.get("/attendance/status") : Promise.resolve({ data: { classes: [] } }),
        ]);
        setRoleStats(roleRes.data ?? []);
        setClassStatuses(classRes.data?.classes ?? []);

        // Fetch linked children's attendance for parent users
        if (user?.role === "parent" && user?.parentStudents?.length > 0) {
          setParentChildren(user.parentStudents);
          const attendanceMap: Record<string, any> = {};
          await Promise.all(
            (user.parentStudents as any[]).map(async (student: any) => {
              const studentId = typeof student === "string" ? student : student._id;
              try {
                const { data } = await api.get(`/attendance/student/${studentId}/summary`);
                attendanceMap[studentId] = data;
              } catch {
                attendanceMap[studentId] = null;
              }
            })
          );
          setChildrenAttendance(attendanceMap);
        }

        // Fetch student's own attendance for per-course-group charts
        if (user?.role === "student") {
          try {
            const { data } = await api.get("/attendance/me");
            const records = data.records ?? [];
            // Group records by course code prefix (e.g., "PED", "O&G")
            const groupMap: Record<string, any> = {};
            records.forEach((rec: any) => {
              const code = rec.course?.code ?? rec.course?.name ?? "Unknown";
              const prefix = code.replace(/[^A-Za-z]/g, "").split("").slice(0, 3).join("") || code.slice(0, 3);
              if (!groupMap[prefix]) {
                groupMap[prefix] = { label: prefix, code, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
              }
              groupMap[prefix][rec.status] = (groupMap[prefix][rec.status] ?? 0) + 1;
              groupMap[prefix].total += 1;
            });
            setStudentCourseGroups(Object.values(groupMap));
          } catch {
            setStudentCourseGroups([]);
          }
        }

        // Fetch rotation stats scoped to the user
        try {
          const { data } = await api.get("/clinical-rotations/stats");
          const counts: Record<string, number> = data.counts || {};
          const completed = counts["completed"] || 0;
          const active = counts["active"] || 0;
          const upcoming = (counts["upcoming"] || 0) + (counts["pending_approval"] || 0);
          const total = completed + active + upcoming || 1;
          const computed = [
            { name: "Completed", value: Math.round((completed / total) * 100), color: "#AD6BEE" },
            { name: "In Progress", value: Math.round((active / total) * 100), color: "#A6D49F" },
            { name: "Upcoming", value: Math.round((upcoming / total) * 100), color: "#C3D405" },
          ];
          setRotationStats(computed);
        } catch (err) {
          setRotationStats(null);
        }

        // Fetch weekly activity counts for students (admin view)
        try {
          if (user?.role === "admin") {
            const { data } = await api.get(`/activities/weekly?weeks=12`);
            const weeks = data.weeks ?? [];
            setWeeklyActivity(
              weeks.map((w: any) => ({ name: format(new Date(w.weekStart), "MMM d"), attendance: w.attendance || 0, rotation: w.rotation || 0 }))
            );
          }
        } catch (err) {
          // ignore
        }
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchAll();
  }, [user]);

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher" || user?.role === "unitconsultant" || user?.role === "unitresident";
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";
  const canViewMordredInsights = isAdmin || isTeacher || user?.role === "unitconsultant" || user?.role === "unitresident" || isParent || isStudent;
  const resolvedAdminDashboardData = useMemo(() => adminDashboardData ?? {
    stats: {
      totalStudents: 0,
      totalParents: 0,
      totalStaff: 0,
      activeSession: "N/A",
    },
    academicData: {
      sessions: 0,
      semesters: 0,
      classes: 0,
      courses: 0,
      assessments: 0,
      details: {
        activeAcademicYear: null,
        currentSemester: null,
        classes: [],
      },
    },
    clinicalData: {
      postings: 0,
      departments: 0,
      units: 0,
      teams: 0,
      rotations: 0,
      details: {
        postings: [],
        rotationTeams: [],
        rotations: [],
      },
    },
    alerts: [],
    activities: [],
  }, [adminDashboardData]);

  // Derived UI values for class overview
  const classesWithTimetableCount = classStatuses.filter((c) => c.timetableStatus === "active").length;
  const classesOverviewValue = `${classesWithTimetableCount} / ${classStatuses.length}`;
  const classesOverviewStatus =
    classStatuses.length === 0
      ? "neutral"
      : classStatuses.every((c) => c.timetableStatus === "active")
      ? "good"
      : "warn";

  // Build quick tiles based on role
  const quickTiles = useMemo<QuickTile[]>(() => [
    ...(isAdmin ? [
      { id: "students", title: "Manage Students", icon: "graduation-cap", onClick: () => navigate("/users/students"), badge: "CRUD" },
      { id: "users", title: "Roles & Permissions", icon: "users", onClick: () => navigate("/users"), badge: "Admin" },
      { id: "classes", title: "Classes", icon: "layers", onClick: () => navigate("/classes"), badge: "CRUD" },
      { id: "attendance-admin", title: "Attendance", icon: "clipboard-list", onClick: () => navigate("/attendance"), badge: "Admin" },
      { id: "timetable", title: "Timetable", icon: "clock", onClick: () => navigate("/timetable") },
      { id: "settings", title: "Settings", icon: "settings", onClick: () => navigate("/settings") },
    ] : []),
    ...(isTeacher ? [
      { id: "attendance-teacher", title: "Take Attendance", icon: "clipboard-list", onClick: () => navigate("/attendance"), badge: "Record" },
      { id: "my-classes", title: "My Classes", icon: "layers", onClick: () => navigate("/classes") },
      { id: "timetable-teacher", title: "Timetable", icon: "clock", onClick: () => navigate("/timetable") },
      { id: "results", title: "Results", icon: "trending-up", onClick: () => navigate("/lms/exams") },
    ] : []),
    ...(isStudent ? [
      { id: "my-attendance", title: "My Attendance", icon: "bar-chart", onClick: () => navigate("/attendance") },
      { id: "my-timetable", title: "Timetable", icon: "clock", onClick: () => navigate("/timetable") },
      { id: "my-courses", title: "Courses", icon: "book-open", onClick: () => navigate("/courses") },
    ] : []),
    ...(isParent ? [
      { id: "linked-students", title: "My Children", icon: "users", onClick: () => navigate("/settings/account") },
      { id: "child-attendance", title: "Children's Attendance", icon: "bar-chart", onClick: () => navigate("/attendance") },
      { id: "child-timetable", title: "Timetables", icon: "clock", onClick: () => navigate("/timetable") },
    ] : []),
  ], [isAdmin, isTeacher, isStudent, isParent, navigate]);

  // Precompute role rows to keep JSX simpler and avoid TSX parser ambiguities
  const roleRows = useMemo(() => roleStats.map((stat: any) => {
    const roleKey = stat._id ?? stat.role;
    const total = stat.count ?? ((stat.active ?? 0) + (stat.inactive ?? 0));
    const route =
      roleKey === "unitconsultant" ? "unit-consultants" :
      roleKey === "unitresident" ? "unit-residents" :
      roleKey === "admin" ? "admins" : `${roleKey}s`;

    return (
      <div
        key={roleKey}
        onClick={() => navigate(`/users/${route}`)}
        className="flex items-center justify-between py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-accent/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            {getRoleIconSmall(roleKey)}
          </div>
          <span className="text-sm font-medium capitalize">{roleLabels[roleKey] ?? roleKey}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={roleBadgeVariant(roleKey)} className="capitalize">{total}</Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }), [navigate, roleStats]);

  // Keep the dashboard shell visible for admins once initial loading is done,
  // but still show a skeleton while the admin overview is being fetched.
  if (shouldShowAdminDashboardSkeleton(loading, isAdmin, adminLoading, adminDashboardData)) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="h-72 lg:col-span-3 rounded-xl" />
          <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="h-72 lg:col-span-3 rounded-xl" />
          <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ADMIN DASHBOARD — Specialized view for admin users
  // ═══════════════════════════════════════════════════════════════
  if (isAdmin) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Page Header */}
        <div>
          <div className="text-3xl font-bold tracking-tight">INSTITUTIONAL OPERATIONS CENTER</div>
          <br />
          <h1 className="text-3xl font-semibold tracking-tight">
            {getGreeting()}, {user?.name?.split(" ")[0]} 
          </h1>
          <p className="text-muted-foreground mt-2">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* KPI Cards */}
        <Suspense fallback={<Skeleton className="h-36 w-full rounded-xl" />}>
          <KPICards stats={resolvedAdminDashboardData.stats} loading={adminLoading} />
        </Suspense>
 
        {/* Academic & Clinical Snapshots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
            <AcademicSnapshot loading={adminLoading} data={resolvedAdminDashboardData.academicData} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
            <ClinicalSnapshot loading={adminLoading} data={resolvedAdminDashboardData.clinicalData} />
          </Suspense>
        </div>

        {/* Operational Alerts */}
        <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
          <OperationalAlerts alerts={resolvedAdminDashboardData.alerts} loading={adminLoading} />
        </Suspense>

        {/* Activity Feed & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
              <RecentActivityFeed activities={resolvedAdminDashboardData.activities} loading={adminLoading} />
            </Suspense>
            {/* Insert mordred insights card here */}
            
          </div>
          
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
            <QuickActions />
          </Suspense>
        </div>

        {/* Analytics Widgets */}
        <Suspense fallback={<Skeleton className="h-60 w-full rounded-xl" />}>
          <AnalyticsWidgets />
        </Suspense>
        {/* Below tag is for notifications imported into the admin's dashboard */}
        <NotificationsCard /> 
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Clinical progress chart</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Responsive container test — line chart</p>
          </div>
          <div className="p-5">
            <div className="h-56">
              <DashboardChartShell paused={pauseCharts}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyActivity.length ? weeklyActivity : [{ name: "W1", attendance: 10, rotation: 6 }, { name: "W2", attendance: 35, rotation: 12 }, { name: "W3", attendance: 50, rotation: 16 }, { name: "W4", attendance: 25, rotation: 8 }]} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="attendance" name="Attendance" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="rotation" name="Rotation" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartShell>
            </div>
          </div>
        </div>
      </div>
      
    );
  }

  return (
    <div id="page-dashboard" className="flex-1 space-y-8 p-6">
      {/* ── GREETING ───────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {getGreeting()}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-NG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ══ TEST CHARTS — RESPONSIVE CONTAINER TEST ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotificationsCard />

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Test Line Chart</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Responsive container test — line chart</p>
          </div>
          <div className="p-5">
              <div className="h-56">
              <DashboardChartShell paused={pauseCharts}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyActivity.length ? weeklyActivity : [{ name: "W1", attendance: 10, rotation: 6 }, { name: "W2", attendance: 35, rotation: 12 }, { name: "W3", attendance: 50, rotation: 16 }, { name: "W4", attendance: 25, rotation: 8 }]} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="attendance" name="Attendance" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="rotation" name="Rotation" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartShell>
            </div>
          </div>
        </div>
      </div>

      {/* ══ CHARTS — TOP OF PAGE ═══════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Logbook Overview — line chart (3 cols) */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Logbook Overview</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Approved vs Pending entries, Jan–Jun</p>
          </div>
          <div className="p-5">
            <div className="h-56">
              <DashboardChartShell paused={pauseCharts}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={logbookData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "var(--foreground)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="approved"
                      name="Approved"
                      stroke="#AD6BEE"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#AD6BEE" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      name="Pending"
                      stroke="#A6D49F"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#A6D49F" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartShell>
            </div>
          </div>
        </div>

        {/* Rotation Progress — donut chart (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Rotation Progress</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Clinical rotation completion status</p>
          </div>
          <div className="p-5 flex items-center gap-4">
            <div className="h-44 w-44 shrink-0">
              <DashboardChartShell paused={pauseCharts} className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                        data={rotationStats ?? rotationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                        {(rotationStats ?? rotationData).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "var(--foreground)",
                      }}
                      formatter={(value: number) => `${value}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </DashboardChartShell>
            </div>
            <div className="flex flex-col gap-2.5">
              {rotationData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2.5">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ background: entry.color }}
                  />
                  <div className="flex items-center justify-between min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                    <span className="text-xs font-semibold ml-2">{entry.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ QUICK SETTINGS TILES ════════════════════════════════ */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {isAdmin ? "Admin Tools" : isTeacher ? "Teacher Tools" : isStudent ? "Student Tools" : "Quick Access"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {quickTiles.map((tile) => (
            <TileCard key={tile.id} tile={tile} />
          ))}
        </div>
      </div>

      {canViewMordredInsights && (
        <div className="grid grid-cols-1 gap-6">
          <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
            <AIInsightWidget />
          </Suspense>
        </div>
      )}

      {/* ══ MAIN CONTENT GRID ══════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: People + Class Overview */}
        <div className="lg:col-span-3 space-y-6">
          {/* User roles breakdown — admin only, clickable card */}
          {isAdmin && roleStats.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold">People</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Users by role in the system</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary">Manage Users</span>
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="p-4 max-h-[36rem] overflow-auto">
                <div className="divide-y divide-border">
                  {roleRows}
                </div>
            </div>
          </div>
          )}

          {/* Class attendance overview */}
          {classStatuses.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold">Class Overview</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Today's attendance by class</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => navigate("/attendance")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View All Attendance
                  </button>
                )}
              </div>
              <div className="p-5 space-y-3">
                {classStatuses.slice(0, isAdmin ? 5 : 3).map((cls) => {
                  const total = cls.present + cls.absent + cls.late + cls.excused;
                  const presentPct = total > 0 ? Math.round((cls.present / total) * 100) : 0;
                  return (
                    <div key={cls.classId} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{cls.className}</span>
                          {cls.timetableStatus !== "active" && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              No Timetable
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {cls.present}/{total}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              presentPct >= 75
                                ? "text-green-600 dark:text-green-400"
                                : presentPct >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            )}
                          >
                            {presentPct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            presentPct >= 75
                              ? "bg-green-500"
                              : presentPct >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${presentPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state for no class data */}
          {!loading && classStatuses.length === 0 && (isAdmin || isTeacher) && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Class Overview</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">No class attendance data yet</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No attendance records found for today.
                </p>
              </div>
            </div>
          )}

          {/* Parent: Children's Attendance Charts */}
          {isParent && parentChildren.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold">Children's Attendance</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Attendance overview for each child</p>
                </div>
                <button
                  onClick={() => navigate("/settings/account")}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View Details
                </button>
              </div>
              <div className="p-5 space-y-6">
                {parentChildren.map((student: any) => {
                  const studentId = typeof student === "string" ? student : student._id;
                  const studentName = typeof student === "object" ? student.name : "Student";
                  const attendance = childrenAttendance[studentId];
                  const stats = attendance?.stats ?? [];
                  const statsMap: Record<string, number> = {};
                  stats.forEach((s: any) => { statsMap[s._id] = s.count; });
                  const total = Object.values(statsMap).reduce((a, b) => a + b, 0) || 1;
                  const present = statsMap.present ?? 0;
                  const absent = statsMap.absent ?? 0;
                  const late = statsMap.late ?? 0;
                  const excused = statsMap.excused ?? 0;
                  const presentPct = Math.round(((present + late) / total) * 100);

                  // Prepare chart data
                  const chartData = [
                    { name: "Present", value: present, fill: "#22c55e" },
                    { name: "Absent", value: absent, fill: "#ef4444" },
                    { name: "Late", value: late, fill: "#eab308" },
                    { name: "Excused", value: excused, fill: "#3b82f6" },
                  ].filter((d) => d.value > 0);

                  return (
                    <div key={studentId} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{studentName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{present}/{total}</span>
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              presentPct >= 75
                                ? "text-green-600 dark:text-green-400"
                                : presentPct >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            )}
                          >
                            {presentPct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            presentPct >= 75
                              ? "bg-green-500"
                              : presentPct >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${presentPct}%` }}
                        />
                      </div>
                      {chartData.length > 0 && (
                        <DashboardChartShell paused={pauseCharts} className="h-[100px]">
                          <ResponsiveContainer width="100%" height={100}>
                            <PieChart>
                              <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={24}
                                outerRadius={40}
                                paddingAngle={2}
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, name: string) => [`${value}`, name]}
                                contentStyle={{
                                  background: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </DashboardChartShell>
                      )}
                      <div className="flex gap-4 justify-center">
                        {chartData.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                            <span className="text-xs text-muted-foreground">{d.name}: {d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parent empty state */}
          {isParent && !loading && parentChildren.length === 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Children's Attendance</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">No linked students yet</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Link a student in your Account Settings to view attendance.
                </p>
              </div>
            </div>
          )}

          {/* Student: Course Subject Group Attendance Charts */}
          {isStudent && studentCourseGroups.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold">Attendance by Subject</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Attendance across your course subject groups</p>
                </div>
                <button
                  onClick={() => navigate("/attendance")}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="p-5">
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {studentCourseGroups.map((group) => {
                    const total = group.total || 1;
                    const presentPct = Math.round(((group.present ?? 0) / total) * 100);
                    const chartData = [
                      { name: "Present", value: group.present ?? 0, fill: "#22c55e" },
                      { name: "Absent", value: group.absent ?? 0, fill: "#ef4444" },
                      { name: "Late", value: group.late ?? 0, fill: "#eab308" },
                      { name: "Excused", value: group.excused ?? 0, fill: "#3b82f6" },
                    ].filter((d) => d.value > 0);
                    return (
                      <div key={group.label} className="shrink-0 w-44 flex flex-col items-center rounded-lg border border-border p-4 space-y-3">
                        <span className="text-sm font-semibold">{group.label}</span>
                        <div className="relative">
                          <DashboardChartShell paused={pauseCharts} className="h-[80px] w-[80px]">
                            <ResponsiveContainer width={80} height={80}>
                              <PieChart>
                                <Pie
                                  data={chartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={22}
                                  outerRadius={36}
                                  paddingAngle={2}
                                >
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number, name: string) => [`${value}`, name]}
                                  contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </DashboardChartShell>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className={cn(
                                "text-xs font-bold",
                                presentPct >= 75
                                  ? "text-green-600 dark:text-green-400"
                                  : presentPct >= 50
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400"
                              )}
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

                {/* TEST: Dummy bar charts for ResponsiveContainer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">Test — Group Attendance Bar</p>
                    <div className="h-40">
                      <DashboardChartShell paused={pauseCharts}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[{ name: "PED", present: 28, absent: 4 }, { name: "O&G", present: 30, absent: 2 }, { name: "INT", present: 25, absent: 6 }]} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }} />
                            <Bar dataKey="present" fill="#22c55e" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </DashboardChartShell>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">Test — Weekly Trend Line</p>
                    <div className="h-40">
                      <DashboardChartShell paused={pauseCharts}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[{ day: "Mon", rate: 85 }, { day: "Tue", rate: 92 }, { day: "Wed", rate: 78 }, { day: "Thu", rate: 95 }]} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }} />
                            <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </DashboardChartShell>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student empty state */}
          {isStudent && !loading && studentCourseGroups.length === 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Attendance by Subject</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">No attendance data yet</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No attendance records found for your courses.
                </p>
              </div>
            </div>
          )}
        </div>

          {/* Right column simplified for parsing/debug */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Right column (debug)</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Temporarily simplified to isolate JSX parse errors.</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;

// ─── Sub-components ───────────────────────────────────────────
function TileCard({ tile }: { tile: QuickTile }) {
  return (
    <button
      onClick={tile.onClick}
      className="group flex flex-col items-start rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/50 active:scale-[0.98]"
    >
      <div className="mb-3">
        <W11Icon glyph={tile.icon} size="md" />
      </div>
      <span className="text-sm font-medium leading-tight">{tile.title}</span>
      {tile.badge && (
        <span className="mt-1.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {tile.badge}
        </span>
      )}
    </button>
  );
}

function StatusRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "good" | "warn" | "bad" | "info" | "neutral";
}) {
  const dotClass = cn(
    "h-2 w-2 rounded-full shrink-0",
    status === "good" && "bg-green-500",
    status === "warn" && "bg-amber-500",
    status === "bad" && "bg-red-500",
    status === "info" && "bg-blue-500",
    status === "neutral" && "bg-muted-foreground"
  );
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={dotClass} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function getRoleIconSmall(role: string) {
  const glyph: W11Glyph =
    role === "admin" ? "shield"
    : role === "teacher" ? "graduation-cap"
    : role === "student" ? "book-open"
    : "user-circle";
  return <W11Icon glyph={glyph} size="sm" />;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
