import mongoose from 'mongoose';
import ClassModel from '../models/classes';
import Department from '../models/departments';
import Unit from '../models/units';
import User from '../models/user';
import { resolveDepartmentByIdentifier, normalizeString } from '../subs/mordred/normalizer';
import { selectSupervisorRoundRobin } from '../subs/mordred/supervisorPool';
import { createSystemAlertForAdmins } from '../subs/tinasha/notificationService';

type DeptConfig = {
  departmentId: string;
  activeUnitIds?: string[];
  reserveUnitIds?: string[];
  departmentDurationWeeks?: number;
  departmentDurationDays?: number;
  unitDurationWeeks?: number;
  unitDurationDays?: number;
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

type TimelineWindow = {
  phaseIndex: number;
  phaseLabel?: string | null;
  phaseDurationDays?: number;
  phaseDurationWeeks?: number;
  phaseDurationLabel?: string | null;
  departmentIndex: number;
  departmentId: string;
  departmentName?: string | null;
  departmentCode?: string | null;
  departmentGroupIndex: number;
  departmentGroupLabel?: string | null;
  unitGroupIndex: number;
  unitGroupLabel?: string | null;
  unitIndex: number;
  unitId: string | null;
  unitName?: string | null;
  unitCode?: string | null;
  unitID?: string | null;
  studentIds: string[];
  startDate: string;
  endDate: string;
  supervisorId: string | null;
  supervisorName?: string | null;
  departmentSupervisorId: string | null;
  departmentSupervisorName?: string | null;
  spin?: string | null;
  departmentSpin?: string | null;
  unitSpin?: string | null;
};

type DepartmentGroup = {
  groupIndex: number;
  studentIds: string[];
};

type SupervisorUser = {
  _id: any;
  name?: string;
  supervisorRank?: number | null;
  departmentRole?: string | null;
};

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function splitIntoBuckets(items: string[], bucketCount: number) {
  if (bucketCount <= 0) {
    return [{ groupIndex: 0, studentIds: items }];
  }

  const buckets: DepartmentGroup[] = [];
  const base = Math.floor(items.length / bucketCount);
  let cursor = 0;

  for (let index = 0; index < bucketCount; index++) {
    const size = index === bucketCount - 1 ? items.length - cursor : base;
    buckets.push({ groupIndex: index, studentIds: items.slice(cursor, cursor + size) });
    cursor += size;
  }

  return buckets;
}

const isValidObjectId = (value: string) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const resolveDepartmentDocument = async (identifier: string) => {
  if (!identifier) return null;
  // Use Mordred normalizer first
  const doc = await resolveDepartmentByIdentifier(identifier);
  if (doc) return doc;

  if (isValidObjectId(identifier)) {
    const byId = await Department.findById(identifier).lean();
    if (byId) return byId;
  }

  // fallback to direct match by department code, departmentID, or name
  return Department.findOne({
    $or: [
      { code: identifier },
      { departmentID: identifier },
      { name: identifier },
    ],
  }).lean();
};

const resolveUnitMap = async (identifiers: string[]) => {
  if (!identifiers.length) return new Map<string, any>();

  const query: any[] = [];
  const objectIds = identifiers.filter(isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length) {
    query.push({ _id: { $in: objectIds } });
  }
  query.push({ unitID: { $in: identifiers } });
  query.push({ code: { $in: identifiers } });
  query.push({ name: { $in: identifiers } });

  const units = await Unit.find({ $or: query })
    .populate('supervisor', 'name email role supervisorRank department departmentId departmentRole academicStatus isSupervisor')
    .lean();

  const map = new Map<string, any>();
  units.forEach((unit: any) => {
    map.set(String(unit._id), unit);
    if (unit.unitID) map.set(String(unit.unitID), unit);
    if (unit.code) map.set(String(unit.code), unit);
    if (unit.name) map.set(String(unit.name), unit);
  });
  return map;
};

const normalizeUnitIds = (identifiers: unknown) => {
  if (!Array.isArray(identifiers)) return [];
  return identifiers
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());
};

