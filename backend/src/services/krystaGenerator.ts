import mongoose, { type Types } from 'mongoose';
import ClassModel from '../models/classes';
import Department from '../models/departments';
import UnitModel from '../models/units';
import User from '../models/user';

type DeptConfig = {
  departmentId: string;
  activeUnitIds: string[];
  reserveUnitIds?: string[];
  departmentDurationWeeks: number;
  unitDurationWeeks: number;
  useUnits?: boolean;
  departmentName?: string;
  departmentCode?: string;
};

type GenerateOpts = {
  classId: string;
  name: string;
  startDate: string; // ISO
  endDate: string; // ISO
  departments: DeptConfig[];
  createdBy?: string;
  phaseId?: string;
  phaseName?: string;
  postingScheduleId?: string;
};

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export async function generateKrystaSchedule(opts: GenerateOpts) {
  const { classId, name, startDate, endDate, departments, createdBy, phaseId, phaseName, postingScheduleId } = opts;

  // fetch class and students
  const cls = await ClassModel.findById(classId).lean();
  if (!cls) throw new Error('Class not found');

  const studentIds: string[] = Array.isArray(cls.students) ? cls.students.map((s: any) => String(s)) : [];
  const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));

  const studentDocs = uniqueStudentIds.length > 0
    ? await User.find({ _id: { $in: uniqueStudentIds } }).select('_id name idNumber').lean()
    : [];
  const studentMap = new Map(studentDocs.map((student) => [String(student._id), student]));

  const resolvedDepartments = await Promise.all(departments.map(async (dept) => {
    const queryClauses: any[] = [];
    if (dept.departmentId && mongoose.Types.ObjectId.isValid(dept.departmentId)) {
      queryClauses.push({ _id: new mongoose.Types.ObjectId(dept.departmentId) });
    }
    if (dept.departmentId) {
      queryClauses.push({ departmentID: dept.departmentId });
      queryClauses.push({ name: dept.departmentId });
      queryClauses.push({ code: dept.departmentId });
    }

    const department = queryClauses.length > 0
      ? await Department.findOne({ $or: queryClauses }).lean()
      : null;

    const activeUnits = Array.isArray(dept.activeUnitIds)
      ? dept.activeUnitIds.filter(Boolean)
      : [];
    const unitQueryClauses: any[] = [];

    for (const unitId of activeUnits) {
      if (!unitId) continue;
      if (mongoose.Types.ObjectId.isValid(unitId)) {
        unitQueryClauses.push({ _id: new mongoose.Types.ObjectId(unitId) });
      }
      unitQueryClauses.push({ unitID: unitId });
      unitQueryClauses.push({ name: unitId });
      unitQueryClauses.push({ code: unitId });
    }

    const resolvedUnits = unitQueryClauses.length > 0
      ? await UnitModel.find({ $or: unitQueryClauses }).lean()
      : [];

    return {
      ...dept,
      resolvedDepartment: department,
      resolvedUnits,
    };
  }));

  const numDepartments = departments.length;
  const deptGroups: { groupIndex: number; studentIds: string[] }[] = [];

  // split students into department groups, remainder to last group
  if (numDepartments === 0) {
    deptGroups.push({ groupIndex: 0, studentIds });
  } else {
    const base = Math.floor(studentIds.length / numDepartments);
    let cursor = 0;
    for (let i = 0; i < numDepartments; i++) {
      const size = i === numDepartments - 1 ? studentIds.length - cursor : base;
      const slice = studentIds.slice(cursor, cursor + size);
      deptGroups.push({ groupIndex: i, studentIds: slice });
      cursor += size;
    }
  }

  // build timeline windows
  const timeline: any[] = [];
  const unvisitedUnits: { departmentIndex: number; unitIds: string[] }[] = [];

  let phaseStart = new Date(startDate);

  for (let dIdx = 0; dIdx < departments.length; dIdx++) {
    const dept = departments[dIdx];
    const useUnits = dept.useUnits !== false;
    const activeUnits = Array.isArray(dept.activeUnitIds) ? dept.activeUnitIds.filter(Boolean) : [];
    const deptDuration = Math.max(0, Number(dept.departmentDurationWeeks) || 0) * 7;
    const unitDuration = Math.max(1, Number(dept.unitDurationWeeks) || 1) * 7;

    const numWindows = useUnits ? Math.floor(deptDuration / unitDuration) : Math.max(1, Math.floor(deptDuration / Math.max(1, unitDuration)));

    const perGroupUnitGroups: { unitGroupIndex: number; studentIds: string[] }[][] = [];
    for (const g of deptGroups) {
      const students = g.studentIds;
      const k = useUnits ? Math.max(1, activeUnits.length || 1) : 1;
      const baseU = Math.floor(students.length / k);
      const groupsForThis: { unitGroupIndex: number; studentIds: string[] }[] = [];
      let cur = 0;
      for (let ui = 0; ui < k; ui++) {
        const usize = ui === k - 1 ? students.length - cur : baseU;
        const s = students.slice(cur, cur + usize);
        groupsForThis.push({ unitGroupIndex: ui, studentIds: s });
        cur += usize;
      }
      perGroupUnitGroups.push(groupsForThis);
    }

    for (let w = 0; w < numWindows; w++) {
      const windowStart = addDays(phaseStart, w * unitDuration);
      const windowEnd = addDays(windowStart, unitDuration);

      for (let gIdx = 0; gIdx < deptGroups.length; gIdx++) {
        const unitGroups = perGroupUnitGroups[gIdx];
        const unitCount = useUnits ? Math.max(1, activeUnits.length) : 1;
        for (let ugIdx = 0; ugIdx < unitGroups.length; ugIdx++) {
          const unitIndex = useUnits ? (ugIdx + w) % unitCount : 0;
          const unitId = useUnits ? activeUnits[unitIndex] ?? null : null;
          timeline.push({
            startDate: windowStart.toISOString(),
            endDate: windowEnd.toISOString(),
            departmentIndex: dIdx,
            departmentId: dept.departmentId,
            unitIndex,
            unitId,
            departmentGroupIndex: gIdx,
            unitGroupIndex: ugIdx,
            studentIds: unitGroups[ugIdx].studentIds,
            supervisorId: null,
          });
        }
      }
    }

    if (useUnits && numWindows < activeUnits.length) {
      const visitedCount = numWindows;
      const remaining = activeUnits.slice(visitedCount);
      if (remaining.length) unvisitedUnits.push({ departmentIndex: dIdx, unitIds: remaining });
    }

    // advance phaseStart by departmentDuration
    phaseStart = addDays(phaseStart, deptDuration);
  }

  // build result object suitable for RotationPlan
  const rotationPlan: any = {
    name,
    class: classId,
    createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
    postings: [
      {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        groups: deptGroups.map((g) => {
          const deptMeta = resolvedDepartments[g.groupIndex] || {} as any;
          const departmentName = deptMeta.resolvedDepartment?.name || deptMeta.departmentName || `${deptMeta.departmentId || 'Department'} Group ${g.groupIndex + 1}`;
          const departmentCode = deptMeta.resolvedDepartment?.code || deptMeta.departmentCode;
          const phaseLabel = phaseName || `Phase ${g.groupIndex + 1}`;

          const unitName = (deptMeta.useUnits !== false && Array.isArray(deptMeta.resolvedUnits) && deptMeta.resolvedUnits.length > 0)
            ? deptMeta.resolvedUnits[0].name
            : departmentName;
          const unitId = (deptMeta.useUnits !== false && Array.isArray(deptMeta.resolvedUnits) && deptMeta.resolvedUnits.length > 0)
            ? String(deptMeta.resolvedUnits[0]._id)
            : null;

          const students = g.studentIds.map((studentId) => {
            const student = studentMap.get(studentId);
            return student
              ? { _id: student._id, name: student.name, idNumber: student.idNumber }
              : { _id: studentId, name: `Student ${studentId}`, idNumber: undefined };
          });

          return {
            groupId: null,
            group: {
              students,
              name: unitName,
              department: departmentName,
              departmentCode,
              departmentId: deptMeta.departmentId,
              departmentName,
              phase: phaseLabel,
              unitId,
              unitName,
            },
          };
        }),
        meta: {
          krysta: true,
          departments,
          timelineCount: timeline.length,
          phaseId,
          phaseName,
          postingScheduleId,
        },
      },
    ],
    groups: deptGroups,
    meta: { krysta: true, timeline, unvisitedUnits, phaseId, phaseName, postingScheduleId },
  };

  return rotationPlan;
}

export default generateKrystaSchedule;
