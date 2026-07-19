import { differenceInCalendarDays, format } from "date-fns";
import { useEffect, useRef, type FC } from "react";
import type { AcademicClockPhase } from "@/types";
import {
  ACADEMIC_CLOCK_DAYS_PER_MONTH,
  ACADEMIC_CLOCK_PHASES,
  getClockPhaseId,
  normalizePhasePlan,
  type AcademicClockPhaseDefinition,
} from "@/lib/academicClock";

interface JUTHAcademicClockProps {
  startDate: Date;
  currentDate: Date;
  isPaused: boolean;
  currentPhaseId?: AcademicClockPhase | null;
  phasePlan?: AcademicClockPhaseDefinition[];
  onComplete?: () => void;
  institutionName?: string | null;
}

const RADIUS = Math.round(150 * 0.75); // reduced by 25%
const CENTER = 200;
const STROKE_WIDTH = Math.round(32 * 0.75);

const getCoordinatesForPercent = (percent: number) => {
  const x = CENTER + RADIUS * Math.cos(2 * Math.PI * (percent - 0.25));
  const y = CENTER + RADIUS * Math.sin(2 * Math.PI * (percent - 0.25));
  return [x, y];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const getAcademicClockHeading = (institutionName?: string | null) => {
  const trimmedName = institutionName?.trim();
  return `${trimmedName || "Institution"} Class Clocks`;
};

const JUTHAcademicClock: FC<JUTHAcademicClockProps> = ({
  startDate,
  currentDate,
  isPaused,
  currentPhaseId,
  phasePlan,
  onComplete,
  institutionName,
}) => {
  const plan = normalizePhasePlan(phasePlan ?? ACADEMIC_CLOCK_PHASES);
  const completionTriggeredRef = useRef(false);

  const totalMonths = Math.max(1, plan.reduce((s, p) => s + p.durationMonths, 0));
  const totalDays = totalMonths * ACADEMIC_CLOCK_DAYS_PER_MONTH;

  const elapsedDays = clamp(
    differenceInCalendarDays(currentDate, startDate),
    0,
    totalDays,
  );

  const progressMonths = elapsedDays / ACADEMIC_CLOCK_DAYS_PER_MONTH;
  const currentMonth = clamp(progressMonths, 0, totalMonths);
  const currentMonthLabel = Math.max(1, Math.ceil(currentMonth));

  const arcs = plan.reduce(
    (acc, phase) => {
      const startMonths = acc.accumulatedMonths;
      const endMonths = startMonths + phase.durationMonths;
      acc.arcs.push({
        phase,
        startPercent: startMonths / totalMonths,
        endPercent: endMonths / totalMonths,
      });
      acc.accumulatedMonths = endMonths;
      return acc;
    },
    { accumulatedMonths: 0, arcs: [] as Array<{
      phase: (typeof plan)[number];
      startPercent: number;
      endPercent: number;
    }> },
  ).arcs;

  const resolvedPhaseId = currentPhaseId ?? getClockPhaseId(startDate, currentDate, plan as any);
  let currentPhase = plan.find((phase) => phase.id === resolvedPhaseId) ?? plan[plan.length - 1] ?? null;
  let currentPosting = currentPhase?.subPostings?.[0] ?? currentPhase?.name ?? "No posting defined";
  let localMonth = currentMonth;
  let phaseStartMonths = 0;
  let handAngle = 0;

  for (const phase of plan) {
    if (localMonth < phase.durationMonths || phase === plan[plan.length - 1]) {
      currentPhase = phase;
      const subPostings = Array.isArray(phase.subPostings) ? phase.subPostings : [];
      const monthlyStep = subPostings.length > 0 ? phase.durationMonths / subPostings.length : phase.durationMonths;
      const postingIndex = subPostings.length > 0
        ? Math.min(subPostings.length - 1, Math.floor(localMonth / monthlyStep))
        : 0;
      currentPosting = subPostings[postingIndex] ?? phase.name ?? "No posting defined";
      handAngle = ((phaseStartMonths + localMonth) / totalMonths) * 360;
      break;
    }
    localMonth -= phase.durationMonths;
    phaseStartMonths += phase.durationMonths;
  }

  useEffect(() => {
    if (elapsedDays < totalDays) {
      completionTriggeredRef.current = false;
      return;
    }

    if (!onComplete || isPaused || completionTriggeredRef.current) return;

    completionTriggeredRef.current = true;
    onComplete();
  }, [elapsedDays, isPaused, onComplete, totalDays]);

  return (
    <div className="w-full space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col items-center gap-3">
          <div className="relative aspect-square w-full max-w-full">
            <svg viewBox="0 0 400 400" className="h-full w-full text-slate-900 dark:text-slate-100">
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS + STROKE_WIDTH / 2 + 12}
                fill="none"
                stroke="rgba(167, 167, 167, 0.16)"
                strokeWidth="12"
              />
              {arcs.map(({ phase, startPercent, endPercent }) => {
                const [startX, startY] = getCoordinatesForPercent(startPercent);
                const [endX, endY] = getCoordinatesForPercent(endPercent);
                const largeArcFlag = phase.durationMonths / totalMonths > 0.5 ? 1 : 0;
                const pathData = `M ${startX} ${startY} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
                return (
                  <path
                    key={phase.id}
                    d={pathData}
                    fill="none"
                    stroke={phase.color}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="butt"
                  />
                );
              })}
              {[...Array(Math.max(1, totalMonths))].map((_, index) => {
                const angle = 2 * Math.PI * (index / Math.max(1, totalMonths) - 0.25);
                const innerRadius = RADIUS - 18;
                const outerRadius = RADIUS + 18;
                const x1 = CENTER + innerRadius * Math.cos(angle);
                const y1 = CENTER + innerRadius * Math.sin(angle);
                const x2 = CENTER + outerRadius * Math.cos(angle);
                const y2 = CENTER + outerRadius * Math.sin(angle);
                return (
                  <line
                    key={`tick-${index}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={index % 4 === 0 ? "#FFFFFF" : "#000000"}
                    strokeWidth={index % 4 === 0 ? 3 : 1.5}
                    opacity="0.85"
                  />
                );
              })}
              <line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER}
                y2={CENTER - RADIUS + 22}
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                transform={`rotate(${handAngle} ${CENTER} ${CENTER})`}
              />
              <circle cx={CENTER} cy={CENTER} r="26" fill="currentColor" />
              <circle cx={CENTER} cy={CENTER} r="14" fill="#0f0f1a" />
              <text
                x={CENTER}
                y={CENTER + 50}
                textAnchor="middle"
                fontSize="18"
                fontWeight="700"
                fill="currentColor"
              >
                {currentMonthLabel}
              </text>
              <text
                x={CENTER}
                y={CENTER + 65}
                textAnchor="middle"
                fontSize="12"
                fill="currentColor"
                opacity="1"
              >
                / {totalMonths} month{totalMonths === 1 ? "" : "s"}
              </text>
            </svg>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <div className="font-semibold">{getAcademicClockHeading(institutionName)}</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">
                  Clock start
                </div>
                <div className="font-semibold">{format(startDate, "PPP")}</div>
              </div>
              <div>
                <div className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">
                  Elapsed
                </div>
                <div className="font-semibold">{Math.round(elapsedDays)} days</div>
              </div>
              <div>
                <div className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">
                  Phase
                </div>
                <div className="font-semibold">{currentPhase?.name ?? "No active phase"}</div>
              </div>
              <div>
                <div className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">
                  Current posting
                </div>
                <div className="font-semibold">{currentPosting ?? "No posting defined"}</div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plan.map((phase) => (
              <div key={phase.id} className="rounded-2xl border p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-3 w-3" viewBox="0 0 8 8" aria-hidden="true">
                    <circle cx="4" cy="4" r="4" fill={phase.color} />
                  </svg>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {phase.name}
                  </div>
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {phase.durationMonths} month{phase.durationMonths > 1 ? "s" : ""}
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {(phase.subPostings ?? []).join(" • ") || "No postings defined."}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <div className="font-semibold">Clock status</div>
          <p className="mt-2">
            {isPaused ? "Paused for break or review." : "Running live against the selected start date."}
          </p>
          <p className="mt-2 text-[0.85rem] text-slate-500">
            The clock maps each month to a segment of the circle based on the selected class phase plan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JUTHAcademicClock;