const rotateLeft = (items: string[], n: number) => {
  if (!Array.isArray(items) || items.length === 0) return items.slice();
  const r = n % items.length;
  return items.slice(r).concat(items.slice(0, r));
};
const getDepartmentDurationDays = (dept: any) => {
  if (typeof dept.departmentDurationDays === 'number') return Math.max(0, dept.departmentDurationDays);
  return Math.max(0, Number(dept.departmentDurationWeeks) || 0) * 7;
};

const getUnitDurationDays = (dept: any) => {
  if (typeof dept.unitDurationDays === 'number') return Math.max(1, dept.unitDurationDays);
  return Math.max(1, Number(dept.unitDurationWeeks) || 1) * 7;
};

const getPhaseDurationLabel = (days: number) => {
  const weeks = Math.max(1, Math.ceil(days / 7));
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
};

const rankSupervisorCandidates = (users: SupervisorUser[]) => {
  return users
    .slice()
    .sort((a, b) => {
      const rankA = typeof a.supervisorRank === 'number' ? a.supervisorRank : -1;
      const rankB = typeof b.supervisorRank === 'number' ? b.supervisorRank : -1;
      if (rankA !== rankB) return rankB - rankA;
      if (a.departmentRole && b.departmentRole) return String(a.departmentRole).localeCompare(String(b.departmentRole));
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
};

const getSupervisorName = async (supervisorId: string | null) => {
  if (!supervisorId) return null;
  try {
    const supervisor = await User.findById(supervisorId).select('name').lean();
    return supervisor?.name || null;
  } catch (err) {
    console.warn('Failed to resolve supervisor name for id', supervisorId, err);
    return null;
  }
};

const findDepartmentSupervisors = async (departmentDoc: any, assignedSet?: Set<string>) => {
  if (!departmentDoc) return [];

  // Only consider teachers for supervisor assignment; ignore existing isSupervisor flag
  const roles = ['teacher'];

  const q: any = {
    role: { $in: roles },
    $or: [
      { departmentId: departmentDoc._id },
      { department: departmentDoc.name },
      { department: departmentDoc.code },
      { department: departmentDoc.departmentID },
    ],
  };

  const candidates = await User.find(q).lean();
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  if (assignedSet && assignedSet.size > 0) {
    const filtered = candidates.filter((c: any) => !assignedSet.has(String(c._id)));
    return filtered.length ? filtered : candidates;
  }

  return candidates;
};

const findUnitSupervisor = async (unit: any, departmentDoc: any, assignedSet?: Set<string>) => {
  if (!unit) return null;

  if (unit.supervisor) {
    const supervisor = await User.findById(unit.supervisor).lean();
    if (supervisor) return String(supervisor._id);
  }

  // Prefer teachers; ignore isSupervisor flag so teachers can be selected even if not pre-marked
  const roles = ['teacher'];

  const query: any = {
    role: { $in: roles },
    $or: [],
  };

  if (unit.name) query.$or.push({ specialties: unit.name });
  if (unit.code) query.$or.push({ specialties: unit.code });
  if (unit.unitID) query.$or.push({ specialties: unit.unitID });

  if (departmentDoc) {
    query.$or.push({ departmentId: departmentDoc._id });
    query.$or.push({ department: departmentDoc.name });
    query.$or.push({ department: departmentDoc.code });
    query.$or.push({ department: departmentDoc.departmentID });
  }

  if (!query.$or.length) {
    delete query.$or;
  }

  let candidates = await User.find(query as any).lean();
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  // Exclude already-assigned supervisors in this generation run when possible
  if (assignedSet && assignedSet.size > 0) {
    const filtered = candidates.filter((c: any) => !assignedSet.has(String(c._id)));
    if (filtered.length) candidates = filtered;
  }

  const candidateIds = candidates.map((c: any) => String(c._id));
  if (candidateIds.length === 0) return null;

  // Use Mordred round-robin selector with a key per unit (fallback to department)
  const poolKey = unit && unit._id ? `unit:${String(unit._id)}` : departmentDoc && departmentDoc._id ? `department:${String(departmentDoc._id)}` : null;
  if (poolKey) {
    try {
      const selected = await selectSupervisorRoundRobin(poolKey, candidateIds);
      if (selected && (!assignedSet || !assignedSet.has(selected))) return selected;
    } catch (e) {
      console.warn('Round-robin supervisor selection failed', e);
    }
  }

  // Fallback to ranking; prefer those not already assigned
  const ranked = rankSupervisorCandidates(candidates);
  const pick = ranked.find((r) => !(assignedSet && assignedSet.has(String(r._id)))) || ranked[0];
  return pick ? String(pick._id) : null;
};

const findBestDepartmentSupervisor = async (departmentDoc: any, assignedSet?: Set<string>) => {
  const candidates = await findDepartmentSupervisors(departmentDoc, assignedSet);
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const candidateIds = candidates.map((c: any) => String(c._id));
  if (candidateIds.length === 0) return null;
  try {
    const selected = await selectSupervisorRoundRobin(`department:${String(departmentDoc._id)}`, candidateIds);
    if (selected && (!assignedSet || !assignedSet.has(selected))) return selected;
  } catch (e) {
    console.warn('Round-robin department supervisor selection failed', e);
  }

  const ranked = rankSupervisorCandidates(candidates);
  const pick = ranked.find((r) => !(assignedSet && assignedSet.has(String(r._id)))) || ranked[0];
  return pick ? String(pick._id) : null;
};

export async function generateKrystaSchedule(opts: GenerateOpts) {
  const { classId, name, startDate, endDate, departments, createdBy, phaseId, phaseName, postingScheduleId } = opts;

  const cls = await ClassModel.findById(classId).lean();
  if (!cls) throw new Error('Class not found');

  const studentIds: string[] = Array.isArray(cls.students) ? cls.students.map((s: any) => String(s)) : [];
  const numDepartments = departments.length;
  if (numDepartments === 0) throw new Error('At least one department is required for schedule generation');

  const deptGroups = splitIntoBuckets(studentIds, numDepartments);
  const timeline: TimelineWindow[] = [];
  const assignedSupervisorIds = new Set<string>();
  const unvisitedUnits: { departmentIndex: number; unitIds: string[] }[] = [];
  const unvisitedUnitGroups: { departmentIndex: number; unitGroupIndex: number; usedUnitIds: string[]; unusedUnitIds: string[] }[] = [];
  const unassignedWindows: any[] = [];
  const groupSupervisorMap = new Map<number, { supervisorId: string | null; supervisorName: string | null; departmentSupervisorId: string | null; departmentSupervisorName: string | null }>();
  const phases: any[] = [];

  const phaseDurationDays = Math.max(
    ...departments.map((dept) => Math.max(0, Number(dept.departmentDurationWeeks) || 0) * 7),
    1
  );
  const phaseDurationWeeks = Math.max(1, Math.ceil(phaseDurationDays / 7));
  const phaseDurationLabel = getPhaseDurationLabel(phaseDurationDays);

  let phaseStart = new Date(startDate);

  for (let phaseIndex = 0; phaseIndex < numDepartments; phaseIndex++) {
    const phaseDepartments: any[] = [];

    for (let deptSlotIndex = 0; deptSlotIndex < numDepartments; deptSlotIndex++) {
      const dept = departments[deptSlotIndex];
      const useUnits = dept.useUnits !== false;
      const activeUnits = normalizeUnitIds(dept.activeUnitIds);
      const departmentDurationDays = getDepartmentDurationDays(dept);
      const unitDurationDays = getUnitDurationDays(dept);
      const assignedGroupIndex = (deptSlotIndex + phaseIndex) % numDepartments;
      const departmentGroup = deptGroups[assignedGroupIndex];

      const departmentDoc = await resolveDepartmentDocument(dept.departmentId);
      const departmentSupervisorId = await findBestDepartmentSupervisor(departmentDoc, assignedSupervisorIds);
      const departmentSupervisorName = await getSupervisorName(departmentSupervisorId);
      const departmentName = departmentDoc?.name || dept.departmentId;
      const departmentCode = departmentDoc?.code || undefined;
      const departmentIdentifier = departmentDoc?.departmentID || dept.departmentId;
      const unitMap = useUnits ? await resolveUnitMap(activeUnits) : new Map<string, any>();
      // Determine number of unit groups per department group (S / u)
      const studentCount = Array.isArray(departmentGroup.studentIds) ? departmentGroup.studentIds.length : 0;
      const unitCount = Math.max(1, activeUnits.length);
      const unitGroupCount = Math.max(1, Math.ceil(studentCount / unitCount));
      const unitGroups = useUnits
        ? splitIntoBuckets(departmentGroup.studentIds, unitGroupCount)
        : [];
      const activeUnitNames = useUnits ? activeUnits.map((id) => unitMap.get(id)?.name || String(id)) : [];

      if (useUnits && activeUnits.length > 0) {
        // number of unit windows each group must complete within the department duration
        const numUnitWindows = Math.max(1, Math.floor(departmentDurationDays / unitDurationDays));

        // For each unit group, precompute the sequence of unitIds it will visit (block of N units, wrapping)
        const groupAssignedUnits: string[][] = [];
        for (let g = 0; g < unitGroups.length; g++) {
          const assigned: string[] = [];
          for (let j = 0; j < numUnitWindows; j++) {
            const idx = (g * numUnitWindows + j) % activeUnits.length;
            assigned.push(activeUnits[idx]);
          }
          groupAssignedUnits.push(assigned);
        }

        // Emit timeline windows for each unit window index (time order)
        for (let windowIndex = 0; windowIndex < numUnitWindows; windowIndex++) {
          const windowStart = addDays(phaseStart, windowIndex * unitDurationDays);
          const windowEnd = addDays(windowStart, unitDurationDays);

          for (let unitGroupIndex = 0; unitGroupIndex < unitGroups.length; unitGroupIndex++) {
            const unitGroup = unitGroups[unitGroupIndex];
            const assignedUnitId = groupAssignedUnits[unitGroupIndex][windowIndex] ?? null;
            const unitDoc = assignedUnitId ? unitMap.get(assignedUnitId) || null : null;
            const unitSupervisorId = await findUnitSupervisor(unitDoc, departmentDoc, assignedSupervisorIds);
            const supervisorId = unitSupervisorId || departmentSupervisorId;
            const supervisorName = supervisorId ? (await getSupervisorName(supervisorId)) || departmentSupervisorName : departmentSupervisorName;

            const existingSupervisor = groupSupervisorMap.get(assignedGroupIndex);
            const preferredSupervisorId = departmentSupervisorId || supervisorId || null;
            const preferredSupervisorName = departmentSupervisorName || supervisorName || null;
            if (!existingSupervisor || (!existingSupervisor.departmentSupervisorName && departmentSupervisorName) || (!existingSupervisor.supervisorName && supervisorName)) {
              groupSupervisorMap.set(assignedGroupIndex, {
                supervisorId: preferredSupervisorId,
                supervisorName: preferredSupervisorName,
                departmentSupervisorId,
                departmentSupervisorName,
              });
            }

            // Mark this supervisor as assigned for the generation run so they are not reused
            if (supervisorId) {
              assignedSupervisorIds.add(String(supervisorId));
              // best-effort: persist isSupervisor flag so external tools can see assigned supervisors
              try {
                await User.findByIdAndUpdate(supervisorId, { isSupervisor: true }).lean();
              } catch (e) {
                // ignore persistence failures during generation
              }
            }

            // rotate student ordering per unit window so captain rotates
            const orderedStudents = rotateLeft(unitGroup.studentIds, windowIndex);

            // find index of assigned unit within activeUnits for reference
            const unitIndex = assignedUnitId ? activeUnits.indexOf(assignedUnitId) : 0;

            timeline.push({
              phaseIndex,
              phaseLabel: `Phase ${phaseIndex + 1}`,
              phaseDurationDays,
              phaseDurationWeeks,
              phaseDurationLabel,
              departmentIndex: deptSlotIndex,
              departmentId: dept.departmentId,
              departmentName,
              departmentCode,
              departmentGroupIndex: assignedGroupIndex,
              departmentGroupLabel: `Department Group ${assignedGroupIndex + 1}`,
              unitGroupIndex,
              unitGroupLabel: `Unit Group ${unitGroupIndex + 1}`,
              unitIndex,
              unitId: assignedUnitId,
              unitName: unitDoc?.name || null,
              unitCode: unitDoc?.code || null,
              unitID: unitDoc?.unitID || null,
              studentIds: orderedStudents,
              startDate: windowStart.toISOString(),
              endDate: windowEnd.toISOString(),
              supervisorId,
              supervisorName,
              departmentSupervisorId,
              departmentSupervisorName,
            });
            if (!supervisorId) {
              unassignedWindows.push({
                phaseIndex,
                departmentIndex: deptSlotIndex,
                departmentId: dept.departmentId,
                departmentGroupIndex: assignedGroupIndex,
                unitGroupIndex,
                unitId: assignedUnitId,
                startDate: windowStart.toISOString(),
                endDate: windowEnd.toISOString(),
                studentIds: orderedStudents,
              });
              console.warn('No supervisor found for unit window', { departmentId: dept.departmentId, unitId: assignedUnitId, phaseIndex, departmentIndex: deptSlotIndex, unitGroupIndex });
            }
          }
        }

        // Track used/unused units per group
        for (let g = 0; g < unitGroups.length; g++) {
          const used = Array.from(new Set(groupAssignedUnits[g].filter(Boolean)));
          const unused = activeUnits.filter((u) => !used.includes(u));
          if (unused.length) unvisitedUnits.push({ departmentIndex: deptSlotIndex, unitIds: unused });
          unvisitedUnitGroups.push({ departmentIndex: deptSlotIndex, unitGroupIndex: g, usedUnitIds: used, unusedUnitIds: unused });
        }
      } else {
        const windowStart = new Date(phaseStart);
        const windowEnd = addDays(phaseStart, departmentDurationDays);
        const supervisorName = departmentSupervisorName;

        const existingSupervisor = groupSupervisorMap.get(assignedGroupIndex);
        if (!existingSupervisor || (!existingSupervisor.departmentSupervisorName && departmentSupervisorName) || (!existingSupervisor.supervisorName && supervisorName)) {
          groupSupervisorMap.set(assignedGroupIndex, {
            supervisorId: departmentSupervisorId || null,
            supervisorName: departmentSupervisorName || null,
            departmentSupervisorId,
            departmentSupervisorName,
          });
        }

        if (departmentSupervisorId) {
          assignedSupervisorIds.add(String(departmentSupervisorId));
          try {
            await User.findByIdAndUpdate(departmentSupervisorId, { isSupervisor: true }).lean();
          } catch (e) {
            // ignore
          }
        }

        timeline.push({
          phaseIndex,
          phaseLabel: `Phase ${phaseIndex + 1}`,
          phaseDurationDays,
          phaseDurationWeeks,
          phaseDurationLabel,
          departmentIndex: deptSlotIndex,
          departmentId: dept.departmentId,
          departmentName,
          departmentCode,
          departmentGroupIndex: assignedGroupIndex,
          departmentGroupLabel: `Department Group ${assignedGroupIndex + 1}`,
          unitGroupIndex: 0,
          unitGroupLabel: 'Unit Group 1',
          unitIndex: 0,
          unitId: null,
          unitName: null,
          unitCode: null,
          unitID: null,
          studentIds: departmentGroup.studentIds,
          startDate: windowStart.toISOString(),
          endDate: windowEnd.toISOString(),
          supervisorId: departmentSupervisorId,
          supervisorName,
          departmentSupervisorId,
          departmentSupervisorName,
        });
        if (!departmentSupervisorId) {
          unassignedWindows.push({
            phaseIndex,
            departmentIndex: deptSlotIndex,
            departmentId: dept.departmentId,
            departmentGroupIndex: assignedGroupIndex,
            unitGroupIndex: 0,
            unitId: null,
            startDate: windowStart.toISOString(),
            endDate: windowEnd.toISOString(),
            studentIds: departmentGroup.studentIds,
          });
          console.warn('No department supervisor found for department window', { departmentId: dept.departmentId, phaseIndex, departmentIndex: deptSlotIndex });
        }
      }

      phaseDepartments.push({
        departmentIndex: deptSlotIndex,
        departmentId: dept.departmentId,
        departmentName,
        departmentCode,
        departmentIdentifier,
        departmentGroupIndex: assignedGroupIndex,
        studentIds: departmentGroup.studentIds,
        departmentSupervisorId,
        useUnits,
        departmentDurationDays,
        unitDurationDays,
        activeUnitIds: activeUnits,
        activeUnitNames,
      });
    }

    phases.push({
      phaseIndex,
      phaseName: `Phase ${phaseIndex + 1}`,
      phaseDurationDays,
      phaseDurationWeeks,
      phaseDurationLabel,
      startDate: phaseStart.toISOString(),
      endDate: addDays(phaseStart, phaseDurationDays).toISOString(),
      departments: phaseDepartments,
    });

    phaseStart = addDays(phaseStart, phaseDurationDays);
  }

  const createdByValue = createdBy && mongoose.Types.ObjectId.isValid(createdBy)
    ? new mongoose.Types.ObjectId(createdBy)
    : createdBy || undefined;

  const rotationPlan: any = {
    name,
    class: classId,
    createdBy: createdByValue,
    postings: [
      {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        groups: deptGroups.map((g) => {
          const supervisorInfo = groupSupervisorMap.get(g.groupIndex) || { supervisorId: null, supervisorName: null, departmentSupervisorId: null, departmentSupervisorName: null, supervisorEmail: null, departmentSupervisorEmail: null } as any;
          return {
            groupId: null,
            group: { students: g.studentIds, name: `Group ${g.groupIndex + 1}` },
            supervisor: supervisorInfo.departmentSupervisorId || supervisorInfo.supervisorId || undefined,
            supervisorName: supervisorInfo.departmentSupervisorName || supervisorInfo.supervisorName || undefined,
            supervisorEmail: supervisorInfo.departmentSupervisorEmail || supervisorInfo.supervisorEmail || undefined,
            departmentSupervisor: supervisorInfo.departmentSupervisorId || undefined,
            departmentSupervisorName: supervisorInfo.departmentSupervisorName || undefined,
            departmentSupervisorEmail: supervisorInfo.departmentSupervisorEmail || undefined,
          };
        }),
        meta: {
          krysta: true,
          departments,
          timelineCount: timeline.length,
          timeline,
          phaseId,
          phaseName,
          postingScheduleId,
        },
      },
    ],
    groups: deptGroups,
    meta: { krysta: true, timeline, phases, unvisitedUnits, unvisitedUnitGroups, unassignedWindows, phaseId, phaseName, postingScheduleId },
  };

  if (unassignedWindows.length > 0) {
    try {
      await createSystemAlertForAdmins({
        title: `KRYSTA schedule generated with ${unassignedWindows.length} unassigned supervisor window${unassignedWindows.length === 1 ? '' : 's'}`,
        message: `The generated schedule "${name}" contains ${unassignedWindows.length} timeline window${unassignedWindows.length === 1 ? '' : 's'} without an assigned supervisor. Please review and assign supervisors before publishing the posting schedule.`,
        type: 'warning',
        metadata: {
          krysta: true,
          scheduleName: name,
          phaseId,
          phaseName,
          postingScheduleId,
          missingWindowCount: unassignedWindows.length,
          sampleWindows: unassignedWindows.slice(0, 10),
        },
      });
    } catch (err) {
      console.warn('Failed to send missing supervisor alert', err);
    }
  }

  return rotationPlan;
}

export default generateKrystaSchedule;
