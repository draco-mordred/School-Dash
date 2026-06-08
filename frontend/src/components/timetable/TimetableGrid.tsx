import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Clock, User as UserIcon } from "lucide-react";
import type { schedule } from "@/types";

interface Props {
  schedule: schedule[];
  isLoading: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TimetableGrid = ({ schedule, isLoading }: Props) => {
  // loading
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

  // no schedule
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

  const timeSlots = useMemo(() => {
    if (!schedule) return [];
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

  // ─── Mobile/tablet list view ───────────────────────────────────
  const MobileList = () => (
    <div className="flex flex-col divide-y divide-border rounded-md border overflow-y-auto">
      {DAYS.map((day) => {
        const dayData = schedule.find((d) => d.day === day);
        const sortedPeriods = dayData?.periods.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)) ?? [];

        return (
          <div key={day}>
            {/* Day header */}
            <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-3 py-2 border-b">
              <span className="font-semibold text-sm">{day}</span>
            </div>

            {/* Periods */}
            <div className="divide-y divide-border">
              {sortedPeriods.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <span className="text-xs text-muted-foreground">No periods scheduled</span>
                </div>
              ) : (
                sortedPeriods.map((period, i) => (
                  <div key={i} className="flex gap-3 p-3 items-start">
                    {/* Time column */}
                    <div className="shrink-0 w-16 text-xs text-muted-foreground pt-0.5">
                      <div>{period.startTime}</div>
                      <div className="text-[10px]">{period.endTime}</div>
                    </div>

                    {/* Card */}
                    <div className={`flex-1 min-w-0 rounded-md border bg-card p-2.5 border-l-4 ${period.isClinical ? "border-l-green-500 bg-green-50" : "border-l-primary"} shadow-sm`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className={`font-semibold text-sm leading-tight truncate ${period.isClinical ? "text-green-700" : "text-primary"}`}>
                          {period.isClinical ? "Clinical Activities" : (period.subject?.name ?? "TBD Subject")}
                        </h4>
                        {period.isClinical ? (
                          <Badge variant="outline" className="font-bold text-[10px] px-1 shrink-0 bg-green-100 text-green-700 border-green-300">
                            CLINICAL
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-bold text-[10px] px-1 shrink-0">
                            {period.subject?.code ?? ""}
                          </Badge>
                        )}
                      </div>
                      {!period.isClinical && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{period.lecturer?.name ?? "TBD Lecturer"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ─── Desktop grid view ──────────────────────────────────────────
  const DesktopGrid = () => (
    <ScrollArea className="w-full rounded-md border">
      <div className="flex min-w-[1028px] flex-col">
        {/* header row */}
        <div className="flex border-b bg-muted/50">
          <div className="w-32 shrink-0 border-r p-4 font-medium text-muted-foreground flex items-center justify-center">
            Time
          </div>
          {DAYS.map((day) => (
            <div
              key={day}
              className="min-w-44 flex-1 border-r p-4 font-semibold text-center last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        {timeSlots?.map((time) => (
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
                  className="min-w-44 flex-1 border-r p-2 last:border-r-0"
                >
                  {period ? (
                    <div className={`h-full w-full rounded-md border bg-card p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2 border-l-4 ${period.isClinical ? "border-l-green-500 bg-green-50" : "border-l-primary"}`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          {period.isClinical ? (
                            <Badge variant="outline" className="font-bold text-[10px] px-1.5 bg-green-100 text-green-700 border-green-300">
                              CLINICAL
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="font-bold text-[10px] px-1.5"
                            >
                              {period.subject?.code ?? ""}
                            </Badge>
                          )}
                        </div>
                        <h4 className={`font-semibold text-sm leading-tight line-clamp-2 ${period.isClinical ? "text-green-700" : "text-primary"}`}>
                          {period.isClinical ? "Clinical Activities" : (period.subject?.name ?? "TBD Subject")}
                        </h4>
                      </div>

                      {!period.isClinical && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-dashed">
                          <UserIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-35" title={period.lecturer?.name ?? ""}>
                            {period.lecturer?.name ?? "TBD Lecturer"}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
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

  return (
    <>
      {/* Mobile/tablet: list view */}
      <div className="block md:hidden">
        <MobileList />
      </div>
      {/* Desktop: grid table */}
      <div className="hidden md:block">
        <DesktopGrid />
      </div>
    </>
  );
};

export default TimetableGrid;
