import { type Types } from 'mongoose';
import ClassModel from '../models/classes';

type DeptConfig = {
  departmentId: string;
  activeUnitIds: string[];
  reserveUnitIds?: string[];
  departmentDurationDays: number;
  unitDurationDays: number;
};

type GenerateOpts = {
  classId: string;
  name: string;
  startDate: string; // ISO
  endDate: string; // ISO
  departments: DeptConfig[];
  createdBy?: string;
};

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export async function generateKrystaSchedule(opts: GenerateOpts) {
  const { classId, name, startDate, endDate, departments, createdBy } = opts;

  // fetch class and students
  const cls = await ClassModel.findById(classId).lean();
  if (!cls) throw new Error('Class not found');

  const studentIds: string[] = Array.isArray(cls.students) ? cls.students.map((s: any) => String(s)) : [];

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
    const activeUnits = Array.isArray(dept.activeUnitIds) ? dept.activeUnitIds : [];
    const deptDuration = Math.max(0, Number(dept.departmentDurationDays) || 0);
    const unitDuration = Math.max(1, Number(dept.unitDurationDays) || 1);

    // number of unit windows that fit
    const numWindows = Math.floor(deptDuration / unitDuration);

    // prepare unit groups per department group
    const perGroupUnitGroups: { unitGroupIndex: number; studentIds: string[] }[][] = [];
    for (const g of deptGroups) {
      const students = g.studentIds;
      const k = Math.max(1, activeUnits.length || 1);
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

    // generate windows
    for (let w = 0; w < numWindows; w++) {
      const windowStart = addDays(phaseStart, w * unitDuration);
      const windowEnd = addDays(windowStart, unitDuration);

      for (let gIdx = 0; gIdx < deptGroups.length; gIdx++) {
        const unitGroups = perGroupUnitGroups[gIdx];
        const unitCount = activeUnits.length || 1;
        // each unitGroup advances independently; compute which unit index this window maps to for that unitGroup
        for (let ugIdx = 0; ugIdx < unitGroups.length; ugIdx++) {
          const unitIndex = (ugIdx + w) % unitCount; // initial offset = unitGroupIndex
          const unitId = activeUnits.length ? activeUnits[unitIndex] : null;
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

    // check unvisited units
    if (numWindows < activeUnits.length) {
      const visitedCount = numWindows; // per unitGroup sequence
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
    createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
    postings: [
      {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        groups: deptGroups.map((g) => ({ groupId: null, group: { students: g.studentIds, name: `Group ${g.groupIndex + 1}` } })),
        meta: { krysta: true, departments, timelineCount: timeline.length },
      },
    ],
    groups: deptGroups,
    meta: { krysta: true, timeline, unvisitedUnits },
  };

  return rotationPlan;
}

export default generateKrystaSchedule;
