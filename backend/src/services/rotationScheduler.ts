import mongoose from "mongoose";
import { inngest } from "../inngest";
import ClassModel from "../models/classes";
import RotationScheduleModel, { RotationGroupModel } from "../models/rotationPlan";
const UserModel = require("../models/user").default;

type Options = {
  level: number; // 400 or 500
  startDate?: string; // ISO date
  medicineUnits?: string[];
  surgeryUnits?: string[];
  pediatricsUnits?: string[];
  obgUnits?: string[];
};

function chunkArray<T>(arr: T[], n: number) {
  const out: T[][] = [];
  let i = 0;
  while (i < arr.length) {
    out.push(arr.slice(i, i + n));
    i += n;
  }
  return out;
}

export async function generateRotationSchedule(academicYearId: string, classId: string, options: Options & { generatedBy: string }) {
  // Basic scheduler implementing the user's high-level rules.
  const cls = await ClassModel.findById(classId).populate("students");
  if (!cls) throw new Error("Class not found");

  const students = (cls as any).students as mongoose.Document[];
  if (!students || students.length === 0) throw new Error("No students found for class");

  // Determine group count: 400-level students require specialty rotations (5 groups), otherwise 4 groups
  const groupCount = options.level === 400 ? 5 : 4;
  const groups: mongoose.Types.ObjectId[] = [];

  // Split students evenly across groups
  const perGroup = Math.ceil(students.length / groupCount);
  const studentChunks = chunkArray(students.map((s) => s._id), perGroup);

  for (let i = 0; i < studentChunks.length; i++) {
    const grp = await RotationGroupModel.create({
      name: `Group ${i + 1}`,
      students: studentChunks[i],
      // initial supervisor left null; will be assigned per posting below
      supervisor: cls.classTeacher || null,
    } as any);
    groups.push((grp as any)._id);
  }

  // Helper: load group docs for assignment tracking
  const groupDocs = await RotationGroupModel.find({ _id: { $in: groups } });

  // Track units already assigned per group by category to enforce uniqueness
  const assignedUnitsByGroup: Record<string, Record<string, Set<string>>> = {};
  for (const g of groupDocs) {
    assignedUnitsByGroup[String(g._id)] = { medicine: new Set(), surgery: new Set(), paediatrics: new Set(), obstetrics: new Set(), specialty: new Set() };
  }

  function assignedSet(gid: string, category: string) {
    if (!assignedUnitsByGroup[gid]) assignedUnitsByGroup[gid] = { medicine: new Set(), surgery: new Set(), paediatrics: new Set(), obstetrics: new Set(), specialty: new Set() };
    return (assignedUnitsByGroup[gid][category] ||= new Set<string>());
  }

  const startDate = options.startDate ? new Date(options.startDate) : new Date();

  // Build clinical postings structure: Intro (2 months), then up to three 4-month phases
  const postings: any[] = [];

  // Preload potential supervisors (teachers and unit consultants)
  let availableSupervisors: any[] = [];
  try {
    availableSupervisors = await (UserModel.find ? UserModel.find({ role: { $in: ["unit_consultant", "teacher"] }, isActive: true }).select("_id name role") : Promise.resolve([]));
  } catch (e) {
    availableSupervisors = [];
  }

  // Helper to add posting and assign units to groups ensuring uniqueness
  async function addPosting(name: string, category: string, start: Date, weeks: number, unitRotationWeeks = 4, units: string[] = []) {
    const end = new Date(start);
    end.setDate(end.getDate() + weeks * 7);
    const rotationCount = Math.max(1, Math.floor(weeks / unitRotationWeeks));

    // normalize units to objects expected by schema
    const normalizedUnits = (units || []).map((u) => typeof u === "string" ? { unitName: u } : u);

    // Assign units for each group trying to ensure uniqueness per category
    const postingGroups: any[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const gid = String(groups[gi]);
        const assigned: any[] = [];
        const available = (units || []).map((x) => String(x));

      for (let r = 0; r < rotationCount; r++) {
        // pick a unit not used before by this group in this category
        let pickIndex = -1;
        for (let i = 0; i < available.length; i++) {
          const u = available[i];
          if (!u) continue;
          if (!assignedSet(gid, category).has(u)) { pickIndex = i; break; }
        }
        if (pickIndex === -1) {
          // fallback: allow reuse but avoid immediate repeats
          pickIndex = r % Math.max(1, available.length);
        }
        const unitName = available[pickIndex] ?? `Unit ${r + 1}`;
        const unitStart = new Date(start);
        unitStart.setDate(unitStart.getDate() + r * unitRotationWeeks * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + unitRotationWeeks * 7);
        assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
        // mark assigned
        assignedSet(gid, category).add(String(unitName));
        // remove chosen unit from available so next rotation picks different
        if (available[pickIndex]) available.splice(pickIndex, 1);
      }

      // choose a supervisor for this group for this posting (round-robin)
      let supervisorForGroup: any = null;
      if (availableSupervisors && availableSupervisors.length) {
        supervisorForGroup = availableSupervisors[(gi + postings.length) % availableSupervisors.length];
        try {
          // persist supervisor on the group
          await RotationGroupModel.findByIdAndUpdate(groups[gi], { supervisor: supervisorForGroup._id });
        } catch (e) {
          // ignore
        }
      }

      postingGroups.push({ groupId: groups[gi], assigned });
    }

    postings.push({ name, category, phase: name, startDate: start, endDate: end, unitRotationWeeks, units: normalizedUnits, groups: postingGroups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });
    return end;
  }

  // Intro: two months total (8 weeks total) where half start in Medicine and half start in Surgery and switch after 4 weeks
  const m0Start = new Date(startDate);
  const introWeeks = 8;
  const halfCount = Math.ceil(groups.length / 2);

  // Create M0 (medicine) posting covering 8 weeks but groups are present in either first or second month depending on split
  const m0Groups: any[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
    const gid = String(groups[gi]);
    const assigned: any[] = [];
    // if group is in first half, they are in medicine for weeks 0-4, otherwise weeks 4-8
    if (gi < halfCount) {
      const unitStart = new Date(m0Start);
      const unitEnd = new Date(unitStart);
      unitEnd.setDate(unitEnd.getDate() + 4 * 7);
      const unitName = (options.medicineUnits || ["General Medicine", "Cardiology", "Gastroenterology"])[gi % (options.medicineUnits || ["General Medicine"]).length] || `Medicine Unit ${gi+1}`;
      assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
      assignedSet(gid, "medicine").add(String(unitName));
    } else {
      const unitStart = new Date(m0Start);
      unitStart.setDate(unitStart.getDate() + 4 * 7);
      const unitEnd = new Date(unitStart);
      unitEnd.setDate(unitEnd.getDate() + 4 * 7);
      const unitName = (options.medicineUnits || ["General Medicine", "Cardiology", "Gastroenterology"])[gi % (options.medicineUnits || ["General Medicine"]).length] || `Medicine Unit ${gi+1}`;
      assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
      assignedSet(gid, "medicine").add(String(unitName));
    }
    m0Groups.push({ groupId: groups[gi], assigned });
  }
  const m0End = new Date(m0Start);
  m0End.setDate(m0End.getDate() + introWeeks * 7);
  postings.push({ name: "M0", category: "medicine", phase: "M0", startDate: m0Start, endDate: m0End, unitRotationWeeks: 4, units: (options.medicineUnits || ["General Medicine", "Cardiology", "Gastroenterology"]).map((u) => ({ unitName: u })), groups: m0Groups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });

  // Create S0 (surgery) posting similarly, groups that started in surgery for first month are in first half
  const s0Start = new Date(m0Start);
  const s0Groups: any[] = [];
  for (let gi = 0; gi < groups.length; gi++) {
    const gid = String(groups[gi]);
    const assigned: any[] = [];
    if (gi >= halfCount) {
      // started in surgery for first month
      const unitStart = new Date(s0Start);
      const unitEnd = new Date(unitStart);
      unitEnd.setDate(unitEnd.getDate() + 4 * 7);
      const unitName = (options.surgeryUnits || ["General Surgery", "Orthopedics", "Neurosurgery"])[gi % (options.surgeryUnits || ["General Surgery"]).length] || `Surgery Unit ${gi+1}`;
      assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
      assignedSet(gid, "surgery").add(String(unitName));
    } else {
      // in second month
      const unitStart = new Date(s0Start);
      unitStart.setDate(unitStart.getDate() + 4 * 7);
      const unitEnd = new Date(unitStart);
      unitEnd.setDate(unitEnd.getDate() + 4 * 7);
      const unitName = (options.surgeryUnits || ["General Surgery", "Orthopedics", "Neurosurgery"])[gi % (options.surgeryUnits || ["General Surgery"]).length] || `Surgery Unit ${gi+1}`;
      assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
      assignedSet(gid, "surgery").add(String(unitName));
    }
    s0Groups.push({ groupId: groups[gi], assigned });
  }
  const s0End = new Date(s0Start);
  s0End.setDate(s0End.getDate() + introWeeks * 7);
  postings.push({ name: "S0", category: "surgery", phase: "S0", startDate: s0Start, endDate: s0End, unitRotationWeeks: 4, units: (options.surgeryUnits || ["General Surgery", "Orthopedics", "Neurosurgery"]).map((u) => ({ unitName: u })), groups: s0Groups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });

  // Phase generation: 400-level gets M0/S0, M1/S1, M2/S2 and Blocks; 500-level gets specialty + O&G/Pediatrics and final phases
  let schedule: any = null;
  const requestedPostingName = (options as any)?.postingName ? String((options as any).postingName).toLowerCase() : null;
  const anchorStartDate = options.startDate ? new Date(options.startDate) : startDate;
  if (options.level === 400) {
    // Phase timings
    // p1Start anchored to provided start if present
    const p1Start = new Date(anchorStartDate || m0Start);
    p1Start.setMonth(p1Start.getMonth() + 2); // start after intro (2 months)
    await addPosting("M1", "medicine", p1Start, 16, 8, options.medicineUnits || ["Respiratory", "Endocrinology", "Nephrology"]);
    await addPosting("S1", "surgery", p1Start, 16, 8, options.surgeryUnits || ["ENT", "Urology", "Plastic Surgery"]);

    // Phase M2/S2 starts immediately after M1/S1 end
    const p2Start = new Date(p1Start);
    p2Start.setMonth(p2Start.getMonth() + 4);
    const p2EndD = await addPosting("M2", "medicine", p2Start, 16, 8, options.medicineUnits || ["Dermatology", "Infectious Diseases", "Hematology"]);
    await addPosting("S2", "surgery", p2Start, 16, 8, options.surgeryUnits || ["Pediatric Surgery", "Maxillofacial", "Cardiothoracic"]);

    // BLOCK POSTINGS: commence after completion of first three clinical phases (after M2/S2 end)
    const blocks = ["CHEMICAL PATHOLOGY", "HISTOPATHOLOGY", "MEDICAL MICROBIOLOGY", "HEMATOLOGY"];
    const blocksStart = new Date(p2EndD);
    const blockPostings: any[] = [];
    let blockCursor = new Date(blocksStart);
    for (let i = 0; i < blocks.length; i++) {
      const name = `Block - ${blocks[i]}`;
      const thisStart = new Date(blockCursor);
      const thisEnd = new Date(thisStart);
      thisEnd.setDate(thisEnd.getDate() + 4 * 7);

      const monthGroups: any[] = [];
      for (let gi = 0; gi < groups.length; gi++) {
        const assigned = [{ unitName: blocks[i], startDate: thisStart, endDate: thisEnd }];
        monthGroups.push({ groupId: groups[gi], assigned });
        assignedSet(String(groups[gi]), 'specialty').add(blocks[i]);
      }
      blockPostings.push({ name, category: 'block', startDate: thisStart, endDate: thisEnd, groups: monthGroups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });
      // advance cursor
      blockCursor = new Date(thisEnd);
    }
    // append block postings to master postings
    postings.push(...blockPostings.map((b) => ({ name: b.name, category: 'block', startDate: b.startDate, endDate: b.endDate, groups: b.groups, workingDays: b.workingDays })));

    // Remove any existing schedules for this class to ensure only one schedule exists per class
    try {
      const existingSchedules = await RotationScheduleModel.find({ class: cls._id }).lean();
      if ((existingSchedules || []).length > 0) {
        const existingIds = existingSchedules.map((s: any) => s._id);
        const existingGroupIds: string[] = [];
        for (const s of existingSchedules) {
          if (Array.isArray(s.groups)) existingGroupIds.push(...s.groups.map((g: any) => String(g)));
        }
        const newGroupIds = groups.map((g) => String(g));
        const toDeleteGroupIds = existingGroupIds.filter((id) => !newGroupIds.includes(id));
        await RotationScheduleModel.deleteMany({ class: cls._id });
        if (toDeleteGroupIds.length) await RotationGroupModel.deleteMany({ _id: { $in: toDeleteGroupIds } });
        const ScheduledNotification = (await import("../models/scheduledNotification")).default;
        const { Notification } = await import("../models/notification");
        await ScheduledNotification.deleteMany({ "metadata.scheduleId": { $in: existingIds } });
        await Notification.deleteMany({ "metadata.scheduleId": { $in: existingIds } });
      }
    } catch (delErr) {
      console.warn("Failed to cleanup existing schedules:", delErr);
    }

    // If a specific posting was requested, filter postings to only include that name (case-insensitive)
    const finalPostings = requestedPostingName ? postings.filter((p) => p.name && String(p.name).toLowerCase() === requestedPostingName) : postings;
    schedule = await RotationScheduleModel.create({
      name: `${cls.name} Rotations ${new Date().getFullYear()}`,
      class: cls._id,
      academicYear: academicYearId,
      applicableLevels: [options.level],
      postings: finalPostings,
      blockPostings: blocks.map((course, idx) => ({ courseName: course, orderIndex: idx + 1, durationWeeks: 4 })),
      specialtyPostings: [],
      groups,
      generatedBy: options.generatedBy,
      generatedAt: new Date(),
    });
  } else {
    // Default schedule creation for non-400-level (e.g., 500). We'll generate specialty and O&G/Pediatrics here.
    // Remove existing schedules for this class before creating the new one
    try {
      const existingSchedules = await RotationScheduleModel.find({ class: cls._id }).lean();
      if ((existingSchedules || []).length > 0) {
        const existingIds = existingSchedules.map((s: any) => s._id);
        const existingGroupIds: string[] = [];
        for (const s of existingSchedules) {
          if (Array.isArray(s.groups)) existingGroupIds.push(...s.groups.map((g: any) => String(g)));
        }
        const newGroupIds = groups.map((g) => String(g));
        const toDeleteGroupIds = existingGroupIds.filter((id) => !newGroupIds.includes(id));
        await RotationScheduleModel.deleteMany({ class: cls._id });
        if (toDeleteGroupIds.length) await RotationGroupModel.deleteMany({ _id: { $in: toDeleteGroupIds } });
        const ScheduledNotification = (await import("../models/scheduledNotification")).default;
        const { Notification } = await import("../models/notification");
        await ScheduledNotification.deleteMany({ "metadata.scheduleId": { $in: existingIds } });
        await Notification.deleteMany({ "metadata.scheduleId": { $in: existingIds } });
      }
    } catch (delErr) {
      console.warn("Failed to cleanup existing schedules:", delErr);
    }

    // Anchor for non-400 flows
    const anchor = anchorStartDate || new Date();

    // Specialty postings (only for 500-level generation)
    const specialtyDefs = ["PSYCHIATRY", "ENT", "ANESTHESIOLOGY", "RADIOLOGY", "OPHTHALMOLOGY"];
    const specialtyStart = new Date(anchor);
    const specialtyEntries: any[] = [];
    for (let monthIdx = 0; monthIdx < specialtyDefs.length; monthIdx++) {
      const postingName = specialtyDefs[monthIdx];
      const thisStart = new Date(specialtyStart);
      thisStart.setMonth(thisStart.getMonth() + monthIdx);
      const thisEnd = new Date(thisStart);
      thisEnd.setMonth(thisEnd.getMonth() + 1);
      const monthGroups: any[] = [];
      for (let gi = 0; gi < groups.length; gi++) {
        const assigned = [{ unitName: `Unit - ${postingName}`, startDate: thisStart, endDate: thisEnd }];
        monthGroups.push({ groupId: groups[gi], assigned });
        assignedSet(String(groups[gi]), 'specialty').add(String(postingName));
      }
      specialtyEntries.push({ name: postingName, category: monthIdx === 0 || monthIdx === 3 ? 'medicine' : 'surgery', monthDurationWeeks: 4, startDate: thisStart, endDate: thisEnd, groups: monthGroups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });
    }

    // O&G and Pediatrics for 500-level
    const juniorStart = new Date(anchor);
    juniorStart.setMonth(juniorStart.getMonth() + 4);
    const juniorDurationWeeks = 16;
    const juniorHalfWeeks = 8;
    const juniorMid = new Date(juniorStart);
    juniorMid.setDate(juniorMid.getDate() + juniorHalfWeeks * 7);
    const juniorEnd = new Date(juniorStart);
    juniorEnd.setDate(juniorEnd.getDate() + juniorDurationWeeks * 7);

    const jogGroups: any[] = [];
    const jpGroups: any[] = [];
    const halfCount = Math.ceil(groups.length / 2);
    for (let gi = 0; gi < groups.length; gi++) {
      const gid = groups[gi];
      if (gi < halfCount) {
        jogGroups.push({ groupId: gid, assigned: [{ unitName: 'O&G - Half A', startDate: juniorStart, endDate: juniorMid }, { unitName: 'O&G - Half B', startDate: juniorMid, endDate: juniorEnd }] });
        jpGroups.push({ groupId: gid, assigned: [{ unitName: 'Pediatrics - Half A', startDate: juniorStart, endDate: juniorMid }, { unitName: 'Pediatrics - Half B', startDate: juniorMid, endDate: juniorEnd }] });
      } else {
        jpGroups.push({ groupId: gid, assigned: [{ unitName: 'Pediatrics - Half A', startDate: juniorStart, endDate: juniorMid }, { unitName: 'Pediatrics - Half B', startDate: juniorMid, endDate: juniorEnd }] });
        jogGroups.push({ groupId: gid, assigned: [{ unitName: 'O&G - Half A', startDate: juniorStart, endDate: juniorMid }, { unitName: 'O&G - Half B', startDate: juniorMid, endDate: juniorEnd }] });
      }
    }

    postings.push({ name: 'O&G (Junior)', category: 'obstetrics', phase: 'O&G-Junior', startDate: juniorStart, endDate: juniorEnd, unitRotationWeeks: 4, groups: jogGroups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] });
    postings.push({ name: 'Pediatrics (Junior)', category: 'paediatrics', phase: 'Pediatrics-Junior', startDate: juniorStart, endDate: juniorEnd, unitRotationWeeks: 2, groups: jpGroups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] });

    // Senior phase: starts approx 5 months after junior end
    const seniorStart = new Date(juniorEnd);
    seniorStart.setMonth(seniorStart.getMonth() + 5);
    const seniorHalfWeeks = 8;
    const seniorDurationWeeks = 16;
    const seniorMid = new Date(seniorStart);
    seniorMid.setDate(seniorMid.getDate() + seniorHalfWeeks * 7);
    const seniorEnd = new Date(seniorStart);
    seniorEnd.setDate(seniorEnd.getDate() + seniorDurationWeeks * 7);

    const sJogGroups: any[] = [];
    const sJpGroups: any[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const gid = groups[gi];
      sJogGroups.push({ groupId: gid, assigned: [{ unitName: 'O&G - Senior Half A', startDate: seniorStart, endDate: seniorMid }, { unitName: 'O&G - Senior Half B', startDate: seniorMid, endDate: seniorEnd }] });
      sJpGroups.push({ groupId: gid, assigned: [{ unitName: 'Pediatrics - Senior Half A', startDate: seniorStart, endDate: seniorMid }, { unitName: 'Pediatrics - Senior Half B', startDate: seniorMid, endDate: seniorEnd }] });
    }
    postings.push({ name: 'O&G (Senior)', category: 'obstetrics', phase: 'O&G-Senior', startDate: seniorStart, endDate: seniorEnd, unitRotationWeeks: 4, groups: sJogGroups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] });
    postings.push({ name: 'Pediatrics (Senior)', category: 'paediatrics', phase: 'Pediatrics-Senior', startDate: seniorStart, endDate: seniorEnd, unitRotationWeeks: 2, groups: sJpGroups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] });

    // attach specialty entries to postings and to specialtyPostings metadata
    postings.push(...specialtyEntries.map((s) => ({ name: s.name, category: s.category, startDate: s.startDate, endDate: s.endDate, groups: s.groups, workingDays: s.workingDays })));

    // If a specific posting was requested, filter postings accordingly
    const finalPostings = requestedPostingName ? postings.filter((p) => p.name && String(p.name).toLowerCase() === requestedPostingName) : postings;

    schedule = await RotationScheduleModel.create({
      name: `${cls.name} Rotations ${new Date().getFullYear()}`,
      class: cls._id,
      academicYear: academicYearId,
      applicableLevels: [options.level],
      postings: finalPostings,
      blockPostings: [],
      specialtyPostings: specialtyEntries.map((s) => ({ name: s.name, category: s.category, monthDurationWeeks: 4 })),
      groups,
      generatedBy: options.generatedBy,
      generatedAt: new Date(),
    });
  }

  // Notify students about their grouping and schedule summary
  try {
    const { Notification } = await import("../models/notification");
    const ScheduledNotification = (await import("../models/scheduledNotification")).default;
    const studentMap: Record<string, { groupName: string; postings: any[] } | undefined> = {};
    for (const p of postings) {
      const pgroups = p.groups || [];
      for (const pg of pgroups) {
        const gid = String(pg.groupId);
        const group = groupDocs.find((g) => String(g._id) === gid);
        if (!group) continue;
        for (const sid of (group.students || [])) {
          const sidStr = String(sid);
          if (!studentMap[sidStr]) studentMap[sidStr] = { groupName: group.name || `Group ${gid}`, postings: [] };
          studentMap[sidStr]!.postings.push({ postingName: p.name, category: p.category, units: pg.assigned });
        }
      }
    }

    const now = new Date();
    const notifications: any[] = [];
    const scheduled: any[] = [];
    for (const sid of Object.keys(studentMap)) {
      const info = studentMap[sid];
      if (!info) continue;
      // find earliest upcoming unit start
      let nextStart: Date | null = null;
      for (const po of info.postings) {
        for (const u of po.units) {
          const sDate = new Date(u.startDate);
          if (!nextStart || sDate < nextStart) nextStart = sDate;
        }
      }
      const title = `Rotation schedule assigned — ${cls.name}`;
      const message = `You have been assigned to ${info.groupName}. Next posting: ${info.postings[0]?.postingName ?? 'TBA'} starting ${nextStart ? nextStart.toDateString() : 'TBA'}.`;
      notifications.push({ userId: new mongoose.Types.ObjectId(sid), role: 'student', title, message, type: 'timetable', isRead: false, link: `/rotation-schedules/${schedule._id}`, metadata: { scheduleId: schedule._id, postings: info.postings }, createdAt: now, updatedAt: now });

      // Schedule per-unit start notifications for this student
      for (const po of info.postings) {
        for (const u of po.units) {
          const sendAt = new Date(u.startDate);
          // only schedule future notifications
          if (sendAt > new Date()) {
            // If environment requests Inngest scheduling, send delayed events
            const useInngest = process.env.USE_INNGEST_SCHEDULING === "1" || process.env.USE_INNGEST_SCHEDULING === "true";
            const payload = { userId: String(sid), title: `Upcoming posting: ${po.postingName}`, message: `Your posting ${po.postingName} (${u.unitName}) starts on ${sendAt.toDateString()}`, metadata: { scheduleId: schedule._id, posting: po.postingName, unit: u, link: `/rotation-schedules/${schedule._id}` } };
            if (useInngest) {
              try {
                const delayMs = Math.max(0, sendAt.getTime() - Date.now());
                await (inngest as any).send({ name: "rotation/notify", data: payload, delay: delayMs } as any);
              } catch (e) {
                // fallback to DB scheduled notifications
                scheduled.push({ userId: new mongoose.Types.ObjectId(sid), title: payload.title, message: payload.message, metadata: payload.metadata, sendAt, processed: false });
              }
            } else {
              scheduled.push({ userId: new mongoose.Types.ObjectId(sid), title: payload.title, message: payload.message, metadata: payload.metadata, sendAt, processed: false });
            }
          }
        }
      }
    }

    if (notifications.length) await Notification.insertMany(notifications);
    if (scheduled.length) await ScheduledNotification.insertMany(scheduled);
  } catch (notifErr) {
    console.error('Failed to send rotation notifications:', notifErr);
  }

  // Persist per-student ClinicalRotation documents so rotationStatus can be tracked and auto-updated
  try {
    const ClinicalRotation = (await import('../models/clinicalRotation')).default;
    // refresh groups with supervisor populated
    const refreshedGroups = await RotationGroupModel.find({ _id: { $in: groups } }).populate('supervisor', 'name');
    const groupById: Record<string, any> = {};
    for (const g of refreshedGroups) groupById[String(g._id)] = g;

    // map student id -> display name
    const studentNames: Record<string, string> = {};
    for (const sdoc of students) {
      const id = String((sdoc as any)._id);
      studentNames[id] = (sdoc as any).name || '';
    }

    const now = new Date();

    const rotationsToCreate: any[] = [];
    for (const sid of Object.keys(studentMap)) {
      const info = studentMap[sid];
      if (!info) continue;
      const studentId = sid;
      for (const po of info.postings) {
        for (const u of po.units) {
          const start = new Date(u.startDate);
          const end = new Date(u.endDate);
          const status = start <= now && end >= now ? 'active' : (start > now ? 'upcoming' : 'completed');
          // attempt to find supervisor from group assignments: find any group that contains this student
          let supervisorId: any = null;
          let supervisorName = '';
          // search groups for this posting to find group that contains student
          for (const p of postings) {
            if (String(p.name) !== String(po.postingName)) continue;
            for (const pg of (p.groups || [])) {
              const gdoc = groupById[String(pg.groupId)];
              if (!gdoc) continue;
              const studentIds = (gdoc.students || []).map((x: any) => String(x));
              if (studentIds.includes(String(studentId))) {
                supervisorId = gdoc.supervisor || null;
                supervisorName = gdoc.supervisor?.name || '';
                break;
              }
            }
            if (supervisorId) break;
          }

          rotationsToCreate.push({
            rotationName: po.postingName || 'Posting',
            rotationDescription: '',
            rotationType: po.category || 'medicine',
            rotationStartDate: start,
            rotationEndDate: end,
            rotationUnit: u.unitName || 'Unit',
            rotationSupervisor: supervisorId,
            rotationStatus: status,
            rotationNotes: '',
            rotationActivities: { numberOfWeeks: Math.ceil(((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) / 7), numberOfConsultantWardRound: 0, numberOfClinics: 0, numberOfResidentWardRound: 0, numberOfCallDuty: 0, numberOfTheatreDays: 0 },
            rotationTutorials: [],
            rotationTutorialPersonal: '',
            patientsClerked: [],
            clinicDays: [],
            theatreDays: [],
            cwrDays: [],
            rwrDays: [],
            callDays: [],
            otherDays: [],
            student: new mongoose.Types.ObjectId(studentId),
            students: [],
            studentName: studentNames[studentId] || '',
            supervisorName: supervisorName || '',
            academicYear: academicYearId,
            generatedFromSchedule: schedule._id,
          });
        }
      }
    }

    if (rotationsToCreate.length) {
      // Insert many; allow duplicates in dev — in production consider upsert logic
      await ClinicalRotation.insertMany(rotationsToCreate);
    }
  } catch (persistErr) {
    console.error('Failed to persist ClinicalRotation documents:', persistErr);
  }

  return schedule;
}

export default generateRotationSchedule;
