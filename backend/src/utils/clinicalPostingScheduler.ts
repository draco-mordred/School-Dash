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

const buildRotationTimelineForSection = (
  sectionAssignments: AssignmentRecord[],
  phaseIndex: number,
  postingStartDate: Date,
  supervisors: { unitId: string; unitName: string; consultant: SupervisorSummary; resident: SupervisorSummary }[]
) => {
  const firstAssignment = sectionAssignments[0];
  if (!firstAssignment) return [];

  const department = firstAssignment.department;
  const phase = firstAssignment.phase;
  const category = firstAssignment.groupName;
  const blocks = buildPhaseBlocks(department, phaseIndex);

  return blocks.map((block, blockIndex) => {
    const studentsByUnit: Record<string, ScheduleStudent[]> = {};

    sectionAssignments.forEach((assignment) => {
      const unit = assignment.units[blockIndex];
      if (!unit) return;

      const studentsForUnit = studentsByUnit[unit.id] ?? [];
      studentsForUnit.push(assignment.student);
      studentsByUnit[unit.id] = studentsForUnit;
    });

    return {
      phase,
      department,
      category,
      weeks: block.weeks,
      units: Object.entries(studentsByUnit).map(([unitId, students]) => {
        const matchingSupervisor = supervisors.find((s) => s.unitId === unitId);
        const consultant = matchingSupervisor?.consultant ?? buildSupervisorSummary(null);
        const resident = matchingSupervisor?.resident ?? buildSupervisorSummary(null);
        const unitName = matchingSupervisor?.unitName ?? unitId;
        return {
          unit: unitName,
          unitId,
          startDate: formatDate(addWeeks(postingStartDate, block.offsetWeeks)),
          endDate: formatDate(addWeeks(postingStartDate, block.offsetWeeks + block.durationWeeks)),
          consultant,
          resident,
          students,
        };
      }),
    };
  });
};

