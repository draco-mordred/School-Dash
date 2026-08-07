export interface ClinicalAttendanceGroupOption {
  id: string;
  label: string;
  code: string;
  type: "unit" | "department";
  supervisorId?: string | null;
  supervisorName?: string | null;
  supervisorEmail?: string | null;
  groupIndex?: number | null;
  unitGroupIndex?: number | null;
}

export interface ClinicalAttendanceGroupSelectionResult {
  usesUnits: boolean;
  groups: ClinicalAttendanceGroupOption[];
  activePhase?: {
    phaseIndex?: number | null;
    phaseName?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  } | null;
}

const normalizeDate = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isDateWithinPhase = (date: Date, phase: any) => {
  const startDate = normalizeDate(phase?.startDate);
  const endDate = normalizeDate(phase?.endDate);
  if (!startDate || !endDate) {
    return false;
  }
  return date >= startDate && date <= endDate;
};

const normalizeIdentityValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "object") {
    return String((value as any).toString ? (value as any).toString() : value).trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
};

const currentUserMatchesSupervisor = (currentUser: unknown, supervisorValues: Array<unknown>) => {
  if (!currentUser) return false;

  const knownValues = new Set<string>();
  const addValue = (value: unknown) => {
    const normalized = normalizeIdentityValue(value as string);
    if (normalized) {
      knownValues.add(normalized);
    }
  };

  if (typeof currentUser === "string") {
    addValue(currentUser);
  } else if (currentUser && typeof currentUser === "object") {
    const currentUserRecord = currentUser as Record<string, any>;
    addValue(currentUserRecord._id);
    addValue(currentUserRecord.id);
    addValue(currentUserRecord.name);
    addValue(currentUserRecord.email);
  }

  if (knownValues.size === 0) return false;

  return supervisorValues.some((value) => {
    const normalized = normalizeIdentityValue(value as string);
    return normalized && knownValues.has(normalized);
  });
};

export const getAvailableClinicalAttendanceGroupsForPosting = (
  posting: any,
  schedule: any,
  today: Date = new Date(),
  currentUser?: string | Record<string, any> | null
): ClinicalAttendanceGroupSelectionResult => {
  const phases = Array.isArray(schedule?.meta?.phases) ? schedule.meta.phases : [];
  const activePhase = phases.find((phase: any) => isDateWithinPhase(today, phase)) || phases[0] || null;

  const windows = [
    ...(Array.isArray(posting?.meta?.timeline) ? posting.meta.timeline : []),
    ...(Array.isArray(posting?.meta?.windows) ? posting.meta.windows : []),
    ...(Array.isArray(schedule?.meta?.timeline) ? schedule.meta.timeline : []),
    ...(Array.isArray(schedule?.meta?.windows) ? schedule.meta.windows : []),
  ];
  const activePhaseWindows = activePhase
    ? windows.filter((window: any) => Number(window?.phaseIndex ?? 0) === Number(activePhase.phaseIndex ?? 0))
    : windows;

  const usesUnits = activePhaseWindows.some((window: any) => Boolean(window?.unitName || window?.unitId || window?.unitGroupLabel || window?.unitCode || window?.unitID));

  const groups: ClinicalAttendanceGroupOption[] = [];
  const seen = new Set<string>();

  const addGroup = (option: ClinicalAttendanceGroupOption) => {
    const key = `${option.type}:${option.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    const supervisorValues = [
      option.supervisorId,
      option.supervisorName,
      option.supervisorEmail,
    ];

    if (!currentUser) {
      groups.push(option);
      return;
    }

    const matchesSupervisor = currentUserMatchesSupervisor(currentUser, supervisorValues);
    if (matchesSupervisor) {
      groups.push(option);
    }
  };

  if (activePhaseWindows.length > 0) {
    activePhaseWindows.forEach((window: any, index: number) => {
      const hasUnitInfo = Boolean(window?.unitName || window?.unitId || window?.unitGroupLabel || window?.unitCode || window?.unitID);
      const groupIndex = window?.departmentGroupIndex ?? window?.unitGroupIndex ?? index;
      const label = hasUnitInfo
        ? (window?.unitGroupLabel || window?.unitName || `Unit Group ${Number(window?.unitGroupIndex ?? 0) + 1}`)
        : (window?.departmentGroupLabel || window?.departmentName || window?.departmentCode || `Department Group ${Number(groupIndex ?? 0) + 1}`);
      const code = window?.departmentCode || window?.unitCode || window?.unitGroupLabel || window?.unitName || label;
      addGroup({
        id: hasUnitInfo ? `unit:${groupIndex}` : `department:${groupIndex}`,
        label,
        code,
        type: hasUnitInfo ? "unit" : "department",
        supervisorId: window?.supervisorId || window?.departmentSupervisorId || null,
        supervisorName: window?.supervisorName || window?.departmentSupervisorName || null,
        supervisorEmail: window?.supervisorEmail || window?.departmentSupervisorEmail || null,
        groupIndex: window?.departmentGroupIndex ?? null,
        unitGroupIndex: window?.unitGroupIndex ?? null,
      });
    });
  }

  if (groups.length === 0) {
    const postingGroups = Array.isArray(posting?.groups) ? posting.groups : [];
    postingGroups.forEach((group: any, index: number) => {
      const groupData = group?.group || group || {};
      const label = groupData?.name || groupData?.label || `Department Group ${index + 1}`;
      addGroup({
        id: `department:${index}`,
        label,
        code: label,
        type: "department",
        supervisorId: group?.departmentSupervisor || group?.supervisor || null,
        supervisorName: group?.departmentSupervisorName || group?.supervisorName || null,
        supervisorEmail: group?.departmentSupervisorEmail || group?.supervisorEmail || null,
        groupIndex: index,
      });
    });
  }

  return {
    usesUnits,
    groups,
    activePhase: activePhase
      ? {
          phaseIndex: activePhase.phaseIndex ?? null,
          phaseName: activePhase.phaseName ?? activePhase.phaseLabel ?? null,
          startDate: activePhase.startDate ?? null,
          endDate: activePhase.endDate ?? null,
        }
      : null,
  };
};
