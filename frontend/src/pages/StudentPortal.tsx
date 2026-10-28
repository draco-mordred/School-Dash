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

interface PortalExamItem {
  _id: string;
  title: string;
  dueDate: string;
  duration?: number;
  subject?: { name?: string } | string | null;
  status: "upcoming" | "submitted" | "result";
  score?: number | null;
  submittedAt?: string | null;
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
  teamFound: boolean;
  postingName: string | null;
  groupName: string | null;
  windowLabel: string;
  postingPercent: number | null;
  daysElapsed: number | null;
  daysTotal: number | null;
  daysRemaining: number | null;
  overallPercent: number;
  attendanceRate: number;
  tally: Record<string, number>;
  sessionsCount: number;
  logbook: { approved: number; pending: number; rejected: number; total: number; hours: number };
  logbookRequired: number;
  logbookPercent: number;
  activeLocationTitle: string;
  activeLocationValue: string;
  needsAttention: boolean;
  note: string;
  rows: PostingProgressRow[];
}


const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
  const [examAlerts, setExamAlerts] = useState<PortalExamItem[]>([]);
  const [examAlertsLoading, setExamAlertsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasTriggeredAttendanceAlertRef = useRef(false);

  // Exams, tests & assessments — upcoming, submitted, and released results.
  // Fetches the student's class exams, then each exam's result to find their
  // submission (with auto-graded score).
  useEffect(() => {
    if (!user || user.role !== "student") return;
    let cancelled = false;

    const loadExamAlerts = async () => {
      try {
        setExamAlertsLoading(true);
        const { data } = await api.get("/exams");
        const exams = Array.isArray(data?.exams) ? data.exams : Array.isArray(data) ? data : [];

        const enriched = await Promise.all(
          exams.map(async (exam: any): Promise<PortalExamItem> => {
            let submission: any = null;
            try {
              const res = await api.get(`/exams/${exam._id}/result`);
              submission = res.data?.submission ?? res.data ?? null;
            } catch {
              submission = null;
            }
            const hasScore = submission && submission.score !== undefined && submission.score !== null;
            const isSubmitted = !!submission;

            return {
              _id: exam._id,
              title: exam.title ?? "Assessment",
              dueDate: exam.dueDate,
              duration: exam.duration,
              subject: exam.subject ?? null,
              status: hasScore ? "result" : isSubmitted ? "submitted" : "upcoming",
              score: hasScore ? submission.score : null,
              submittedAt: submission?.submittedAt ?? null,
            };
          }),
        );

        if (!cancelled) {
          setExamAlerts(
            enriched
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
          );
        }
      } catch {
        if (!cancelled) setExamAlerts([]);
      } finally {
        if (!cancelled) setExamAlertsLoading(false);
      }
    };

    void loadExamAlerts();
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?._id]);

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

    const loadPostingProgress = async () => {
      try {
        setPostingProgressLoading(true);
        setPostingProgressError(null);

        const studentId = user?._id ?? (user as any)?.id;
        const [teamSettled, logbookSettled] = await Promise.allSettled([
          api.get("/clinical-attendance/my-team"),
          studentId
            ? api.get(`/activity-entries/student/${studentId}`)
            : Promise.resolve({ data: { entries: [] } }),
        ]);

        const teamData =
          teamSettled.status === "fulfilled" ? teamSettled.value.data?.data ?? null : null;
        const team = teamData?.team ?? null;
        const perf = teamData?.myPerformance ?? null;

        // Logbook performance across the posting (all statuses).
        const logbook = { approved: 0, pending: 0, rejected: 0, total: 0, hours: 0 };
        if (logbookSettled.status === "fulfilled") {
          const entries = Array.isArray(logbookSettled.value.data?.entries)
            ? logbookSettled.value.data.entries
            : [];
          for (const entry of entries) {
            const status = String(entry?.approvalStatus ?? entry?.status ?? "").trim().toLowerCase();
            logbook.total += 1;
            if (status === "approved") {
              logbook.approved += 1;
              logbook.hours += Number(entry?.hours ?? 0) || 0;
            } else if (status === "rejected") {
              logbook.rejected += 1;
            } else {
              logbook.pending += 1;
            }
          }
        }
        const logbookRequired = Number(team?.logbookRequiredEntries ?? 0) || 0;
        const logbookPercent =
          logbookRequired > 0
            ? Math.min(100, Math.round((logbook.approved / logbookRequired) * 100))
            : logbook.total > 0
              ? 100
              : 0;

        // Posting progress = days elapsed in the active team window.
        const daysElapsed = team?.daysElapsed ?? null;
        const daysTotal = team?.daysTotal ?? null;
        const daysRemaining = team?.daysRemaining ?? null;
        const postingPercent =
          daysTotal && daysElapsed ? Math.min(100, Math.round((daysElapsed / daysTotal) * 100)) : null;
        const attendanceRate = perf?.attendanceRate ?? 0;

        const startDate = team?.window?.startDate ? new Date(team.window.startDate) : null;
        const week =
          startDate && !Number.isNaN(startDate.getTime())
            ? Math.max(
                1,
                Math.floor(Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000)) / 7) + 1,
              )
            : null;
        const windowLabel = team
          ? week
            ? `Week ${week} of ${team.postingName ?? "current posting"}`
            : "Current posting"
          : "Current posting";

        // Per-unit clinical attendance inside this posting window.
        const grouped = new Map<string, PostingProgressRow>();
        for (const session of perf?.sessions ?? []) {
          const unitLabel = session?.unitLabel || team?.postingName || "General";
          const key = `unit::${unitLabel}`;
          const row = grouped.get(key) ?? {
            key,
            label: unitLabel,
            department: team?.postingName ?? "Current posting",
            planned: 0,
            attended: 0,
            missed: 0,
            percent: 0,
            isCurrentUnit: true,
          };
          row.planned += 1;
          const status = String(session?.myStatus ?? "").trim().toLowerCase();
          if (status === "present" || status === "late" || status === "excused" || status === "on-leave") {
            row.attended += 1;
          } else {
            row.missed += 1;
          }
          grouped.set(key, row);
        }
        const rows = Array.from(grouped.values())
          .map((row) => ({
            ...row,
            percent: row.planned > 0 ? Math.round((row.attended / row.planned) * 100) : 0,
          }))
          .sort((a, b) => b.percent - a.percent || b.planned - a.planned);

        const overallPercent = attendanceRate;
        const note = !team
          ? "You are not in an active clinical posting right now. This card updates once your posting starts."
          : rows.length === 0
            ? "No clinical sessions have been recorded for your team yet."
            : overallPercent >= 75
              ? "You are on track with your posting attendance and logbook targets."
              : "You are below the 75% clinical attendance target for this posting.";
        const needsAttention = Boolean(team) && (overallPercent < 75 || rows.some((row) => row.missed > 0));

        setPostingProgress({
          teamFound: Boolean(team),
          postingName: team?.postingName ?? null,
          groupName: team?.groupName ?? null,
          windowLabel,
          postingPercent,
          daysElapsed,
          daysTotal,
          daysRemaining,
          overallPercent,
          attendanceRate,
          tally: perf?.tally ?? {},
          sessionsCount: perf?.sessions?.length ?? 0,
          logbook,
          logbookRequired,
          logbookPercent,
          activeLocationTitle: team ? "Team" : "Posting",
          activeLocationValue: team?.groupName ?? team?.postingName ?? "—",
          needsAttention,
          note,
          rows,
        });
      } catch (err: any) {
        console.error("Failed to load posting progress", err);
        setPostingProgress(null);
        setPostingProgressError(
          "Posting progress data is not available yet. Once your posting details are ready, this card will update automatically.",
        );
      } finally {
        setPostingProgressLoading(false);
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Today's schedule</CardTitle>
                  <CardDescription>
                    See what lectures are planned for {summary?.todayDay ?? "today"}.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/student/schedule/today">
                    View full schedule
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : summary?.todayLectures?.length ? (
                summary.todayLectures.map((lecture, index) => {
                  const subjectName =
                    typeof lecture.subject === "string"
                      ? lecture.subject
                      : lecture.subject?.name ?? null;
                  const lecturerName =
                    typeof lecture.lecturer === "string"
                      ? lecture.lecturer
                      : lecture.lecturer?.name ?? null;
                  const metaLine = !subjectName && !lecturerName
                    ? "No activity"
                    : subjectName && !lecturerName
                      ? "Lecturer not assigned"
                      : lecturerName;

                  return (
                    <div key={index} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <p className="font-semibold">{subjectName ?? "Open period"}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{metaLine}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          <span>{lecture.startTime ?? "--"} – {lecture.endTime ?? "--"}</span>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                            {getLectureStatus(lecture, summary?.todayDay ?? WEEK_DAYS[(new Date().getDay() + 6) % 7])}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
                  There are no lectures scheduled for {summary?.todayDay ?? "today"} yet.
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
                      {postingProgress?.windowLabel ?? "Current posting progress"}
                    </CardDescription>
                  </div>
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <ProgressRing percent={postingProgress?.postingPercent ?? postingProgress?.overallPercent ?? 0} />
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
                ) : postingProgress?.teamFound ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl bg-muted/70 p-3">
                        <p className="text-xs uppercase tracking-[.2em] text-muted-foreground">Posting progress</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {postingProgress?.daysElapsed ?? "—"}
                          {postingProgress?.daysTotal ? " of " + postingProgress.daysTotal + " days" : ""}
                        </p>
                        {postingProgress?.postingPercent != null ? (
                          <p className="text-xs text-muted-foreground">{postingProgress.postingPercent}% through the posting</p>
                        ) : null}
                      </div>
                      <div className="rounded-2xl bg-muted/70 p-3">
                        <p className="text-xs uppercase tracking-[.2em] text-muted-foreground">Clinical attendance</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{postingProgress?.attendanceRate ?? 0}%</p>
                        <p className="text-xs text-muted-foreground">
                          {postingProgress?.sessionsCount ?? 0} sessions ·{" "}
                          {(postingProgress?.tally?.present ?? 0) + (postingProgress?.tally?.late ?? 0)} attended
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/70 p-3">
                        <p className="text-xs uppercase tracking-[.2em] text-muted-foreground">Logbook entries</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {postingProgress?.logbook?.approved ?? 0}
                          {postingProgress?.logbookRequired ? " / " + postingProgress.logbookRequired : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {postingProgress?.logbook?.pending ?? 0} pending · {postingProgress?.logbook?.rejected ?? 0} rejected
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/70 p-3">
                        <p className="text-xs uppercase tracking-[.2em] text-muted-foreground">Hours logged</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{postingProgress?.logbook?.hours ?? 0}h</p>
                        <p className="text-xs text-muted-foreground">approved entries only</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1 rounded-2xl border border-border bg-muted/30 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Posting progress (days)</span>
                          <span className="tabular-nums font-semibold">{postingProgress?.postingPercent ?? 0}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: (postingProgress?.postingPercent ?? 0) + "%" }} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {postingProgress?.daysRemaining != null
                            ? postingProgress.daysRemaining + " day" + (postingProgress.daysRemaining === 1 ? "" : "s") + " remaining"
                            : ""}
                          {postingProgress?.groupName ? " · Team " + postingProgress.groupName : ""}
                        </p>
                      </div>
                      <div className="space-y-1 rounded-2xl border border-border bg-muted/30 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Logbook vs required entries{postingProgress?.logbookRequired ? "" : " (no target set)"}
                          </span>
                          <span className="tabular-nums font-semibold">{postingProgress?.logbookPercent ?? 0}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={(postingProgress?.logbookPercent ?? 0) >= 100 ? "h-full rounded-full bg-green-500" : "h-full rounded-full bg-amber-500"}
                            style={{ width: (postingProgress?.logbookPercent ?? 0) + "%" }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {postingProgress?.logbook?.approved ?? 0} approved of{" "}
                          {postingProgress?.logbookRequired || postingProgress?.logbook?.total || 0} entries
                        </p>
                      </div>
                    </div>

                    {postingProgress?.rows?.length ? (
                      <div className="rounded-2xl border border-border bg-muted/30 p-3">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Posting units vs your attendance
                        </div>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={postingProgress.rows} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                              <XAxis type="number" domain={[0, Math.max(1, ...postingProgress.rows.map((row) => row.planned))]} allowDecimals={false} />
                              <YAxis type="category" dataKey="label" width={90} tickLine={false} axisLine={false} />
                              <Tooltip content={renderPostingTooltip} />
                              <Bar dataKey="missed" stackId="attendance" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                              <Bar dataKey="attended" stackId="attendance" fill="#2563eb" radius={[0, 6, 6, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-3 space-y-2">
                          {postingProgress.rows.map((row) => (
                            <div key={row.key} className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm">
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
                                <span className={"rounded-full px-2 py-1 text-[11px] font-semibold uppercase " + (row.percent >= 75 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
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
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                      {postingProgress?.needsAttention ? (
                        <><AlertTriangle className="h-4 w-4 text-amber-600" /> {postingProgress.note}</>
                      ) : (
                        <><CalendarDays className="h-4 w-4 text-primary" /> {postingProgress?.note}</>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    You are not in an active clinical posting right now. This card updates automatically once your class clock phase places you in a posting group.
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

              {/* Exams, tests & assessments — upcoming, submitted, released results */}
              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Exams, tests & assessments</p>
                {examAlertsLoading ? (
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-8 w-full rounded-xl" />
                    <Skeleton className="h-8 w-full rounded-xl" />
                  </div>
                ) : examAlerts.length ? (
                  <div className="mt-3 space-y-2">
                    {examAlerts.slice(0, 5).map((exam) => (
                      <div key={exam._id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {exam.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {typeof exam.subject === "string"
                              ? exam.subject
                              : exam.subject?.name ?? "—"} ·{" "}
                            {exam.status === "result" && exam.submittedAt
                              ? `Submitted ${new Date(exam.submittedAt).toLocaleDateString()}`
                              : `Due ${new Date(exam.dueDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <span
                          className={
                            "shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold uppercase " +
                            (exam.status === "result"
                              ? "bg-green-500/15 text-green-600"
                              : exam.status === "submitted"
                                ? "bg-blue-500/15 text-blue-600"
                                : "bg-primary/10 text-primary")
                          }
                        >
                          {exam.status === "result"
                            ? `Result: ${exam.score}`
                            : exam.status === "submitted"
                              ? "Submitted"
                              : "Upcoming"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No exams, tests or assessments available yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
