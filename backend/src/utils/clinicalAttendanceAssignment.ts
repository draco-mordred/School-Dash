export interface StudentClinicalAssignment {
  classId: string;
  scheduleId: string;
  postingId: string;
  postingName: string;
  groupId: string;
  groupLabel: string;
  groupType: "unit" | "department";
  departmentName: string;
  unitName: string;
  supervisorId: string | null;
  supervisorName: string;
  supervisorEmail: string;
  studentIds: string[];
  startDate: Date;
  endDate: Date;
}

export interface ClinicalAttendancePhaseContext {
  configured: boolean;
  phaseId: string | null;
  phaseName: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  postingRequired: boolean;
  postingScheduleId: string | null;
  postingName: string | null;
}

export const isPostingInAcademicClockPhase = (
  scheduleId: string,
  postingId: string,
  postingName: string,
  phase: ClinicalAttendancePhaseContext
) => {
  if (!phase.configured) return true;
  if (!phase.postingRequired || (!phase.postingScheduleId && !phase.postingName)) return false;

  const normalize = (value: string | null | undefined) => String(value ?? "").trim().toLowerCase();
  const matchesReference = phase.postingScheduleId === scheduleId ||
    phase.postingScheduleId === postingId;
  const matchesName = !phase.postingName || normalize(postingName) === normalize(phase.postingName);
  return matchesReference && matchesName;
};

export const filterAssignmentsToAcademicClockPhase = (
  assignments: readonly StudentClinicalAssignment[],
  phase: ClinicalAttendancePhaseContext
) => {
  if (!phase.configured) return [...assignments];
  return assignments.filter((assignment) => {
    return isPostingInAcademicClockPhase(
      assignment.scheduleId,
      assignment.postingId,
      assignment.postingName,
      phase
    );
  });
};

const toDate = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const idOf = (value: unknown) => {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directId = record._id ?? record.id;
    if (directId !== undefined && directId !== null) return String(directId);
    const stringValue = String(value);
    return stringValue === "[object Object]" ? "" : stringValue;
  }
  return value === null || value === undefined ? "" : String(value);
};

const rosterIds = (values: unknown) => Array.isArray(values)
  ? values.map(idOf).filter(Boolean)
  : [];

const isActive = (startValue: unknown, endValue: unknown, at: Date) => {
  const start = toDate(startValue);
  const end = toDate(endValue);
  return Boolean(start && end && start <= at && at < end);
};

const supervisorDetails = (group: any, window: any) => {
  const supervisor = group?.supervisor ?? group?.group?.supervisor ?? {};
  return {
    id: idOf(window?.departmentSupervisorId ?? window?.supervisorId ?? group?.departmentSupervisor ?? group?.supervisorId ?? group?.supervisor ?? supervisor?._id) || null,
    name: String(window?.departmentSupervisorName ?? window?.supervisorName ?? group?.departmentSupervisorName ?? group?.supervisorName ?? supervisor?.name ?? ""),
    email: String(window?.departmentSupervisorEmail ?? window?.supervisorEmail ?? group?.departmentSupervisorEmail ?? group?.supervisorEmail ?? supervisor?.email ?? ""),
  };
};

const matchesPostingWindow = (window: any, posting: any, postingCount: number) => {
  const postingReference = String(window?.postingId ?? window?.postingName ?? window?.posting ?? "").trim();
  if (!postingReference) return postingCount === 1;
  return [posting?._id, posting?.name].some((value) => String(value ?? "") === postingReference);
};

