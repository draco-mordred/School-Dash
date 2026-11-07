import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { UserRound, Users, Activity } from "lucide-react";
import type { schedule } from "@/types";

const ACTIVITY_LABELS: Record<string, string> = {
  ward_round: "Ward Round",
  clinic: "Clinic",
  theatre: "Theatre",
  call_duty: "Call Duty",
  procedure: "Procedure",
  practical: "Practical",
  simulation: "Simulation",
  other: "Other Activity",
};

const activityLabel = (value?: string | null) => {
  if (!value) return null;
  const key = String(value).toLowerCase();
  return ACTIVITY_LABELS[key] ?? String(value).replace(/_/g, " ");
};

type LayoutWindow = {
  startDate: string | null;
  endDate: string | null;
  unitName?: string | null;
  unitCode?: string | null;
  supervisorId?: string | null;
  supervisorName?: string | null;
  studentIds: string[];
};

type UnitGroup = {
  unitGroupIndex: number;
  label: string | null;
  unitIds: string[];
  windows: LayoutWindow[];
};

type DepartmentGroup = {
  departmentGroupIndex: number;
  name: string | null;
  code: string | null;
  supervisor?: string | null;
  supervisorName?: string | null;
  cohortStudents: string[];
  unitGroups: UnitGroup[];
  weeklySchedule?: Array<{ day: number; activityType: string }>;
};

export type PostingLayoutData = {
  planId: string;
  postings?: Array<{
    postingName: string | null;
    startDate: string | null;
    endDate: string | null;
    departments: DepartmentGroup[];
  }>;
};

interface Props {
  date: Date;
  layout: PostingLayoutData | null;
  loading?: boolean;
  dayTimetable?: schedule | null;
}

const coversDay = (w: LayoutWindow, day: Date) => {
  if (!w.startDate || !w.endDate) return false;
  const start = new Date(w.startDate);
  const end = new Date(w.endDate);
  const d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const d1 = new Date(d0);
  d1.setDate(d1.getDate() + 1);
  return start < d1 && end >= d0;
};

const rangeCoversDay = (
  startDate: string | null,
  endDate: string | null,
  day: Date,
) => {
  if (!startDate || !endDate) return false;
  return coversDay({ startDate, endDate, studentIds: [] }, day);
};

export default function DayGroupsBoard({
  date,
  layout,
  loading,
  dayTimetable,
}: Props) {
  const dayIndex = date.getDay();
  const dayLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const periods = useMemo(() => dayTimetable?.periods ?? [], [dayTimetable]);
  const postings = layout?.postings ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{dayLabel}</p>
          <p className="text-xs text-muted-foreground">
            Department groups with their unit groups, supervisors and
            activities for this day.
          </p>
        </div>
        {loading && (
          <Badge variant="secondary" className="animate-pulse">
            Loading groups…
          </Badge>
        )}
      </div>

      {periods.length > 0 && (
        <div className="rounded-2xl border border-border bg-background p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Class timetable for this day
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {periods.map((period, idx) => (
              <Badge
                key={`${period.startTime}-${idx}`}
                variant="outline"
                className="text-[11px]"
              >
                {period.startTime} – {period.endTime} ·{" "}
                {period.displayLabel ||
                  period.subject?.name ||
                  period.subject?.code ||
                  "Class session"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!loading && postings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
          No clinical posting schedule found for this class. Generate a
          posting schedule first, then its groups will appear here.
        </div>
      )}

      {postings.map((posting) => {
        const postingActive = rangeCoversDay(
          posting.startDate,
          posting.endDate,
          date,
        );
        return (
          <div key={posting.postingName ?? "posting"} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {posting.postingName || "Clinical posting"}
              </p>
              <Badge variant={postingActive ? "secondary" : "outline"}>
                {postingActive ? "Covers this day" : "Outside this day"}
              </Badge>
              {posting.startDate && posting.endDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(posting.startDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  –{" "}
                  {new Date(posting.endDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {posting.departments.map((dept) => {
                const dayActivity = activityLabel(
                  (dept.weeklySchedule ?? []).find(
                    (entry) => Number(entry.day) === dayIndex,
                  )?.activityType,
                );
                const activeUnits = (dept.unitGroups ?? [])
                  .map((unitGroup) => ({
                    unitGroup,
                    window:
                      unitGroup.windows.find((w) => coversDay(w, date)) ??
                      null,
                  }))
                  .filter(
                    (
                      entry: {
                        unitGroup: UnitGroup;
                        window: LayoutWindow | null;
                      },
                    ) => entry.window !== null || entry.unitGroup.windows.length === 0,
                  );

                return (
                  <div
                    key={`${dept.departmentGroupIndex}-${dept.name ?? "dept"}`}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {dept.name || "Department group"}
                          {dept.code ? ` (${dept.code})` : ""}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <UserRound className="h-3 w-3" />
                          {dept.supervisorName || "Supervisor unassigned"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {dept.cohortStudents.length} students
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          {dayActivity || "No activity scheduled"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {activeUnits.length === 0 && (
                        <p className="rounded-xl border border-dashed border-border bg-background p-2 text-xs text-muted-foreground">
                          No unit window covers this day.
                        </p>
                      )}
                      {activeUnits.map(({ unitGroup, window }) => (
                        <div
                          key={`${dept.departmentGroupIndex}-${unitGroup.unitGroupIndex}`}
                          className="rounded-xl border border-border/70 bg-background p-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-medium text-foreground">
                              {unitGroup.label ||
                                window?.unitName ||
                                `Unit group ${unitGroup.unitGroupIndex + 1}`}
                              {window?.unitCode ? ` (${window.unitCode})` : ""}
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              {window?.supervisorName || "Supervisor unassigned"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{window?.studentIds.length ?? 0} students</span>
                            <span>·</span>
                            <span>{dayActivity || "No activity scheduled"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
