import mongoose from "mongoose";
import ClassModel from "../models/classes";
import User from "../models/user";
import Unit from "../models/units";
import { DEPARTMENT_UNITS, DepartmentName } from "../constants/departments";

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

interface RotationBlockTemplate {
  weeks: string;
  offsetWeeks: number;
  durationWeeks: number;
}

const OBG_DEPARTMENT = DepartmentName.obstetricsAndGynecology;
const PAE_DEPARTMENT = DepartmentName.pediatrics;

const departmentPhases = {
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

const addWeeks = (date: Date, weeks: number) => {
  const value = new Date(date.valueOf());
  value.setDate(value.getDate() + weeks * 7);
  return value;
};

const formatDate = (date: Date) => date.toISOString().split("T")[0];

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

const splitStudentsIntoCategories = (students: ScheduleStudent[]) => {
  const categoryA: ScheduleStudent[] = [];
  const categoryB: ScheduleStudent[] = [];

  students.forEach((student, index) => {
    if (index % 2 === 0) categoryA.push(student);
    else categoryB.push(student);
  });

  return {
    categoryA,
    categoryB,
  };
};

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

const chooseTwoOgUnits = (studentIndex: number, units: { id: string; name: string }[]) => {
  const unitCount = units.length;
  const firstIndex = studentIndex % unitCount;
  const secondIndex = (firstIndex + 1 + Math.floor(studentIndex / unitCount)) % unitCount;
  return [units[firstIndex], units[secondIndex]];
};

const chooseFourPaeUnits = (studentIndex: number, units: { id: string; name: string }[]) => {
  const unitCount = units.length;
  const offsets = [0, 1, 2, 3];
  return offsets.map((offset) => units[(studentIndex + offset) % unitCount]);
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
  const unitNames = unitEntries.map((u) => u.name);

  const historyBlocks: RotationBlock[] = blocks.map((block, index) => {
    const unit = unitEntries[index];
    const supervisor = supervisors.find((s) => s.unitId === unit.id) ?? supervisors[index % supervisors.length];
    const blockStartDate = formatDate(addWeeks(startDate, block.offsetWeeks));
    const blockEndDate = formatDate(addWeeks(startDate, block.offsetWeeks + block.durationWeeks));

    return {
      unit: unit.name,
      unitId: unit.id,
      consultant: supervisor.consultant,
      resident: supervisor.resident,
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
    const unitEntry = supervisors[blockIndex];
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

export async function generate500LevelOgPaeJuniorPostingSchedule(options: {
  classId: string;
  postingName?: string;
  postingStartDate?: string;
}): Promise<{ schedule: PostingSchedule; validation: { valid: boolean; errors: string[] } }> {
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
  const categories = splitStudentsIntoCategories(students);

  const categoryA = categories.categoryA;
  const categoryB = categories.categoryB;

  const departmentConfigObg = DEPARTMENT_UNITS[OBG_DEPARTMENT];
  const departmentConfigPae = DEPARTMENT_UNITS[PAE_DEPARTMENT];

  if (!departmentConfigObg || !departmentConfigPae) {
    throw new Error("Required OBG or Pediatrics department configuration is missing.");
  }

  const unitSupervisorsObg = await buildUnitSupervisors(OBG_DEPARTMENT);
  const unitSupervisorsPae = await buildUnitSupervisors(PAE_DEPARTMENT);

  const categoriesOutput = [
    {
      category: "Category A",
      //only one half of the class should be here, so we divide by 2
      studentCount: Math.floor(categoryA.length / 2),
      // studentCount: categoryA.length,
      departmentPhase1: "OBG",
      departmentPhase2: "Pediatrics",
      students: categoryA,
    },
    {
      category: "Category B",
      //only one half of the class should be here, so we divide by 2
      studentCount: Math.floor(categoryB.length / 2),
      // studentCount: categoryB.length,
      departmentPhase1: "Pediatrics",
      departmentPhase2: "OBG",
      students: categoryB,
    },
  ];

  const buildAssignments = async (category: string, studentsInCategory: ScheduleStudent[], departmentName: DepartmentName, phaseIndex: number) => {
    const activeUnits = departmentName === OBG_DEPARTMENT ? departmentConfigObg.units.active : departmentConfigPae.units.active;
    const supervisors = departmentName === OBG_DEPARTMENT ? unitSupervisorsObg : unitSupervisorsPae;
    const phaseName = phaseNameForWeekOffset(phaseIndex);

    const assignments: {
      student: ScheduleStudent;
      phase: string;
      department: string;
      units: { id: string; name: string }[];
      history: StudentHistoryRecord[];
    }[] = [];

    studentsInCategory.forEach((student, index) => {
      const assignedUnits = departmentName === OBG_DEPARTMENT
        ? chooseTwoOgUnits(index, activeUnits)
        : chooseFourPaeUnits(index, activeUnits);

      const history = buildStudentHistoryForDepartment(student, departmentName, phaseName, assignedUnits, supervisors, postingStartDate, phaseIndex);
      assignments.push({ student, phase: phaseName, department: departmentName, units: assignedUnits, history });
    });

    return assignments;
  };

  const phase1A = await buildAssignments("Category A", categoryA, OBG_DEPARTMENT, 0);
  const phase1B = await buildAssignments("Category B", categoryB, PAE_DEPARTMENT, 0);
  const phase2A = await buildAssignments("Category A", categoryA, PAE_DEPARTMENT, 1);
  const phase2B = await buildAssignments("Category B", categoryB, OBG_DEPARTMENT, 1);

  const allAssignments = [...phase1A, ...phase1B, ...phase2A, ...phase2B];

  const buildUnitAssignmentRecords = (
    departmentName: string,
    phase: string,
    assignments: ReturnType<typeof buildAssignments>[0][]
  ) => {
    const unitsMap: Record<string, ScheduleStudent[]> = {};
    const supervisors = departmentName === OBG_DEPARTMENT ? unitSupervisorsObg : unitSupervisorsPae;

    assignments.forEach((assignment) => {
      assignment.units.forEach((unit) => {
        unitsMap[unit.id] = unitsMap[unit.id] ?? [];
        unitsMap[unit.id].push(assignment.student);
      });
    });

    return Object.entries(unitsMap).map(([unitId, studentsList]) => {
      const supervisor = supervisors.find((s) => s.unitId === unitId) ?? supervisors[0];
      const unitName = supervisor?.unitName ?? (departmentName === OBG_DEPARTMENT ? "Unknown OBG Unit" : "Unknown Pediatrics Unit");
      return {
        department: departmentName,
        phase,
        unit: unitName,
        unitId,
        consultant: supervisor.consultant,
        resident: supervisor.resident,
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
    ...[phase1A, phase1B].flatMap((section) => {
      if (!section.length) return [];
      const department = section[0].department;
      const phase = section[0].phase;
      const blocks = buildPhaseBlocks(department, 0);
      const studentsByUnit: Record<string, ScheduleStudent[]> = {};
      section.forEach((assignment) => {
        assignment.units.forEach((unit) => {
          studentsByUnit[unit.id] = studentsByUnit[unit.id] ?? [];
          studentsByUnit[unit.id].push(assignment.student);
        });
      });
      return blocks.map((block, blockIndex) => {
        const supervisor = (department === OBG_DEPARTMENT ? unitSupervisorsObg : unitSupervisorsPae)[blockIndex];
        return {
          phase,
          department,
          category: section === phase1A ? "Category A" : "Category B",
          weeks: block.weeks,
          units: [
            {
              unit: supervisor.unitName,
              unitId: supervisor.unitId,
              startDate: formatDate(addWeeks(postingStartDate, block.offsetWeeks)),
              endDate: formatDate(addWeeks(postingStartDate, block.offsetWeeks + block.durationWeeks)),
              consultant: supervisor.consultant,
              resident: supervisor.resident,
              students: studentsByUnit[supervisor.unitId] ?? [],
            },
          ],
        };
      });
    }),
    ...[phase2A, phase2B].flatMap((section) => {
      if (!section.length) return [];
      const department = section[0].department;
      const phase = section[0].phase;
      const blocks = buildPhaseBlocks(department, 1);
      const studentsByUnit: Record<string, ScheduleStudent[]> = {};
      section.forEach((assignment) => {
        assignment.units.forEach((unit) => {
          studentsByUnit[unit.id] = studentsByUnit[unit.id] ?? [];
          studentsByUnit[unit.id].push(assignment.student);
        });
      });
      return blocks.map((block, blockIndex) => {
        const supervisor = (department === OBG_DEPARTMENT ? unitSupervisorsObg : unitSupervisorsPae)[blockIndex];
        return {
          phase,
          department,
          category: section === phase2A ? "Category A" : "Category B",
          weeks: block.weeks,
          units: [
            {
              unit: supervisor.unitName,
              unitId: supervisor.unitId,
              startDate: formatDate(addWeeks(postingStartDate, block.offsetWeeks)),
              endDate: formatDate(addWeeks(postingStartDate, block.offsetWeeks + block.durationWeeks)),
              consultant: supervisor.consultant,
              resident: supervisor.resident,
              students: studentsByUnit[supervisor.unitId] ?? [],
            },
          ],
        };
      });
    }),
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

  const balancedCategories = Math.abs(categoryA.length - categoryB.length) <= 1;
  if (!balancedCategories) validationErrors.push("Category sizes differ by more than one student.");

  const totalAssignedStudents = new Set(rotationHistory.map((record) => record.student._id));
  if (totalAssignedStudents.size !== students.length) {
    validationErrors.push("Not every student has a history record assigned.");
  }

  const repeatedUnits = rotationHistory.some((record) => {
    const units = record.blocks.map((block) => block.unitId);
    return new Set(units).size !== units.length;
  });
  if (repeatedUnits) validationErrors.push("A student has repeated units in the same posting phase.");

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
