import { differenceInCalendarDays, format } from "date-fns";
import { useEffect, useRef, useState, type FC } from "react";
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

const getCoordinatesForPercent = (percent: number, radiusOverride = RADIUS) => {
  const x = CENTER + radiusOverride * Math.cos(2 * Math.PI * (percent - 0.25));
  const y = CENTER + radiusOverride * Math.sin(2 * Math.PI * (percent - 0.25));
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
  const [hoveredSector, setHoveredSector] = useState<{
    phaseId: AcademicClockPhase;
    monthIndex: number;
    component: string;
  } | null>(null);
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

  const {
    arcs,
    segments: monthlySectors,
  } = plan.reduce(
    (acc, phase) => {
      const startMonths = acc.accumulatedMonths;
      const endMonths = startMonths + phase.durationMonths;
      const components = Array.isArray(phase.subPostings) && phase.subPostings.length > 0
        ? phase.subPostings
        : [phase.name];
      const monthsPerComponent = phase.durationMonths / components.length;
      const shouldRepeatComponents =
        phase.durationMonths > components.length &&
        phase.durationMonths % components.length === 0;

      for (let monthIndex = 0; monthIndex < phase.durationMonths; monthIndex += 1) {
        const componentIndex = shouldRepeatComponents
          ? monthIndex % components.length
          : Math.min(
              components.length - 1,
              Math.floor(monthIndex / monthsPerComponent),
            );
        const component = components[componentIndex] ?? phase.name;
        const segmentStartMonths = startMonths + monthIndex;
        const segmentEndMonths = segmentStartMonths + 1;

        acc.segments.push({
          phase,
          component,
          startPercent: segmentStartMonths / totalMonths,
          endPercent: segmentEndMonths / totalMonths,
          monthIndex,
        });
      }

      acc.arcs.push({
        phase,
        startPercent: startMonths / totalMonths,
        endPercent: endMonths / totalMonths,
      });
      acc.accumulatedMonths = endMonths;
      return acc;
    },
    {
      accumulatedMonths: 0,
      arcs: [] as Array<{
        phase: (typeof plan)[number];
        startPercent: number;
        endPercent: number;
      }>,
      segments: [] as Array<{
        phase: (typeof plan)[number];
        component: string;
        startPercent: number;
        endPercent: number;
        monthIndex: number;
      }>,
    },
  );

  const hoveredSectorData = hoveredSector
    ? monthlySectors.find(
        (sector) => sector.phase.id === hoveredSector.phaseId && sector.monthIndex === hoveredSector.monthIndex,
      )
    : null;

  const currentDisplayPhase = hoveredSector
    ? plan.find((phase) => phase.id === hoveredSector.phaseId) ?? null
    : null;

  const activePhase = currentDisplayPhase ?? plan.find((phase) => phase.id === (currentPhaseId ?? getClockPhaseId(startDate, currentDate, plan as any))) ?? plan[plan.length - 1] ?? null;
  const activePosting = hoveredSector?.component ?? activePhase?.subPostings?.[0] ?? activePhase?.name ?? "No posting defined";

  const thoughtBubblePhase = hoveredSectorData?.phase.name;
  const thoughtBubbleComponent = hoveredSectorData?.component;

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
            {hoveredSectorData ? (
              <>
                <style>{`@keyframes thoughtBubbleFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-3px) scale(1.03); } }`}</style>
                <div className="absolute inset-x-0 top-6 z-10 flex justify-center pointer-events-none">
                  <div className="relative inline-flex w-[min(92%,260px)] items-center justify-center rounded-[1.32rem] border-2 border-slate-200/70 bg-white/95 px-4 py-2.5 text-[0.61rem] text-slate-900 shadow-[0_12px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/90 dark:text-slate-100"
                    style={{ animation: 'thoughtBubbleFloat 3s ease-in-out infinite' }}>
                    <span className="absolute -left-3.5 top-2 h-4 w-4 rounded-full border-2 border-slate-200/70 bg-white/95 dark:border-slate-700/60 dark:bg-slate-950/90" />
                    <span className="absolute -right-4 top-2.5 h-4.5 w-4.5 rounded-full border-2 border-slate-200/70 bg-white/95 dark:border-slate-700/60 dark:bg-slate-950/90" />
                    <span className="absolute -top-3.5 left-1/4 h-4 w-4 rounded-full border-2 border-slate-200/70 bg-white/95 dark:border-slate-700/60 dark:bg-slate-950/90" />
                    <span className="absolute -top-4 right-1/4 h-3.5 w-3.5 rounded-full border-2 border-slate-200/70 bg-white/95 dark:border-slate-700/60 dark:bg-slate-950/90" />
                    <div className="relative flex flex-col items-center gap-0.5 max-w-[min(84%,220px)] text-center">
                      <span className="uppercase tracking-[0.18em] text-[0.53rem] text-slate-500 dark:text-slate-400">
                        {thoughtBubblePhase}
                      </span>
                      <span className="font-semibold leading-tight text-slate-900 dark:text-slate-100 text-[0.61rem]">
                        {thoughtBubbleComponent}
                      </span>
                    </div>
                    <span className="absolute -bottom-2.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-slate-200/70 bg-white/95 dark:border-slate-700/60 dark:bg-slate-950/90" />
                    <span className="absolute -bottom-5 left-[55%] h-2 w-2 -translate-x-1/2 rounded-full border-2 border-slate-200/70 bg-white/95 dark:border-slate-700/60 dark:bg-slate-950/90" />
                    <span className="absolute -bottom-7 left-[52%] h-1.75 w-1.75 -translate-x-1/2 rounded-full border-2 border-slate-200/70 bg-white/95 dark:border-slate-700/60 dark:bg-slate-950/90" />
                  </div>
                </div>
              </>
            ) : null}
            <svg viewBox="0 0 400 400" className="h-full w-full text-slate-900 dark:text-slate-100">
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS + STROKE_WIDTH / 2 + 12}
                fill="none"
                stroke="rgba(167, 167, 167, 0.16)"
                strokeWidth="12"
              />
              {monthlySectors.map(({ phase, component, startPercent, endPercent, monthIndex }) => {
                const [startX, startY] = getCoordinatesForPercent(startPercent);
                const [endX, endY] = getCoordinatesForPercent(endPercent);
                const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
                const pathData = `M ${startX} ${startY} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
                const isHovered = hoveredSector?.phaseId === phase.id && hoveredSector.monthIndex === monthIndex;

                return (
                  <path
                    key={`${phase.id}-month-${monthIndex}`}
                    d={pathData}
                    fill="none"
                    stroke={phase.color}
                    strokeWidth={isHovered ? STROKE_WIDTH + 6 : STROKE_WIDTH}
                    strokeLinecap="butt"
                    strokeOpacity={isHovered ? 1 : 0.75}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredSector({ phaseId: phase.id, monthIndex, component })}
                    onMouseLeave={() => setHoveredSector(null)}
                    onClick={() => {
                      if (hoveredSector?.phaseId === phase.id && hoveredSector.monthIndex === monthIndex) {
                        setHoveredSector(null);
                      } else {
                        setHoveredSector({ phaseId: phase.id, monthIndex, component });
                      }
                    }}
                  />
                );
              })}
              {arcs.slice(1).map((boundary, index) => {
                const angle = 2 * Math.PI * (boundary.startPercent - 0.25);
                const innerRadius = RADIUS - STROKE_WIDTH / 2 - 4;
                const outerRadius = RADIUS + STROKE_WIDTH / 2 + 4;
                const x1 = CENTER + innerRadius * Math.cos(angle);
                const y1 = CENTER + innerRadius * Math.sin(angle);
                const x2 = CENTER + outerRadius * Math.cos(angle);
                const y2 = CENTER + outerRadius * Math.sin(angle);
                return (
                  <line
                    key={`phase-boundary-${index}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#ffffff"
                    strokeWidth="2"
                    opacity="0.9"
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
                <div className="font-semibold">{activePhase?.name ?? currentPhase?.name ?? "No active phase"}</div>
              </div>
              <div>
                <div className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">
                  Current posting
                </div>
                <div className="font-semibold">{activePosting ?? "No posting defined"}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <div className="font-semibold">
              {hoveredSector ? "Hovered month sector preview" : "Hover a month sector"}
            </div>
            <p className="mt-2">
              {hoveredSector
                ? `Previewing ${activePhase?.name}: ${hoveredSector.component}`
                : "Move your cursor over a month sector to reveal the component assigned to that month."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plan.map((phase) => (
              <div
                key={phase.id}
                className={`rounded-2xl border p-4 transition ${hoveredSector?.phaseId === phase.id ? "border-primary bg-slate-50 dark:border-primary/80 dark:bg-slate-950" : "border-slate-200 dark:border-slate-800"}`}
              >
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