export const resolveStudentClinicalAssignments = (
  schedules: readonly any[],
  studentId: string,
  at = new Date(),
  phase?: ClinicalAttendancePhaseContext
): StudentClinicalAssignment[] => {
  const assignments: StudentClinicalAssignment[] = [];
  const normalizedStudentId = String(studentId);

  for (const schedule of schedules) {
    const classId = idOf(schedule?.class);
    const postings = Array.isArray(schedule?.postings) ? schedule.postings : [];
    const timeline = [
      ...(Array.isArray(schedule?.meta?.timeline) ? schedule.meta.timeline : []),
      ...postings.flatMap((posting: any) => Array.isArray(posting?.meta?.timeline) ? posting.meta.timeline : []),
    ];

    postings.forEach((posting: any, postingIndex: number) => {
      const scheduleId = idOf(schedule?._id);
      const postingId = idOf(posting?._id) || `${scheduleId}:${postingIndex}`;
      const postingName = String(posting?.name ?? schedule?.name ?? "Clinical posting");
      const mappedToClockPhase = Boolean(phase?.configured && isPostingInAcademicClockPhase(
        scheduleId,
        postingId,
        postingName,
        phase
      ));
      const postingStart = mappedToClockPhase && phase?.startsAt
        ? phase.startsAt
        : toDate(posting?.startDate ?? schedule?.startDate);
      const postingEnd = mappedToClockPhase && phase?.endsAt
        ? phase.endsAt
        : toDate(posting?.endDate ?? schedule?.endDate);
      const groups = Array.isArray(posting?.groups) ? posting.groups : [];
      const activeTimelineExists = timeline.some((window: any) =>
        matchesPostingWindow(window, posting, postings.length) && isActive(window?.startDate, window?.endDate, at)
      );
      const activeGroupAssignmentExists = groups.some((group: any) =>
        (Array.isArray(group?.assigned) ? group.assigned : []).some((window: any) => isActive(window?.startDate, window?.endDate, at))
      );
      const postingIsActive = mappedToClockPhase
        ? true
        : postingStart && postingEnd
        ? postingStart <= at && at < postingEnd
        : activeTimelineExists || activeGroupAssignmentExists;
      if (!postingIsActive) return;

      const groupMatches = groups.flatMap((group: any, groupIndex: number) => {
        const data = group?.group ?? group ?? {};
        const students = rosterIds(data?.students ?? group?.students);
        if (!students.includes(normalizedStudentId)) return [];

        const assigned = Array.isArray(group?.assigned) ? group.assigned : [];
        const activeAssignment = assigned.find((window: any) => isActive(window?.startDate, window?.endDate, at));
        if (assigned.length > 0 && !activeAssignment) return [];

        const window = timeline.find((entry: any) => {
          const entryHasUnitInfo = Boolean(entry?.unitName || entry?.unitId || entry?.unitGroupLabel);
          const entryGroupIndex = entryHasUnitInfo
            ? entry?.unitGroupIndex ?? entry?.departmentGroupIndex ?? groupIndex
            : entry?.departmentGroupIndex ?? entry?.groupIndex ?? groupIndex;
          return matchesPostingWindow(entry, posting, postings.length) &&
            Number(entryGroupIndex) === groupIndex &&
            (!entry?.startDate || !entry?.endDate || isActive(entry.startDate, entry.endDate, at));
        });
        const unitName = String(window?.unitName ?? data?.unitName ?? data?.unit?.name ?? "");
        const departmentName = String(window?.departmentName ?? data?.departmentName ?? data?.department ?? "");
        const supervisor = supervisorDetails(group, window);
        const teamIndex = Number(unitName || window?.unitId
          ? window?.unitGroupIndex ?? window?.departmentGroupIndex ?? groupIndex
          : window?.departmentGroupIndex ?? groupIndex);
        const startDate = toDate(activeAssignment?.startDate) ?? postingStart ?? new Date(at.getFullYear(), at.getMonth(), at.getDate());
        const endDate = toDate(activeAssignment?.endDate) ?? postingEnd ?? new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        return [{
          classId,
          scheduleId: idOf(schedule?._id),
          postingId,
          postingName,
          groupId: `${unitName || window?.unitId ? "unit" : "department"}:${teamIndex}`,
          groupLabel: String(window?.unitGroupLabel || window?.departmentGroupLabel || data?.name || data?.label || unitName || departmentName || `Group ${groupIndex + 1}`),
          groupType: unitName || window?.unitId ? "unit" as const : "department" as const,
          departmentName,
          unitName,
          supervisorId: supervisor.id,
          supervisorName: supervisor.name,
          supervisorEmail: supervisor.email,
          studentIds: students,
          startDate,
          endDate,
        }];
      });

      assignments.push(...groupMatches);

      for (const [windowIndex, window] of timeline.entries()) {
        if (!matchesPostingWindow(window, posting, postings.length)) continue;
        if (!isActive(window?.startDate, window?.endDate, at)) continue;
        const students = rosterIds(window?.studentIds);
        if (!students.includes(normalizedStudentId)) continue;
        const isUnitWindow = Boolean(window?.unitName || window?.unitId || window?.unitGroupLabel);
        const groupIndex = Number(isUnitWindow
          ? window?.unitGroupIndex ?? window?.departmentGroupIndex ?? windowIndex
          : window?.departmentGroupIndex ?? window?.groupIndex ?? windowIndex);
        const group = groups[groupIndex] ?? {};
        const data = group?.group ?? group ?? {};
        const unitName = String(window?.unitName ?? "");
        const departmentName = String(window?.departmentName ?? window?.department ?? "");
        const supervisor = supervisorDetails(group, window);

        assignments.push({
          classId,
          scheduleId: idOf(schedule?._id),
          postingId,
          postingName,
          groupId: `${isUnitWindow ? "unit" : "department"}:${groupIndex}`,
          groupLabel: String(window?.unitGroupLabel || window?.departmentGroupLabel || unitName || departmentName || data?.name || `Group ${groupIndex + 1}`),
          groupType: unitName || window?.unitId ? "unit" : "department",
          departmentName,
          unitName,
          supervisorId: supervisor.id,
          supervisorName: supervisor.name,
          supervisorEmail: supervisor.email,
          studentIds: students,
          startDate: toDate(window?.startDate) as Date,
          endDate: toDate(window?.endDate) as Date,
        });
      }
    });
  }

  const unique = new Map<string, StudentClinicalAssignment>();
  for (const assignment of assignments) {
    unique.set(`${assignment.scheduleId}:${assignment.postingId}:${assignment.groupId}`, assignment);
  }
  return [...unique.values()];
};