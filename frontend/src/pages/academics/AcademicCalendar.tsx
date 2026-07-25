import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Clock3, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  getClassLevelPhasePlan,
  resolveActiveAcademicClockPhase,
  type AcademicClockPhaseDefinition,
} from "@/lib/academicClock";
import { getScheduleForDay, getTodayDayLabel } from "@/lib/studentSchedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Class, schedule } from "@/types";

interface ClassClockItem {
  classRecord: Class;
  clockData: Record<string, any> | null;
  timetable: schedule[];
}

const safeDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const formatStartLabel = (startDate: Date | null) =>
  startDate ? format(startDate, "MMM d, yyyy") : "Start date not set";

const formatPhaseDuration = (durationMonths: number) => `${durationMonths} mo`;

const convertPhaseConfigToPlan = (
  phaseConfig?: Record<
    string,
    {
      name?: string;
      duration?: number;
      postingType?: string | null;
      postingId?: string | null;
      color?: string;
      subPostings?: string[];
    } | null,
  >,
): AcademicClockPhaseDefinition[] => {
  if (!phaseConfig || Object.keys(phaseConfig).length === 0) {
    return [];
  }

  return Object.entries(phaseConfig).map(([phaseId, config], index) => ({
    id: phaseId,
    name: config?.name ?? `Phase ${index + 1}`,
    durationMonths: Number.isFinite(config?.duration ?? NaN)
      ? config?.duration ?? 1
      : 1,
    color: config?.color ?? "#3B82F6",
    subPostings: Array.isArray(config?.subPostings)
      ? config.subPostings.filter(Boolean)
      : [],
  }));
};

const buildClockTimeline = (
  phasePlan: AcademicClockPhaseDefinition[],
  activePhaseId: string | null,
) => {
  const activeIndex = Math.max(
    0,
    phasePlan.findIndex((phase) => phase.id === activePhaseId),
  );

  return phasePlan.map((phase, index) => ({
    ...phase,
    active: index === activeIndex,
    completed: index < activeIndex,
    timelineIndex: index,
  }));
};

const loadClassDetail = async (classRecord: Class) => {
  const academicYearId = classRecord.academicYear?._id ?? classRecord.academicYear?.id ?? "";

  const clockPromise = api
    .get(`/academic-clocks?academicYearId=${academicYearId}&classId=${classRecord._id}`)
    .then((res) => {
      const data = res.data;
      if (Array.isArray(data)) return data[0] ?? null;
      if (data && typeof data === "object") {
        const value = data as Record<string, any>;
        if (Array.isArray(value.data)) return value.data[0] ?? null;
        if (Array.isArray(value.academicClocks)) return value.academicClocks[0] ?? null;
        if (Array.isArray(value.clocks)) return value.clocks[0] ?? null;
        return value;
      }
      return null;
    })
    .catch((error: any) => {
      console.warn(`Academic clock not found for class ${classRecord.name}`, error?.response?.status);
      return null;
    });

  const timetablePromise = api
    .get(`/timetables/${classRecord._id}`)
    .then((res) =>
      Array.isArray(res.data?.schedule)
        ? res.data.schedule
        : Array.isArray(res.data)
        ? res.data
        : [],
    )
    .catch((error: any) => {
      const status = error?.response?.status;
      if (status === 404) {
        return [];
      }
      console.warn(`Failed to load timetable for class ${classRecord.name}`, status);
      return [];
    });

  const [clockData, timetable] = await Promise.all([clockPromise, timetablePromise]);

  return {
    classId: classRecord._id,
    clockData,
    timetable,
  };
};

