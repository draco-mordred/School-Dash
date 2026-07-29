import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2, Zap } from "lucide-react";

export type ActivityStatus =
  | "scheduled"
  | "upcoming"
  | "in-progress"
  | "completed"
  | "cancelled";
export type ActivityType =
  | "lecture"
  | "clinical"
  | "posting"
  | "tutorial"
  | "duty"
  | "call";

interface ActivityStatusBadgeProps {
  type: ActivityType;
  status: ActivityStatus;
  startTime?: Date;
  compact?: boolean;
}

type IconType = React.ComponentType<{ className?: string }>;

const STATUS_METADATA: Record<
  ActivityStatus,
  { label: string; bgClass: string; textClass: string; icon: IconType }
> = {
  scheduled: {
    label: "Scheduled",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
    icon: Clock,
  },
  upcoming: {
    label: "Upcoming",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: Zap,
  },
  "in-progress": {
    label: "In Progress",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: AlertCircle,
  },
  completed: {
    label: "Completed",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    bgClass: "bg-rose-100",
    textClass: "text-rose-700",
    icon: AlertCircle,
  },
};

const TYPE_LABEL: Record<ActivityType, string> = {
  lecture: "Lecture",
  clinical: "Clinical",
  posting: "Posting",
  tutorial: "Tutorial",
  duty: "Duty",
  call: "Call",
};

/**
 * Determine activity status based on current time
 */
function getActivityStatus(
  status: ActivityStatus,
  startTime?: Date,
  endTime?: Date,
): ActivityStatus {
  if (status !== "scheduled") return status;

  if (!startTime) return "scheduled";

  const now = new Date();
  const leadTime = 15; // minutes
  const upcomingThreshold = new Date(
    startTime.getTime() - leadTime * 60 * 1000,
  );

  if (now < upcomingThreshold) return "scheduled";
  if (now >= upcomingThreshold && now < startTime) return "upcoming";
  if (endTime && now >= startTime && now < endTime) return "in-progress";
  if (endTime && now >= endTime) return "completed";

  return "scheduled";
}

export function ActivityStatusBadge({
  type,
  status,
  startTime,
  compact = false,
}: ActivityStatusBadgeProps) {
  const resolvedStatus = getActivityStatus(status, startTime);
  const statusMeta = STATUS_METADATA[resolvedStatus];
  const typeLabel = TYPE_LABEL[type];
  const IconComponent = statusMeta.icon;

  if (compact) {
    return (
      <Badge
        className={`${statusMeta.bgClass} ${statusMeta.textClass} border-0 text-xs`}
      >
        {statusMeta.label}
      </Badge>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 ${statusMeta.bgClass}`}
    >
      <div className={`flex-shrink-0 ${statusMeta.textClass}`}>
        <IconComponent className="h-3 w-3" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className={`text-xs font-semibold ${statusMeta.textClass}`}>
          {statusMeta.label}
        </p>
        <p className={`text-[10px] ${statusMeta.textClass} opacity-75`}>
          {typeLabel}
        </p>
      </div>
    </div>
  );
}

/**
 * Timeline indicator showing activity progress
 */
export function ActivityTimelineIndicator({
  startTime,
  endTime,
  status,
}: {
  startTime: Date;
  endTime: Date;
  status: ActivityStatus;
}) {
  const now = new Date();
  const totalDuration = endTime.getTime() - startTime.getTime();
  const elapsed = Math.max(0, now.getTime() - startTime.getTime());
  const progress = Math.min(100, (elapsed / totalDuration) * 100);
  const isActive = now >= startTime && now < endTime;

  return (
    <div className="flex flex-col gap-1">
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${
            isActive
              ? "bg-amber-500"
              : status === "completed"
                ? "bg-emerald-500"
                : "bg-slate-300"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>
          {startTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span>
          {endTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

/**
 * Activity card component for dashboard display
 */
export function ActivityCard({
  title,
  type,
  status,
  startTime,
  endTime,
  location,
  instructor,
  onClick,
}: {
  title: string;
  type: ActivityType;
  status: ActivityStatus;
  startTime: Date;
  endTime: Date;
  location?: string;
  instructor?: string;
  onClick?: () => void;
}) {
  const resolvedStatus = getActivityStatus(status, startTime, endTime);
  const statusMeta = STATUS_METADATA[resolvedStatus];
  const IconComponent = statusMeta.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-all hover:shadow-md ${
        statusMeta.bgClass
      } border-${statusMeta.bgClass.split("-")[1]}-200`}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`font-semibold text-sm ${statusMeta.textClass}`}>
              {title}
            </p>
            <p className={`text-xs ${statusMeta.textClass} opacity-75`}>
              {TYPE_LABEL[type]}
            </p>
          </div>
          <Badge
            className={`${statusMeta.bgClass} ${statusMeta.textClass} border-0`}
          >
            {statusMeta.label}
          </Badge>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {startTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {endTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Location & Instructor */}
        {(location || instructor) && (
          <div className="text-xs text-muted-foreground space-y-1">
            {location && <p>📍 {location}</p>}
            {instructor && <p>👤 {instructor}</p>}
          </div>
        )}

        {/* Progress bar if in progress */}
        {resolvedStatus === "in-progress" && (
          <ActivityTimelineIndicator
            startTime={startTime}
            endTime={endTime}
            status={resolvedStatus}
          />
        )}
      </div>
    </button>
  );
}
