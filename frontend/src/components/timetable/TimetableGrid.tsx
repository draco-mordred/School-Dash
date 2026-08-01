import { useMemo, type CSSProperties, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Clock, User as UserIcon } from "lucide-react";
import type { period, schedule } from "@/types";

interface Props {
  schedule: schedule[];
  isLoading: boolean;
  currentPostingTitle?: string | null;
  postingScheduleAvailable?: boolean;
}

type TimetableSubjectMeta = {
  _id?: string;
  name?: string | null;
  code?: string | null;
  date?: string | Date | null;
  lecturer?: Array<{ _id?: string; name?: string | null; email?: string } | null> | null;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TextMarquee = ({ children }: { children: ReactNode }) => (
  <div className="marquee-clip w-full overflow-hidden text-left">
    <div
      className="marquee-track inline-flex min-w-max items-center whitespace-nowrap marquee-animate"
      style={
        {
          "--marquee-distance": "220px",
          "--marquee-duration": "9s",
        } as CSSProperties
      }
    >
      <span className="marquee-item inline-flex pr-8 font-medium">{children}</span>
      <span className="marquee-item inline-flex pr-8 font-medium">{children}</span>
    </div>
  </div>
);

const getCurrentWeekRange = () => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getActiveSubjectForPeriod = (period: period) => {
  const subjects = Array.isArray(period.subject?.subjects)
    ? (period.subject.subjects as TimetableSubjectMeta[])
    : [];

  if (subjects.length === 0) return null;

  const { start, end } = getCurrentWeekRange();
  const withinWeek = subjects.find((subject: TimetableSubjectMeta) => {
    if (!subject?.date) return false;
    const parsed = new Date(subject.date);
    return !Number.isNaN(parsed.getTime()) && parsed >= start && parsed <= end;
  });

  return withinWeek ?? subjects[0] ?? null;
};

const formatSubjectDate = (dateValue?: string | Date | null) => {
  if (!dateValue) return "Date not set";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "Date not set";

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getPeriodTitle = (
  period: period,
  currentPostingTitle?: string | null,
) => {
  if (period.isOptional) return period.displayLabel ?? "Optional Activity";
  if (period.isClinical) {
    return currentPostingTitle
      ? `Clinical: ${currentPostingTitle}`
      : "Clinical Activities";
  }

  const courseName = period.subject?.name ?? "TBD Subject";
  const activeSubject = getActiveSubjectForPeriod(period);

  if (activeSubject?.name && activeSubject.name !== courseName) {
    return `${courseName}: ${activeSubject.name}`;
  }

  return courseName;
};

const getPeriodDateText = (period: period) => {
  if (period.isOptional || period.isClinical) return null;
  const activeSubject = getActiveSubjectForPeriod(period);
  return formatSubjectDate(activeSubject?.date ?? null);
};

const getAssignedLecturerName = (period: period) => {
  const activeSubject = getActiveSubjectForPeriod(period);
  if (Array.isArray(activeSubject?.lecturer) && activeSubject.lecturer.length > 0) {
    return activeSubject.lecturer[0]?.name ?? "Lecturer not assigned";
  }

  return period.lecturer?.name ?? "Lecturer not assigned";
};

const getPeriodBadgeText = (period: period) => {
  if (period.isOptional) return "OPTIONAL";
  if (period.isClinical) return "CLINICAL";

  const activeSubject = getActiveSubjectForPeriod(period);
  return activeSubject?.code ?? period.subject?.code ?? "";
};

const getPeriodBadgeClassName = (period: period) => {
  if (period.isOptional) return "bg-amber-100 text-amber-700 border-amber-300";
  if (period.isClinical) return "bg-green-100 text-green-700 border-green-300";
  return "";
};

const getPeriodHeadingClassName = (period: period) => {
  if (period.isOptional) return "text-amber-700";
  if (period.isClinical) return "text-green-700";
  return "text-primary";
};

const getPeriodCardClassName = (period: period) => {
  if (period.isOptional) return "border-l-amber-500 bg-amber-50";
  if (period.isClinical) return "border-l-green-500 bg-green-50";
  return "border-l-primary";
};

const getPeriodDetailItems = (
  period: period,
  currentPostingTitle?: string | null,
  postingScheduleAvailable?: boolean,
) => {
  const items: Array<{ label: string; value: string }> = [
    { label: "Time", value: `${period.startTime} - ${period.endTime}` },
    {
      label: "Type",
      value: period.isClinical ? "Clinical" : period.isOptional ? "Optional" : "Academic",
    },
  ];

  const activeSubject = getActiveSubjectForPeriod(period);

  if (!period.isClinical && !period.isOptional && activeSubject?.name) {
    items.push({ label: "Subject", value: activeSubject.name });
  }

  if (activeSubject?.code) {
    items.push({ label: "Code", value: activeSubject.code });
  }

  if (!period.isClinical && !period.isOptional) {
    items.push({ label: "Date", value: formatSubjectDate(activeSubject?.date ?? null) });
  }

  if (period.isClinical) {
    items.push({ label: "Current posting", value: currentPostingTitle ?? "Clinical" });
    items.push({
      label: "Schedule",
      value: postingScheduleAvailable ? "Schedule available" : "Schedule unavailable",
    });
  }

  const lecturerName =
    Array.isArray(activeSubject?.lecturer) && activeSubject.lecturer.length > 0
      ? activeSubject.lecturer[0]?.name
      : period.lecturer?.name;

  if (lecturerName) {
    items.push({ label: "Lecturer", value: lecturerName });
  }

  return items;
};

const MobileList = ({
  schedule,
  currentPostingTitle,
  postingScheduleAvailable,
}: {
  schedule: schedule[];
  currentPostingTitle?: string | null;
  postingScheduleAvailable?: boolean;
}) => (
  <div className="flex flex-col divide-y divide-border rounded-md border overflow-y-auto">
    {DAYS.map((day) => {
      const dayData = schedule.find((d) => d.day === day);
      const sortedPeriods = dayData?.periods.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)) ?? [];

      return (
        <div key={day}>
          <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-3 py-2 border-b">
            <span className="font-semibold text-sm">{day}</span>
          </div>

          <div className="divide-y divide-border">
            {sortedPeriods.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <span className="text-xs text-muted-foreground">No periods scheduled</span>
              </div>
            ) : (
              sortedPeriods.map((period, i) => {
                const detailItems = getPeriodDetailItems(
                  period,
                  currentPostingTitle,
                  postingScheduleAvailable,
                );

                return (
                  <div key={i} className="flex gap-3 p-3 items-start">
                    <div className="shrink-0 w-16 text-xs text-muted-foreground pt-0.5">
                      <div>{period.startTime}</div>
                      <div className="text-[10px]">{period.endTime}</div>
                    </div>

                    <div className="group/period relative flex-1 min-w-0">
                      <div className={`rounded-md border bg-card p-2.5 border-l-4 ${getPeriodCardClassName(period)} shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <div className={`font-semibold text-sm leading-tight ${getPeriodHeadingClassName(period)}`}>
                              <TextMarquee>{getPeriodTitle(period, currentPostingTitle)}</TextMarquee>
                            </div>
                            {!period.isClinical && !period.isOptional && (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {getPeriodDateText(period)}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className={`font-bold text-[10px] px-1 shrink-0 ${getPeriodBadgeClassName(period)}`}>
                            {getPeriodBadgeText(period)}
                          </Badge>
                        </div>
                        {!period.isClinical && !period.isOptional && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <UserIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{getAssignedLecturerName(period)}</span>
                          </div>
                        )}
                      </div>

                      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 origin-top scale-95 rounded-xl border border-border bg-popover/95 p-3 text-left shadow-xl backdrop-blur-sm opacity-0 invisible transition-all duration-200 group-hover/period:visible group-hover/period:opacity-100 group-hover/period:translate-y-0 group-hover/period:scale-100">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Period details
                        </p>
                        <div className="space-y-1.5 text-sm">
                          {detailItems.map((item) => (
                            <div key={item.label} className="flex items-start justify-between gap-3">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className="text-right font-medium text-foreground">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    })}
  </div>
);

const DesktopGrid = ({
  schedule,
  currentPostingTitle,
  postingScheduleAvailable,
  timeSlots,
  getRowLabel,
}: {
  schedule: schedule[];
  currentPostingTitle?: string | null;
  postingScheduleAvailable?: boolean;
  timeSlots: string[];
  getRowLabel: (startTime: string) => string;
}) => (
  <ScrollArea className="w-full rounded-md border">
    <div className="flex min-w-[1028px] flex-col">
      <div className="flex border-b bg-muted/50">
        <div className="w-32 shrink-0 border-r p-4 font-medium text-muted-foreground flex items-center justify-center">
          Time
        </div>
        {DAYS.map((day) => (
          <div
            key={day}
            className="w-44 shrink-0 border-r p-4 font-semibold text-center last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      {timeSlots.map((time) => (
        <div className="flex border-b last:border-b-0 min-h-[110px]" key={time}>
          <div className="w-32 shrink-0 border-r p-2 text-xs font-medium text-muted-foreground flex items-center justify-center text-center bg-muted/50">
            {getRowLabel(time)}
          </div>
          {DAYS.map((day) => {
            const dayData = schedule.find((d) => d.day === day);
            const period = dayData?.periods.find((p) => p.startTime === time);
            return (
              <div
                key={`${day}-${time}`}
                className="w-44 shrink-0 border-r p-2 last:border-r-0 overflow-visible"
              >
                {period ? (() => {
                  const detailItems = getPeriodDetailItems(
                    period,
                    currentPostingTitle,
                    postingScheduleAvailable,
                  );

                  return (
                    <div className="group/period relative h-full w-full">
                      <div className={`h-full w-full rounded-md border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg flex flex-col justify-between gap-2 border-l-4 ${getPeriodCardClassName(period)}`}>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className={`font-bold text-[10px] px-1.5 ${getPeriodBadgeClassName(period)}`}>
                              {getPeriodBadgeText(period)}
                            </Badge>
                          </div>
                          <div>
                            <div className={`font-semibold text-sm leading-tight ${getPeriodHeadingClassName(period)}`}>
                              <TextMarquee>{getPeriodTitle(period, currentPostingTitle)}</TextMarquee>
                            </div>
                            {!period.isClinical && !period.isOptional && (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {getPeriodDateText(period)}
                              </div>
                            )}
                          </div>
                        </div>

                        {!period.isClinical && !period.isOptional && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-dashed">
                            <UserIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-35" title={getAssignedLecturerName(period)}>
                              {getAssignedLecturerName(period)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 origin-top scale-95 rounded-xl border border-border bg-popover/95 p-3 text-left shadow-xl backdrop-blur-sm opacity-0 invisible transition-all duration-200 group-hover/period:visible group-hover/period:opacity-100 group-hover/period:translate-y-0 group-hover/period:scale-100">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Period details
                        </p>
                        <div className="space-y-1.5 text-sm">
                          {detailItems.map((item) => (
                            <div key={item.label} className="flex items-start justify-between gap-3">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className="text-right font-medium text-foreground">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-full w-full rounded-md border border-dashed border-primary bg-primary/30 flex items-center justify-center">
                    <span className="text-xs text-primary font-medium">Free Period</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);

const TimetableGrid = ({
  schedule,
  isLoading,
  currentPostingTitle,
  postingScheduleAvailable,
}: Props) => {
  const timeSlots = useMemo(() => {
    const times = new Set<string>();
    schedule.forEach((day) => {
      day.periods.forEach((period) => {
        times.add(period.startTime);
      });
    });
    return Array.from(times).sort();
  }, [schedule]);

  const getRowLabel = (startTime: string) => {
    for (const day of schedule) {
      const found = day.periods.find((p) => p.startTime === startTime);
      if (found) {
        return `${found.startTime} - ${found.endTime}`;
      }
    }
    return startTime;
  };

  if (isLoading) {
    return (
      <div className="h-40 w-full flex items-center justify-center border rounded-lg bg-card">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <div className="h-40 w-full flex flex-col items-center justify-center border rounded-lg border-dashed bg-card">
        <Clock className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-lg">No Timetable Generated</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          Select a class and academic year to view the schedule.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="block md:hidden">
        <MobileList
          schedule={schedule}
          currentPostingTitle={currentPostingTitle}
          postingScheduleAvailable={postingScheduleAvailable}
        />
      </div>
      <div className="hidden md:block">
        <DesktopGrid
          schedule={schedule}
          currentPostingTitle={currentPostingTitle}
          postingScheduleAvailable={postingScheduleAvailable}
          timeSlots={timeSlots}
          getRowLabel={getRowLabel}
        />
      </div>
    </>
  );
};

export default TimetableGrid;
