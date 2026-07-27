import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  title: string;
  status?: "planned" | "ongoing" | "completed" | "assigned" | "cancelled" | "default";
  time?: string;
  postingName?: string;
  type?: "timetable" | "clinical" | "optional" | "other";
}

interface DayLineItems {
  timetable?: Activity;
  clinical?: Activity;
  optional?: Activity;
}

interface DayData {
  date: Date;
  activities: Activity[];
}

interface Props {
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    extendedProps?: { status?: string };
  }>;
  currentDate: Date;
  dayLineItems?: Record<string, DayLineItems>;
  onDateSelect: (date: Date) => void;
  onDayHover?: (date: Date, lineItems: DayLineItems | undefined, activities: Activity[], anchorRect?: DOMRect | null) => void;
  onDayLeave?: () => void;
  isLoading?: boolean;
}

const statusMetadata: Record<string, { label: string; bgClass: string; badgeClass: string; dotClass: string }> = {
  planned: { label: "Planned", bgClass: "bg-sky-50/70 dark:bg-sky-900/30", badgeClass: "bg-sky-100 text-sky-700 border-sky-300", dotClass: "bg-sky-500" },
  ongoing: { label: "Ongoing", bgClass: "bg-amber-50/70 dark:bg-amber-900/30", badgeClass: "bg-amber-100 text-amber-700 border-amber-300", dotClass: "bg-amber-500" },
  completed: { label: "Completed", bgClass: "bg-emerald-50/70 dark:bg-emerald-900/30", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-300", dotClass: "bg-emerald-500" },
  assigned: { label: "Assigned", bgClass: "bg-violet-50/70 dark:bg-violet-900/30", badgeClass: "bg-violet-100 text-violet-700 border-violet-300", dotClass: "bg-violet-500" },
  cancelled: { label: "Cancelled", bgClass: "bg-rose-50/70 dark:bg-rose-900/30", badgeClass: "bg-rose-100 text-rose-700 border-rose-300", dotClass: "bg-rose-500" },
  default: { label: "Scheduled", bgClass: "bg-slate-50/70 dark:bg-slate-800/30", badgeClass: "bg-slate-100 text-slate-700 border-slate-300", dotClass: "bg-slate-500" },
};

const lineTypeClasses: Record<NonNullable<Activity["type"]>, string> = {
  timetable: "border border-primary/30 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/20",
  clinical: "border border-emerald-200 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20",
  optional: "border border-amber-200 bg-amber-100/80 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20",
  other: "border border-slate-200 bg-slate-100/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/20",
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthViewCalendar({ events, currentDate, dayLineItems, onDateSelect, onDayHover, onDayLeave, isLoading }: Props) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const { monthDays, monthLabel } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Adjust first day to Monday-based week (0 = Monday)
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday to last column

    // Build calendar grid
    const days: (DayData | null)[] = [];

    // Empty cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        activities: [],
      });
    }

    const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(firstDay);

    return { monthDays: days, monthLabel };
  }, [currentDate]);

  // Map events to days
  const calendarDays = useMemo(() => {
    return monthDays.map((day) => {
      if (!day) return null;

      const dayActivities = events
        .filter((evt) => {
          const eventStart = new Date(evt.start);
          return (
            eventStart.getFullYear() === day.date.getFullYear() &&
            eventStart.getMonth() === day.date.getMonth() &&
            eventStart.getDate() === day.date.getDate()
          );
        })
        .map((evt) => ({
          id: evt.id,
          title: evt.title,
          status: (evt.extendedProps?.status ?? "default") as keyof typeof statusMetadata,
          time: new Date(evt.start).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
          postingName: evt.title,
          type: evt.extendedProps?.status === "clinical" ? "clinical" : "other",
        }));

      return {
        ...day,
        activities: dayActivities,
      };
    });
  }, [monthDays, events]);

  const handleDayClick = (day: DayData) => {
    onDateSelect(day.date);
  };

  const handleDayHover = (day: DayData | null, anchorEl?: HTMLElement | null) => {
    if (!day) return;
    const dateKey = day.date.toISOString().split("T")[0];
    setHoveredDate(dateKey);
    const rect = anchorEl ? anchorEl.getBoundingClientRect() : null;
    onDayHover?.(day.date, dayLineItems?.[dateKey], day.activities, rect ?? null);
  };

  const handleDayLeave = () => {
    setHoveredDate(null);
    onDayLeave?.();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date | null) => {
    if (!date) return false;
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  const weeks = useMemo(() => {
    const result: (DayData | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  // Navigate months: call parent with new month's first day
  const handlePrevMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const prev = new Date(year, month - 1, 1);
    onDateSelect(prev);
  };

  const handleNextMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const next = new Date(year, month + 1, 1);
    onDateSelect(next);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2 rounded-lg border border-border bg-background/50 p-4 backdrop-blur-sm dark:bg-slate-950/40">
        {/* Day headers */}
        <div className="mb-4 grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div className="space-y-2">
                {weeks.map((week, weekIdx) => (
            <div key={`week-${weekIdx}`} className="grid grid-cols-7 gap-2">
              {week.map((day, dayIdx) => {
                if (!day) {
                  return <div key={`empty-${dayIdx}`} className="aspect-square" />;
                }

                const dateKey = day.date.toISOString().split("T")[0];
                const isHovered = hoveredDate === dateKey;
                const isTodayDate = isToday(day.date);
                const isMonthDate = isCurrentMonth(day.date);
                const hasActivities = day.activities.length > 0;

                // Get dominant activity status for background tinting
                const dominantStatus = day.activities.length > 0 ? (day.activities[0].status as keyof typeof statusMetadata) : "default";
                const statusMeta = statusMetadata[dominantStatus] || statusMetadata.default;

                return (
                  <div
                    key={`day-${dateKey}`}
                    onMouseEnter={(e) => handleDayHover(day, e.currentTarget as HTMLElement)}
                    onMouseLeave={handleDayLeave}
                    onClick={() => handleDayClick(day)}
                    className={`group relative aspect-square cursor-pointer transition-all duration-200`}
                  >
                    {/* Glass background */}
                    <div
                      className={`absolute inset-0 rounded-[1rem] border backdrop-blur-xl transition-all duration-200 ${
                        isHovered
                            ? "border-primary/50 bg-primary/10 dark:bg-primary/20 shadow-[0_8px_32px_rgba(110,86,207,0.2)] scale-105 -translate-y-1"
                            : `border-border/70 ${statusMeta.bgClass} shadow-sm dark:border-border/60`
                      }`}
                    />
                    {/* Content */}
                    <div className="relative flex h-full flex-col gap-1 p-2 overflow-hidden">
                      {/* Date */}
                      <div
                        className={`text-xs font-semibold ${isMonthDate ? "text-foreground" : "text-muted-foreground"} ${isTodayDate ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}
                      >
                        {day.date.getDate()}
                      </div>

                            <div className="space-y-1">
                        {dayLineItems ? (
                          [dayLineItems[dateKey]?.timetable, dayLineItems[dateKey]?.clinical, dayLineItems[dateKey]?.optional]
                            .filter(Boolean)
                            .map((item, idx) => (
                              <div
                                key={`day-line-${dateKey}-${idx}`}
                                className={`truncate rounded-full px-2 py-1 text-[10px] font-medium ${lineTypeClasses[item?.type || "other"]}`}
                              >
                                {item?.time ? `${item.time} · ` : ""}{item?.postingName || item?.title}
                              </div>
                            ))
                        ) : (
                          <>
                            {hasActivities && (
                              <div className="flex flex-wrap gap-1">
                                {day.activities.slice(0, 3).map((activity, idx) => {
                                  const meta = statusMetadata[activity.status] || statusMetadata.default;
                                  return (
                                    <Badge
                                      key={`${activity.id}-${idx}`}
                                      className={`text-[9px] px-1.5 py-0 h-4 truncate ${meta.badgeClass} border`}
                                    >
                                      {activity.status === "default" ? "Scheduled" : meta.label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
