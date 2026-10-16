import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Loader2, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { buildTimelineWindowView } from "@/lib/rotationScheduleViews";

type RotationWindowView = ReturnType<typeof buildTimelineWindowView>;

type StudentPostingSchedule = {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  windows: RotationWindowView[];
};

const formatDate = (date: Date | null) =>
  date?.toLocaleDateString("en", { dateStyle: "medium" }) ?? "Date not set";

const formatDateRange = (startDate: Date | null, endDate: Date | null) =>
  `${formatDate(startDate)} – ${formatDate(endDate)}`;

const getScheduleDateRange = (windows: RotationWindowView[]) => {
  const starts = windows.map((window) => window.startDate).filter((date): date is Date => date !== null);
  const ends = windows.map((window) => window.endDate).filter((date): date is Date => date !== null);

  return {
    startDate: starts.length ? new Date(Math.min(...starts.map((date) => date.getTime()))) : null,
    endDate: ends.length ? new Date(Math.max(...ends.map((date) => date.getTime()))) : null,
  };
};

const statusLabels = {
  upcoming: "Upcoming",
  current: "Current",
  completed: "Completed",
} as const;

type RotationStatus = keyof typeof statusLabels;

const getRotationStatus = (window: RotationWindowView): RotationStatus | null => {
  if (!window.startDate || !window.endDate) return null;
  if (window.startDate > new Date()) return "upcoming";
  if (window.endDate < new Date()) return "completed";
  return "current";
};

export default function StudentRotationHistory() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<StudentPostingSchedule[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadSchedules = async () => {
      if (!user?._id) {
        setSchedules([]);
        setActiveScheduleId("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/rotation-schedules/student/me/schedules");
        const responseSchedules = Array.isArray(data?.schedules) ? data.schedules : [];
        const studentId = String(user._id);
        const normalizedSchedules = responseSchedules.map((schedule: any, index: number) => {
          const timeline = Array.isArray(schedule?.meta?.timeline) ? schedule.meta.timeline : [];
          const windows = timeline
            .map((window: any, windowIndex: number) =>
              buildTimelineWindowView(schedule, window, windowIndex, studentId),
            )
            .filter((window: RotationWindowView) => window.matchesStudent);
          const dateRange = getScheduleDateRange(windows);

          return {
            id: String(schedule?._id ?? `${schedule?.name ?? "posting-schedule"}-${index}`),
            name: String(schedule?.name || schedule?.postings?.[0]?.name || `Posting Schedule ${index + 1}`),
            ...dateRange,
            windows,
          } satisfies StudentPostingSchedule;
        });

        if (isMounted) {
          setSchedules(normalizedSchedules);
          setActiveScheduleId((current) =>
            normalizedSchedules.some((schedule) => schedule.id === current)
              ? current
              : normalizedSchedules[0]?.id ?? "",
          );
        }
      } catch (requestError) {
        console.error("Failed to load student posting schedules", requestError);
        if (isMounted) {
          setError("Unable to load your posting schedules right now.");
          setSchedules([]);
          setActiveScheduleId("");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadSchedules();
    return () => {
      isMounted = false;
    };
  }, [retryCount, user?._id]);

  const activeSchedule = schedules.find((schedule) => schedule.id === activeScheduleId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your Rotations History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your clinical rotations and assigned units by posting schedule.
        </p>
      </div>

      {loading ? (
        <div
          className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your rotations history…
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setRetryCount((count) => count + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No posting schedule has been assigned to your account yet.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeScheduleId} onValueChange={setActiveScheduleId} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-2 xl:grid-cols-3">
            {schedules.map((schedule) => (
              <TabsTrigger
                key={schedule.id}
                value={schedule.id}
                className="h-auto min-h-20 flex-col whitespace-normal rounded-xl border border-border/70 bg-card px-4 py-3 text-center data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5"
              >
                <span className="font-semibold text-foreground">{schedule.name}</span>
                <span className="mt-1 block text-xs italic text-muted-foreground">
                  {formatDateRange(schedule.startDate, schedule.endDate)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {schedules.map((schedule) => (
            <TabsContent key={schedule.id} value={schedule.id} className="mt-5">
              <Card>
                <CardHeader>
                  <CardTitle>{schedule.name}</CardTitle>
                  <CardDescription>{formatDateRange(schedule.startDate, schedule.endDate)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    defaultValue={
                      schedule.windows.some((window) => getRotationStatus(window) === "current")
                        ? "current"
                        : schedule.windows.some((window) => getRotationStatus(window) === "upcoming")
                          ? "upcoming"
                          : "completed"
                    }
                    className="w-full"
                  >
                    <TabsList className="grid h-auto w-full grid-cols-3">
                      {Object.entries(statusLabels).map(([status, label]) => (
                        <TabsTrigger key={status} value={status}>{label}</TabsTrigger>
                      ))}
                    </TabsList>
                    {Object.entries(statusLabels).map(([status, label]) => {
                      const windows = schedule.windows.filter(
                        (window) => getRotationStatus(window) === status,
                      );

                      return (
                        <TabsContent key={status} value={status} className="mt-4 space-y-3">
                          {windows.length ? windows.map((window) => (
                            <div key={window.id} className="rounded-lg border border-border/70 bg-card/70 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{window.phaseLabel}</p>
                                  <h3 className="mt-1 text-base font-semibold text-foreground">{window.departmentName}</h3>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {window.departmentGroupLabel} · {window.unitGroupLabel}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                                  {label}
                                </span>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {window.unitName}
                                </span>
                                <span className="inline-flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4" />
                                  {formatDateRange(window.startDate, window.endDate)}
                                </span>
                                <span className="inline-flex items-center gap-2">
                                  <Clock3 className="h-4 w-4" />
                                  {window.durationLabel}
                                </span>
                              </div>
                            </div>
                          )) : (
                            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                              No {label.toLowerCase()} rotations in this posting schedule.
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {activeSchedule ? <span className="sr-only">Selected {activeSchedule.name}</span> : null}
    </div>
  );
}
