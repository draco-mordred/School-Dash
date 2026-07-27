import { useEffect, useRef } from "react";
import { X, Clock, BookOpen, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Lecture {
  time: string;
  subject?: string;
  lecturer?: string;
  code?: string;
}

interface ClinicalPosting {
  time: string;
  postingName: string;
  status: "planned" | "ongoing" | "completed" | "assigned" | "cancelled" | "default";
  id: string;
}

interface Props {
  date: Date;
  lectures: Lecture[];
  optionalLectures?: Lecture[];
  clinicalPostings: ClinicalPosting[];
  isVisible: boolean;
  position?: "top" | "bottom" | "auto";
  onClose?: () => void;
  anchorRect?: DOMRect | null;
}

const statusMetadata: Record<string, { label: string; badgeClass: string }> = {
  planned: { label: "Planned", badgeClass: "bg-sky-100 text-sky-700 border-sky-300" },
  ongoing: { label: "Ongoing", badgeClass: "bg-amber-100 text-amber-700 border-amber-300" },
  completed: { label: "Completed", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  assigned: { label: "Assigned", badgeClass: "bg-violet-100 text-violet-700 border-violet-300" },
  cancelled: { label: "Cancelled", badgeClass: "bg-rose-100 text-rose-700 border-rose-300" },
  default: { label: "Scheduled", badgeClass: "bg-slate-100 text-slate-700 border-slate-300" },
};

export default function DayPopupBubble({
  date,
  lectures,
  optionalLectures = [],
  clinicalPostings,
  isVisible,
  position = "auto",
  onClose,
  anchorRect = null,
}: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  const isAbove = anchorRect ? anchorRect.top > 240 : true;
  const bubbleStyle = anchorRect
    ? (() => {
        const viewportWidth = window.innerWidth;
        const anchorCenter = anchorRect.left + anchorRect.width / 2;
        const left = Math.min(Math.max(16, anchorCenter), viewportWidth - 16);
        const top = isAbove
          ? Math.max(8, anchorRect.top - 12)
          : Math.min(window.innerHeight - 16, anchorRect.bottom + 8);
        return {
          top: `${top}px`,
          left: `${left}px`,
          transform: `translateX(-50%) ${isAbove ? "translateY(-100%)" : "translateY(0)"}`,
        };
      })()
    : {
        top: position === "bottom" ? "auto" : "50%",
        bottom: position === "bottom" ? "20px" : "auto",
        left: "50%",
        transform: `translateX(-50%) ${position === "bottom" ? "" : "translateY(-50%)"}`,
      };

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const hasActivities = lectures.length > 0 || optionalLectures.length > 0 || clinicalPostings.length > 0;

  return (
    <div
      ref={bubbleRef}
      className={`fixed z-50 w-80 transition-all duration-300 ${
        isVisible
          ? "translate-y-0 scale-100 opacity-100"
          : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
      }`}
      style={bubbleStyle}
    >
      {/* Backdrop blur container */}
      <div className="absolute inset-0 rounded-2xl bg-background/25 backdrop-blur-xl" />

      {/* Glass card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-[0_24px_70px_-24px_rgba(110,86,207,0.35)]">
        {/* Decorative triangle pointer */}
        <div
          className={`absolute left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-border/70 bg-background/95 ${
            isAbove ? "-bottom-3 border-b border-r" : "-top-3 border-t border-l"
          }`}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{dateLabel}</p>
            <p className="text-xs text-muted-foreground">
              {hasActivities ? `${lectures.length + optionalLectures.length + clinicalPostings.length} activities` : "No activities"}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto px-4 py-3">
          {!hasActivities ? (
            <p className="text-center text-sm text-muted-foreground py-4">No scheduled activities for this day</p>
          ) : (
            <div className="space-y-4">
              {/* Lectures Section */}
              {lectures.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground">Class timetable</p>
                  </div>
                  <div className="space-y-2 pl-6">
                    {lectures.map((lecture, idx) => (
                      <div key={`lecture-${idx}`} className="rounded-lg border border-border/50 bg-muted/30 p-2 text-xs space-y-1">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          {lecture.time}
                        </div>
                        {lecture.subject && (
                          <p className="text-muted-foreground">{lecture.subject}</p>
                        )}
                        {lecture.code && (
                          <p className="text-[11px] text-muted-foreground/70">{lecture.code}</p>
                        )}
                        {lecture.lecturer && (
                          <p className="text-[11px] text-muted-foreground italic">by {lecture.lecturer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Activities Section */}
              {optionalLectures && optionalLectures.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-600" />
                    <p className="text-xs font-semibold text-muted-foreground">Optional activities</p>
                  </div>
                  <div className="space-y-2 pl-6">
                    {optionalLectures.map((optional, idx) => (
                      <div key={`optional-${idx}`} className="rounded-lg border border-border/50 bg-muted/30 p-2 text-xs space-y-1">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          {optional.time}
                        </div>
                        <p className="text-muted-foreground">{optional.subject}</p>
                        {optional.code && (
                          <p className="text-[11px] text-muted-foreground/70">{optional.code}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Postings Section */}
              {clinicalPostings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold text-muted-foreground">Clinical activities</p>
                  </div>
                  <div className="space-y-2 pl-6">
                    {clinicalPostings.map((posting) => {
                      const statusMeta = statusMetadata[posting.status] || statusMetadata.default;
                      return (
                        <div
                          key={posting.id}
                          className="rounded-lg border border-border/50 bg-muted/30 p-2 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-foreground font-medium">
                              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              {posting.time}
                            </div>
                            <Badge
                              className={`text-[10px] px-1.5 py-0 h-5 border ${statusMeta.badgeClass}`}
                            >
                              {statusMeta.label}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{posting.postingName}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
