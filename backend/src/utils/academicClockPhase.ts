export interface AcademicClockPhaseEntry {
  id: string;
  name: string;
  duration: number;
  config: Record<string, any>;
  startsAt: Date;
  endsAt: Date;
}

export interface AcademicClockPhaseResolution {
  phaseId: string | null;
  phase: Record<string, any> | null;
  startsAt: Date | null;
  endsAt: Date | null;
}

const DAYS_PER_CLOCK_MONTH = 30;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export const phaseRequiresPostingSchedule = (phase: Record<string, any> | null | undefined) => {
  if (typeof phase?.requiresPostingSchedule === "boolean") {
    return phase.requiresPostingSchedule;
  }
  if (phase?.postingType) return true;

  const phaseDescription = [phase?.name, ...(Array.isArray(phase?.subPostings) ? phase.subPostings : [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /clinical|posting|rotation|ward|medicine|surgery|pediatr|obstetric|gyn|specialty|pathology|elective|hospital|peds|o&g|pae/.test(phaseDescription);
};

const getPhaseEntries = (phaseConfig: unknown) => {
  if (!phaseConfig || typeof phaseConfig !== "object") return [];
  if (Array.isArray(phaseConfig)) {
    return phaseConfig.map((phase: any, index) => [
      String(phase?.id ?? `phase${index + 1}`),
      phase,
    ] as const);
  }

  return Object.entries(phaseConfig as Record<string, any>);
};

export const hasConfiguredAcademicClockPhases = (phaseConfig: unknown) =>
  getPhaseEntries(phaseConfig).length > 0;

export const resolveAcademicClockPhase = (
  clock: {
    clockStartDate?: Date | string | null;
    clockPausedAt?: Date | string | null;
    clockIsPaused?: boolean;
    clockPhase?: string | null;
    phaseConfig?: unknown;
  },
  at = new Date(),
): AcademicClockPhaseResolution => {
  const phases = getPhaseEntries(clock.phaseConfig)
    .map(([id, config]) => ({
      id,
      name: String(config?.name ?? id),
      duration: Number(config?.duration ?? config?.durationMonths ?? 0),
      config: config as Record<string, any>,
    }))
    .filter((phase) => Number.isFinite(phase.duration) && phase.duration > 0);

  const startDate = clock.clockStartDate
    ? new Date(clock.clockStartDate)
    : null;
  if (!startDate || Number.isNaN(startDate.getTime()) || phases.length === 0) {
    const phaseId = clock.clockPhase ?? phases[0]?.id ?? null;
    const fallback = phases.find((phase) => phase.id === phaseId) ?? null;
    return {
      phaseId,
      phase: fallback?.config ?? null,
      startsAt: null,
      endsAt: null,
    };
  }

  const effectiveDate =
    clock.clockIsPaused && clock.clockPausedAt
      ? new Date(clock.clockPausedAt)
      : at;
  let cursor = startDate;
  const entries: AcademicClockPhaseEntry[] = phases.map((phase) => {
    const startsAt = cursor;
    const endsAt = new Date(
      startsAt.getTime() +
        phase.duration * DAYS_PER_CLOCK_MONTH * millisecondsPerDay,
    );
    cursor = endsAt;
    return { ...phase, startsAt, endsAt };
  });

  const active =
    entries.find(
      (phase) =>
        effectiveDate >= phase.startsAt && effectiveDate < phase.endsAt,
    ) ??
    (effectiveDate < entries[0].startsAt
      ? entries[0]
      : entries[entries.length - 1]);

  return {
    phaseId: active.id,
    phase: active.config,
    startsAt: active.startsAt,
    endsAt: active.endsAt,
  };
};

// Resolve a SPECIFIC phase's window by id (does not depend on "now").
// Returns null when the clock has no start date, no valid phases, or the
// requested phaseId does not match any configured phase.
export const resolveClockPhaseWindowById = (
  clock: {
    clockStartDate?: Date | string | null;
    phaseConfig?: unknown;
  },
  phaseId: string | null | undefined,
): AcademicClockPhaseEntry | null => {
  if (!phaseId) return null;
  const phases = getPhaseEntries(clock.phaseConfig)
    .map(([id, config]) => ({
      id,
      name: String(config?.name ?? id),
      duration: Number(config?.duration ?? config?.durationMonths ?? 0),
      config: config as Record<string, any>,
    }))
    .filter((phase) => Number.isFinite(phase.duration) && phase.duration > 0);
  const startDate = clock.clockStartDate
    ? new Date(clock.clockStartDate)
    : null;
  if (!startDate || Number.isNaN(startDate.getTime()) || phases.length === 0) {
    return null;
  }
  let cursor = startDate;
  for (const phase of phases) {
    const startsAt = cursor;
    const endsAt = new Date(
      startsAt.getTime() +
        phase.duration * DAYS_PER_CLOCK_MONTH * millisecondsPerDay,
    );
    if (phase.id === String(phaseId)) {
      return { ...phase, startsAt, endsAt };
    }
    cursor = endsAt;
  }
  return null;
};