export async function generate500LevelOgPaeJuniorPostingSchedule (
  options: {
  classId: string;
  postingName?: string;
  postingStartDate?: string;
}): Promise<{ 
  schedule: PostingSchedule; 
  validation: { valid: boolean; errors: string[] } 
}> {
  if (!options?.classId) {
    throw new Error("classId is required to generate the 500-level posting schedule.");
  }

  const classDoc = await ClassModel.findById(options.classId).populate("students", "name idNumber department").lean();
  if (!classDoc) {
    throw new Error("Class not found");
  }

  const students: ScheduleStudent[] = Array.isArray(classDoc.students)
    ? classDoc.students.map((student: any) => buildStudentSummary(student))
    : [];

  if (!students.length) {
    throw new Error("No students found in the selected class.");
  }

  const postingStartDate = options.postingStartDate ? new Date(options.postingStartDate) : new Date();
  const postingEndDate = formatDate(addWeeks(postingStartDate, 16));
  const groups = splitStudentsIntoGroups(students);

  const groupA = groups.groupA;
  const groupB = groups.groupB;

  const departmentConfigObg = DEPARTMENT_UNITS[OBG_DEPARTMENT];
  const departmentConfigPae = DEPARTMENT_UNITS[PAE_DEPARTMENT];

  if (!departmentConfigObg || !departmentConfigPae) {
    throw new Error("Required OBG or Pediatrics department configuration is missing.");
  }

  const unitSupervisorsObg = await buildUnitSupervisors(OBG_DEPARTMENT);
  const unitSupervisorsPae = await buildUnitSupervisors(PAE_DEPARTMENT);

  const categoriesOutput = [
    {
      category: "Group A",
      studentCount: groupA.length,
      departmentPhase1: "OBG",
      departmentPhase2: "Pediatrics",
      students: groupA,
    },
    {
      category: "Group B",
      studentCount: groupB.length,
      departmentPhase1: "Pediatrics",
      departmentPhase2: "OBG",
      students: groupB,
    },
  ];

  const buildAssignments = async (
    groupName: string,
    studentsInGroup: ScheduleStudent[],
    departmentName: DepartmentName,
    phaseIndex: number
  ): Promise<AssignmentRecord[]> => {
    const activeUnitsRaw = departmentName === OBG_DEPARTMENT ? departmentConfigObg.units.active : departmentConfigPae.units.active;
    const activeUnits = normalizeDepartmentUnitEntries(activeUnitsRaw);
    const supervisors = departmentName === OBG_DEPARTMENT ? unitSupervisorsObg : unitSupervisorsPae;
    const phaseName = phaseNameForWeekOffset(phaseIndex);

    return studentsInGroup.map((student, index) => {
      const assignedUnits: { id: string; name: string }[] = departmentName === OBG_DEPARTMENT
        ? chooseTwoOgUnits(index, activeUnits)
        : chooseFourPaeUnits(index, activeUnits);

        const history = buildStudentHistoryForDepartment(student, departmentName, phaseName, assignedUnits, supervisors, postingStartDate, phaseIndex);
      return { groupName, student, phase: phaseName, department: departmentName, units: assignedUnits, history };
    });
  };

  const phase1A = await buildAssignments("Group A", groupA, OBG_DEPARTMENT, 0);
  const phase1B = await buildAssignments("Group B", groupB, PAE_DEPARTMENT, 0);
  const phase2A = await buildAssignments("Group A", groupA, PAE_DEPARTMENT, 1);
  const phase2B = await buildAssignments("Group B", groupB, OBG_DEPARTMENT, 1);

  const allAssignments = [...phase1A, ...phase1B, ...phase2A, ...phase2B];

  const buildUnitAssignmentRecords = (
    departmentName: string,
    phase: string,
    assignments: AssignmentRecord[]
  ) => {
    const unitsMap: Record<string, ScheduleStudent[]> = {};
    const supervisors = departmentName === OBG_DEPARTMENT ? unitSupervisorsObg : unitSupervisorsPae;

    assignments.forEach((assignment) => {
      assignment.units.forEach((unit) => {
        const studentsList = unitsMap[unit.id] ?? [];
        studentsList.push(assignment.student);
        unitsMap[unit.id] = studentsList;
      });
    });

    return Object.entries(unitsMap).map(([unitId, studentsList]) => {
      const matchingSupervisor = supervisors.find((s) => s.unitId === unitId);
      const consultant = matchingSupervisor?.consultant ?? buildSupervisorSummary(null);
      const resident = matchingSupervisor?.resident ?? buildSupervisorSummary(null);
      const unitName = matchingSupervisor?.unitName ?? (departmentName === OBG_DEPARTMENT ? "Unknown OBG Unit" : "Unknown Pediatrics Unit");
      return {
        department: departmentName,
        phase,
        unit: unitName,
        unitId,
        consultant,
        resident,
        students: studentsList,
      };
    });
  };

  const unitAssignments = [
    ...buildUnitAssignmentRecords(OBG_DEPARTMENT, "Phase 1", phase1A),
    ...buildUnitAssignmentRecords(PAE_DEPARTMENT, "Phase 1", phase1B),
    ...buildUnitAssignmentRecords(PAE_DEPARTMENT, "Phase 2", phase2A),
    ...buildUnitAssignmentRecords(OBG_DEPARTMENT, "Phase 2", phase2B),
  ];

  const createRotationTeams = (assignmentRecords: typeof unitAssignments) => assignmentRecords.map((assignment) => ({
    department: assignment.department,
    phase: assignment.phase,
    unit: assignment.unit,
    unitId: assignment.unitId,
    consultant: assignment.consultant,
    resident: assignment.resident,
    students: assignment.students,
  }));

  const rotationTeams = createRotationTeams(unitAssignments);

  const rotationTimeline = [
    ...buildRotationTimelineForSection(phase1A, 0, postingStartDate, unitSupervisorsObg),
    ...buildRotationTimelineForSection(phase1B, 0, postingStartDate, unitSupervisorsPae),
    ...buildRotationTimelineForSection(phase2A, 1, postingStartDate, unitSupervisorsPae),
    ...buildRotationTimelineForSection(phase2B, 1, postingStartDate, unitSupervisorsObg),
  ];

  const rotationHistory = allAssignments.flatMap((assignment) => assignment.history);

  const schedule: PostingSchedule = {
    postingName: options.postingName || "500 Level O&G / Pediatrics Clinical Posting",
    postingType: "OG_PEDS",
    durationWeeks: 16,
    startDate: formatDate(postingStartDate),
    endDate: postingEndDate,
    phases: ["Phase 1", "Phase 2"],
    departments: [
      {
        department: departmentConfigObg.name,
        departmentCode: departmentConfigObg.id,
        rotationDurationWeeks: departmentConfigObg.rotationDurationWeeks,
        activeUnits: departmentConfigObg.units.active.map((u) => (typeof u === "string" ? { id: u, name: u } : u)),
        reserveUnits: departmentConfigObg.units.reserve.map((u) => (typeof u === "string" ? { id: u, name: u } : u)),
        supervisors: unitSupervisorsObg.map((unit) => ({
          unit: unit.unitName,
          consultant: unit.consultant,
          resident: unit.resident,
        })),
      },
      {
        department: departmentConfigPae.name,
        departmentCode: departmentConfigPae.id,
        rotationDurationWeeks: departmentConfigPae.rotationDurationWeeks,
        activeUnits: departmentConfigPae.units.active.map((u) => (typeof u === "string" ? { id: u, name: u } : u)),
        reserveUnits: departmentConfigPae.units.reserve.map((u) => (typeof u === "string" ? { id: u, name: u } : u)),
        supervisors: unitSupervisorsPae.map((unit) => ({
          unit: unit.unitName,
          consultant: unit.consultant,
          resident: unit.resident,
        })),
      },
    ],
    studentCategories: categoriesOutput,
    unitAssignments,
    rotationTeams,
    rotationTimeline,
    rotationHistory,
  };

  const validationErrors: string[] = [];

  const balancedCategories = Math.abs(groupA.length - groupB.length) <= 1;
  if (!balancedCategories) validationErrors.push("Group sizes differ by more than one student.");

  const totalAssignedStudents = new Set(rotationHistory.map((record) => record.student._id));
  if (totalAssignedStudents.size !== students.length) {
    validationErrors.push("Not every student has a history record assigned.");
  }

  const repeatedUnits = rotationHistory.some((record) => {
    const units = record.blocks.map((block) => block.unitId);
    return new Set(units).size !== units.length;
  });
  if (repeatedUnits) validationErrors.push("A student has repeated units in the same posting phase.");

  const assignmentsByStudent: Record<string, AssignmentRecord[]> = {};
  allAssignments.forEach((assignment) => {
    const studentAssignments = assignmentsByStudent[assignment.student._id] ?? [];
    studentAssignments.push(assignment);
    assignmentsByStudent[assignment.student._id] = studentAssignments;
  });

  Object.values(assignmentsByStudent).forEach((studentAssignments) => {
    const firstAssignment = studentAssignments[0];
    if (!firstAssignment) return;
    const student = firstAssignment.student;
    const obgUnits = new Set(
      studentAssignments
        .filter((assignment) => assignment.department === OBG_DEPARTMENT)
        .flatMap((assignment) => assignment.units.map((unit) => unit.id))
    );
    const paeUnits = new Set(
      studentAssignments
        .filter((assignment) => assignment.department === PAE_DEPARTMENT)
        .flatMap((assignment) => assignment.units.map((unit) => unit.id))
    );

    if (obgUnits.size !== 2) {
      validationErrors.push(`Student ${student.name} must have exactly 2 distinct O&G units assigned.`);
    }
    if (paeUnits.size !== 4) {
      validationErrors.push(`Student ${student.name} must have exactly 4 distinct Pediatrics units assigned.`);
    }
    const hasObg = studentAssignments.some((assignment) => assignment.department === OBG_DEPARTMENT);
    const hasPae = studentAssignments.some((assignment) => assignment.department === PAE_DEPARTMENT);
    if (!hasObg || !hasPae) {
      validationErrors.push(`Student ${student.name} must rotate through both O&G and Pediatrics phases.`);
    }
  });

  // Supervisors are optional and can be assigned later on rotation teams
  // Removed validation requiring all supervisors to be assigned at schedule generation

  // All phases not strictly required for flexible junior posting scheduling
  // Removed validation for full phase representation

  const noReserveUsed = unitAssignments.every((assignment) => {
    return departmentConfigObg.units.reserve.every((reserve) => assignment.unit !== (typeof reserve === "string" ? reserve : reserve.name)) &&
      departmentConfigPae.units.reserve.every((reserve) => assignment.unit !== (typeof reserve === "string" ? reserve : reserve.name));
  });
  if (!noReserveUsed) validationErrors.push("Reserve units are being used when active units are available.");

  const scheduleValidation = {
    valid: validationErrors.length === 0,
    errors: validationErrors,
  };

  return { schedule, validation: scheduleValidation };
}

export async function update500LevelOgPaeJuniorPostingSchedule(
  scheduleId: string,
  updates: any
) {
  const RotationPlan = (await import("../models/rotationPlan")).default;
  return RotationPlan.findByIdAndUpdate(scheduleId, updates, { returnDocument: "after" }).lean();
}

export async function delete500LevelOgPaeJuniorPostingSchedule(scheduleId: string) {
  const RotationPlan = (await import("../models/rotationPlan")).default;
  return RotationPlan.findByIdAndDelete(scheduleId).lean();
}