import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Bell, ClipboardList, Clock3, ArrowRight, AlertTriangle, CalendarDays, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AIInsightWidget, type InsightItem } from "@/components/dashboard/ai-insight-widget";

interface LectureSummary {
  subject: { _id: string; name: string } | string | null;
  lecturer: { _id: string; name: string } | string | null;
  startTime?: string;
  endTime?: string;
  status?: string | null;
}

interface WeeklyAlert {
  day: string;
  lectures: LectureSummary[];
}

interface StudentPortalSummary {
  className: string | null;
  academicYear: string | null;
  todayDay: string | null;
  todayLectures: LectureSummary[];
  totalAttended: number;
  totalClasses: number;
  percentage: number;
  weeklyAlerts: WeeklyAlert[];
}

interface SystemAnnouncement {
  _id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  unreadForUser?: boolean;
}

interface PostingProgressRow {
  key: string;
  label: string;
  department: string;
  planned: number;
  attended: number;
  missed: number;
  percent: number;
  isCurrentUnit: boolean;
}

interface PostingProgressState {
  overallPercent: number;
  daysRemaining: number | null;
  currentWindowLabel: string;
  currentUnitLabel: string;
  activeLocationTitle: string;
  activeLocationValue: string;
  usesUnits: boolean;
  needsAttention: boolean;
  note: string;
  rows: PostingProgressRow[];
}

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const POSTING_PROGRESS_MAX_RETRIES = 3;
const POSTING_PROGRESS_RETRY_DELAY_MS = 1500;

const parseTimeToMinutes = (time?: string) => {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const getDayIndex = (day: string) => WEEK_DAYS.findIndex((d) => d.toLowerCase() === day.toLowerCase());

const normalizeStudentStatus = (rawStatus?: string | null) => {
  const normalized = String(rawStatus ?? "").trim().toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "completed") return "Completed";
  if (normalized === "active" || normalized === "ongoing") return "Active";
  if (normalized === "planned") return "Planned";
  return "Scheduled";
};

const getLectureStatus = (lecture: LectureSummary, lectureDay: string) => {
  const now = new Date();
  const todayIndex = getDayIndex(WEEK_DAYS[(now.getDay() + 6) % 7]);
  const lectureIndex = getDayIndex(lectureDay || WEEK_DAYS[todayIndex >= 0 ? todayIndex : 0]);
  const rawStatus = String(lecture.status ?? "").trim().toLowerCase();

  if (rawStatus === "cancelled" || rawStatus === "canceled") return "Cancelled";
  if (rawStatus === "completed") return "Completed";

  const startMinutes = parseTimeToMinutes(lecture.startTime);
  const endMinutes = parseTimeToMinutes(lecture.endTime);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (lectureIndex === todayIndex && startMinutes !== null && endMinutes !== null) {
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) return "Active";
    if (currentMinutes > endMinutes) return "Completed";
    return rawStatus === "planned" ? "Planned" : "Scheduled";
  }

  if (lectureIndex >= 0 && todayIndex >= 0) {
    if (lectureIndex < todayIndex) return "Completed";
    return rawStatus === "planned" ? "Planned" : "Scheduled";
  }

  return normalizeStudentStatus(rawStatus);
};

function ProgressRing({ percent }: { percent: number }) {
  const size = 56;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/70">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(148, 163, 184, 0.2)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2563eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-[10px] font-semibold text-foreground">{percent}%</div>
    </div>
  );
}

