import mongoose from "mongoose";
import ClassModel from "../models/classes";
import User from "../models/user";
import Unit from "../models/units";
import { DEPARTMENT_UNITS, DepartmentName } from "../constants/departments";
import type { DepartmentUnitEntry } from "../constants/departments";

export interface ScheduleStudent {
  _id: string;
  name: string;
  idNumber?: string;
  department?: string;
}

export interface SupervisorSummary {
  _id: string | null;
  name: string;
  role: string;
  email?: string;
  department?: string;
}

export interface RotationBlock {
  unit: string;
  unitId: string;
  consultant: SupervisorSummary;
  resident: SupervisorSummary;
  startDate: string;
  endDate: string;
  weeks: string;
  completed: boolean;
}

export interface StudentHistoryRecord {
  student: ScheduleStudent;
  department: string;
  phase: string;
  blocks: RotationBlock[];
}

export interface DepartmentSchedule {
  department: string;
  departmentCode: string;
  rotationDurationWeeks: number;
  activeUnits: { id: string; name: string }[];
  reserveUnits: { id: string; name: string }[];
  supervisors: {
    unit: string;
    consultant: SupervisorSummary;
    resident: SupervisorSummary;
  }[];
}

export interface PostingSchedule {
  postingName: string;
  postingType: string;
  durationWeeks: number;
  startDate: string;
  endDate: string;
  phases: string[];
  departments: DepartmentSchedule[];
  studentCategories: {
    category: string;
    studentCount: number;
    departmentPhase1: string;
    departmentPhase2: string;
    students: ScheduleStudent[];
  }[];
  unitAssignments: {
    department: string;
    phase: string;
    unit: string;
    unitId: string;
    consultant: SupervisorSummary;
    resident: SupervisorSummary;
    students: ScheduleStudent[];
  }[];
  rotationTeams: {
    department: string;
    phase: string;
    unit: string;
    unitId: string;
    consultant: SupervisorSummary;
    resident: SupervisorSummary;
    students: ScheduleStudent[];
  }[];
  rotationTimeline: {
    phase: string;
    department: string;
    category: string;
    weeks: string;
    units: {
      unit: string;
      unitId: string;
      startDate: string;
      endDate: string;
      consultant: SupervisorSummary;
      resident: SupervisorSummary;
      students: ScheduleStudent[];
    }[];
  }[];
  rotationHistory: StudentHistoryRecord[];
  nestedSchedule: {
    phase1: {
      groupA: NestedGroupSchedule;
      groupB: NestedGroupSchedule;
    };
    phase2: {
      groupA: NestedGroupSchedule;
      groupB: NestedGroupSchedule;
    };
  };
}

export interface NestedUnitSchedule {
  name: string;
  unitId: string;
  duration: number;
  postingType: string;
  students: ScheduleStudent[];
  supervisor: SupervisorSummary;
}

export interface NestedGroupSchedule {
  posting: string;
  duration: number;
  totalNumberofUnitsPerStudent: number;
  units: Record<string, Record<string, NestedUnitSchedule>>;
}

export interface NestedPhaseSchedule {
  groupA: NestedGroupSchedule;
  groupB: NestedGroupSchedule;
}

type AssignmentRecord = {
  groupName: string;
  student: ScheduleStudent;
  phase: string;
  department: string;
  units: { id: string; name: string }[];
  history: StudentHistoryRecord[];
};

interface RotationBlockTemplate {
  weeks: string;
  offsetWeeks: number;
  durationWeeks: number;
}

const OBG_DEPARTMENT = DepartmentName.obstetricsAndGynecology;
const PAE_DEPARTMENT = DepartmentName.pediatrics;

const departmentPhases: Partial<Record<DepartmentName, RotationBlockTemplate[]>> = {
  [OBG_DEPARTMENT]: [
    { weeks: "1-4", offsetWeeks: 0, durationWeeks: 4 },
    { weeks: "5-8", offsetWeeks: 4, durationWeeks: 4 },
  ],
  [PAE_DEPARTMENT]: [
    { weeks: "1-2", offsetWeeks: 0, durationWeeks: 2 },
    { weeks: "3-4", offsetWeeks: 2, durationWeeks: 2 },
    { weeks: "5-6", offsetWeeks: 4, durationWeeks: 2 },
    { weeks: "7-8", offsetWeeks: 6, durationWeeks: 2 },
  ],
};

const phaseNameForWeekOffset = (phaseIndex: number) => (phaseIndex === 0 ? "Phase 1" : "Phase 2");

const buildPhaseBlocks = (department: string, phaseIndex: number): RotationBlockTemplate[] => {
  const template = departmentPhases[department as DepartmentName];
  if (!template) return [];

  const offset = phaseIndex === 0 ? 0 : 8;
  return template.map((entry) => ({
    weeks: entry.weeks,
    offsetWeeks: entry.offsetWeeks + offset,
    durationWeeks: entry.durationWeeks,
  }));
};

const addWeeks = (date: Date, weeks: number): Date => {
  const value = new Date(date.valueOf());
  value.setDate(value.getDate() + weeks * 7);
  return value;
};

