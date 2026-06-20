import mongoose from "mongoose";
// avoid importing inngest at module load time to prevent ESM resolution issues in test harness
const inngest: any = null;
// models will be dynamically imported inside the generator to avoid ESM resolution issues in test harness
import fs from 'fs';
import path from 'path';

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

/**
 * Determine the status of a posting relative to current time
 * - "completed" if end date is in the past
 * - "current" if start date is in the past and end date is in the future
 * - "upcoming" if start date is in the future
 */
function determinePostingStatus(startDate: Date, endDate: Date): "upcoming" | "current" | "completed" {
  const now = new Date();
  if (endDate < now) return "completed";
  if (startDate <= now && endDate >= now) return "current";
  return "upcoming";
}


export async function generateRotationSchedule(academicYearId: string, classId: string, options: Options & { generatedBy: string }) {
  // dynamic imports (avoid top-level imports to prevent ESM loader issues during ad-hoc scripts)
  const ClassModel = (await import("../models/classes.ts")).default;
  const rotationPlanMod = await import("../models/rotationPlan.ts");
  const RotationScheduleModel = rotationPlanMod.default;
  const RotationGroupModel = rotationPlanMod.RotationGroupModel;
  const StudentPostingAssignmentModel = (await import("../models/studentPostingAssignment.ts")).default;
  const UserModel = (await import("../models/user.ts")).default;
  // Basic scheduler implementing the user's high-level rules.
  const cls = await ClassModel.findById(classId).populate("students");
  if (!cls) throw new Error("Class not found");

  const students = (cls as any).students as mongoose.Document[];
  if (!students || students.length === 0) throw new Error("No students found for class");

  // Determine group count: 400-level students use 4 groups, 500-level use 6 groups
  const groupCount = options.level === 400 ? 4 : 6;
  const groups: mongoose.Types.ObjectId[] = [];

  // Split students evenly across groups
  const perGroup = Math.ceil(students.length / groupCount);
  const studentChunks = chunkArray(students.map((s) => s._id), perGroup);

  // Create groups (dynamically typed based on posting schedule)
  for (let i = 0; i < studentChunks.length; i++) {
    const grp = await RotationGroupModel.create({
      name: `Group ${String.fromCharCode(65 + i)}`, // Group A, B, C, D (or up to F for 500-level)
      students: studentChunks[i],
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
  // NOTE: All postings are calculated from startDate. The entered start date becomes the beginning of the first posting.
  const postings: any[] = [];

  // Preload potential supervisors (teachers and unit consultants)
  let availableSupervisors: any[] = [];
  try {
    // include residents as possible supervisors; require explicit isSupervisor flag
    availableSupervisors = await (UserModel.find ? UserModel.find({ role: { $in: ["unit_consultant", "teacher", "unit_resident"] }, isActive: true, isSupervisor: true }).select("_id name role supervisorRank specialties academicStatus") : Promise.resolve([]));
  } catch (e) {
    availableSupervisors = [];
  }

  const SPECIALTY_UNITS = ["ENT","PSYCHIATRY","OPHTHALMOLOGY","RADIOLOGY","DERMATOLOGY","ANESTHESIOLOGY"];

  function sanitizeUnits(units?: string[]) {
    if (!units || !Array.isArray(units)) return [];
    return units.filter((u) => {
      if (!u) return false;
      const name = String(u).toUpperCase().trim();
      return SPECIALTY_UNITS.indexOf(name) === -1;
    });
  }

  // Load seed staff from scripts/seedHospitalData.ts as fallback supervisor pool
  function extractStaffFromSeed(seedPath?: string) {
    try {
      const p = seedPath || path.resolve(__dirname, '../../scripts/seedHospitalData.ts');
      if (!fs.existsSync(p)) return [] as any[];
      const txt = fs.readFileSync(p, 'utf8');
      const out: any[] = [];
      const matchArray = txt.match(/const\s+(medicineStaff|surgeryStaff)\s*=\s*\[[\s\S]*?\];/g);
      if (!matchArray) return out;
      for (const block of matchArray) {
        const objs = block.match(/\{[\s\S]*?\}/g) || [];
        for (const o of objs) {
          const nameM = o.match(/name:\s*"([^"]+)"/);
          const designationM = o.match(/designation:\s*"([^"]+)"/);
          const departmentM = o.match(/department:\s*"([^"]+)"/);
          const unitM = o.match(/unit:\s*"([^"]+)"/);
          if (nameM && unitM) {
            out.push({ name: nameM[1], designation: designationM ? designationM[1] : '', department: departmentM ? departmentM[1] : '', unit: unitM[1] });
          }
        }
      }
      return out;
    } catch (e) {
      return [] as any[];
    }
  }

  function pickSupervisorsForUnitFromSeed(unit: string, staffByUnit: Record<string, any[]>, groupsCount: number) {
    const pool = staffByUnit[unit] || [];
    const rankOrder = ['Professor', 'Reader', 'Senior Lecturer', 'Lecturer I', 'Lecturer', 'N/A'];
    pool.sort((a,b)=> rankOrder.indexOf(a.designation||'') - rankOrder.indexOf(b.designation||''));
    const out: any[] = [];
    for (let i=0;i<groupsCount;i++) out.push(pool[i % Math.max(1,pool.length)] || { name: 'TBD', designation: '' });
    return out;
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
      // pick supervisor based on specialty match and supervisorRank
      let supervisorForGroup: any = null;
      if (availableSupervisors && availableSupervisors.length) {
        const unitNamesForPosting = (units || []).map((x) => String(x).toUpperCase());
        // find candidates with matching specialties
        const specialtyCandidates = availableSupervisors.filter((s) => Array.isArray(s.specialties) && s.specialties.some((sp: string) => unitNamesForPosting.some((un) => (sp || '').toUpperCase() === un || un.includes((sp || '').toUpperCase()))));
        const candidates = (specialtyCandidates.length ? specialtyCandidates : availableSupervisors)
          .slice() // copy
          .sort((a: any, b: any) => (b.supervisorRank || 0) - (a.supervisorRank || 0));
        // distribute among candidates deterministically using group index
        supervisorForGroup = candidates[(gi + postings.length) % candidates.length];
        try {
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

  // M0 and S0 are only for 400-level students
  // Both start at the entered start date
  let m0Start: Date | null = null;
  let m0End: Date | null = null;
  let s0End: Date | null = null;
  
  if (options.level === 400) {
    // Intro: two months total (8 weeks total) where half start in Medicine and half start in Surgery and switch after 4 weeks
    // M0 and S0 use the entered startDate as their beginning
    m0Start = new Date(startDate);
    const introWeeks = 8;
    const halfCount = Math.ceil(groups.length / 2);

    const medUnitsForIntro = sanitizeUnits(options.medicineUnits || ["General Medicine", "Cardiology", "Gastroenterology"]);
    const surgUnitsForIntro = sanitizeUnits(options.surgeryUnits || ["General Surgery", "Orthopedics", "Neurosurgery"]);

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
        const unitName = (medUnitsForIntro.length ? medUnitsForIntro : ["General Medicine"])[gi % medUnitsForIntro.length] || `Medicine Unit ${gi+1}`;
        assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
        assignedSet(gid, "medicine").add(String(unitName));
      } else {
        const unitStart = new Date(m0Start);
        unitStart.setDate(unitStart.getDate() + 4 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 4 * 7);
        const unitName = (medUnitsForIntro.length ? medUnitsForIntro : ["General Medicine"])[gi % medUnitsForIntro.length] || `Medicine Unit ${gi+1}`;
        assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
        assignedSet(gid, "medicine").add(String(unitName));
      }
      m0Groups.push({ groupId: groups[gi], assigned });
    }
    m0End = new Date(m0Start);
    m0End.setDate(m0End.getDate() + introWeeks * 7);
    postings.push({ name: "M0", category: "medicine", phase: "M0", startDate: m0Start, endDate: m0End, unitRotationWeeks: 4, units: medUnitsForIntro.map((u) => ({ unitName: u })), groups: m0Groups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });

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
        const unitName = (surgUnitsForIntro.length ? surgUnitsForIntro : ["General Surgery"])[gi % surgUnitsForIntro.length] || `Surgery Unit ${gi+1}`;
        assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
        assignedSet(gid, "surgery").add(String(unitName));
      } else {
        // in second month
        const unitStart = new Date(s0Start);
        unitStart.setDate(unitStart.getDate() + 4 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 4 * 7);
        const unitName = (surgUnitsForIntro.length ? surgUnitsForIntro : ["General Surgery"])[gi % surgUnitsForIntro.length] || `Surgery Unit ${gi+1}`;
        assigned.push({ unitName, startDate: unitStart, endDate: unitEnd });
        assignedSet(gid, "surgery").add(String(unitName));
      }
      s0Groups.push({ groupId: groups[gi], assigned });
    }
    s0End = new Date(s0Start);
    s0End.setDate(s0End.getDate() + introWeeks * 7);
    postings.push({ name: "S0", category: "surgery", phase: "S0", startDate: s0Start, endDate: s0End, unitRotationWeeks: 4, units: surgUnitsForIntro.map((u) => ({ unitName: u })), groups: s0Groups, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });
  }

  // Phase generation: 400-level gets M0/S0, M1/S1, M2/S2 and Blocks; 500-level gets specialty + O&G/Pediatrics and final phases
  let schedule: any = null;
  const requestedPostingName = (options as any)?.postingName ? String((options as any).postingName).toLowerCase() : null;
  const filterOption = (options as any)?.only ? String((options as any).only) : null; // 'all' or specific filters
  const anchorStartDate = options.startDate ? new Date(options.startDate) : startDate;
  if (options.level === 400) {
    // Phase timings
    // p1Start anchored to provided start if present
    const p1Start = new Date(anchorStartDate || m0Start);
    p1Start.setMonth(p1Start.getMonth() + 2); // start after intro (2 months)
    await addPosting("M1", "medicine", p1Start, 16, 8, sanitizeUnits(options.medicineUnits || ["Respiratory", "Endocrinology", "Nephrology"]));
    await addPosting("S1", "surgery", p1Start, 16, 8, sanitizeUnits(options.surgeryUnits || ["ENT", "Urology", "Plastic Surgery"]));

    // Phase M2/S2 starts immediately after M1/S1 end
    const p2Start = new Date(p1Start);
    p2Start.setMonth(p2Start.getMonth() + 4);
    const p2EndD = await addPosting("M2", "medicine", p2Start, 16, 8, sanitizeUnits(options.medicineUnits || ["Dermatology", "Infectious Diseases", "Hematology"]));
    await addPosting("S2", "surgery", p2Start, 16, 8, sanitizeUnits(options.surgeryUnits || ["Pediatric Surgery", "Maxillofacial", "Cardiothoracic"]));

    // BLOCK POSTINGS: commence after completion of first three clinical phases (after M2/S2 end)
    // UPDATED: Add 2-week buffer before Block Postings begin
    const blocks = ["CHEMICAL PATHOLOGY", "HISTOPATHOLOGY", "MEDICAL MICROBIOLOGY", "HEMATOLOGY"];
    const blocksStart = new Date(p2EndD);
    blocksStart.setDate(blocksStart.getDate() + 2 * 7);  // Add 2-week buffer
    const blockPostings: any[] = [];
    
    // Generate 4 postings (one for each month), with groups rotating through blocks
    for (let monthIdx = 0; monthIdx < blocks.length; monthIdx++) {
      const monthStart = new Date(blocksStart);
      monthStart.setDate(monthStart.getDate() + monthIdx * 4 * 7);
      const monthEnd = new Date(monthStart);
      monthEnd.setDate(monthEnd.getDate() + 4 * 7);

      const monthGroups: any[] = [];
      for (let gi = 0; gi < groups.length; gi++) {
        // Rotate group through blocks: group gi gets block (gi + monthIdx) % blocks.length in month monthIdx
        const blockIdx = (gi + monthIdx) % blocks.length;
        const blockName: string = blocks[blockIdx]!;
        const assigned = [{ unitName: blockName, startDate: monthStart, endDate: monthEnd }];
        monthGroups.push({ groupId: groups[gi], assigned });
        assignedSet(String(groups[gi]), 'block').add(blockName);
      }
      
      // Create posting for this month
      const monthNum = monthIdx + 1;
      blockPostings.push({ 
        name: `Block Month ${monthNum}`, 
        category: 'block', 
        phase: 'block', 
        startDate: monthStart, 
        endDate: monthEnd, 
        unitRotationWeeks: 4,
        units: blocks.map((b) => ({ unitName: b })),
        groups: monthGroups, 
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] 
      });
    }
    // append block postings to master postings
    postings.push(...blockPostings);

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
        const ScheduledNotification = (await import("../models/scheduledNotification.ts")).default;
        const { Notification } = await import("../models/notification.ts");
        await ScheduledNotification.deleteMany({ "metadata.scheduleId": { $in: existingIds } });
        await Notification.deleteMany({ "metadata.scheduleId": { $in: existingIds } });
      }
    } catch (delErr) {
      console.warn("Failed to cleanup existing schedules:", delErr);
    }

    // If a specific posting was requested, filter postings to only include that name (case-insensitive)
    let finalPostings = postings.slice();
    if (filterOption && filterOption !== 'all') {
      const f = filterOption;
      if (f === 'M0-M2') finalPostings = postings.filter((p:any)=> ['M0','M1','M2','S0','S1','S2'].includes(p.name));
      else if (f === 'Block') finalPostings = postings.filter((p:any)=> p.category === 'block' || (p.name && String(p.name).toLowerCase().includes('block')));
      else if (f === 'PED_JUNIOR') finalPostings = postings.filter((p:any)=> p.name && String(p.name).toLowerCase().includes('pediatrics') && String(p.name).toLowerCase().includes('junior'));
      else if (f === 'OG_JUNIOR') finalPostings = postings.filter((p:any)=> p.name && String(p.name).toLowerCase().includes('o&g') || (p.name && String(p.name).toLowerCase().includes('obstetrics')));
      else if (f === 'M3-S3') finalPostings = postings.filter((p:any)=> ['M3','S3'].includes(p.name));
      else if (f === 'specialties') finalPostings = postings.filter((p:any)=> p.phase === 'block' ? false : (p.category === 'medicine' || p.category === 'surgery' ? false : true));
    } else if (requestedPostingName) {
      finalPostings = postings.filter((p) => p.name && String(p.name).toLowerCase() === requestedPostingName);
    }
    
    schedule = await RotationScheduleModel.create({
      name: `${cls.name} Rotations ${new Date().getFullYear()}`,
      class: cls._id,
      academicYear: academicYearId,
      startDate: options.startDate ? new Date(options.startDate) : (finalPostings.length ? new Date(Math.min(...finalPostings.map((p:any)=> new Date(p.startDate).getTime()))) : new Date()),
      endDate: finalPostings.length ? new Date(Math.max(...finalPostings.map((p:any)=> new Date(p.endDate).getTime()))) : null,
      applicableLevels: [options.level],
      postings: finalPostings,
      blockPostings: blocks.map((course, idx) => ({ courseName: course, orderIndex: idx + 1, durationWeeks: 4 })),
      specialtyPostings: [],
      groups,
      generatedBy: options.generatedBy,
      generatedAt: new Date(),
    });

    // Create StudentPostingAssignment records for posting-specific group tracking and status
    try {
      const assignmentRecords: any[] = [];
      let sequenceIndex = 0;

      for (const posting of finalPostings) {
        if (!posting.groups || !Array.isArray(posting.groups)) continue;

        for (const groupAssignment of posting.groups) {
          const groupId = groupAssignment.groupId;
          const groupDoc = await RotationGroupModel.findById(groupId).lean();
          if (!groupDoc || !Array.isArray(groupDoc.students)) continue;

          // For each student in this group for this posting
          for (const studentId of groupDoc.students) {
            assignmentRecords.push({
              student: new mongoose.Types.ObjectId(studentId),
              postingName: posting.name,
              postingCategory: posting.category,
              assignedGroup: new mongoose.Types.ObjectId(groupId),
              status: determinePostingStatus(posting.startDate, posting.endDate),
              postingStartDate: new Date(posting.startDate),
              postingEndDate: new Date(posting.endDate),
              completedUnits: [],
              sequenceIndex: sequenceIndex,
              rotationSchedule: schedule._id,
            });
          }
        }

        sequenceIndex++;
      }

      if (assignmentRecords.length > 0) {
        await StudentPostingAssignmentModel.insertMany(assignmentRecords);
      }
    } catch (assignErr) {
      console.error("Failed to create StudentPostingAssignment records:", assignErr);
    }
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
        const ScheduledNotification = (await import("../models/scheduledNotification.ts")).default;
        const { Notification } = await import("../models/notification.ts");
        await ScheduledNotification.deleteMany({ "metadata.scheduleId": { $in: existingIds } });
        await Notification.deleteMany({ "metadata.scheduleId": { $in: existingIds } });
      }
    } catch (delErr) {
      console.warn("Failed to cleanup existing schedules:", delErr);
    }

    // Anchor for non-400 flows
    // For 500-level, all postings are calculated from this anchor point (the entered start date)
    const anchor = anchorStartDate || new Date();

    // Specialty postings will be generated after the Junior O&G/Pediatrics phase

    // O&G and Pediatrics for 500-level
    // UPDATED: Implement proper unit rotation frequencies
    // - Pediatrics rotates units every 2 weeks (4 units per 2-month phase)
    // - O&G rotates units every 4 weeks (2 units per 2-month phase)
    const juniorStart = new Date(anchor);
    juniorStart.setMonth(juniorStart.getMonth() + 4);
    const juniorDurationWeeks = 16;
    const juniorHalfWeeks = 8;
    const juniorMid = new Date(juniorStart);
    juniorMid.setDate(juniorMid.getDate() + juniorHalfWeeks * 7);
    const juniorEnd = new Date(juniorStart);
    juniorEnd.setDate(juniorEnd.getDate() + juniorDurationWeeks * 7);

    // load seed staff pool (fallback)
    const seedStaff = extractStaffFromSeed();
    const staffByUnit: Record<string, any[]> = {};
    for (const s of seedStaff) {
      staffByUnit[s.unit] = staffByUnit[s.unit] || [];
      staffByUnit[s.unit].push(s);
    }

    // helper to choose supervisor: prefer DB supervisors, otherwise pick from seed
      const SUPERVISOR_RANK_THRESHOLD = 60; // numeric value for 'Senior Lecturer' and above
      const unitSupervisorMap: Record<string, any> = {};
      function chooseSupervisorForUnit(unitName: string, giIndex: number) {
        const unitKey = (unitName || '').toUpperCase();
        // reuse if already chosen for this unit (ensure one unique supervisor per unit)
        if (unitSupervisorMap[unitKey]) return unitSupervisorMap[unitKey];

        let chosen: any = null;
        if (availableSupervisors && availableSupervisors.length) {
          // prefer supervisors whose specialties include the unit
          const candidates = availableSupervisors.filter((s: any) => Array.isArray(s.specialties) && s.specialties.map((x: string) => (x||'').toUpperCase()).includes(unitKey));
          // prefer only senior supervisors (supervisorRank >= threshold)
          const seniorCandidates = (candidates.length ? candidates : availableSupervisors).filter((s: any) => (s.supervisorRank || 0) >= SUPERVISOR_RANK_THRESHOLD);
          const pool = (seniorCandidates.length ? seniorCandidates : (candidates.length ? candidates : availableSupervisors)).slice().sort((a: any, b: any) => (b.supervisorRank || 0) - (a.supervisorRank || 0));
          if (pool.length) chosen = pool[0]; // pick highest-ranked available for this unit
        }

        if (!chosen) {
          const seedPool = staffByUnit[unitName] || staffByUnit[unitName.replace(/\s+&\s+/,' & ')] || [];
          if (seedPool.length) chosen = seedPool[0];
        }

        unitSupervisorMap[unitKey] = chosen;
        return chosen;
      }

    // Get units from options or use defaults
    const pediatricsUnits = options.pediatricsUnits || [
      "Paediatric Nephrology", "Paediatric Infectious Diseases",
      "General Paediatrics", "Neonatology"
    ];
    const obgUnits = options.obgUnits || ["Gynecology", "Obstetrics"];

    // Junior Phase: Months 1-2 and 3-4 with unit rotations
    const jogGroupsJunior: any[] = [];
    const jpGroupsJunior: any[] = [];
    const halfCount = Math.ceil(groups.length / 2);
    
    for (let gi = 0; gi < groups.length; gi++) {
      const gid = groups[gi];
      
      // Create unit rotation schedule for O&G (4-week rotations = 2 units per 2-month phase)
      const obgAssignedFirst = [];
      const obgAssignedSecond = [];
      
      for (let unitIdx = 0; unitIdx < 2; unitIdx++) {
        const unitStart = new Date(juniorStart);
        unitStart.setDate(unitStart.getDate() + unitIdx * 4 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 4 * 7);
        const unitName = obgUnits[unitIdx % obgUnits.length];
        if (unitIdx < 1) {
          obgAssignedFirst.push({ unitName, startDate: unitStart, endDate: unitEnd });
        } else {
          obgAssignedSecond.push({ unitName, startDate: unitStart, endDate: unitEnd });
        }
      }
      
      for (let unitIdx = 0; unitIdx < 2; unitIdx++) {
        const unitStart = new Date(juniorMid);
        unitStart.setDate(unitStart.getDate() + unitIdx * 4 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 4 * 7);
        const unitName = obgUnits[(unitIdx + 1) % obgUnits.length];  // Use next units for second half
        if (unitIdx < 1) {
          obgAssignedFirst.push({ unitName, startDate: unitStart, endDate: unitEnd });
        } else {
          obgAssignedSecond.push({ unitName, startDate: unitStart, endDate: unitEnd });
        }
      }

      // Create unit rotation schedule for Pediatrics (2-week rotations = 4 units per 2-month phase)
      const pedAssignedFirst = [];
      const pedAssignedSecond = [];
      
      for (let unitIdx = 0; unitIdx < 4; unitIdx++) {
        const unitStart = new Date(juniorStart);
        unitStart.setDate(unitStart.getDate() + unitIdx * 2 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 2 * 7);
        const unitName = pediatricsUnits[unitIdx % pediatricsUnits.length];
        if (unitIdx < 2) {
          pedAssignedFirst.push({ unitName, startDate: unitStart, endDate: unitEnd });
        } else {
          pedAssignedSecond.push({ unitName, startDate: unitStart, endDate: unitEnd });
        }
      }
      
      for (let unitIdx = 0; unitIdx < 4; unitIdx++) {
        const unitStart = new Date(juniorMid);
        unitStart.setDate(unitStart.getDate() + unitIdx * 2 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 2 * 7);
        const unitName = pediatricsUnits[(unitIdx + 2) % pediatricsUnits.length];  // Use next units for second half
        if (unitIdx < 2) {
          pedAssignedFirst.push({ unitName, startDate: unitStart, endDate: unitEnd });
        } else {
          pedAssignedSecond.push({ unitName, startDate: unitStart, endDate: unitEnd });
        }
      }

      // choose supervisor based on first assigned unit for display and DB assignment
      // decide primary unit for supervisor selection
      const primaryObgUnit = obgAssignedFirst.length ? obgAssignedFirst[0].unitName : (obgUnits[0] || 'Gynecology/Obstetrics');
      const primaryPedUnit = pedAssignedFirst.length ? pedAssignedFirst[0].unitName : (pediatricsUnits[0] || 'General Paediatrics');
      const chosenObgSupervisor = chooseSupervisorForUnit(primaryObgUnit, gi);
      const chosenPedSupervisor = chooseSupervisorForUnit(primaryPedUnit, gi);

      // persist DB supervisor where available
      if (chosenObgSupervisor && chosenObgSupervisor._id) {
        try { await RotationGroupModel.findByIdAndUpdate(gid, { supervisor: chosenObgSupervisor._id }); } catch(e){}
      }
      if (chosenPedSupervisor && chosenPedSupervisor._id) {
        try { await RotationGroupModel.findByIdAndUpdate(gid, { supervisor: chosenPedSupervisor._id }); } catch(e){}
      }

      // include supervisorName within posting group entries for clarity
      const obgAssignedCombined = [...obgAssignedFirst, ...obgAssignedSecond].map(a=> ({ ...a, supervisorName: chosenObgSupervisor ? (chosenObgSupervisor.name || chosenObgSupervisor) : undefined }));
      const pedAssignedCombined = [...pedAssignedFirst, ...pedAssignedSecond].map(a=> ({ ...a, supervisorName: chosenPedSupervisor ? (chosenPedSupervisor.name || chosenPedSupervisor) : undefined }));

      if (gi < halfCount) {
        // Group starts in O&G first half, then Pediatrics second half
        jogGroupsJunior.push({ groupId: gid, assigned: obgAssignedCombined });
        jpGroupsJunior.push({ groupId: gid, assigned: pedAssignedCombined });
      } else {
        // Group starts in Pediatrics first half, then O&G second half
        jpGroupsJunior.push({ groupId: gid, assigned: pedAssignedCombined });
        jogGroupsJunior.push({ groupId: gid, assigned: obgAssignedCombined });
      }
    }

    // Build periods for Junior O&G and Pediatrics: split into two halves around juniorMid
    const ogJuniorPeriods: any[] = [];
    const pedJuniorPeriods: any[] = [];
    // first half period
    const ogFirstAssignments: any[] = [];
    const pedFirstAssignments: any[] = [];
    // second half period
    const ogSecondAssignments: any[] = [];
    const pedSecondAssignments: any[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const gid = groups[gi];
      const half = gi < halfCount ? 'Category One' : 'Category Two';
      // find group entries constructed earlier
      const ogGroup = jogGroupsJunior.find(g=> String(g.groupId)===String(gid));
      const pedGroup = jpGroupsJunior.find(g=> String(g.groupId)===String(gid));
      // determine supervisorName from assigned rotations (take first entry)
      const ogSup = ogGroup && ogGroup.assigned && ogGroup.assigned.length ? (ogGroup.assigned[0].supervisorName || null) : null;
      const pedSup = pedGroup && pedGroup.assigned && pedGroup.assigned.length ? (pedGroup.assigned[0].supervisorName || null) : null;
      // first half assignments use the rotations that start before or at juniorMid
      const ogFirstUnit = (ogGroup && ogGroup.assigned && ogGroup.assigned.find(a=> new Date(a.startDate) < juniorMid)) || (ogGroup && ogGroup.assigned && ogGroup.assigned[0]);
      const ogSecondUnit = (ogGroup && ogGroup.assigned && ogGroup.assigned.find(a=> new Date(a.startDate) >= juniorMid)) || (ogGroup && ogGroup.assigned && ogGroup.assigned[1]) || ogFirstUnit;
      const pedFirstUnit = (pedGroup && pedGroup.assigned && pedGroup.assigned.find(a=> new Date(a.startDate) < juniorMid)) || (pedGroup && pedGroup.assigned && pedGroup.assigned[0]);
      const pedSecondUnit = (pedGroup && pedGroup.assigned && pedGroup.assigned.find(a=> new Date(a.startDate) >= juniorMid)) || (pedGroup && pedGroup.assigned && pedGroup.assigned[1]) || pedFirstUnit;

      ogFirstAssignments.push({ groupId: gid, category: gi < halfCount ? 'Category One' : 'Category Two', unitName: ogFirstUnit ? ogFirstUnit.unitName : 'Gynecology/Obstetrics', supervisorName: ogSup });
      ogSecondAssignments.push({ groupId: gid, category: gi < halfCount ? 'Category One' : 'Category Two', unitName: ogSecondUnit ? ogSecondUnit.unitName : 'Gynecology/Obstetrics', supervisorName: ogSup });

      pedFirstAssignments.push({ groupId: gid, category: gi < halfCount ? 'Category One' : 'Category Two', unitName: pedFirstUnit ? pedFirstUnit.unitName : 'General Paediatrics', supervisorName: pedSup });
      pedSecondAssignments.push({ groupId: gid, category: gi < halfCount ? 'Category One' : 'Category Two', unitName: pedSecondUnit ? pedSecondUnit.unitName : 'General Paediatrics', supervisorName: pedSup });
    }

    ogJuniorPeriods.push({ startDate: juniorStart, endDate: juniorMid, assignments: ogFirstAssignments });
    ogJuniorPeriods.push({ startDate: juniorMid, endDate: juniorEnd, assignments: ogSecondAssignments });

    pedJuniorPeriods.push({ startDate: juniorStart, endDate: juniorMid, assignments: pedFirstAssignments });
    pedJuniorPeriods.push({ startDate: juniorMid, endDate: juniorEnd, assignments: pedSecondAssignments });

    postings.push({ name: 'O&G (Junior)', category: 'obstetrics', phase: 'O&G-Junior', startDate: juniorStart, endDate: juniorEnd, unitRotationWeeks: 4, groups: jogGroupsJunior, periods: ogJuniorPeriods, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });
    postings.push({ name: 'Pediatrics (Junior)', category: 'paediatrics', phase: 'Pediatrics-Junior', startDate: juniorStart, endDate: juniorEnd, unitRotationWeeks: 2, groups: jpGroupsJunior, periods: pedJuniorPeriods, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });

    // Generate specialty postings after Junior phase so the order is: Junior -> Specialty -> Senior
    const specialtyDefs = [
      { name: "PSYCHIATRY", umbrella: "medicine" },
      { name: "ENT", umbrella: "surgery" },
      { name: "ANESTHESIOLOGY", umbrella: "surgery" },
      { name: "RADIOLOGY", umbrella: "surgery" },
      { name: "OPHTHALMOLOGY", umbrella: "surgery" },
      { name: "DERMATOLOGY", umbrella: "medicine" }
    ];
    const specialtyStart = new Date(juniorEnd);
    const specialtyEntriesLocal: any[] = [];
    for (let monthIdx = 0; monthIdx < specialtyDefs.length; monthIdx++) {
      const thisStart = new Date(specialtyStart);
      thisStart.setMonth(thisStart.getMonth() + monthIdx);
      const thisEnd = new Date(thisStart);
      thisEnd.setMonth(thisEnd.getMonth() + 1);
      const monthGroups: any[] = [];
      for (let gi = 0; gi < groups.length; gi++) {
        const specIdx = (gi + monthIdx) % specialtyDefs.length;
        const specName: string = specialtyDefs[specIdx]!.name;
        const assigned = [{ unitName: specName, startDate: thisStart, endDate: thisEnd }];
        // choose supervisor for this specialty/unit
        const chosenSpec = chooseSupervisorForUnit(specName, gi);
        if (chosenSpec && chosenSpec._id) {
          try { await RotationGroupModel.findByIdAndUpdate(groups[gi], { supervisor: chosenSpec._id }); } catch(e){}
        }
        const assignedWithSup = assigned.map(a => ({ ...a, supervisorName: chosenSpec ? (chosenSpec.name || chosenSpec) : undefined }));
        monthGroups.push({ groupId: groups[gi], assigned: assignedWithSup });
        assignedSet(String(groups[gi]), 'specialty').add(specName);
      }
      const specIdx = monthIdx % specialtyDefs.length;
      const category = specialtyDefs[specIdx]!.umbrella;
      specialtyEntriesLocal.push({ 
        name: specialtyDefs[specIdx]!.name, 
        category: category, 
        phase: 'specialty',
        monthDurationWeeks: 4, 
        startDate: thisStart, 
        endDate: thisEnd, 
        groups: monthGroups, 
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"]
      });
    }
    // append specialties right after Junior postings
    postings.push(...specialtyEntriesLocal.map((s) => ({ name: s.name, category: s.category, startDate: s.startDate, endDate: s.endDate, groups: s.groups, workingDays: s.workingDays })));

    // Senior phase: starts after specialty postings complete
    const specialtyEnd = new Date(specialtyStart);
    specialtyEnd.setMonth(specialtyEnd.getMonth() + specialtyDefs.length);
    const seniorStart = new Date(specialtyEnd);
    const seniorHalfWeeks = 8;
    const seniorDurationWeeks = 16;
    const seniorMid = new Date(seniorStart);
    seniorMid.setDate(seniorMid.getDate() + seniorHalfWeeks * 7);
    const seniorEnd = new Date(seniorStart);
    seniorEnd.setDate(seniorEnd.getDate() + seniorDurationWeeks * 7);

    // Senior Phase: Must use completely different units than Junior phase
    const pediatricsUnitsSenior = options.pediatricsUnits ? 
      options.pediatricsUnits.slice(2).concat(options.pediatricsUnits.slice(0, 2)) :
      ["Paediatric Cardiology", "Paediatric Gastroenterology", "Paediatric Surgery", "Paediatric ICU"];
    
    const obgUnitsSenior = options.obgUnits ? 
      options.obgUnits.reverse() :
      ["Maternal-Fetal Medicine", "Reproductive Endocrinology"];

    const sJogGroupsJunior: any[] = [];
    const sJpGroupsJunior: any[] = [];
    
    for (let gi = 0; gi < groups.length; gi++) {
      const gid = groups[gi];
      
      // Create unit rotation schedule for O&G (4-week rotations = 2 units per 2-month phase)
      const obgAssignedFirst = [];
      const obgAssignedSecond = [];
      
      for (let unitIdx = 0; unitIdx < 2; unitIdx++) {
        const unitStart = new Date(seniorStart);
        unitStart.setDate(unitStart.getDate() + unitIdx * 4 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 4 * 7);
        const unitName = obgUnitsSenior[unitIdx % obgUnitsSenior.length];
        if (unitIdx < 1) {
          obgAssignedFirst.push({ unitName, startDate: unitStart, endDate: unitEnd });
        } else {
          obgAssignedSecond.push({ unitName, startDate: unitStart, endDate: unitEnd });
        }
      }
      
      for (let unitIdx = 0; unitIdx < 2; unitIdx++) {
        const unitStart = new Date(seniorMid);
        unitStart.setDate(unitStart.getDate() + unitIdx * 4 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 4 * 7);
        const unitName = obgUnitsSenior[(unitIdx + 1) % obgUnitsSenior.length];
        if (unitIdx < 1) {
          obgAssignedFirst.push({ unitName, startDate: unitStart, endDate: unitEnd });
        } else {
          obgAssignedSecond.push({ unitName, startDate: unitStart, endDate: unitEnd });
        }
      }

      // Create unit rotation schedule for Pediatrics (2-week rotations = 4 units per 2-month phase)
      const pedAssignedFirst = [];
      const pedAssignedSecond = [];
      
      for (let unitIdx = 0; unitIdx < 4; unitIdx++) {
        const unitStart = new Date(seniorStart);
        unitStart.setDate(unitStart.getDate() + unitIdx * 2 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 2 * 7);
        const unitName = pediatricsUnitsSenior[unitIdx % pediatricsUnitsSenior.length];
        if (unitIdx < 2) {
          pedAssignedFirst.push({ unitName, startDate: unitStart, endDate: unitEnd });
        } else {
          pedAssignedSecond.push({ unitName, startDate: unitStart, endDate: unitEnd });
        }
      }
      
      for (let unitIdx = 0; unitIdx < 4; unitIdx++) {
        const unitStart = new Date(seniorMid);
        unitStart.setDate(unitStart.getDate() + unitIdx * 2 * 7);
        const unitEnd = new Date(unitStart);
        unitEnd.setDate(unitEnd.getDate() + 2 * 7);
        const unitName = pediatricsUnitsSenior[(unitIdx + 2) % pediatricsUnitsSenior.length];
        if (unitIdx < 2) {
          pedAssignedFirst.push({ unitName, startDate: unitStart, endDate: unitEnd });
        } else {
          pedAssignedSecond.push({ unitName, startDate: unitStart, endDate: unitEnd });
        }
      }

      // choose supervisor for senior units
      const primaryObgUnitS = obgAssignedFirst.length ? obgAssignedFirst[0].unitName : (obgUnitsSenior[0] || 'Gynecology/Obstetrics');
      const primaryPedUnitS = pedAssignedFirst.length ? pedAssignedFirst[0].unitName : (pediatricsUnitsSenior[0] || 'General Paediatrics');
      const chosenObgSupervisorS = chooseSupervisorForUnit(primaryObgUnitS, gi);
      const chosenPedSupervisorS = chooseSupervisorForUnit(primaryPedUnitS, gi);
      if (chosenObgSupervisorS && chosenObgSupervisorS._id) {
        try { await RotationGroupModel.findByIdAndUpdate(gid, { supervisor: chosenObgSupervisorS._id }); } catch(e){}
      }
      if (chosenPedSupervisorS && chosenPedSupervisorS._id) {
        try { await RotationGroupModel.findByIdAndUpdate(gid, { supervisor: chosenPedSupervisorS._id }); } catch(e){}
      }
      const obgAssignedCombinedS = [...obgAssignedFirst, ...obgAssignedSecond].map(a=> ({ ...a, supervisorName: chosenObgSupervisorS ? (chosenObgSupervisorS.name || chosenObgSupervisorS) : undefined }));
      const pedAssignedCombinedS = [...pedAssignedFirst, ...pedAssignedSecond].map(a=> ({ ...a, supervisorName: chosenPedSupervisorS ? (chosenPedSupervisorS.name || chosenPedSupervisorS) : undefined }));

      if (gi < halfCount) {
        sJogGroupsJunior.push({ groupId: gid, assigned: obgAssignedCombinedS });
        sJpGroupsJunior.push({ groupId: gid, assigned: pedAssignedCombinedS });
      } else {
        sJpGroupsJunior.push({ groupId: gid, assigned: pedAssignedCombinedS });
        sJogGroupsJunior.push({ groupId: gid, assigned: obgAssignedCombinedS });
      }
    }
    
    // Build periods for Senior O&G and Pediatrics similar to Junior split
    const ogSeniorPeriods: any[] = [];
    const pedSeniorPeriods: any[] = [];
    const ogSFirstAssignments: any[] = [];
    const ogSSecondAssignments: any[] = [];
    const pedSFirstAssignments: any[] = [];
    const pedSSecondAssignments: any[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const gid = groups[gi];
      const ogGroup = sJogGroupsJunior.find(g=> String(g.groupId)===String(gid));
      const pedGroup = sJpGroupsJunior.find(g=> String(g.groupId)===String(gid));
      const ogSup = ogGroup && ogGroup.assigned && ogGroup.assigned.length ? (ogGroup.assigned[0].supervisorName || null) : null;
      const pedSup = pedGroup && pedGroup.assigned && pedGroup.assigned.length ? (pedGroup.assigned[0].supervisorName || null) : null;
      const ogFirstUnit = (ogGroup && ogGroup.assigned && ogGroup.assigned.find(a=> new Date(a.startDate) < seniorMid)) || (ogGroup && ogGroup.assigned && ogGroup.assigned[0]);
      const ogSecondUnit = (ogGroup && ogGroup.assigned && ogGroup.assigned.find(a=> new Date(a.startDate) >= seniorMid)) || (ogGroup && ogGroup.assigned && ogGroup.assigned[1]) || ogFirstUnit;
      const pedFirstUnit = (pedGroup && pedGroup.assigned && pedGroup.assigned.find(a=> new Date(a.startDate) < seniorMid)) || (pedGroup && pedGroup.assigned && pedGroup.assigned[0]);
      const pedSecondUnit = (pedGroup && pedGroup.assigned && pedGroup.assigned.find(a=> new Date(a.startDate) >= seniorMid)) || (pedGroup && pedGroup.assigned && pedGroup.assigned[1]) || pedFirstUnit;
      const half = gi < halfCount ? 'Category One' : 'Category Two';
      ogSFirstAssignments.push({ groupId: gid, category: half, unitName: ogFirstUnit ? ogFirstUnit.unitName : 'Gynecology/Obstetrics', supervisorName: ogSup });
      ogSSecondAssignments.push({ groupId: gid, category: half, unitName: ogSecondUnit ? ogSecondUnit.unitName : 'Gynecology/Obstetrics', supervisorName: ogSup });
      pedSFirstAssignments.push({ groupId: gid, category: half, unitName: pedFirstUnit ? pedFirstUnit.unitName : 'General Paediatrics', supervisorName: pedSup });
      pedSSecondAssignments.push({ groupId: gid, category: half, unitName: pedSecondUnit ? pedSecondUnit.unitName : 'General Paediatrics', supervisorName: pedSup });
    }
    ogSeniorPeriods.push({ startDate: seniorStart, endDate: seniorMid, assignments: ogSFirstAssignments });
    ogSeniorPeriods.push({ startDate: seniorMid, endDate: seniorEnd, assignments: ogSSecondAssignments });
    pedSeniorPeriods.push({ startDate: seniorStart, endDate: seniorMid, assignments: pedSFirstAssignments });
    pedSeniorPeriods.push({ startDate: seniorMid, endDate: seniorEnd, assignments: pedSSecondAssignments });

    postings.push({ name: 'O&G (Senior)', category: 'obstetrics', phase: 'O&G-Senior', startDate: seniorStart, endDate: seniorEnd, unitRotationWeeks: 4, groups: sJogGroupsJunior, periods: ogSeniorPeriods, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });
    postings.push({ name: 'Pediatrics (Senior)', category: 'paediatrics', phase: 'Pediatrics-Senior', startDate: seniorStart, endDate: seniorEnd, unitRotationWeeks: 2, groups: sJpGroupsJunior, periods: pedSeniorPeriods, workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"] });

    // specialty entries were already appended after Junior phase

    // If a specific posting was requested, filter postings accordingly
    let finalPostings = postings.slice();
    if (filterOption && filterOption !== 'all') {
      const f = filterOption;
      if (f === 'M0-M2') finalPostings = postings.filter((p:any)=> ['O&G (Junior)','Pediatrics (Junior)','O&G (Senior)','Pediatrics (Senior)'].includes(p.name) || ['M1','M2','S1','S2'].includes(p.name));
      else if (f === 'PED_JUNIOR') finalPostings = postings.filter((p:any)=> p.name && String(p.name).toLowerCase().includes('pediatrics') && String(p.name).toLowerCase().includes('junior'));
      else if (f === 'OG_JUNIOR') finalPostings = postings.filter((p:any)=> p.name && String(p.name).toLowerCase().includes('o&g') || (p.name && String(p.name).toLowerCase().includes('obstetrics')));
      else if (f === 'M3-S3') finalPostings = postings.filter((p:any)=> p.name && (String(p.name).toLowerCase().includes('senior')));
      else if (f === 'specialties') finalPostings = postings.filter((p:any)=> p.phase === 'specialty' || (p.name && ['PSYCHIATRY','ENT','ANESTHESIOLOGY','RADIOLOGY','OPHTHALMOLOGY','DERMATOLOGY'].includes(p.name)));
    } else if (requestedPostingName) {
      finalPostings = postings.filter((p) => p.name && String(p.name).toLowerCase() === requestedPostingName);
    }

    // Ensure postings are ordered by start date (ascending) so schedule ordering is deterministic by date
    finalPostings.sort((a: any, b: any) => {
      const da = a?.startDate ? new Date(a.startDate).getTime() : Infinity;
      const db = b?.startDate ? new Date(b.startDate).getTime() : Infinity;
      return da - db;
    });

    schedule = await RotationScheduleModel.create({
      name: `${cls.name} Rotations ${new Date().getFullYear()}`,
      class: cls._id,
      academicYear: academicYearId,
      applicableLevels: [options.level],
      startDate: options.startDate ? new Date(options.startDate) : (finalPostings.length ? new Date(Math.min(...finalPostings.map((p:any)=> new Date(p.startDate).getTime()))) : new Date()),
      endDate: finalPostings.length ? new Date(Math.max(...finalPostings.map((p:any)=> new Date(p.endDate).getTime()))) : null,
      postings: finalPostings,
      blockPostings: [],
      specialtyPostings: finalPostings.filter((p: any) => p.phase === 'specialty').map((s: any) => ({ name: s.name, category: s.category, monthDurationWeeks: 4 })),
      groups,
      generatedBy: options.generatedBy,
      generatedAt: new Date(),
    });

    // Create StudentPostingAssignment records for posting-specific group tracking and status
    try {
      const assignmentRecords: any[] = [];
      let sequenceIndex = 0;

      for (const posting of finalPostings) {
        if (!posting.groups || !Array.isArray(posting.groups)) continue;

        for (const groupAssignment of posting.groups) {
          const groupId = groupAssignment.groupId;
          const groupDoc = await RotationGroupModel.findById(groupId).lean();
          if (!groupDoc || !Array.isArray(groupDoc.students)) continue;

          // For each student in this group for this posting
          for (const studentId of groupDoc.students) {
            assignmentRecords.push({
              student: new mongoose.Types.ObjectId(studentId),
              postingName: posting.name,
              postingCategory: posting.category,
              assignedGroup: new mongoose.Types.ObjectId(groupId),
              status: determinePostingStatus(posting.startDate, posting.endDate),
              postingStartDate: new Date(posting.startDate),
              postingEndDate: new Date(posting.endDate),
              completedUnits: [],
              sequenceIndex: sequenceIndex,
              rotationSchedule: schedule._id,
            });
          }
        }

        sequenceIndex++;
      }

      if (assignmentRecords.length > 0) {
        await StudentPostingAssignmentModel.insertMany(assignmentRecords);
      }
    } catch (assignErr) {
      console.error("Failed to create StudentPostingAssignment records:", assignErr);
    }
  }

  // Build student map for notifications and rotation creation
  // This needs to be accessible to both notification and clinical rotation logic
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
    // include period-based assignments if present (e.g., half-periods for O&G/Pediatrics)
    if (Array.isArray(p.periods)) {
      for (const period of p.periods) {
        for (const a of period.assignments || []) {
          const gid = String(a.groupId);
          const group = groupDocs.find((g) => String(g._id) === gid);
          if (!group) continue;
          for (const sid of (group.students || [])) {
            const sidStr = String(sid);
            if (!studentMap[sidStr]) studentMap[sidStr] = { groupName: group.name || `Group ${gid}`, postings: [] };
            const unitEntry = { unitName: a.unitName, startDate: period.startDate, endDate: period.endDate, supervisorName: a.supervisorName, category: a.category };
            studentMap[sidStr]!.postings.push({ postingName: p.name, category: p.category, units: [unitEntry] });
          }
        }
      }
    }
  }

  // Notify students about their grouping and schedule summary
  try {
    const { Notification } = await import("../models/notification.ts");
    const ScheduledNotification = (await import("../models/scheduledNotification.ts")).default;

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
    const ClinicalRotation = (await import('../models/clinicalRotation.ts')).default;
    // refresh groups with supervisor populated
    const refreshedGroups = await RotationGroupModel.find({ _id: { $in: groups } }).populate('supervisor', 'name email supervisorRank specialties');
    const groupById: Record<string, any> = {};
    
    // Build group map for lookups
    for (const group of refreshedGroups) {
      const gid = String(group._id);
      groupById[gid] = group;
    }

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
          let assignedGroupId: any = null;
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
                // Get the group ID for this posting
                assignedGroupId = new mongoose.Types.ObjectId(String(pg.groupId));
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
            // Posting-specific assignment tracking
            postingName: po.postingName || '',
            assignedGroup: assignedGroupId,
            postingCategory: po.category || '',
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