export default function StudentPortal() {
  const { user, year } = useAuth();

  const renderPostingTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const row = payload[0]?.payload;
    if (!row) return null;

    return (
      <div className="rounded-2xl border border-border bg-background/95 p-3 text-sm shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-muted-foreground">{row.department}</p>
        <div className="mt-2 space-y-1">
          <p className="text-foreground">Attended: {row.attended}</p>
          <p className="text-foreground">Missed: {row.missed}</p>
          <p className="text-foreground">Planned: {row.planned}</p>
        </div>
      </div>
    );
  };
  const [summary, setSummary] = useState<StudentPortalSummary | null>(null);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [postingProgressLoading, setPostingProgressLoading] = useState(true);
  const [postingProgress, setPostingProgress] = useState<PostingProgressState | null>(null);
  const [postingProgressError, setPostingProgressError] = useState<string | null>(null);
  const [studentAlertInsight, setStudentAlertInsight] = useState<InsightItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasTriggeredAttendanceAlertRef = useRef(false);

  useEffect(() => {
    if (!user || user.role !== "student") {
      setIsLoading(false);
      setAnnouncementsLoading(false);
      return;
    }

    const loadSummary = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get("/attendance/student-notifications");
        setSummary(data);
      } catch (err: any) {
        console.error("Failed to load student portal summary", err);
        setError(err?.response?.data?.message ?? "Unable to load your student summary.");
      } finally {
        setIsLoading(false);
      }
    };

    const loadAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const { data } = await api.get("/notifications?limit=3");
        setAnnouncements(data.notifications || []);
      } catch (err: any) {
        console.error("Failed to load system announcements", err);
        setAnnouncementsError(err?.response?.data?.error ?? "Unable to load announcements.");
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    const loadNotificationsCount = async () => {
      try {
        setNotificationsLoading(true);
        const { data } = await api.get("/notifications/unread-count");
        setUnreadNotifications(data.count ?? 0);
      } catch (err: any) {
        console.error("Failed to load unread notifications", err);
        setUnreadNotifications(null);
      } finally {
        setNotificationsLoading(false);
      }
    };

    const loadPostingProgress = async (attempt = 1) => {
      let shouldRetry = false;

      try {
        setPostingProgressLoading(true);
        setPostingProgressError(null);

        const studentId = user?._id ?? (user as any)?.id;
        const [postingRes, sessionsRes] = await Promise.all([
          studentId
            ? api.get(`/rotation-schedules/student/${studentId}/current`)
            : Promise.resolve({ data: { current: [] } }),
          api.get("/clinical-attendance/sessions?status=ongoing,planned"),
        ]);

        const currentScheduleEntry = Array.isArray(postingRes.data?.current)
          ? postingRes.data.current[0] ?? null
          : null;
        const scheduleWindow = currentScheduleEntry?.window ?? null;
        const usesUnits = Boolean(scheduleWindow?.unitName || scheduleWindow?.unitId);
        const activeLocationTitle = usesUnits ? "Active Unit" : "Department Group";
        const activeLocationValue = usesUnits
          ? (scheduleWindow?.unitName || `Unit ${Number(scheduleWindow?.unitGroupIndex ?? 0) + 1}`)
          : (scheduleWindow?.departmentName || `Department Group ${Number(scheduleWindow?.departmentGroupIndex ?? 0) + 1}`);

        const posting = currentScheduleEntry
          ? {
              rotation: {
                startDate: scheduleWindow?.startDate ?? null,
                endDate: scheduleWindow?.endDate ?? null,
              },
              unit: {
                name: scheduleWindow?.unitName ?? currentScheduleEntry?.postingName ?? "Current unit",
                department: scheduleWindow?.departmentName ?? "Current department",
              },
            }
          : null;
        const sessions = Array.isArray(sessionsRes.data?.data) ? sessionsRes.data.data : [];

        const startDate = posting?.rotation?.startDate ? new Date(posting.rotation.startDate) : null;
        const endDate = posting?.rotation?.endDate ? new Date(posting.rotation.endDate) : null;
        const today = new Date();

        const daysRemaining = endDate && !Number.isNaN(endDate.getTime())
          ? Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
          : null;

        const currentWeek = startDate && !Number.isNaN(startDate.getTime())
          ? Math.max(1, Math.floor(Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) / 7) + 1)
          : 1;

        const weekStart = startDate && !Number.isNaN(startDate.getTime())
          ? new Date(startDate)
          : null;

        if (weekStart) {
          weekStart.setDate(weekStart.getDate() + (currentWeek - 1) * 7);
        }

        const weekEnd = weekStart ? new Date(weekStart) : null;
        if (weekEnd) {
          weekEnd.setDate(weekEnd.getDate() + 6);
        }

        const relevantSessions = sessions.filter((session: any) => {
          if (!session?.date) return false;
          const sessionDate = new Date(session.date);
          if (Number.isNaN(sessionDate.getTime())) return false;
          if (weekStart && weekEnd) {
            return sessionDate >= weekStart && sessionDate <= weekEnd;
          }
          if (startDate && endDate) {
            return sessionDate >= startDate && sessionDate <= endDate;
          }
          return true;
        });

        const fallbackSessions = relevantSessions.length ? relevantSessions : sessions;
        const grouped = new Map<string, PostingProgressRow>();

        const currentUnitName = posting?.unit?.name ?? currentScheduleEntry?.postingName ?? "Current unit";
        const currentDepartmentName = posting?.unit?.department ?? scheduleWindow?.departmentName ?? "Current department";
        const currentUnitKey = `${currentUnitName}::${currentDepartmentName}`;

        fallbackSessions.forEach((session: any) => {
          const unitName = session?.unit?.name ?? currentUnitName;
          const departmentName = session?.unit?.department ?? currentDepartmentName;
          const key = `${unitName}::${departmentName}`;
          const existing = grouped.get(key) ?? {
            key,
            label: unitName,
            department: departmentName,
            planned: 0,
            attended: 0,
            missed: 0,
            percent: 0,
            isCurrentUnit: key === currentUnitKey,
          };

          existing.planned += 1;

          const attendee = Array.isArray(session?.attendees)
            ? session.attendees.find((entry: any) => {
                const studentId = entry?.student?._id ?? entry?.student;
                return studentId && String(studentId) === String(user?._id);
              })
            : null;

          const normalizedStatus = String(attendee?.status ?? "").trim().toLowerCase();
          const attended = normalizedStatus === "present" || normalizedStatus === "excused" || normalizedStatus === "approved_absent";
          if (attended) {
            existing.attended += 1;
          } else {
            existing.missed += 1;
          }

          grouped.set(key, existing);
        });

        const rows = Array.from(grouped.values()).map((row) => ({
          ...row,
          percent: row.planned > 0 ? Math.round((row.attended / row.planned) * 100) : 0,
        })).sort((a, b) => {
          if (a.isCurrentUnit !== b.isCurrentUnit) {
            return a.isCurrentUnit ? -1 : 1;
          }
          if (b.percent !== a.percent) {
            return b.percent - a.percent;
          }
          return b.planned - a.planned;
        });

        const overallPercent = rows.length > 0
          ? Math.round(rows.reduce((total, row) => total + row.percent, 0) / rows.length)
          : 0;

        const note = rows.length === 0
          ? "No clinical sessions have been logged for this posting yet."
          : overallPercent >= 80
            ? "You are on track with your posting attendance target."
            : "You are below the expected attendance target for this posting.";

        const needsAttention = overallPercent < 80 || rows.some((row) => row.missed > 0);

        setPostingProgress({
          overallPercent,
          daysRemaining,
          currentWindowLabel: startDate ? `Week ${currentWeek} of current posting` : "Current posting phase",
          currentUnitLabel: currentUnitName,
          activeLocationTitle,
          activeLocationValue,
          usesUnits,
          needsAttention,
          note,
          rows,
        });
      } catch (err: any) {
        const status = err?.response?.status;
        const message = err?.response?.data?.message ?? err?.message ?? "Unable to load posting progress right now.";
        const retriable = !status || status === 401 || status === 403 || status === 404 || status === 500;
        shouldRetry = retriable && attempt < POSTING_PROGRESS_MAX_RETRIES;

        if (shouldRetry) {
          console.info(`Posting progress unavailable, retrying (${attempt}/${POSTING_PROGRESS_MAX_RETRIES})`, { status, message });
          window.setTimeout(() => {
            void loadPostingProgress(attempt + 1);
          }, POSTING_PROGRESS_RETRY_DELAY_MS * attempt);
          return;
        }

        console.error("Failed to load posting progress", err);
        setPostingProgress(null);
        setPostingProgressError("Posting progress data is not available yet. Once your posting details are ready, this card will update automatically.");
      } finally {
        if (!shouldRetry) {
          setPostingProgressLoading(false);
        }
      }
    };

    void loadSummary();
    void loadAnnouncements();
    void loadNotificationsCount();
    void loadPostingProgress();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "student" || !postingProgress?.needsAttention || hasTriggeredAttendanceAlertRef.current) {
      return;
    }

    hasTriggeredAttendanceAlertRef.current = true;

    api.post("/mordred/insights/attendance-alert", {
      studentId: user._id ?? (user as any)?.id,
      overallPercent: postingProgress.overallPercent,
      activeLocationTitle: postingProgress.activeLocationTitle,
      activeLocationValue: postingProgress.activeLocationValue,
      note: postingProgress.note,
    })
      .then(({ data }) => {
        if (data?.insight) {
          setStudentAlertInsight(data.insight);
        }
      })
      .catch((err) => {
        console.error("Failed to create posting attendance alert", err);
      });
  }, [postingProgress?.activeLocationTitle, postingProgress?.activeLocationValue, postingProgress?.needsAttention, postingProgress?.note, postingProgress?.overallPercent, user]);

  if (user?.role !== "student") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="rounded-3xl border border-border bg-muted p-10 shadow-sm">
          <h1 className="text-2xl font-semibold">Student Portal</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This portal is designed for student users. If you are a member of staff or a parent, please use the standard dashboard.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">Student Portal</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Welcome back, {user?.name?.split(" ")[0] ?? "Student"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Your personalized hub for attendance, timetable, courses, and notifications for {year?.name ?? "the current academic year"}.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:w-auto">
            <div className="rounded-3xl bg-background p-4 shadow-sm ring-1 ring-border">
              <p className="text-sm text-muted-foreground">Class</p>
              <div className="mt-2 text-xl font-semibold text-foreground">
                {isLoading ? <Skeleton className="h-6 w-24" /> : summary?.className ?? "Not set"}
              </div>
            </div>
            <div className="rounded-3xl bg-background p-4 shadow-sm ring-1 ring-border">
              <p className="text-sm text-muted-foreground">Attendance</p>
              <div className="mt-2 text-xl font-semibold text-foreground">
                {isLoading ? <Skeleton className="h-6 w-20" /> : `${summary?.percentage ?? 0}%`}
              </div>
            </div>
            <div className="rounded-3xl bg-background p-4 shadow-sm ring-1 ring-border">
              <p className="text-sm text-muted-foreground">Notifications</p>
              <div className="mt-2 text-xl font-semibold text-foreground">
                {notificationsLoading ? <Skeleton className="h-6 w-20" /> : unreadNotifications !== null ? unreadNotifications : "—"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="columns-1 xl:columns-2 gap-6">
        <div className="mb-6 break-inside-avoid">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Attendance overview</CardTitle>
                <CardDescription>
                  Review your attendance performance and total classes for the current week.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : error ? (
                <div className="text-sm text-destructive">{error}</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-muted p-5">
                    <p className="text-sm text-muted-foreground">Attendance rate</p>
                    <p className="mt-3 text-3xl font-semibold text-foreground">{summary?.percentage ?? 0}%</p>
                    <p className="mt-1 text-sm text-muted-foreground">of completed classes</p>
                  </div>
                  <div className="rounded-3xl bg-muted p-5">
                    <p className="text-sm text-muted-foreground">Total attended</p>
                    <p className="mt-3 text-3xl font-semibold text-foreground">{summary?.totalAttended ?? 0}</p>
                    <p className="mt-1 text-sm text-muted-foreground">classes out of {summary?.totalClasses ?? 0}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 break-inside-avoid">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Today's schedule</CardTitle>
                <CardDescription>
                  See what lectures are planned for {summary?.todayDay ?? "today"}.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : summary?.todayLectures?.length ? (
                summary.todayLectures.map((lecture, index) => (
                  <div key={index} className="rounded-3xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          {typeof lecture.subject === "string"
                            ? lecture.subject
                            : lecture.subject?.name ?? "Untitled subject"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {typeof lecture.lecturer === "string"
                            ? lecture.lecturer
                            : lecture.lecturer?.name ?? "No lecturer"}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                        {getLectureStatus(lecture, summary?.todayDay ?? WEEK_DAYS[(new Date().getDay() + 6) % 7])}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {lecture.startTime ?? "--"} – {lecture.endTime ?? "--"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
                  No lectures scheduled for today.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 break-inside-avoid">
          {!isLoading && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Posting progress vs attendance</CardTitle>
                    <CardDescription>
                      {postingProgress?.currentWindowLabel ?? "Current posting progress"}
                    </CardDescription>
                  </div>
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <ProgressRing percent={postingProgress?.overallPercent ?? 0} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {postingProgressLoading ? (
                  <div className="space-y-3">
                    <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                  </div>
                ) : postingProgressError ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    {postingProgressError}
                  </div>
                ) : postingProgress?.rows?.length ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-muted/70 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overall attendance</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{postingProgress?.overallPercent ?? 0}%</p>
                      </div>
                      <div className="rounded-2xl bg-muted/70 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Days left</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {postingProgress?.daysRemaining ?? "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/70 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{postingProgress?.activeLocationTitle ?? "Active Unit"}</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{postingProgress?.activeLocationValue ?? postingProgress?.currentUnitLabel ?? "Current posting"}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-muted/30 p-3">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Posting flow vs your attendance
                      </div>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={postingProgress?.rows ?? []} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <XAxis type="number" domain={[0, Math.max(1, ...(postingProgress?.rows ?? []).map((row) => row.planned))]} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={90} tickLine={false} axisLine={false} />
                            <Tooltip content={renderPostingTooltip} />
                            <Bar dataKey="missed" stackId="attendance" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                            <Bar dataKey="attended" stackId="attendance" fill="#2563eb" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 space-y-2">
                        {(postingProgress?.rows ?? []).map((row) => (
                          <div key={row.key} className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${row.isCurrentUnit ? "border-primary/30 bg-primary/5" : "border-border bg-background/70"}`}>
                            <div>
                              <p className="font-medium text-foreground">{row.label}</p>
                              <p className="text-xs text-muted-foreground">{row.department}</p>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              {row.missed > 0 && (
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase text-amber-700">
                                  Needs attention
                                </span>
                              )}
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${row.percent >= 80 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {row.percent}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {row.attended}/{row.planned}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                      {postingProgress?.overallPercent && postingProgress.overallPercent < 80 ? (
                        <><AlertTriangle className="h-4 w-4 text-amber-600" /> {postingProgress.note}</>
                      ) : (
                        <><CalendarDays className="h-4 w-4 text-primary" /> {postingProgress?.note}</>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    No posting attendance data is available yet. The card will refresh automatically once your clinical posting details are ready.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mb-6 break-inside-avoid">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>Jump straight to the tools you use most.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button asChild variant="outline" className="justify-between w-full">
                  <Link to="/attendance">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" /> Attendance
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between w-full">
                  <Link to="/timetable">
                    <span className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" /> Timetable
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between w-full">
                  <Link to="/courses">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Courses
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between w-full">
                  <Link to="/notifications">
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4" /> Notifications
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 break-inside-avoid">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Latest student updates</CardTitle>
                <CardDescription>Latest notices from the school and academic office.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcementsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : announcementsError ? (
                <div className="text-sm text-destructive">{announcementsError}</div>
              ) : announcements.length ? (
                announcements.map((item) => (
                  <div key={item._id} className="rounded-3xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.message}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold uppercase text-primary">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
                  No updates at the moment.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 break-inside-avoid">
          <AIInsightWidget prependInsights={studentAlertInsight ? [studentAlertInsight] : []} />
        </div>

        <div className="mb-6 break-inside-avoid">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Weekly alerts</CardTitle>
                <CardDescription>Upcoming lecture status and attendance reminders.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : summary?.weeklyAlerts?.length ? (
                summary.weeklyAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.day} className="rounded-3xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">{alert.day}</p>
                    <div className="mt-3 space-y-3">
                      {alert.lectures.slice(0, 2).map((lecture, index) => (
                        <div key={index} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {typeof lecture.subject === "string"
                                ? lecture.subject
                                : lecture.subject?.name ?? "Unknown subject"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {lecture.startTime ?? "--"} – {lecture.endTime ?? "--"}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase text-primary">
                            {getLectureStatus(lecture, alert.day)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
                  No weekly alerts available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