const formatDate = (date: Date): string => {
  const isoString = date.toISOString();
  const splitIndex = isoString.indexOf("T");
  return splitIndex >= 0 ? isoString.slice(0, splitIndex) : isoString;
};

const buildSupervisorSummary = (user: any): SupervisorSummary => {
  // Allow null supervisors - they can be assigned later
  if (!user) {
    return {
      _id: null,
      name: "TBD - Assign Later",
      role: "supervisor",
      email: undefined,
      department: undefined,
    };
  }
  return {
    _id: user?._id ? String(user._id) : null,
    name: user?.name ?? "TBD",
    role: user?.role ?? "supervisor",
    email: user?.email ?? undefined,
    department: user?.department ?? undefined,
  };
};

const buildStudentSummary = (student: any): ScheduleStudent => ({
  _id: String(student._id),
  name: student.name ?? "Unknown Student",
  idNumber: student.idNumber ?? undefined,
  department: student.department ?? undefined,
});

const splitStudentsIntoGroups = (students: ScheduleStudent[]) => {
  const groupA: ScheduleStudent[] = [];
  const groupB: ScheduleStudent[] = [];

  students.forEach((student, index) => {
    if (index % 2 === 0) groupA.push(student);
    else groupB.push(student);
  });

  return {
    groupA,
    groupB,
  };
};

const normalizeDepartmentUnitEntries = (units: DepartmentUnitEntry[]): { id: string; name: string }[] =>
  units.map((unit) => (typeof unit === "string" ? { id: unit, name: unit } : unit));

const chooseResidentPool = async (departmentKey: string) => {
  const userDepartment = departmentKey === OBG_DEPARTMENT ? "OBG" : departmentKey === PAE_DEPARTMENT ? "Pediatrics" : departmentKey;
  return await User.find({ role: "unitresident", department: userDepartment }).select("name email department role").lean();
};

const chooseConsultantPool = async (departmentKey: string) => {
  const userDepartment = departmentKey === OBG_DEPARTMENT ? "OBG" : departmentKey === PAE_DEPARTMENT ? "Pediatrics" : departmentKey;
  return await User.find({ role: "unitconsultant", department: userDepartment }).select("name email department role").lean();
};

const buildUnitSupervisors = async (departmentKey: DepartmentName) => {
  const departmentData = DEPARTMENT_UNITS[departmentKey];
  if (!departmentData) return [];

  const activeUnits = departmentData.units.active;
  const unitDocs = await Unit.find({ name: { $in: activeUnits.map((unit) => (typeof unit === "string" ? unit : unit.name)) } })
    .populate("supervisor", "name email role department")
    .lean();

  const consultantPool = await chooseConsultantPool(String(departmentKey));
  const residentPool = await chooseResidentPool(String(departmentKey));

  return activeUnits.map((unitEntry, index) => {
    const unitName = typeof unitEntry === "string" ? unitEntry : unitEntry.name;
    const unitId = typeof unitEntry === "string" ? unitEntry : unitEntry.id;
    const doc = unitDocs.find((unitDoc: any) => unitDoc.name === unitName);
    const consultant = doc?.supervisor ? buildSupervisorSummary(doc.supervisor) : buildSupervisorSummary(consultantPool[index % Math.max(consultantPool.length, 1)] || {});
    const resident = buildSupervisorSummary(residentPool[index % Math.max(residentPool.length, 1)] || consultant);

    return {
      unitId,
      unitName,
      consultant,
      resident,
    };
  });
};

const chooseTwoOgUnits = (studentIndex: number, units: { id: string; name: string }[]): { id: string; name: string }[] => {
  const unitCount = units.length;
  const firstIndex = studentIndex % unitCount;
  const secondIndex = (firstIndex + 1 + Math.floor(studentIndex / unitCount)) % unitCount;
  return [units[firstIndex]!, units[secondIndex]!];
};

const chooseFourPaeUnits = (studentIndex: number, units: { id: string; name: string }[]): { id: string; name: string }[] => {
  const unitCount = units.length;
  const offsets = [0, 1, 2, 3];
  return offsets.map((offset) => units[(studentIndex + offset) % unitCount]!);
};

const buildStudentHistoryForDepartment = (
  student: ScheduleStudent,
  departmentName: string,
  phaseName: string,
  unitEntries: { id: string; name: string }[],
  supervisors: { unitId: string; unitName: string; consultant: SupervisorSummary; resident: SupervisorSummary }[],
  startDate: Date,
  phaseIndex: number
): StudentHistoryRecord[] => {
  const blocks = buildPhaseBlocks(departmentName, phaseIndex);
  const historyBlocks: RotationBlock[] = blocks.map((block, index) => {
    const unit = unitEntries[index] ?? { id: "unknown", name: "Unknown Unit" };
    const matchingSupervisor = supervisors.find((s) => s.unitId === unit.id);
    const consultant = matchingSupervisor?.consultant ?? buildSupervisorSummary(null);
    const resident = matchingSupervisor?.resident ?? buildSupervisorSummary(null);
    const blockStartDate = formatDate(addWeeks(startDate, block.offsetWeeks));
    const blockEndDate = formatDate(addWeeks(startDate, block.offsetWeeks + block.durationWeeks));

    return {
      unit: unit.name,
      unitId: unit.id,
      consultant,
      resident,
      startDate: blockStartDate,
      endDate: blockEndDate,
      weeks: block.weeks,
      completed: false,
    };
  });

  return [
    {
      student,
      department: departmentName,
      phase: phaseName,
      blocks: historyBlocks,
    },
  ];
};

