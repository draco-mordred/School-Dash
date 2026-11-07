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

type EventKind = "lecture" | "other" | "clinical";

const kindOf = (e: TimelineEvent): EventKind => {
  if (e.isTimetable) {
    if (e.postingName.startsWith("Optional:")) return "other";
    if (e.postingName.startsWith("Clinical:")) return "clinical";
    return "lecture";
  }
  return "clinical";
};

// Legend colors: Lecture = sky, Other activity = indigo, Clinical = status color.
const windowTint: Record<
  string,
  { edge: string; chip: string; chipText: string }
> = {
  lecture: {
    edge: "border-l-sky-400 bg-sky-500/5",
    chip: "border-sky-200 bg-sky-100",
    chipText: "text-sky-700",
  },
  other: {
    edge: "border-l-indigo-400 bg-indigo-500/5",
    chip: "border-indigo-200 bg-indigo-100",
    chipText: "text-indigo-700",
  },
  clinicalActive: {
    edge: "border-l-emerald-400 bg-emerald-500/5",
    chip: "border-emerald-200 bg-emerald-100",
    chipText: "text-emerald-700",
  },
  clinicalOngoing: {
    edge: "border-l-amber-400 bg-amber-500/5",
    chip: "border-amber-200 bg-amber-100",
    chipText: "text-amber-700",
  },
  clinicalCompleted: {
    edge: "border-l-emerald-400 bg-emerald-500/5",
    chip: "border-emerald-200 bg-emerald-100",
    chipText: "text-emerald-700",
  },
  clinicalPlanned: {
    edge: "border-l-sky-400 bg-sky-500/5",
    chip: "border-sky-200 bg-sky-100",
    chipText: "text-sky-700",
  },
  clinicalUpcoming: {
    edge: "border-l-indigo-400 bg-indigo-500/5",
    chip: "border-indigo-200 bg-indigo-100",
    chipText: "text-indigo-700",
  },
  clinicalAssigned: {
    edge: "border-l-violet-400 bg-violet-500/5",
    chip: "border-violet-200 bg-violet-100",
    chipText: "text-violet-700",
  },
  clinicalCancelled: {
    edge: "border-l-rose-400 bg-rose-500/5",
    chip: "border-rose-200 bg-rose-100",
    chipText: "text-rose-700",
  },
  default: {
    edge: "border-l-slate-400 bg-slate-500/5",
    chip: "border-slate-200 bg-slate-100",
    chipText: "text-slate-700",
  },
};

const tintFor = (kind: EventKind, status: string | undefined) => {
  if (kind === "lecture") return windowTint.lecture;
  if (kind === "other") return windowTint.other;
  const key = status || "default";
  if (key === "active") return windowTint.clinicalActive;
  if (key === "ongoing") return windowTint.clinicalOngoing;
  if (key === "completed") return windowTint.clinicalCompleted;
  if (key === "planned") return windowTint.clinicalPlanned;
  if (key === "upcoming") return windowTint.clinicalUpcoming;
  if (key === "assigned") return windowTint.clinicalAssigned;
  if (key === "cancelled") return windowTint.clinicalCancelled;
  return windowTint.default;
};

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

const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatDuration = (ms: number) => {
  const minutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return rest + "m";
  if (rest === 0) return hours + "h";
  return hours + "h " + rest + "m";
};

interface TimeWindow {
  key: string;
  start: Date;
  end: Date;
  items: TimelineEvent[];
  isCurrent: boolean;
}

export default function DayTimelineWindows({ date, events, onEventClick }: Props) {
  const [openWindows, setOpenWindows] = useState<Record<string, boolean>>({});

  const windows = useMemo<TimeWindow[] | null>(() => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const now = new Date();
    const isToday = now.toDateString() === dayStart.toDateString();

    // Activities are grouped by their EXACT time frame on this day
    // (clamped to the day), so a window only ever shows its own
    // timeframe's data — never another timeframe's.
    const groups = new Map<string, { start: Date; end: Date; items: TimelineEvent[] }>();
    for (const e of events) {
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      if (Number.isNaN(s.getTime()) || Number.isNaN(en.getTime())) continue;
      if (!(s < dayEnd && en > dayStart)) continue;
      const cs = s < dayStart ? dayStart : s;
      const ce = en > dayEnd ? dayEnd : en;
      const key = cs.getTime() + "|" + ce.getTime();
      const group = groups.get(key);
      if (group) {
        group.items.push(e);
      } else {
        groups.set(key, { start: cs, end: ce, items: [e] });
      }
    }

    return Array.from(groups.values())
      .sort((a, b) =>
        a.start.getTime() === b.start.getTime()
          ? a.end.getTime() - b.end.getTime()
          : a.start.getTime() - b.start.getTime(),
      )
      .map((g) => ({
        key: g.start.getTime() + "-" + g.end.getTime(),
        start: g.start,
        end: g.end,
        items: g.items.sort(
          (x, y) =>
            new Date(x.startDate).getTime() - new Date(y.startDate).getTime(),
        ),
        isCurrent: isToday && now >= g.start && now < g.end,
      }));
  }, [date, events]);

  const toggleWindow = (key: string) =>
    setOpenWindows((prev) => ({ ...prev, [key]: !prev[key] }));

  if (windows === null) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Invalid date selected.
      </div>
    );
  }

  const flatLine = (label: string, message?: string) => (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="w-40 shrink-0 text-[11px] text-muted-foreground/70">
        {label}
      </span>
      <span className="h-px flex-1 border-t border-dashed border-border/70" />
      {message && (
        <span className="shrink-0 text-[11px] italic text-muted-foreground/70">
          {message}
        </span>
      )}
    </div>
  );

  return (
    <div className="divide-y divide-border">
      {windows.length === 0 &&
        flatLine("12:00 AM \u2013 11:59 PM", "No activities scheduled for this day")}
      {windows.map((w, idx) => {
        const open = !!openWindows[w.key];
        const label = formatTime(w.start) + " \u2013 " + formatTime(w.end);
        const duration = formatDuration(w.end.getTime() - w.start.getTime());
        const dominant = w.items.find(
          (e) => kindOf(e) === "clinical",
        );
        const kind = dominant ? "clinical" : kindOf(w.items[0]);
        const tint = tintFor(kind, dominant ? dominant.status : w.items[0].status);

        const prev = idx === 0 ? null : windows[idx - 1];
        const gapStart = prev ? prev.end : null;
        const showGap = gapStart && w.start.getTime() > gapStart.getTime();

        return (
          <div key={w.key}>
            {showGap &&
              flatLine(
                formatTime(gapStart as Date) +
                  " \u2013 " +
                  formatTime(w.start),
              )}
            <div className={"border-l-4 px-4 py-2 " + tint.edge}>
              <button
                type="button"
                onClick={() => toggleWindow(w.key)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted/40"
              >
                <span className="w-52 shrink-0 text-xs font-semibold text-foreground">
                  {label}
                </span>
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                  {"\u00b7 " + duration}
                </span>
                <span
                  className={
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
                    tint.chip +
                    " " +
                    tint.chipText
                  }
                >
                  {w.items.length} activit{w.items.length === 1 ? "y" : "ies"}
                </span>
                {w.isCurrent && (
                  <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
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
                        key={e.id + "-" + w.key}
                        className="rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <button
                          type="button"
                          onClick={() => onEventClick?.(e)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                              {formatTime(new Date(e.startDate)) +
                                " \u2013 " +
                                formatTime(new Date(e.endDate))}
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
          </div>
        );
      })}
    </div>
  );
}