const AcademicCalendar = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [classDetails, setClassDetails] = useState<Record<string, ClassClockItem>>({});
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayLabel = useMemo(() => getTodayDayLabel(), []);

  useEffect(() => {
    const loadAcademicCalendar = async () => {
      try {
        setLoading(true);
        setError(null);

        const classesResponse = await api.get("/classes?limit=200");
        const classList = Array.isArray(classesResponse.data?.classes)
          ? classesResponse.data.classes
          : Array.isArray(classesResponse.data)
          ? classesResponse.data
          : [];

        setClasses(classList);

        const detailEntries = await Promise.all(
          classList.map(async (classRecord: Class) => loadClassDetail(classRecord)),
        );

        const detailsRecord = detailEntries.reduce<Record<string, ClassClockItem>>(
          (acc, item) => ({
            ...acc,
            [item.classId]: {
              classRecord: classList.find((cls) => cls._id === item.classId) as Class,
              clockData: item.clockData,
              timetable: item.timetable,
            },
          }),
          {},
        );

        setClassDetails(detailsRecord);
      } catch (err) {
        console.error(err);
        setError("Unable to load academic calendar data.");
      } finally {
        setLoading(false);
      }
    };

    void loadAcademicCalendar();
  }, []);

  const toggleCard = (classId: string) => {
    setExpandedIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId],
    );
  };

  const toggleSortDirection = () => {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  };

  const classCards = useMemo(() => {
    return classes
      .map((classRecord) => {
        const details = classDetails[classRecord._id];
        const classClock = details?.clockData ?? null;
        const configuredPhasePlan = convertPhaseConfigToPlan(
          classClock?.phaseConfig as Record<string, any> | undefined,
        );
        const hasConfiguredClock = configuredPhasePlan.length > 0;
        const fallbackStart =
          safeDate(classRecord.academicYear?.clockStartDate) ??
          safeDate(classRecord.academicYear?.fromYear);
        const startDate =
          safeDate(classClock?.clockStartDate) ??
          fallbackStart ??
          null;

        const phasePlan = hasConfiguredClock
          ? configuredPhasePlan
          : [];

        const resolved = resolveActiveAcademicClockPhase(
          classClock ?? {
            clockStartDate: classRecord.academicYear?.clockStartDate,
            clockPhase: classRecord.academicYear?.clockPhase,
          },
          classRecord.name,
          new Date(),
        );

        const activePhaseId = resolved.phaseId ?? phasePlan[0]?.id ?? null;
        const timeline = buildClockTimeline(phasePlan, activePhaseId);
        const activePhase = phasePlan.find((phase) => phase.id === activePhaseId);
        const todaySchedule = getScheduleForDay(details?.timetable, todayLabel);

        return {
          classRecord,
          classClock,
          timetable: details?.timetable ?? [],
          startDate,
          phasePlan,
          activePhaseId,
          activePhase,
          timeline,
          todaySchedule,
          hasConfiguredClock,
        };
      })
      .sort((a, b) =>
        sortDirection === "asc"
          ? a.classRecord.name.localeCompare(b.classRecord.name)
          : b.classRecord.name.localeCompare(a.classRecord.name),
      );
  }, [classes, classDetails, sortDirection, todayLabel]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <h1 className="text-3xl font-bold tracking-tight">Academic Calendar</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Loading class clocks and current schedules...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="rounded-3xl border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
        <CardHeader className="gap-4 p-0">
          <div className="space-y-2">
            <CardTitle className="text-3xl">Academic Calendar</CardTitle>
            <CardDescription>
              Review each class’s academic clock, current phase, and today’s timetable in one place.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={toggleSortDirection}>
              Sort: {sortDirection === "asc" ? "A → Z" : "Z → A"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="rounded-3xl border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-5">
        {classCards.length === 0 ? (
          <Card className="rounded-3xl border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No classes were found. Add classes in the Classes section to populate the academic calendar.
              </p>
            </CardContent>
          </Card>
        ) : (
          classCards.map((item) => {
            const isExpanded = expandedIds.includes(item.classRecord._id);
            const activePhaseLabel = item.hasConfiguredClock
              ? item.activePhase?.name ?? "No active phase"
              : "Clock not configured";
            const activeBadgeVariant = item.hasConfiguredClock ? "default" : "secondary";

            return (
              <Card
                key={item.classRecord._id}
                className="rounded-[1.85rem] border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/90"
              >
                <CardHeader className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <CardTitle className="text-xl font-semibold">
                        {item.classRecord.name}
                      </CardTitle>
                      <Badge variant={activeBadgeVariant}>
                        {activePhaseLabel}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>
                        Started: {formatStartLabel(item.startDate)}
                      </span>
                      <span>
                        Academic year: {item.classRecord.academicYear?.name ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCard(item.classRecord._id)}
                    >
                      {isExpanded ? "Collapse" : "Expand"}
                      <ChevronDown
                        className={`size-4 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 border-t border-slate-200/80 px-6 py-6 dark:border-slate-800/80">
                  <div className="space-y-4">
                    <div className="overflow-x-auto pb-2">
                      <div className="inline-flex min-w-[min(720px,100%)] items-center gap-3">
                        {item.phasePlan.length > 0 ? (
                          item.timeline.map((phase, index) => (
                            <div key={phase.id} className="inline-flex items-center gap-3">
                              <div
                                className={`min-w-[180px] rounded-3xl border px-4 py-3 shadow-sm transition duration-200 ${
                                  phase.active
                                    ? "border-slate-900 bg-slate-950/95 text-white dark:border-white/80"
                                    : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                                }`}
                                style={{
                                  boxShadow: phase.active
                                    ? "0 24px 50px rgba(15, 23, 42, 0.16)"
                                    : undefined,
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold">
                                    {phase.name}
                                  </span>
                                  <Badge variant="outline">
                                    {formatPhaseDuration(phase.durationMonths)}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                  {phase.subPostings.length > 0
                                    ? phase.subPostings.slice(0, 2).join(" • ")
                                    : phase.name}
                                </p>
                              </div>

                              {index < item.timeline.length - 1 ? (
                                <ChevronRight
                                  className="size-5 text-slate-400 animate-[chevronPulse_1.25s_ease-in-out_infinite]"
                                  style={{ animationDelay: `${index * 100}ms` }}
                                />
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <div className="inline-flex min-w-[min(720px,100%)] items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                            No configured academic clock phases for this class. Configure the class clock to display the timeline here.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Phase details
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Each phase shows the duration and strongest component grouping for this class’ academic clock.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Today’s timetable
                        </h3>
                        {item.todaySchedule?.periods?.length ? (
                          <div className="mt-3 space-y-3">
                            {item.todaySchedule.periods.map((period, index) => (
                              <div
                                key={`${period._id ?? period.startTime}-${index}`}
                                className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium">
                                    {period.subject?.name ?? period.displayLabel ?? "Untitled period"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {period.startTime} – {period.endTime}
                                  </span>
                                </div>
                                {period.lecturer?.name ? (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {period.lecturer.name}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">
                            No timetable is available for today in this class.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes chevronPulse {
          0%, 100% { opacity: 0.4; transform: translateX(0); }
          50% { opacity: 1; transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
};

export default AcademicCalendar;
