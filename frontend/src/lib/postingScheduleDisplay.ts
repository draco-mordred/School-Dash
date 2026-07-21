const OBJECT_ID_PATTERN = /^[0-9a-f]{8,24}$/i;
const GENERIC_LABEL_PATTERN = /^(group|unit|department)(?:\s+group)?\s*\d+$/i;

function isObjectIdLike(value: unknown): boolean {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value.trim());
}

function isGenericLabel(value: unknown): boolean {
  return typeof value === "string" && GENERIC_LABEL_PATTERN.test(value.trim());
}

function toText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function getFallbackDepartmentLabel(index: number) {
  return `Department Group ${index + 1}`;
}

function getFallbackUnitLabel(index: number) {
  return `Unit ${index + 1}`;
}

function getFriendlyLabel(value: unknown, fallback: string) {
  const text = toText(value);
  if (!text) return fallback;
  if (isObjectIdLike(text)) return fallback;
  if (isGenericLabel(text)) return fallback;
  return text;
}

function getStudentLookupKey(student: any): string | null {
  if (!student) return null;
  if (typeof student === "string") {
    return student;
  }
  if (student._id) return String(student._id);
  if (student.id) return String(student.id);
  if (student.userId) return String(student.userId);
  return null;
}

export function normalizeStudentEntry(student: any, studentLookup: any[] = [], fallbackName = "Unnamed student") {
  if (!student) {
    return { _id: undefined, name: fallbackName, idNumber: undefined };
  }

  if (typeof student === "string") {
    const lookupStudent = studentLookup.find((candidate) => getStudentLookupKey(candidate) === student);
    return {
      _id: student,
      name: lookupStudent?.name || lookupStudent?.fullName || fallbackName,
      idNumber: lookupStudent?.idNumber,
    };
  }

  if (typeof student !== "object") {
    return { _id: undefined, name: fallbackName, idNumber: undefined };
  }

  const lookupKey = getStudentLookupKey(student);
  const lookupStudent = lookupKey ? studentLookup.find((candidate) => getStudentLookupKey(candidate) === lookupKey) : null;
  const friendlyName = toText(student.name) || toText(student.fullName) || toText(student.displayName) || lookupStudent?.name || lookupStudent?.fullName || fallbackName;
  const idNumber = toText(student.idNumber) || toText(lookupStudent?.idNumber) || undefined;

  return {
    _id: student._id || student.id || lookupKey || undefined,
    name: friendlyName,
    idNumber,
  };
}

export function normalizeStudents(students: unknown, studentLookup: any[] = []) {
  if (!Array.isArray(students)) return [];
  return students.map((student, index) => normalizeStudentEntry(student, studentLookup, `Student ${index + 1}`));
}

export function normalizePostingGroup(group: any, index: number, studentLookup: any[] = []) {
  const groupData = group?.group || group || {};
  const department = getFriendlyLabel(
    groupData.departmentName || groupData.department?.name || groupData.department?.departmentName || groupData.department,
    getFallbackDepartmentLabel(index)
  );
  const unit = getFriendlyLabel(
    groupData.unitName || groupData.unit?.name || groupData.name || groupData.unit,
    getFallbackUnitLabel(index)
  );
  const phase = toText(groupData.phase) || "Phase 1";
  const supervisorName = toText(groupData.supervisor?.name) || toText(groupData.supervisorName) || toText(group?.supervisor?.name) || "TBD";
  const students = normalizeStudents(groupData.students || groupData.studentIds || [], studentLookup);

  return {
    department,
    unit,
    phase,
    supervisorName,
    students,
  };
}

export function normalizePostingScheduleForDisplay(schedule: any, studentLookup: any[] = []) {
  const posting = schedule?.postings?.[0] || schedule?.posting || schedule || {};
  const groups = Array.isArray(posting.groups) ? posting.groups : Array.isArray(schedule?.groups) ? schedule.groups : [];
  const unitAssignments = groups.map((group: any, index: number) => {
    const normalized = normalizePostingGroup(group, index, studentLookup);
    return {
      department: normalized.department,
      phase: normalized.phase,
      unit: normalized.unit,
      unitId: group?.groupId || group?.group?._id || group?.groupId || `unit-${index}`,
      consultant: { _id: null, name: normalized.supervisorName, role: "supervisor" },
      resident: { _id: null, name: normalized.supervisorName, role: "supervisor" },
      students: normalized.students,
    };
  });

  const studentCategories = [
    {
      category: toText(posting?.name) || toText(schedule?.name) || toText(schedule?.postingName) || "Generated Posting",
      studentCount: unitAssignments.reduce((sum: number, assignment: any) => sum + (assignment.students?.length || 0), 0),
      departmentPhase1: unitAssignments[0]?.department || "Department",
      departmentPhase2: unitAssignments[1]?.department || unitAssignments[0]?.department || "Department",
      students: unitAssignments.flatMap((assignment: any) => assignment.students).slice(0, 50),
    },
  ];

  const nestedSchedule: Record<string, any> = {};
  if (groups.length > 0) {
    const phaseEntry: Record<string, any> = {};
    groups.forEach((group: any, index: number) => {
      const normalized = normalizePostingGroup(group, index, studentLookup);
      const groupKey = index === 0 ? "groupA" : `group${index + 1}`;
      phaseEntry[groupKey] = {
        posting: normalized.department,
        duration: 1,
        units: {
          [normalized.unit]: {
            [normalized.unit]: {
              students: normalized.students,
            },
          },
        },
      };
    });
    nestedSchedule.phase1 = phaseEntry;
  }

  return {
    postingName: toText(posting?.name) || toText(schedule?.name) || toText(schedule?.postingName) || "Posting",
    postingType: toText(posting?.category) || toText(schedule?.postingType) || "OG_PEDS",
    durationWeeks: toText(posting?.durationWeeks) ? Number(posting.durationWeeks) : 16,
    startDate: toText(posting?.startDate) || toText(schedule?.startDate) || new Date().toISOString(),
    endDate: toText(posting?.endDate) || toText(schedule?.endDate) || new Date().toISOString(),
    phases: ["Phase 1", "Phase 2"],
    departments: [],
    studentCategories,
    unitAssignments,
    nestedSchedule,
    rotationHistory: [],
  };
}
