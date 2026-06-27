import { differenceInCalendarDays, format } from "date-fns";
import type { FC } from "react";
import type { AcademicClockPhase } from "@/types";
import {
  ACADEMIC_CLOCK_DAYS_PER_MONTH,
  ACADEMIC_CLOCK_PHASES,
  TOTAL_ACADEMIC_CLOCK_DAYS,
  TOTAL_ACADEMIC_CLOCK_MONTHS,
  getClockPhaseId,
} from "@/lib/academicClock";

interface JUTHAcademicClockProps {
  startDate: Date;
  currentDate: Date;
  isPaused: boolean;
  currentPhaseId?: AcademicClockPhase | null;
}

const RADIUS = 150;
const CENTER = 200;
const STROKE_WIDTH = 32;

const getCoordinatesForPercent = (percent: number) => {
  const x = CENTER + RADIUS * Math.cos(2 * Math.PI * (percent - 0.25));
  const y = CENTER + RADIUS * Math.sin(2 * Math.PI * (percent - 0.25));
  return [x, y];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const JUTHAcademicClock: FC<JUTHAcademicClockProps> = ({
  startDate,
  currentDate,
  isPaused,
  currentPhaseId,
}) => {
  const elapsedDays = clamp(
    differenceInCalendarDays(currentDate, startDate),
    0,
    TOTAL_ACADEMIC_CLOCK_DAYS,
  );

  const progressMonths = elapsedDays / ACADEMIC_CLOCK_DAYS_PER_MONTH;
  const currentMonth = clamp(progressMonths, 0, TOTAL_ACADEMIC_CLOCK_MONTHS);
  const currentMonthLabel = Math.max(1, Math.ceil(currentMonth));

  const arcs = ACADEMIC_CLOCK_PHASES.reduce(
    (acc, phase) => {
      const startMonths = acc.accumulatedMonths;
      const endMonths = startMonths + phase.durationMonths;
      acc.arcs.push({
        phase,
        startPercent: startMonths / TOTAL_ACADEMIC_CLOCK_MONTHS,
        endPercent: endMonths / TOTAL_ACADEMIC_CLOCK_MONTHS,
      });
      acc.accumulatedMonths = endMonths;
      return acc;
    },
    { accumulatedMonths: 0, arcs: [] as Array<{
      phase: (typeof ACADEMIC_CLOCK_PHASES)[number];
      startPercent: number;
      endPercent: number;
    }> },
  ).arcs;

  const resolvedPhaseId = currentPhaseId ?? getClockPhaseId(startDate, currentDate);
  let currentPhase = ACADEMIC_CLOCK_PHASES.find((phase) => phase.id === resolvedPhaseId) ?? ACADEMIC_CLOCK_PHASES[ACADEMIC_CLOCK_PHASES.length - 1];
  let currentPosting = currentPhase.subPostings[0];
  let localMonth = currentMonth;
  let phaseStartMonths = 0;
  let handAngle = 0;

  for (const phase of ACADEMIC_CLOCK_PHASES) {
    if (localMonth < phase.durationMonths || phase === ACADEMIC_CLOCK_PHASES[ACADEMIC_CLOCK_PHASES.length - 1]) {
      currentPhase = phase;
      const monthlyStep = phase.durationMonths / phase.subPostings.length;
      const postingIndex = Math.min(
        phase.subPostings.length - 1,
        Math.floor(localMonth / monthlyStep),
      );
      currentPosting = phase.subPostings[postingIndex] ?? phase.name;
      handAngle = ((phaseStartMonths + localMonth) / TOTAL_ACADEMIC_CLOCK_MONTHS) * 360;
      break;
    }
    localMonth -= phase.durationMonths;
    phaseStartMonths += phase.durationMonths;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-[400px] w-full max-w-[420px]">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS + STROKE_WIDTH / 2 + 12}
                fill="none"
                stroke="rgba(148,167,194,0.16)"
                strokeWidth="12"
              />
              {arcs.map(({ phase, startPercent, endPercent }) => {
                const [startX, startY] = getCoordinatesForPercent(startPercent);
                const [endX, endY] = getCoordinatesForPercent(endPercent);
                const largeArcFlag = phase.durationMonths / TOTAL_ACADEMIC_CLOCK_MONTHS > 0.5 ? 1 : 0;
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
              {[...Array(TOTAL_ACADEMIC_CLOCK_MONTHS)].map((_, index) => {
                const angle = 2 * Math.PI * (index / TOTAL_ACADEMIC_CLOCK_MONTHS - 0.25);
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
                    stroke={index % 4 === 0 ? "#334155" : "#94a3b8"}
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
                stroke="#111827"
                strokeWidth="5"
                strokeLinecap="round"
                transform={`rotate(${handAngle} ${CENTER} ${CENTER})`}
              />
              <circle cx={CENTER} cy={CENTER} r="26" fill="#111827" />
              <circle cx={CENTER} cy={CENTER} r="14" fill="#f8fafc" />
              <text
                x={CENTER}
                y={CENTER - 10}
                textAnchor="middle"
                fontSize="18"
                fontWeight="700"
                fill="#ffffff"
              >
                {currentMonthLabel}
              </text>
              <text
                x={CENTER}
                y={CENTER + 15}
                textAnchor="middle"
                fontSize="11"
                fill="#cbd5e1"
              >
                / 16 months
              </text>
            </svg>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <div className="font-semibold">JUTH 500-Level Clock</div>
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
                <div className="font-semibold">{currentPhase.name}</div>
              </div>
              <div>
                <div className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">
                  Current posting
                </div>
                <div className="font-semibold">{currentPosting}</div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACADEMIC_CLOCK_PHASES.map((phase) => (
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
                  {phase.subPostings.join(" • ")}
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
            The 16-month clock maps every month to 22.5° of the circle.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JUTHAcademicClock;
