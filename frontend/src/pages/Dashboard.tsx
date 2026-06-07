import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { W11Icon, type W11Glyph } from "@/components/icons/W11Icon";
import {
  LineChart,
  Line,
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
import { cn } from "@/lib/utils";

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
  _id: string;
  count: number;
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
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roleStats, setRoleStats] = useState<RoleStat[]>([]);
  const [classStatuses, setClassStatuses] = useState<ClassStatus[]>([]);

  // Chart data — mock logbook entries for Jan–Jun
  const logbookData = [
    { month: "Jan", approved: 42, pending: 18 },
    { month: "Feb", approved: 55, pending: 12 },
    { month: "Mar", approved: 48, pending: 22 },
    { month: "Apr", approved: 67, pending: 9 },
    { month: "May", approved: 74, pending: 15 },
    { month: "Jun", approved: 58, pending: 25 },
  ];

  // Rotation progress — mock data
  const rotationData = [
    { name: "Completed", value: 62, color: "#AD6BEE" },
    { name: "In Progress", value: 24, color: "#A6D49F" },
    { name: "Upcoming", value: 14, color: "#C3D405" },
  ];

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
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchAll();
  }, [user]);

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";

  // Build quick tiles based on role
  const quickTiles: QuickTile[] = [
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
  ];

  if (loading) {
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

  return (
    <div className="flex-1 space-y-8 p-6">
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rotationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {rotationData.map((entry, index) => (
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

      {/* ══ MAIN CONTENT GRID ══════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: People + Class Overview */}
        <div className="lg:col-span-3 space-y-6">
          {/* User roles breakdown — admin only, clickable card */}
          {isAdmin && roleStats.length > 0 && (
            <div
              onClick={() => navigate("/users")}
              className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:bg-accent/30 active:scale-[0.99]"
            >
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
              <div className="divide-y divide-border">
                {roleStats.map((stat) => (
                  <div
                    key={stat._id}
                    className="flex items-center justify-between px-5 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        {getRoleIconSmall(stat._id)}
                      </div>
                      <span className="text-sm font-medium capitalize">
                        {roleLabels[stat._id] ?? stat._id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={roleBadgeVariant(stat._id)} className="capitalize">
                        {stat.count}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
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
        </div>

        {/* Right column: System Status + Quick Links */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Status */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">System Status</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Current platform overview</p>
            </div>
            <div className="p-5 space-y-3">
              <StatusRow
                label="Active Academic Year"
                value={user?.year?.name ?? "Not Set"}
                status="info"
              />
              {isAdmin && (
                <>
                  <StatusRow
                    label="Classes with Timetables"
                    value={`${classStatuses.filter((c) => c.timetableStatus === "active").length} / ${classStatuses.length}`}
                    status={
                      classStatuses.length === 0
                        ? "neutral"
                        : classStatuses.every((c) => c.timetableStatus === "active")
                        ? "good"
                        : "warn"
                    }
                  />
                  <StatusRow
                    label="User Roles"
                    value={roleStats.reduce((a, b) => a + b.count, 0).toString()}
                    status="info"
                  />
                  <StatusRow
                    label="Today's Attendance"
                    value={`${classStatuses.reduce((a, c) => a + c.present, 0)} present`}
                    status="info"
                  />
                </>
              )}
              <StatusRow
                label="Your Role"
                value={(user?.role ?? "—").replace(/\b\w/g, (c) => c.toUpperCase())}
                status="info"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">Quick Links</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Frequently accessed areas</p>
            </div>
            <div className="p-2 space-y-1">
              {quickTiles.slice(0, 5).map((tile) => (
                <button
                  key={tile.id}
                  onClick={tile.onClick}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="flex items-center gap-3">
                    <W11Icon glyph={tile.icon} size="sm" />
                    <span>{tile.title}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
