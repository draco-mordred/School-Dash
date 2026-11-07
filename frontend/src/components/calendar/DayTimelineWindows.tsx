import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface TimelineEvent {
  id: string;
  postingName: string;
  startDate: string;
  endDate: string;
  status?: string;
  supervisorName?: string;
  isTimetable?: boolean;
}

interface Props {
  date: string;
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

const statusBadgeClasses: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  planned: "bg-sky-100 text-sky-700 border-sky-200",
  ongoing: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  assigned: "bg-violet-100 text-violet-700 border-violet-200",
  upcoming: "bg-indigo-100 text-indigo-700 border-indigo-200",
  default: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  planned: "Planned",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
  assigned: "Assigned",
  upcoming: "Upcoming",
  default: "Scheduled",
};

const formatHour = (hour: number) =>
  new Date(2000, 0, 1, hour, 0, 0, 0).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatEventTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export default function DayTimelineWindows({ date, events, onEventClick }: Props) {
  const [openWindows, setOpenWindows] = useState<Record<number, boolean>>({});

  const windows = useMemo(() => {
    const day = new Date(date);
    if (Number.isNaN(day.getTime())) return [];
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const isToday = new Date().toDateString() === dayStart.toDateString();
    const nowHour = new Date().getHours();

    return Array.from({ length: 24 }, (_, hour) => {
      const winStart = new Date(dayStart);
      winStart.setHours(hour, 0, 0, 0);
      const winEnd = new Date(dayStart);
      winEnd.setHours(hour + 1, 0, 0, 0);
      const items = events
        .filter((e) => {
          const s = new Date(e.startDate);
          const en = new Date(e.endDate);
          return s < winEnd && en > winStart;
        })
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        );
      return {
        hour,
        items,
        isCurrent: isToday && hour === nowHour,
      };
    });
  }, [date, events]);

  const toggleWindow = (hour: number) =>
    setOpenWindows((prev) => ({ ...prev, [hour]: !prev[hour] }));

  if (windows.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Invalid date selected.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {windows.map((w) => {
        const open = !!openWindows[w.hour];
        const label =
          formatHour(w.hour) + " \u2013 " + formatHour((w.hour + 1) % 24);

        if (w.items.length === 0) {
          return (
            <div key={w.hour} className="flex items-center gap-3 px-4 py-2">
              <span
                className={
                  "w-36 shrink-0 text-[11px] " +
                  (w.isCurrent
                    ? "font-semibold text-primary"
                    : "text-muted-foreground/70")
                }
              >
                {label}
              </span>
              <span className="h-px flex-1 border-t border-dashed border-border/70" />
            </div>
          );
        }

        return (
          <div key={w.hour} className="px-4 py-2">
            <button
              type="button"
              onClick={() => toggleWindow(w.hour)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted/40"
            >
              <span
                className={
                  "w-36 shrink-0 text-[11px] font-medium " +
                  (w.isCurrent ? "text-primary" : "text-muted-foreground")
                }
              >
                {label}
              </span>
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {w.items.length} activit{w.items.length === 1 ? "y" : "ies"}
              </span>
              {w.isCurrent && (
                <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Now
                </span>
              )}
              <span className="ml-auto flex items-center text-muted-foreground">
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            </button>

            {open && (
              <div className="mt-2 space-y-2 pl-2 pr-1">
                {w.items.map((e) => {
                  const statusKey = e.status || "default";
                  const badgeClass =
                    statusBadgeClasses[statusKey] || statusBadgeClasses.default;
                  const statusLabel = statusLabels[statusKey] || "Scheduled";
                  return (
                    <div
                      key={e.id + "-" + w.hour}
                      className={
                        "rounded-xl border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md " +
                        (w.isCurrent ? "border-emerald-300/70" : "border-border")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => onEventClick?.(e)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                            <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                            {formatEventTime(e.startDate) +
                              " \u2013 " +
                              formatEventTime(e.endDate)}
                          </div>
                          <div className="flex items-center gap-2">
                            {e.isTimetable && (
                              <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                Timetable
                              </span>
                            )}
                            <Badge
                              className={
                                "h-5 border px-1.5 py-0 text-[10px] " + badgeClass
                              }
                            >
                              {statusLabel}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-foreground">
                          {e.postingName}
                        </p>
                        {e.supervisorName && (
                          <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                            {"by " + e.supervisorName}
                          </p>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
