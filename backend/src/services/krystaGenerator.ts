import mongoose from 'mongoose';
import ClassModel from '../models/classes';
import Department from '../models/departments';
import Unit from '../models/units';
import User from '../models/user';
import { resolveDepartmentByIdentifier } from '../subs/mordred/normalizer';
import { selectSupervisorRoundRobin } from '../subs/mordred/supervisorPool';
import { createSystemAlertForAdmins } from '../subs/tinasha/notificationService';
import {
  splitIntoBuckets,
  resolveUnitPool,
  distributeStudentsRoundRobin,
  rotateLeft,
} from '../utils/clinicalGrouping';

// KRYSTA clinical posting generator (department/unit rotation model).
//
// Model (per Israel's spec):
// - The class is divided into N cohorts (N = number of sub-postings /
//   departments), equally, with the remainder going to the LAST group.
// - Each sub-posting maps to a Department (names + 3-letter codes come
//   from the Department documents, seeded from
//   backend/src/constants/departments.ts).
// - Each cohort starts at "its own" department and, after each rotation
//   block (>= 4 weeks), rotates to the NEXT department cyclically until
//   every cohort has visited every department.
// - When the department config uses units, each cohort is further
//   distributed round-robin across the department's ACTIVE units
//   (reserve units only when no active units are configured): student i
//   -> unit group (i % unitCount), so every unit has a student before
//   any unit gets a second one. Unit groups rotate cyclically through
//   the units each unit-window (unitDurationDays, from the phase
//   config; default 1 week).
// - Supervisors: ONE unique supervisor per department group and ONE
//   unique supervisor per unit, per generation run.
// - postings[].groups[] = one group per DEPARTMENT (named by the
//   department name + code); departmentGroupIndex in timeline windows
//   indexes this array. The timeline windows carry the per-window
//   students/supervisors and are the source of truth for "who is
//   where, when" (groups[].assigned stays empty for generated plans;
//   see clinicalPostingResolver.findGroupOrTimelineWindowForStudent).

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
  endDate: string; // ISO (informational; the posting is extended so every
  // department group completes a full rotation block)
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
  cohortIndex?: number | null;
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

type SupervisorRef = { id: string | null; name: string | null };

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

