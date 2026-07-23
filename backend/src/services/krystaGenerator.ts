import mongoose, { type Types } from 'mongoose';
import ClassModel from '../models/classes';
import { getDepartmentUnitsByCode } from '../constants/departments';

type DeptConfig = {
  departmentId: string;
  departmentName?: string;
  departmentCode?: string;
  activeUnitIds: string[];
  reserveUnitIds?: string[];
  departmentDurationWeeks: number;
  unitDurationWeeks: number;
  useUnits?: boolean;
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

function resolveUnitName(departmentCode: string | undefined, unitId: string | null): string | null {
  if (!departmentCode || !unitId) return null;
  const departmentUnits = getDepartmentUnitsByCode(departmentCode);
  if (!departmentUnits) return null;
  const allUnits = [
    ...(Array.isArray(departmentUnits.units.active) ? departmentUnits.units.active : []),
    ...(Array.isArray(departmentUnits.units.reserve) ? departmentUnits.units.reserve : []),
  ];
  const match = allUnits.find((entry) => {
    if (typeof entry === 'string') {
      return entry === unitId;
    }
    return entry.id === unitId;
  });
  if (!match) return null;
  return typeof match === 'string' ? match : match.name;
}

export async function generateKrystaSchedule(opts: GenerateOpts) {
  const { classId, name, startDate, endDate, departments, createdBy, phaseId, phaseName, postingScheduleId } = opts;

  // fetch class and students
  const cls = await ClassModel.findById(classId).lean();
  if (!cls) throw new Error('Class not found');

  const studentIds: string[] = Array.isArray(cls.students) ? cls.students.map((s: any) => String(s)) : [];

  const numDepartments = departments.length;

  const getPostingSpinPrefix = (postingName: string) => {
    const letters = (postingName.match(/[A-Za-z]/g) || []).join("").slice(0, 3).toUpperCase();
    return letters.padEnd(3, "X");
  };

  const buildSpin = (postingName: string, groupOrdinal: number) => {
    const prefix = getPostingSpinPrefix(postingName);
    const suffix = String(groupOrdinal).padStart(3, "0");
    return `${prefix}${suffix}`;
  };

  const normalizedName = String(name || "").trim();
  const postingSpinPrefix = getPostingSpinPrefix(normalizedName);

  const studentGroups: { groupIndex: number; studentIds: string[]; spin: string }[] = [];
  if (numDepartments === 0) {
    studentGroups.push({ groupIndex: 0, studentIds, spin: `${postingSpinPrefix}001` });
  } else {
    const base = Math.floor(studentIds.length / numDepartments);
    let cursor = 0;
    for (let i = 0; i < numDepartments; i++) {
      const size = i === numDepartments - 1 ? studentIds.length - cursor : base;
      const slice = studentIds.slice(cursor, cursor + size);
      studentGroups.push({
        groupIndex: i,
        studentIds: slice,
        spin: buildSpin(normalizedName, i + 1),
      });
      cursor += size;
    }
  }

  // build timeline windows with explicit phase metadata
  const timeline: any[] = [];
  const unvisitedUnits: { departmentIndex: number; unitIds: string[] }[] = [];

  let phaseStart = new Date(startDate);

  for (let phaseIndex = 0; phaseIndex < departments.length; phaseIndex++) {
    const phaseDept = departments[phaseIndex];
    const phaseDurationWeeks = Math.max(1, Number(phaseDept.departmentDurationWeeks) || 1);
    const phaseDurationDays = phaseDurationWeeks * 7;
    const phaseLabel = `Phase ${phaseIndex + 1}`;
    const phaseDurationLabel = `${phaseDurationWeeks} week${phaseDurationWeeks === 1 ? "" : "s"}`;
    const phaseEnd = addDays(phaseStart, phaseDurationDays);

    for (let departmentIndex = 0; departmentIndex < departments.length; departmentIndex++) {
      const dept = departments[departmentIndex];
      const useUnits = dept.useUnits !== false;
      const activeUnits = Array.isArray(dept.activeUnitIds) ? dept.activeUnitIds.filter(Boolean) : [];
      const departmentDurationWeeks = Math.max(1, Number(dept.departmentDurationWeeks) || 1);
      const unitDurationWeeks = Math.max(1, Number(dept.unitDurationWeeks) || 1);
      const departmentDurationDays = departmentDurationWeeks * 7;
      const unitDurationDays = unitDurationWeeks * 7;
      const groupIndex = numDepartments > 0 ? (departmentIndex - phaseIndex + numDepartments) % numDepartments : 0;
      const studentGroup = studentGroups[groupIndex] ?? studentGroups[0];
      const studentsForGroup = studentGroup.studentIds;
      const spin = studentGroup.spin;
      const numWindows = useUnits ? Math.max(1, Math.ceil(phaseDurationDays / unitDurationDays)) : 1;

      const unitGroups: { unitGroupIndex: number; studentIds: string[] }[] = [];
      if (useUnits) {
        const unitCount = Math.max(1, activeUnits.length || 1);
        const baseUnitSize = Math.floor(studentsForGroup.length / unitCount);
        let studentCursor = 0;
        for (let ui = 0; ui < unitCount; ui++) {
          const size = ui === unitCount - 1 ? studentsForGroup.length - studentCursor : baseUnitSize;
          unitGroups.push({ unitGroupIndex: ui, studentIds: studentsForGroup.slice(studentCursor, studentCursor + size) });
          studentCursor += size;
        }
      } else {
        unitGroups.push({ unitGroupIndex: 0, studentIds: studentsForGroup });
      }

      for (let windowIndex = 0; windowIndex < numWindows; windowIndex++) {
        const windowStart = addDays(phaseStart, windowIndex * unitDurationDays);
        const rawWindowEnd = addDays(windowStart, unitDurationDays);
        const windowEnd = useUnits ? (rawWindowEnd > phaseEnd ? phaseEnd : rawWindowEnd) : phaseEnd;

        for (const unitGroup of unitGroups) {
          const unitIndex = useUnits ? (unitGroup.unitGroupIndex + windowIndex) % Math.max(1, activeUnits.length || 1) : 0;
          const unitId = useUnits ? activeUnits[unitIndex] ?? null : null;
          const unitName = unitId ? resolveUnitName(dept.departmentCode, unitId) : null;
          timeline.push({
            startDate: windowStart.toISOString(),
            endDate: windowEnd.toISOString(),
            phaseIndex,
            phaseLabel,
            phaseDurationWeeks,
            phaseDurationLabel,
            phaseId,
            phaseName,
            departmentIndex,
            departmentId: dept.departmentId,
            departmentName: dept.departmentName,
            departmentCode: dept.departmentCode,
            unitIndex,
            unitId,
            unitName,
            departmentGroupIndex: groupIndex,
            unitGroupIndex: unitGroup.unitGroupIndex,
            studentIds: unitGroup.studentIds,
            spin,
            supervisorId: null,
          });
        }
      }

      if (useUnits && numWindows < activeUnits.length) {
        const visitedCount = numWindows;
        const remaining = activeUnits.slice(visitedCount);
        if (remaining.length) unvisitedUnits.push({ departmentIndex, unitIds: remaining });
      }
    }

    phaseStart = addDays(phaseStart, phaseDurationDays);
  }

  const rotationPlan: any = {
    name,
    class: classId,
    createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
    postings: [
      {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        groups: studentGroups.map((g) => ({
          groupId: null,
          group: {
            students: g.studentIds,
            name: `Group ${g.groupIndex + 1}`,
            spin: g.spin,
          },
          spin: g.spin,
        })),
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
    groups: studentGroups,
    meta: { krysta: true, timeline, unvisitedUnits, phaseId, phaseName, postingScheduleId },
  };

  return rotationPlan;
}

export default generateKrystaSchedule;
