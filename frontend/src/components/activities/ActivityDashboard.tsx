import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useActivityNotifications } from "@/hooks/useActivityNotifications";
import { buildTimelineWindowView } from "@/lib/rotationScheduleViews";
import { ActivityCard, type ActivityStatus, type ActivityType } from "@/components/activities/ActivityStatusBadge";
import { AlertCircle, Clock } from "lucide-react";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Date (within the current week) for a weekday name like "Monday".
const getWeekDateForDay = (dayName: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  const index = WEEKDAY_NAMES.findIndex((d) => d.toLowerCase() === String(dayName ?? "").toLowerCase());
  if (index < 0) return null;
  const date = new Date(start);
  date.setDate(date.getDate() + index);
  return date;
};

interface ScheduledActivity {
  id: string;
  title: string;
  type: ActivityType;
  status: ActivityStatus;
  startTime: Date;
  endTime: Date;
  location?: string;
  instructor?: string;
  postingName?: string;
  classId?: string;
}

export default function ActivityDashboard() {
  const { user } = useAuth();
  const { pendingCount } = useActivityNotifications({
    enabled: true,
    checkInterval: 30000, // Check every 30 seconds
  });

  const [activities, setActivities] = useState<ScheduledActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"today" | "week">("today");

  // Fetch scheduled activities
  useEffect(() => {
    if (!user) return;

    const fetchActivities = async () => {
      try {
        setIsLoading(true);

        // Determine date range
        const now = new Date();
        let startDate: Date, endDate: Date;

        if (timeRange === "today") {
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        } else {
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);
        }

        // Real endpoints: the class timetable (weekly days/periods) and the
        // class rotation schedules. The old /timetables?userId=... and
        // /rotation-schedules/events routes never existed and returned 404.
        const studentClass = (user as any).studentClass ?? (user as any).studentClasses;
        const classId =
          studentClass && typeof studentClass === "object"
            ? studentClass._id
            : typeof studentClass === "string"
              ? studentClass
              : null;

        if (!classId) {
          setActivities([]);
          return;
        }

        const [timetableRes, rotationRes] = await Promise.all([
          api.get(`/timetables/${classId}`).catch(() => ({ data: { schedule: [] } })),
          api.get("/rotation-schedules", { params: { classId } }).catch(() => ({ data: { schedules: [] } })),
        ]);

        const lectures: ScheduledActivity[] = [];
        const schedule = timetableRes.data?.schedule ?? [];
        const todayName = WEEKDAY_NAMES[(new Date().getDay() + 6) % 7];

        schedule.forEach((day: any) => {
          if (timeRange === "today" && String(day.day ?? "").toLowerCase() !== todayName.toLowerCase()) return;
          const dayDate = getWeekDateForDay(day.day) ?? startDate;
          (day.periods ?? []).forEach((period: any) => {
            if (!period.subject || period.isClinical || period.isOptional) return;
            const [sHour, sMin] = String(period.startTime ?? "00:00").split(":").map(Number);
            const [eHour, eMin] = String(period.endTime ?? "00:00").split(":").map(Number);
            const start = new Date(dayDate);
            start.setHours(sHour || 0, sMin || 0, 0, 0);
            const end = new Date(dayDate);
            end.setHours(eHour || 0, eMin || 0, 0, 0);

            if (start >= startDate && start < endDate) {
              lectures.push({
                id: `lecture-${day.day}-${period.startTime}`,
                title: period.subject?.name || "Lecture",
                type: "lecture",
                status: "scheduled",
                startTime: start,
                endTime: end,
                instructor: period.lecturer?.name,
                location: period.venue?.name,
              });
            }
          });
        });

        // Clinical postings from the class rotation schedule timeline windows
        const clinicalActivities: ScheduledActivity[] = [];
        const rotationSchedules = Array.isArray(rotationRes.data?.schedules)
          ? rotationRes.data.schedules
          : Array.isArray(rotationRes.data)
            ? rotationRes.data
            : [];
        const studentId = user._id ? String(user._id) : "";

        rotationSchedules.forEach((sched: any) => {
          const timeline = Array.isArray(sched?.meta?.timeline) ? sched.meta.timeline : [];
          timeline.forEach((window: any, index: number) => {
            const view = buildTimelineWindowView(sched, window, index, studentId);
            if (!view.matchesStudent || !view.startDate || !view.endDate) return;
            if (view.endDate < startDate || view.startDate >= endDate) return;
            clinicalActivities.push({
              id: view.id ?? `rotation-${index}`,
              title: view.postingName || "Clinical Posting",
              type: "clinical",
              status: view.status === "current" ? "in-progress" : "scheduled",
              startTime: view.startDate,
              endTime: view.endDate,
              postingName: view.postingName,
              classId,
            });
          });
        });

        // Combine and sort by start time
        const allActivities = [...lectures, ...clinicalActivities].sort(
          (a, b) => a.startTime.getTime() - b.startTime.getTime(),
        );

        setActivities(allActivities);
      } catch (err) {
        console.error("Failed to fetch activities:", err);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [user, timeRange]);

  // Separate activities by time
  const { upcoming, inProgress, completed } = useMemo(() => {
    const now = new Date();
    const upcoming: ScheduledActivity[] = [];
    const inProgress: ScheduledActivity[] = [];
    const completed: ScheduledActivity[] = [];

    activities.forEach((activity) => {
      if (activity.status === "completed" || activity.endTime < now) {
        completed.push(activity);
      } else if (
        activity.status === "in-progress" ||
        (activity.startTime <= now && activity.endTime > now)
      ) {
        inProgress.push(activity);
      } else {
        upcoming.push(activity);
      }
    });

    return { upcoming, inProgress, completed };
  }, [activities]);

  const hasReminders = pendingCount > 0;

  return (
    <div className="space-y-6">
      {/* Header with notification alert */}
      <Card className="overflow-hidden rounded-3xl border border-border shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Your Activity Schedule
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {timeRange === "today"
                ? "Today's activities"
                : "This week's activities"}
            </p>
          </div>
          {hasReminders && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4" />
              <span>
                {pendingCount} upcoming reminder{pendingCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Time range selector */}
      <div className="flex justify-center">
        <Tabs
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as "today" | "week")}
        >
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <Card className="overflow-hidden rounded-3xl border border-amber-200 shadow-sm bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inProgress.map((activity) => (
              <ActivityCard
                key={activity.id}
                title={activity.title}
                type={activity.type}
                status="in-progress"
                startTime={activity.startTime}
                endTime={activity.endTime}
                location={activity.location}
                instructor={activity.instructor}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Upcoming ({upcoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((activity) => (
              <ActivityCard
                key={activity.id}
                title={activity.title}
                type={activity.type}
                status={activity.status}
                startTime={activity.startTime}
                endTime={activity.endTime}
                location={activity.location}
                instructor={activity.instructor}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              Completed ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completed.map((activity) => (
              <ActivityCard
                key={activity.id}
                title={activity.title}
                type={activity.type}
                status="completed"
                startTime={activity.startTime}
                endTime={activity.endTime}
                location={activity.location}
                instructor={activity.instructor}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && activities.length === 0 && (
        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No activities scheduled for{" "}
              {timeRange === "today" ? "today" : "this week"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card className="overflow-hidden rounded-3xl border border-border shadow-sm">
          <CardContent className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
