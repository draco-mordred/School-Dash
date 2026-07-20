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

export function getDepartmentName(departmentId?: string | null) {
  if (!departmentId) {
    return "Department";
  }

  return departmentNameLookup[departmentId] || departmentId;
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

function normalizeGroupStudents(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry) => entry !== undefined && entry !== null);
}

function extractGroupStudents(schedule: any, window: any) {
  const groupIndex = window?.departmentGroupIndex ?? window?.groupIndex ?? 0;
  const groupEntry = schedule?.groups?.[groupIndex] ?? schedule?.postings?.[0]?.groups?.[groupIndex];

  const candidates = [
    groupEntry?.group?.students,
    groupEntry?.group?.studentIds,
    groupEntry?.students,
    groupEntry?.studentIds,
    window?.groupStudents,
    window?.students,
    window?.studentIds,
    window?.group?.students,
    window?.group?.studentIds,
    window?.group?.group?.students,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeGroupStudents(candidate);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
}

export function buildTimelineWindowView(schedule: any, window: any, index: number, studentId?: string) {
  const studentIds = Array.isArray(window?.studentIds) ? window.studentIds : [];
  const matchesStudent = studentId ? studentIds.some((entry: any) => String(entry) === String(studentId)) : true;
  const startDate = window?.startDate ? new Date(window.startDate) : null;
  const endDate = window?.endDate ? new Date(window.endDate) : null;
  const now = new Date();
  const status = startDate && endDate ? (startDate > now ? "upcoming" : endDate < now ? "completed" : "current") : "pending";
  const groupStudents = extractGroupStudents(schedule, window);

  return {
    id: `${schedule?._id ?? "schedule"}-${index}`,
    postingName: schedule?.postings?.[0]?.name || schedule?.name || "Posting schedule",
    departmentName: getDepartmentName(window?.departmentId),
    departmentGroupLabel: `Department Group ${Number(window?.departmentGroupIndex ?? 0) + 1}`,
    unitGroupLabel: `Unit Group ${Number(window?.unitGroupIndex ?? 0) + 1}`,
    unitName: window?.unitId || `Unit ${Number(window?.unitGroupIndex ?? 0) + 1}`,
    startDate,
    endDate,
    status,
    durationLabel: formatWindowDuration(window?.startDate, window?.endDate),
    studentCount: groupStudents.length > 0 ? groupStudents.length : studentIds.length,
    studentIds,
    groupStudents,
    matchesStudent,
    phaseId: window?.phaseId ?? schedule?.phaseId ?? null,
    phaseName: window?.phaseName ?? schedule?.phaseName ?? null,
    supervisorName: window?.supervisorName || (window?.supervisorId ? String(window.supervisorId) : "Unassigned"),
    rawWindow: window,
  };
}

export function selectStudentPostingWindow<T extends { status?: string; phaseId?: string | null }>(windows: T[], activePhaseId?: string | null) {
  const phaseMatchingWindows = activePhaseId
    ? windows.filter((window) => !window.phaseId || window.phaseId === activePhaseId)
    : windows;

  return phaseMatchingWindows.find((window) => window.status === "current")
    || phaseMatchingWindows.find((window) => window.status === "upcoming")
    || windows[0]
    || null;
}
