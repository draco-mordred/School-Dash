const departmentNameLookup: Record<string, string> = {
  MED: "Medicine",
  SUR: "Surgery",
  PAE: "Pediatrics",
  OBG: "Obstetrics and Gynecology",
  PSY: "Psychiatry",
  ORL: "ENT",
  RAD: "Radiology",
  OPH: "Ophthalmology",
  DER: "Dermatology",
};

const departmentDisplayNameLookup: Record<string, string> = {
  MED: "Department of Medicine",
  SUR: "Department of Surgery",
  PAE: "Department of Pediatrics",
  OBG: "Department of Obstetrics and Gynecology",
  PSY: "Department of Psychiatry",
  ORL: "Department of ENT",
  RAD: "Department of Radiology",
  OPH: "Department of Ophthalmology",
  DER: "Department of Dermatology",
};

export function getDepartmentName(departmentId?: string | null) {
  if (!departmentId) {
    return "Department";
  }

  return departmentNameLookup[departmentId] || departmentId;
}

export function getDepartmentDisplayName(
  departmentId?: string | null,
  departmentName?: string | null,
  departmentCode?: string | null,
) {
  const code = departmentCode || (typeof departmentId === 'string' && departmentId.length <= 5 ? departmentId : undefined);
  const nameFromValue = departmentName || (code ? departmentDisplayNameLookup[code] : undefined) || (departmentId ? departmentNameLookup[departmentId] || departmentId : "Department");

  if (code && typeof nameFromValue === 'string' && !nameFromValue.includes(`(${code})`)) {
    return `${nameFromValue} (${code})`;
  }

  return nameFromValue;
}

function looksLikeObjectId(value: unknown) {
  return typeof value === 'string' && (/^[a-f0-9]{24}$/i.test(value.trim()) || /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.trim()));
}

function getFriendlyUnitName(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) {
    if (looksLikeObjectId(value.trim())) {
      return fallback;
    }
    return value.trim();
  }
  return fallback;
}

export function formatWindowDuration(startDate?: string | Date | null, endDate?: string | Date | null) {
  if (!startDate || !endDate) {
    return "Duration pending";
  }

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Duration pending";
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.round(diffMs / 86_400_000));
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export function getReferenceDisplayName(value: unknown, lookup: Record<string, string | undefined> = {}, fallback = "Unknown") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    const looksLikeObjectId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed) || /^[a-f0-9]{24}$/i.test(trimmed);
    const looksLikeIdentifier = looksLikeObjectId || trimmed.includes("-") || trimmed.includes("_") || trimmed.includes(":") || trimmed.length >= 20;
    if (looksLikeIdentifier) {
      return lookup[trimmed] || fallback;
    }

    return lookup[trimmed] || trimmed;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directName = [record.name, record.fullName, record.displayName, record.title].find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);

    if (directName) {
      return directName;
    }

    const objectId = [record._id, record.id].find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
    if (objectId && lookup[objectId]) {
      return lookup[objectId];
    }
  }

  return fallback;
}

export function buildTimelineWindowView(schedule: any, window: any, index: number, studentId?: string) {
  const studentIds = Array.isArray(window?.studentIds) ? window.studentIds : [];
  const matchesStudent = studentId ? studentIds.some((entry: any) => String(entry) === String(studentId)) : true;
  const startDate = window?.startDate ? new Date(window.startDate) : null;
  const endDate = window?.endDate ? new Date(window.endDate) : null;
  const now = new Date();
  const status = startDate && endDate ? (startDate > now ? "upcoming" : endDate < now ? "completed" : "current") : "pending";

  const departmentSource = window?.department || window?.departmentInfo || null;
  const unitSource = window?.unit || window?.unitInfo || null;
  const unitGroupSource = window?.unitGroup || window?.unitGroupInfo || null;

  const departmentName = getDepartmentDisplayName(
    window?.departmentId ?? departmentSource?.departmentId ?? departmentSource?.id ?? null,
    window?.departmentName ?? departmentSource?.name ?? null,
    window?.departmentCode ?? departmentSource?.code ?? null,
  );
  const defaultUnitLabel = `Unit ${Number(window?.unitGroupIndex ?? 0) + 1}`;
  const unitNameValue = getFriendlyUnitName(
    window?.unitName ?? unitSource?.name ?? unitSource?.unitName ?? null,
    getFriendlyUnitName(window?.unitId ?? unitSource?.id ?? unitSource?.unitId ?? unitSource?.unitID ?? null, defaultUnitLabel),
  );
  const unitGroupName = getFriendlyUnitName(
    window?.unitGroupName ?? unitGroupSource?.name ?? unitGroupSource?.unitGroupName ?? null,
    null,
  );
  const unitGroupLabel = unitGroupName
    ? unitGroupName
    : window?.unitId && unitNameValue && unitNameValue !== defaultUnitLabel
      ? `${unitNameValue} (${window.unitId})`
      : unitNameValue;
  const phaseLabel = typeof window?.phaseLabel === 'string'
    ? window.phaseLabel
    : typeof window?.phaseName === 'string'
      ? window.phaseName
      : `Phase ${Number(window?.phaseIndex ?? window?.departmentIndex ?? 0) + 1}`;
  const phaseDurationLabel = typeof window?.phaseDurationLabel === 'string' && window.phaseDurationLabel.trim()
    ? window.phaseDurationLabel
    : typeof window?.phaseDurationWeeks === 'number' && Number.isFinite(window.phaseDurationWeeks)
      ? `${window.phaseDurationWeeks} week${window.phaseDurationWeeks === 1 ? '' : 's'}`
      : typeof window?.phaseDurationDays === 'number' && Number.isFinite(window.phaseDurationDays)
        ? `${Math.max(1, Math.ceil(window.phaseDurationDays / 7))} week${Math.max(1, Math.ceil(window.phaseDurationDays / 7)) === 1 ? '' : 's'}`
        : 'Phase duration pending';
  const departmentGroupLabel = typeof window?.departmentGroupLabel === 'string'
    ? window.departmentGroupLabel
    : `Department Group ${Number(window?.departmentGroupIndex ?? 0) + 1}`;

  return {
    id: `${schedule?._id ?? "schedule"}-${index}`,
    postingName: schedule?.postings?.[0]?.name || schedule?.name || "Posting schedule",
    phaseIndex: typeof window?.phaseIndex === 'number' ? window.phaseIndex : Number(window?.departmentIndex ?? 0),
    phaseLabel,
    phaseDurationLabel,
    departmentName,
    departmentGroupLabel,
    unitGroupLabel,
    unitName: unitNameValue,
    unitId: window?.unitId ?? unitSource?.id ?? unitSource?.unitId ?? unitSource?.unitID ?? null,
    startDate,
    endDate,
    status,
    durationLabel: formatWindowDuration(window?.startDate, window?.endDate),
    studentCount: studentIds.length,
    studentIds,
    matchesStudent,
    supervisorName: window?.supervisorName || (window?.supervisorId ? String(window.supervisorId) : "Unassigned"),
    departmentSupervisorName: window?.departmentSupervisorName || window?.departmentSupervisor?.name || null,
    departmentSpin: window?.departmentSpin ?? window?.group?.departmentSpin ?? window?.department?.departmentSpin ?? null,
    spin: window?.spin ?? window?.group?.spin ?? null,
    rawWindow: window,
  };
}