const normalizeDepartmentPostingLabel = (departmentName: string): string => {
  const normalized = String(departmentName).trim().toLowerCase();

  if (normalized === "obg" || normalized === "obstetrics and gynecology" || normalized === "obstetricsandgynecology") {
    return "O&G";
  }

  if (normalized === "pae" || normalized === "pediatrics") {
    return "Pediatrics";
  }

  return departmentName;
};

const normalizeDepartmentKey = (departmentName: string): string => {
  const normalized = String(departmentName).trim().toLowerCase();

  if (normalized === "obg" || normalized === "obstetrics and gynecology" || normalized === "obstetricsandgynecology") {
    return "OBG";
  }

  if (normalized === "pae" || normalized === "pediatrics" || normalized === "department of pediatrics") {
    return "PAE";
  }

  return departmentName;
};

export const buildNestedPostingScheduleTemplate = (
  assignments: AssignmentRecord[],
  phaseName: string,
  supervisors: { unitId: string; unitName: string; consultant: SupervisorSummary; resident: SupervisorSummary }[]
): Record<string, NestedPhaseSchedule> => {
  const phaseKey = phaseName.toLowerCase().replace(/\s+/g, "");
  const groups = ["Group A", "Group B"] as const;

  const groupedByPhaseAndGroup = groups.reduce<NestedPhaseSchedule>((acc, groupName) => {
    const groupAssignments = assignments.filter((assignment) => assignment.groupName === groupName);
    if (!groupAssignments.length) {
      return acc;
    }

    const departmentName = groupAssignments[0]?.department ?? "";
    const posting = normalizeDepartmentPostingLabel(departmentName);
    const normalizedPosting = posting === "O&G" ? "OandG" : posting.replace(/[^a-zA-Z0-9]+/g, "");
    const totalNumberofUnitsPerStudent = normalizeDepartmentKey(departmentName) === "OBG" ? 2 : 4;
    const units: Record<string, Record<string, NestedUnitSchedule>> = {};

    groupAssignments.forEach((assignment) => {
      assignment.units.forEach((unit, unitIndex) => {
        const unitSlotKey = `unit${unitIndex + 1}`;
        const unitEntryKey = `${normalizedPosting}_Unit_${unitIndex + 1}`;
        const matchingSupervisor = supervisors.find((supervisor) => supervisor.unitId === unit.id) ?? supervisors.find((supervisor) => supervisor.unitName === unit.name);
        const supervisor = matchingSupervisor?.consultant ?? matchingSupervisor?.resident ?? buildSupervisorSummary(null);

        const existingUnit = units[unitSlotKey]?.[unitEntryKey];
        if (!existingUnit) {
          units[unitSlotKey] = {
            ...(units[unitSlotKey] ?? {}),
            [unitEntryKey]: {
              name: unit.name,
              unitId: unit.id,
              duration: departmentName === OBG_DEPARTMENT ? 4 : 2,
              postingType: posting,
              students: [],
              supervisor,
            },
          };
        }

        const unitGroup = units[unitSlotKey];
        if (!unitGroup?.[unitEntryKey]) {
          return;
        }

        unitGroup[unitEntryKey].students.push(assignment.student);
      });
    });

    const groupKey = groupName === "Group A" ? "groupA" : "groupB";
    acc[groupKey] = {
      posting,
      duration: 2,
      totalNumberofUnitsPerStudent,
      units,
    };

    return acc;
  }, {} as NestedPhaseSchedule);

  return {
    [phaseKey]: groupedByPhaseAndGroup,
  };
};

const buildUnitTimeline = (
  department: string,
  phase: string,
  category: string,
  blocks: RotationBlockTemplate[],
  studentsByBlock: Record<string, ScheduleStudent[]>,
  supervisors: { unitId: string; unitName: string; consultant: SupervisorSummary; resident: SupervisorSummary }[]
) => {
  return blocks.map((block, blockIndex) => {
    const unitEntry = supervisors[blockIndex] ?? {
      unitId: "unknown",
      unitName: "Unknown Unit",
      consultant: buildSupervisorSummary(null),
      resident: buildSupervisorSummary(null),
    };
    return {
      phase,
      department,
      category,
      weeks: block.weeks,
      units: [
        {
          unit: unitEntry.unitName,
          unitId: unitEntry.unitId,
          startDate: "",
          endDate: "",
          consultant: unitEntry.consultant,
          resident: unitEntry.resident,
          students: studentsByBlock[unitEntry.unitId] ?? [],
        },
      ],
    };
  });
};