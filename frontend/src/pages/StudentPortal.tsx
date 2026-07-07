import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Bell, ClipboardList, Clock3, ArrowRight } from "lucide-react";
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
import { AIInsightWidget } from "@/components/dashboard/ai-insight-widget";

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

export default function StudentPortal() {
  const { user, year } = useAuth();
  const [summary, setSummary] = useState<StudentPortalSummary | null>(null);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    void loadSummary();
    void loadAnnouncements();
    void loadNotificationsCount();
  }, [user]);

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

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
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
                        {lecture.status ? lecture.status : "Scheduled"}
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

        <div className="space-y-6">
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

          <AIInsightWidget />

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
                            {lecture.status ?? "Pending"}
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
