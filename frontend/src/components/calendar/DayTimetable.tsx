import React, { useMemo, useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type PostingWindow = { id?: string; scheduleId?: string; postingId?: string; postingName?: string; startDate: string; endDate: string; status?: string; supervisorName?: string };

type TimelineEvent = PostingWindow & { __start: string; __end: string };

type LayoutItem = { ev: TimelineEvent; start: number; end: number; id?: string; col: number; cols: number };

type DragIndicator = { x: number; y: number; label: string } | null;

type DragGuideUpdater = (evt: PointerEvent, label: string) => void;

const statusMetadata: Record<string, { label: string; badgeClasses: string; dotClass: string; borderClass: string }> = {
  planned: { label: "Planned", badgeClasses: "bg-sky-100 text-sky-700 border-sky-200", dotClass: "bg-sky-500", borderClass: "border-sky-500" },
  ongoing: { label: "Ongoing", badgeClasses: "bg-amber-100 text-amber-700 border-amber-200", dotClass: "bg-amber-500", borderClass: "border-amber-500" },
  completed: { label: "Completed", badgeClasses: "bg-emerald-100 text-emerald-700 border-emerald-200", dotClass: "bg-emerald-500", borderClass: "border-emerald-500" },
  cancelled: { label: "Cancelled", badgeClasses: "bg-rose-100 text-rose-700 border-rose-200", dotClass: "bg-rose-500", borderClass: "border-rose-500" },
  assigned: { label: "Assigned", badgeClasses: "bg-violet-100 text-violet-700 border-violet-200", dotClass: "bg-violet-500", borderClass: "border-violet-500" },
  default: { label: "Scheduled", badgeClasses: "bg-slate-100 text-slate-700 border-slate-200", dotClass: "bg-slate-500", borderClass: "border-slate-500" },
};

function minutesFromMidnight(dateStr: string) {
  const d = new Date(dateStr);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function weekDaysFor(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const monday = new Date(d);
  // set to Monday (1)
  const diff = (day + 6) % 7; // days since monday
  monday.setDate(d.getDate() - diff);
  return Array.from({ length: 7 }).map((_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

interface Props {
  events: PostingWindow[];
  date: string; // ISO date string
  onEventClick?: (e: PostingWindow) => void;
  onEventDrop?: (e: PostingWindow, newStartISO: string, newEndISO: string) => void;
  onDateChange?: (isoDate: string) => void;
}

export default function DayTimetable({ events, date, onEventClick, onEventDrop, onDateChange }: Props) {
  // produce slots from 06:00 to 22:00, 30m increments
  const slots = useMemo(() => {
    const res: { label: string; minutes: number }[] = [];
    for (let m = 6 * 60; m <= 22 * 60; m += 30) {
      const hh = Math.floor(m / 60);
      const mm = m % 60;
      const label = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      res.push({ label, minutes: m });
    }
    return res;
  }, []);

  // events for this date
  const dayStart = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);

  const eventsForDay = useMemo(() => {
    return events
      .map((ev) => {
        const s = new Date(ev.startDate);
        const e = new Date(ev.endDate);
        const start = new Date(Math.max(s.getTime(), dayStart.getTime()));
        const end = new Date(Math.min(e.getTime(), dayStart.getTime() + 24 * 60 * 60 * 1000 - 1));
        return { ...ev, __start: start.toISOString(), __end: end.toISOString() } as TimelineEvent;
      })
      .filter((ev) => {
        const s = new Date(ev.__start);
        return s.toDateString() === dayStart.toDateString();
      })
      .sort((a, b) => minutesFromMidnight(a.__start) - minutesFromMidnight(b.__start));
  }, [events, dayStart]);

  // compute overlap layout using a sweep-line algorithm
  const layouted = useMemo(() => {
    const items: Array<Pick<LayoutItem, 'ev' | 'start' | 'end' | 'id'>> = eventsForDay.map((ev) => {
      const start = minutesFromMidnight(ev.__start);
      const end = minutesFromMidnight(ev.__end);
      return { ev, start, end, id: ev.id };
    });

    const groups: Array<Array<Pick<LayoutItem, 'ev' | 'start' | 'end' | 'id'>>> = [];
    items.forEach((it) => {
      let placed = false;
      for (const g of groups) {
        if (!g.some((x) => x.start < it.end && it.start < x.end)) {
          g.push(it);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([it]);
    });

    const results: LayoutItem[] = [];
    groups.forEach((g) => {
      g.sort((a, b) => a.start - b.start);
      const columns: Array<Array<Pick<LayoutItem, 'ev' | 'start' | 'end' | 'id'>>> = [];
      g.forEach((it) => {
        let placedCol = -1;
        for (let i = 0; i < columns.length; i++) {
          const last = columns[i][columns[i].length - 1];
          if (last.end <= it.start) {
            columns[i].push(it);
            placedCol = i;
            break;
          }
        }
        if (placedCol === -1) {
          columns.push([it]);
          placedCol = columns.length - 1;
        }
        results.push({ ...it, col: placedCol, cols: columns.length });
      });
    });

    return results;
  }, [eventsForDay]);

  // dragging indicator state (for visual time indicator)
  const [draggingInfo, setDraggingInfo] = useState<DragIndicator>(null);
  const [dragGuide, setDragGuide] = useState<{ y: number; label: string } | null>(null);
  const [weekScrollerActive, setWeekScrollerActive] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    onDateChange?.(d.toISOString());
  };

  useEffect(() => {
    setWeekScrollerActive(true);
    const timer = window.setTimeout(() => setWeekScrollerActive(false), 220);
    return () => window.clearTimeout(timer);
  }, [date]);

  const updateDragGuide = (evt: PointerEvent, label: string) => {
    if (!evt || typeof evt.clientY !== 'number') return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = evt.clientY - rect.top + (containerRef.current?.scrollTop || 0);
    setDragGuide({ y: Math.max(0, Math.min(y, rect.height)), label });
  };

  const clearDragGuide = () => setDragGuide(null);

  return (
    <div className="w-full overflow-auto">
      <div id="dayViewDatePickHeader" className="px-4 pb-4">
        <div id="dayViewDatePick" className="flex flex-col items-center gap-3 py-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <button
                id="dayViewDatePickLftBtn"
                className="p-2 text-sm text-muted-foreground"
                onClick={() => changeDate(-1)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    changeDate(-1);
                  }
                }}
              >
                ‹
              </button>
              <div className="text-center">
                <div className="text-md uppercase font-medium">{new Date(date).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDateLong(date)}</div>
              </div>
              <button
                id="dayViewDatePickRgtBtn"
                className="p-2 text-sm text-muted-foreground"
                onClick={() => changeDate(1)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    changeDate(1);
                  }
                }}
              >
                ›
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{events.length} windows</div>
              <div className={`flex -space-x-2 overflow-hidden transition-all duration-200 ease-out ${weekScrollerActive ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}>
                {weekDaysFor(date).map((d, idx) => (
                      <button
                        key={idx}
                        aria-label={`Select ${d.toDateString()}`}
                        onClick={() => onDateChange?.(new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString())}
                        className={`mx-1 flex h-8 w-8 items-center justify-center rounded-lg ${d.toDateString() === new Date(date).toDateString() ? 'bg-primary text-white' : 'bg-background text-muted-foreground'}`}>
                        <div className="text-xs font-medium">{d.getDate()}</div>
                      </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">{events.length} windows</div>
            </div>
          </div>
        </div>
      </div>

      <div id="dayViewDailyView" className="min-h-[640px] grid grid-cols-[96px_1fr] gap-4 px-4">
        {/* time column */}
        <div className="flex flex-col">
          {slots.map((s) => (
            <div key={s.label} className="h-12 flex items-center justify-center text-xs text-muted-foreground border-b">{s.label}</div>
          ))}
        </div>

        {/* events column */}
        <div className="relative" ref={containerRef}>
          <div className="absolute inset-0 grid grid-rows-[repeat(32,48px)]">
            {slots.map((_, i) => (
              <div key={i} className="border-b" />
            ))}
          </div>

          <div className="relative z-10 space-y-3 p-2">
            {eventsForDay.length === 0 && (
              <div className="h-40 flex items-center justify-center border rounded-lg bg-card">
                <div className="text-muted-foreground">No events for this day</div>
              </div>
            )}

            {dragGuide && (
              <div className="pointer-events-none absolute left-0 right-0 h-px bg-primary/70" style={{ top: dragGuide.y }} />
            )}

            {layouted.map((item) => {
              const ev: any = item.ev;
              const startMin = item.start;
              const endMin = item.end;
              const top = ((startMin - 6 * 60) / 30) * 48; // 48px per slot
              const height = Math.max(40, ((endMin - startMin) / 30) * 48 - 8);
              const status = ev.status || "default";
              const meta = statusMetadata[status] ?? statusMetadata.default;
              const leftPct = (item.col / item.cols) * 100;
              const widthPct = 100 / item.cols;

              // dragging state handled via inline pointer events

              return (
                <EventItem
                  key={ev.id}
                  ev={ev}
                  top={top}
                  height={height}
                  leftPct={leftPct}
                  widthPct={widthPct}
                  meta={meta}
                  onClick={() => onEventClick?.(ev)}
                  setDraggingInfo={setDraggingInfo}
                  onDragGuide={updateDragGuide}
                  clearDragGuide={clearDragGuide}
                  onDrop={(newStartMin: number, newEndMin: number) => {
                    if (!onEventDrop) return;
                    const day = new Date(date);
                    const newStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
                    newStart.setMinutes(newStartMin);
                    const newEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
                    newEnd.setMinutes(newEndMin);
                    onEventDrop(ev, newStart.toISOString(), newEnd.toISOString());
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      {draggingInfo && (
        <div style={{ position: 'fixed', left: draggingInfo.x + 12, top: draggingInfo.y + 12, zIndex: 9999 }}>
          <div className="rounded-md bg-card border border-border px-3 py-1 shadow">{draggingInfo.label}</div>
        </div>
      )}
    </div>
  );
}

// Separate component to handle dragging with pointer events
interface EventItemProps {
  ev: TimelineEvent;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  meta: { label: string; badgeClasses: string; dotClass: string; borderClass: string };
  onClick?: () => void;
  onDrop: (newStartMin: number, newEndMin: number) => void;
  setDraggingInfo?: React.Dispatch<React.SetStateAction<DragIndicator>>;
  onDragGuide?: DragGuideUpdater;
  clearDragGuide?: ClearDragGuide;
}

function EventItem({ ev, top, height, leftPct, widthPct, meta, onClick, onDrop, setDraggingInfo, onDragGuide, clearDragGuide }: EventItemProps) {
  const slotPx = 48 / 30; // px per minute = 1.6
  const pxPerMin = slotPx;
  const snap = 15; // minutes
  const ref = useRef<HTMLButtonElement | null>(null);

  const updateDragPreview = (evt: PointerEvent, startMin: number, endMin: number) => {
    const label = `${formatTime(new Date(new Date(ev.__start).setMinutes(startMin)).toISOString())} - ${formatTime(new Date(new Date(ev.__start).setMinutes(endMin)).toISOString())}`;
    setDraggingInfo?.({ x: evt.clientX, y: evt.clientY, label });
    onDragGuide?.(evt, label);
  };

  const clampRange = (value: number) => Math.max(6 * 60, Math.min(22 * 60, value));

  const onPointerDown = (e: React.PointerEvent) => {
    const target = ref.current!;
    target.setPointerCapture(e.pointerId);
    const s = minutesFromMidnight(ev.__start);
    const end = minutesFromMidnight(ev.__end);
    const origStartMin = s;
    const durationMin = Math.max(15, end - s);
    const startClientY = e.clientY;

    const onMove = (evt: PointerEvent) => {
      const dy = evt.clientY - startClientY;
      const minutesDelta = Math.round(dy / (pxPerMin * snap)) * snap;
      const newStartMin = clampRange(origStartMin + minutesDelta);
      const newTop = ((newStartMin - 6 * 60) * pxPerMin);
      target.style.top = `${newTop}px`;
      updateDragPreview(evt, newStartMin, newStartMin + durationMin);
    };

    const onUp = (evt: PointerEvent | null) => {
      try {
        if (!evt || typeof evt.clientY !== 'number') {
          return;
        }
        const dy = evt.clientY - startClientY;
        const minutesDelta = Math.round(dy / (pxPerMin * snap)) * snap;
        const newStart = clampRange(origStartMin + minutesDelta);
        const newEnd = clampRange(newStart + durationMin);
        onDrop(newStart, newEnd);
      } finally {
        try { target.releasePointerCapture(e.pointerId); } catch (_err) { /* ignore */ }
        setDraggingInfo?.(null);
        clearDragGuide?.();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp as EventListener);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onResizePointerDown = (e: React.PointerEvent, direction: 'top' | 'bottom') => {
    e.stopPropagation();
    const target = ref.current!;
    target.setPointerCapture(e.pointerId);
    const startClientY = e.clientY;
    const startDuration = Math.max(15, minutesFromMidnight(ev.__end) - minutesFromMidnight(ev.__start));
    const origStart = minutesFromMidnight(ev.__start);
    const origEnd = minutesFromMidnight(ev.__end);
    const onMove = (evt: PointerEvent) => {
      const dy = evt.clientY - startClientY;
      const minutesDelta = Math.round(dy / (pxPerMin * snap)) * snap;
      if (direction === 'bottom') {
        const newDuration = Math.max(15, startDuration + minutesDelta);
        const newHeight = Math.max(40, (newDuration / 30) * 48 - 8);
        target.style.height = `${newHeight}px`;
        updateDragPreview(evt, origStart, clampRange(origStart + newDuration));
      } else {
        const newStart = clampRange(origStart + minutesDelta);
        const newHeight = Math.max(40, ((origEnd - newStart) / 30) * 48 - 8);
        const newTop = ((newStart - 6 * 60) * pxPerMin);
        target.style.top = `${newTop}px`;
        target.style.height = `${newHeight}px`;
        updateDragPreview(evt, newStart, origEnd);
      }
    };

    const onUp = (evt: PointerEvent | null) => {
      try {
        if (!evt || typeof evt.clientY !== 'number') {
          return;
        }
        const dy = evt.clientY - startClientY;
        const minutesDelta = Math.round(dy / (pxPerMin * snap)) * snap;
        if (direction === 'bottom') {
          const newDuration = Math.max(15, startDuration + minutesDelta);
          onDrop(origStart, clampRange(origStart + newDuration));
        } else {
          const newStart = clampRange(origStart + minutesDelta);
          onDrop(newStart, origEnd);
        }
      } finally {
        try { target.releasePointerCapture(e.pointerId); } catch (_err) { /* ignore */ }
        setDraggingInfo?.(null);
        clearDragGuide?.();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp as EventListener);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 15;
    const s = minutesFromMidnight(ev.__start);
    const end = minutesFromMidnight(ev.__end);
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newStart = Math.max(6 * 60, s - step);
      const newEnd = newStart + (end - s);
      onDrop(newStart, newEnd);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newStart = Math.min(22 * 60 - 15, s + step);
      const newEnd = newStart + (end - s);
      onDrop(newStart, newEnd);
    } else if (e.key === 'ArrowLeft' && e.shiftKey) {
      e.preventDefault();
      const newDuration = Math.max(15, (end - s) - step);
      onDrop(s, s + newDuration);
    } else if (e.key === 'ArrowRight' && e.shiftKey) {
      e.preventDefault();
      const newDuration = Math.min(22 * 60 - s, (end - s) + step);
      onDrop(s, s + newDuration);
    }
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${ev.postingName} ${formatTime((ev as any).__start || ev.startDate)} to ${formatTime((ev as any).__end || ev.endDate)}`}
      className={`relative rounded-lg border bg-card p-3 shadow-sm text-left transition-all duration-150 ${meta.borderClass}`}
      style={{ top: "0px", height:"120px", left: `0%`, width: `calc(100% - 8px)` }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">{meta.label}</div>
          <div className="text-xs text-muted-foreground">{Math.max(1, Math.round((height / 48))) } hr</div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold text-sm line-clamp-2">{ev.postingName}</h4>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarFallback>{(ev.supervisorName || '').split(' ').map((n:any)=>n[0]).slice(0,2).join('')}</AvatarFallback>
              </Avatar>
              <div>{ev.supervisorName ?? 'TBD'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">{formatTime((ev as any).__start || ev.startDate)}</div>
            <Badge variant="outline" className={meta.badgeClasses}>{meta.label}</Badge>
          </div>
        </div>
      </div>
      <div
        onPointerDown={(e) => onResizePointerDown(e, 'top')}
        className="absolute top-0 left-2 h-3 w-6 cursor-row-resize rounded bg-muted/30"
        aria-hidden
      />
      <div
        onPointerDown={(e) => onResizePointerDown(e, 'bottom')}
        className="absolute -bottom-1 right-2 h-3 w-6 cursor-row-resize rounded bg-muted/30"
        aria-hidden
      />
    </button>
  );
}