const isValidObjectId = (value: string) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const resolveDepartmentDocument = async (identifier: string) => {
  if (!identifier) return null;
  const doc = await resolveDepartmentByIdentifier(identifier);
  if (doc) return doc;

  if (isValidObjectId(identifier)) {
    const byId = await Department.findById(identifier).lean();
    if (byId) return byId;
  }

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

const departmentLabel = (name: string, code?: string | null) =>
  `${name}${code ? ` (${code})` : ''}`;

const unitLabel = (unitDoc: any, unitId: string) =>
  `${unitDoc?.name || unitId}${unitDoc?.code ? ` (${unitDoc.code})` : ''}`;

const rankSupervisorCandidates = (users: any[]) => {
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

  if (assignedSet && assignedSet.size > 0) {
    const filtered = candidates.filter((c: any) => !assignedSet.has(String(c._id)));
    if (filtered.length) candidates = filtered;
  }

  const candidateIds = candidates.map((c: any) => String(c._id));
  if (candidateIds.length === 0) return null;

  const poolKey = unit && unit._id ? `unit:${String(unit._id)}` : departmentDoc && departmentDoc._id ? `department:${String(departmentDoc._id)}` : null;
  if (poolKey) {
    try {
      const selected = await selectSupervisorRoundRobin(poolKey, candidateIds);
      if (selected && (!assignedSet || !assignedSet.has(selected))) return selected;
    } catch (e) {
      console.warn('Round-robin supervisor selection failed', e);
    }
  }

  const ranked = rankSupervisorCandidates(candidates);
  const pick = ranked.find((r: any) => !(assignedSet && assignedSet.has(String(r._id)))) || ranked[0];
  return pick ? String(pick._id) : null;
};

const findBestDepartmentSupervisor = async (departmentDoc: any, assignedSet?: Set<string>) => {
  const candidates = await findDepartmentSupervisors(departmentDoc, assignedSet);
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const candidateIds = candidates.map((c: any) => String(c._id));
  if (candidateIds.length === 0) return null;
  try {
    const selected = await selectSupervisorRoundRobin(`department:${String(departmentDoc?._id)}`, candidateIds);
    if (selected && (!assignedSet || !assignedSet.has(selected))) return selected;
  } catch (e) {
    console.warn('Round-robin department supervisor selection failed', e);
  }

  const ranked = rankSupervisorCandidates(candidates);
  const pick = ranked.find((r: any) => !(assignedSet && assignedSet.has(String(r._id)))) || ranked[0];
  return pick ? String(pick._id) : null;
};

const markSupervisor = async (supervisorId: string | null) => {
  if (!supervisorId) return;
  try {
    await User.findByIdAndUpdate(supervisorId, { isSupervisor: true }).lean();
  } catch (e) {
    // ignore persistence failures during generation
  }
};

export async function generateKrystaSchedule(opts: GenerateOpts) {
  const { classId, name, startDate, departments, createdBy, phaseId, phaseName, postingScheduleId } = opts;

  const cls = await ClassModel.findById(classId).lean();
  if (!cls) throw new Error('Class not found');

  const studentIds: string[] = Array.isArray(cls.students) ? cls.students.map((s: any) => String(s)) : [];
  const numDepartments = departments.length;
  if (numDepartments === 0) throw new Error('At least one department is required for schedule generation');

  // 1. Resolve department documents once — group names/codes come from
  //    the DB (seeded from backend/src/constants/departments.ts).
  const deptDocs: any[] = [];
  for (const dept of departments) {
    deptDocs.push(await resolveDepartmentDocument(dept.departmentId));
  }

  // 2. Rotation block: one uniform block length for all department
  //    groups so the cohorts stay in sync, at least 4 weeks (28 days)
  //    per department group. Unit durations come from the phase
  //    config (unitDurationDays/Weeks, default 1 week).
  const configuredBlockDays = Math.max(0, ...departments.map((d) => getDepartmentDurationDays(d)));
  const blockDays = Math.max(28, configuredBlockDays);
  const totalDays = blockDays * numDepartments;
  const postingStart = new Date(startDate);
  const postingEnd = addDays(postingStart, totalDays);
  const blockDurationLabel = getPhaseDurationLabel(blockDays);

  // 3. Cohorts: students divided equally across the sub-postings
  //    (departments); remainder lands in the LAST department group.
  const cohorts = splitIntoBuckets(studentIds, numDepartments);

  // 4. Unit pools (active units; reserve only when active is empty).
  const unitPools = departments.map((d) => (d.useUnits !== false ? resolveUnitPool(d) : []));
  const unitMaps: Map<string, any>[] = [];
  for (let d = 0; d < numDepartments; d++) {
    unitMaps.push(unitPools[d].length ? await resolveUnitMap(unitPools[d]) : new Map<string, any>());
  }

  // 5. Supervisors: one UNIQUE supervisor per department group and one
  //    UNIQUE supervisor per unit, across the whole generation run.
  const assignedSupervisorIds = new Set<string>();
  const deptSupervisors: SupervisorRef[] = [];
  for (let d = 0; d < numDepartments; d++) {
    const id = await findBestDepartmentSupervisor(deptDocs[d], assignedSupervisorIds);
    if (id) assignedSupervisorIds.add(id);
    await markSupervisor(id);
    deptSupervisors.push({ id, name: await getSupervisorName(id) });
  }
  const unitSupervisors: Map<string, SupervisorRef>[] = [];
  for (let d = 0; d < numDepartments; d++) {
    const map = new Map<string, SupervisorRef>();
    for (const unitId of unitPools[d]) {
      const unitDoc = unitMaps[d].get(unitId) || null;
      const id = await findUnitSupervisor(unitDoc, deptDocs[d], assignedSupervisorIds);
      if (id) assignedSupervisorIds.add(id);
      await markSupervisor(id);
      map.set(unitId, { id, name: await getSupervisorName(id) });
    }
    unitSupervisors.push(map);
  }

  const timeline: TimelineWindow[] = [];
  const unvisitedUnits: { departmentIndex: number; unitIds: string[] }[] = [];
  const unvisitedUnitGroups: { departmentIndex: number; unitGroupIndex: number; usedUnitIds: string[]; unusedUnitIds: string[] }[] = [];
  const unassignedWindows: any[] = [];
  const phases: any[] = [];

  // 6. Rotation blocks: cohort c is at department (c + block) % N, i.e.
  //    department d hosts cohort (d - block) mod N.
  for (let blockIndex = 0; blockIndex < numDepartments; blockIndex++) {
    const blockStart = addDays(postingStart, blockIndex * blockDays);
    const phaseDepartments: any[] = [];

    for (let deptSlot = 0; deptSlot < numDepartments; deptSlot++) {
      const dept = departments[deptSlot];
      const deptDoc = deptDocs[deptSlot];
      const departmentName = deptDoc?.name || dept.departmentId;
      const departmentCode = deptDoc?.code || undefined;
      const departmentIdentifier = deptDoc?.departmentID || dept.departmentId;
      const deptLabelText = departmentLabel(departmentName, departmentCode);
      const deptSup = deptSupervisors[deptSlot];
      const useUnits = dept.useUnits !== false;
      const unitPool = unitPools[deptSlot];
      const unitMap = unitMaps[deptSlot];
      const unitDurationDays = getUnitDurationDays(dept);

      const cohortIndex = ((deptSlot - blockIndex) % numDepartments + numDepartments) % numDepartments;
      const cohort = cohorts[cohortIndex];

      if (useUnits && unitPool.length > 0) {
        // Number of unit windows inside one department block.
        const numUnitWindows = Math.max(1, Math.floor(blockDays / unitDurationDays));
        // Strict round-robin across units: student i -> unit group
        // (i % unitCount); every unit has a student before wrapping.
        const unitGroups = distributeStudentsRoundRobin(cohort.studentIds, unitPool.length);

        // Cyclical unit sequence per unit group: unit group g is at
        // unit (g + w) % unitCount during unit window w.
        const groupAssignedUnits: string[][] = unitGroups.map((_, g) =>
          Array.from({ length: numUnitWindows }, (_, w) => unitPool[(g + w) % unitPool.length]),
        );

        for (let w = 0; w < numUnitWindows; w++) {
          const winStart = addDays(blockStart, w * unitDurationDays);
          const winEnd = addDays(winStart, unitDurationDays);

          for (let g = 0; g < unitGroups.length; g++) {
            const unitId = groupAssignedUnits[g][w] ?? unitPool[g % unitPool.length] ?? null;
            const unitDoc = unitId ? unitMap.get(unitId) || null : null;
            const unitSup = unitId ? unitSupervisors[deptSlot].get(unitId) || null : null;
            const supervisorId = unitSup?.id || deptSup.id || null;
            const supervisorName = unitSup?.name || deptSup.name || null;

            timeline.push({
              phaseIndex: blockIndex,
              phaseLabel: `Phase ${blockIndex + 1}`,
              phaseDurationDays: blockDays,
              phaseDurationWeeks: Math.max(1, Math.ceil(blockDays / 7)),
              phaseDurationLabel: blockDurationLabel,
              departmentIndex: deptSlot,
              departmentId: dept.departmentId,
              departmentName,
              departmentCode,
              departmentGroupIndex: deptSlot,
              departmentGroupLabel: deptLabelText,
              cohortIndex,
              unitGroupIndex: g,
              unitGroupLabel: unitDoc ? unitLabel(unitDoc, String(unitId)) : deptLabelText,
              unitIndex: unitId ? unitPool.indexOf(unitId) : 0,
              unitId,
              unitName: unitDoc?.name || null,
              unitCode: unitDoc?.code || null,
              unitID: unitDoc?.unitID || null,
              studentIds: rotateLeft(unitGroups[g], w),
              startDate: winStart.toISOString(),
              endDate: winEnd.toISOString(),
              supervisorId,
              supervisorName,
              departmentSupervisorId: deptSup.id,
              departmentSupervisorName: deptSup.name,
            });

            if (!supervisorId) {
              unassignedWindows.push({
                phaseIndex: blockIndex,
                departmentIndex: deptSlot,
                departmentId: dept.departmentId,
                departmentGroupIndex: deptSlot,
                cohortIndex,
                unitGroupIndex: g,
                unitId,
                startDate: winStart.toISOString(),
                endDate: winEnd.toISOString(),
                studentIds: unitGroups[g],
              });
              console.warn('No supervisor found for unit window', { departmentId: dept.departmentId, unitId, phaseIndex: blockIndex, departmentIndex: deptSlot, unitGroupIndex: g });
            }
          }
        }

        for (let g = 0; g < unitGroups.length; g++) {
          const used = Array.from(new Set(groupAssignedUnits[g].filter(Boolean)));
          const unused = unitPool.filter((u) => !used.includes(u));
          if (unused.length) {
            unvisitedUnitGroups.push({ departmentIndex: deptSlot, unitGroupIndex: g, usedUnitIds: used, unusedUnitIds: unused });
          }
        }
      } else {
        // No units: the whole cohort stays in the department for the
        // full block, supervised by the department supervisor.
        const winEnd = addDays(blockStart, blockDays);
        const supervisorId = deptSup.id || null;
        const supervisorName = deptSup.name || null;

        timeline.push({
          phaseIndex: blockIndex,
          phaseLabel: `Phase ${blockIndex + 1}`,
          phaseDurationDays: blockDays,
          phaseDurationWeeks: Math.max(1, Math.ceil(blockDays / 7)),
          phaseDurationLabel: blockDurationLabel,
          departmentIndex: deptSlot,
          departmentId: dept.departmentId,
          departmentName,
          departmentCode,
          departmentGroupIndex: deptSlot,
          departmentGroupLabel: deptLabelText,
          cohortIndex,
          unitGroupIndex: 0,
          unitGroupLabel: deptLabelText,
          unitIndex: 0,
          unitId: null,
          unitName: null,
          unitCode: null,
          unitID: null,
          studentIds: cohort.studentIds,
          startDate: blockStart.toISOString(),
          endDate: winEnd.toISOString(),
          supervisorId,
          supervisorName,
          departmentSupervisorId: deptSup.id,
          departmentSupervisorName: deptSup.name,
        });

        if (!supervisorId) {
          unassignedWindows.push({
            phaseIndex: blockIndex,
            departmentIndex: deptSlot,
            departmentId: dept.departmentId,
            departmentGroupIndex: deptSlot,
            cohortIndex,
            unitGroupIndex: 0,
            unitId: null,
            startDate: blockStart.toISOString(),
            endDate: winEnd.toISOString(),
            studentIds: cohort.studentIds,
          });
          console.warn('No department supervisor found for department window', { departmentId: dept.departmentId, phaseIndex: blockIndex, departmentIndex: deptSlot });
        }
      }

      phaseDepartments.push({
        departmentIndex: deptSlot,
        departmentId: dept.departmentId,
        departmentName,
        departmentCode,
        departmentIdentifier,
        departmentGroupIndex: deptSlot,
        cohortIndex,
        studentIds: cohort.studentIds,
        departmentSupervisorId: deptSup.id,
        departmentSupervisorName: deptSup.name,
        useUnits,
        departmentDurationDays: blockDays,
        unitDurationDays,
        activeUnitIds: unitPool,
        activeUnitNames: unitPool.map((id) => unitMap.get(id)?.name || String(id)),
      });
    }

    phases.push({
      phaseIndex: blockIndex,
      phaseName: `Phase ${blockIndex + 1}`,
      phaseDurationDays: blockDays,
      phaseDurationWeeks: Math.max(1, Math.ceil(blockDays / 7)),
      phaseDurationLabel: blockDurationLabel,
      startDate: blockStart.toISOString(),
      endDate: addDays(blockStart, blockDays).toISOString(),
      departments: phaseDepartments,
    });
  }

  // Units never visited by any cohort across the whole run, per department.
  const usedByDept = departments.map(() => new Set<string>());
  for (const w of timeline) {
    if (w.unitId != null) usedByDept[w.departmentIndex].add(String(w.unitId));
  }
  departments.forEach((_, d) => {
    const unused = unitPools[d].filter((u) => !usedByDept[d].has(String(u)));
    if (unused.length) unvisitedUnits.push({ departmentIndex: d, unitIds: unused });
  });

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
        startDate: postingStart,
        endDate: postingEnd,
        // One group per DEPARTMENT, named by department name + code
        // (from the Department document / departments.ts constants).
        // group.students = the cohort that STARTS in this department
        // (block 0). assigned stays EMPTY for generated plans — the
        // meta.timeline windows are the source of truth for who is
        // where, when (see clinicalPostingResolver).
        groups: departments.map((dept, d) => {
          const deptDoc = deptDocs[d];
          const deptSup = deptSupervisors[d];
          const departmentName = deptDoc?.name || dept.departmentId;
          const departmentCode = deptDoc?.code || undefined;
          return {
            groupId: null,
            group: {
              students: cohorts[d].studentIds,
              name: departmentLabel(departmentName, departmentCode),
              code: departmentCode ?? null,
              departmentId: dept.departmentId,
              departmentIdentifier: deptDoc?.departmentID || dept.departmentId,
              cohortIndex: d,
            },
            assigned: [],
            supervisor: deptSup.id || undefined,
            supervisorName: deptSup.name || undefined,
            departmentSupervisor: deptSup.id || undefined,
            departmentSupervisorName: deptSup.name || undefined,
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
          blockDays,
          unitDurationDays: departments.map((d) => getUnitDurationDays(d)),
        },
      },
    ],
    groups: cohorts.map((c) => ({
      ...c,
      name: departmentLabel(
        deptDocs[c.groupIndex]?.name || departments[c.groupIndex]?.departmentId,
        deptDocs[c.groupIndex]?.code,
      ),
    })),
    meta: {
      krysta: true,
      timeline,
      phases,
      unvisitedUnits,
      unvisitedUnitGroups,
      unassignedWindows,
      phaseId,
      phaseName,
      postingScheduleId,
      blockDays,
      totalDays,
    },
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
