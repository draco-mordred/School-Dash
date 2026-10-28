import { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import type { AuthRequest } from '../middleware/auth';
import RotationPlan from '../models/rotationPlan';
import User from '../models/user';
import ClassModel from '../models/classes';
import AcademicClock from '../models/academicClock';
import generateKrystaSchedule from '../services/krystaGenerator';
import runRotationSnapshot from '../services/rotationRunner';
import { attachSpinMetadataToTimeline, generatePostingSpinsForPayload } from '../utils/spinGenerator';
import {
  hasConfiguredAcademicClockPhases,
  phaseRequiresPostingSchedule,
  resolveAcademicClockPhase,
} from '../utils/academicClockPhase';

export const getClassActivePhaseSchedule = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const classDoc = await ClassModel.findById(classId)
      .select('academicYear courses')
      .populate('courses', 'name code')
      .lean();
    if (!classDoc) return res.status(404).json({ message: 'Class not found' });
    const clock = await AcademicClock.findOne({
      classId,
      academicYear: classDoc.academicYear,
    }).lean();
    if (!clock) return res.status(404).json({ message: 'Academic clock not found for this class' });

    const resolved = resolveAcademicClockPhase(clock);
    const phaseConfig = resolved.phase as Record<string, any> | null;
    const phaseDriven = hasConfiguredAcademicClockPhases(clock.phaseConfig);
    const postingRequired = phaseRequiresPostingSchedule(phaseConfig);
    const configuredScheduleId = phaseConfig?.postingScheduleId ?? phaseConfig?.postingId;
    const scheduleId = configuredScheduleId ? String(configuredScheduleId) : null;
    const postingName = phaseConfig?.postingName ? String(phaseConfig.postingName) : null;
    const plan = scheduleId && mongoose.isValidObjectId(scheduleId)
      ? await RotationPlan.findOne({ _id: scheduleId, class: classId }).lean()
      : null;
    const posting = plan?.postings?.find((item: any) => String(item.name) === postingName) ?? null;
    const courseById = new Map(
      ((classDoc as any).courses ?? []).map((course: any) => [String(course._id), course]),
    );
    const learningObjectives = (phaseConfig?.learningObjectives ?? []).map((objective: any) => ({
      ...objective,
      courseName: objective.courseId
        ? courseById.get(String(objective.courseId))?.name ?? null
        : null,
      courseCode: objective.courseId
        ? courseById.get(String(objective.courseId))?.code ?? null
        : null,
    }));

    return res.json({
      phaseId: resolved.phaseId,
      phaseName: phaseConfig?.name ?? null,
      startsAt: resolved.startsAt,
      endsAt: resolved.endsAt,
      isPhaseActive: Boolean(
        resolved.phaseId &&
        (!resolved.startsAt || !resolved.endsAt ||
          (new Date() >= resolved.startsAt && new Date() < resolved.endsAt)),
      ),
      postingRequired: phaseDriven ? postingRequired : null,
      postingConfigured: Boolean(scheduleId && postingName),
      postingAvailable: Boolean(plan && posting),
      scheduleId,
      scheduleName: plan?.name ?? null,
      postingName,
      posting,
      courseIds: phaseConfig?.courseIds ?? [],
      learningObjectives,
      courses: ((classDoc as any).courses ?? []).filter((course: any) =>
        !Array.isArray(phaseConfig?.courseIds) ||
        phaseConfig.courseIds.length === 0 ||
        phaseConfig.courseIds.some((courseId: unknown) => String(courseId) === String(course._id)),
      ),
    });
  } catch (err) {
    console.error('getClassActivePhaseSchedule error', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// POST /api/rotation-schedules
export const createRotationSchedule = async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    payload.createdBy = (req as any).user?._id;
    // If payload requests Krysta generator or provides departments, generate canonical schedule
    if (payload.generateWith === 'krysta' || payload.krysta === true || Array.isArray(payload.departments)) {
      if (!payload.class) {
        return res.status(400).json({ message: 'Missing class id for schedule generation' });
      }
      if (!Array.isArray(payload.departments) || payload.departments.length === 0) {
        return res.status(400).json({ message: 'At least one department is required for schedule generation' });
      }
      try {
        const planObj = await generateKrystaSchedule({
          classId: payload.class,
          name: payload.name || 'Krysta Rotation',
          startDate: payload.startDate || new Date().toISOString(),
          endDate: payload.endDate || new Date().toISOString(),
          departments: payload.departments || [],
          createdBy: payload.createdBy,
          phaseId: payload.phaseId,
          phaseName: payload.phaseName,
          postingScheduleId: payload.postingScheduleId,
        });

        await generatePostingSpinsForPayload(planObj.class, planObj.postings || []);
        const timeline = Array.isArray(planObj.meta?.timeline) ? planObj.meta.timeline : [];
        attachSpinMetadataToTimeline(timeline, planObj.postings || []);

        const doc = await RotationPlan.create({
          ...planObj,
          meta: {
            ...(planObj.meta || {}),
            timeline,
            phases: Array.isArray(planObj.meta?.phases) ? planObj.meta.phases : [],
            unvisitedUnits: Array.isArray(planObj.meta?.unvisitedUnits) ? planObj.meta.unvisitedUnits : [],
            unvisitedUnitGroups: Array.isArray(planObj.meta?.unvisitedUnitGroups) ? planObj.meta.unvisitedUnitGroups : [],
          },
          postings: (planObj.postings || []).map((posting: any) => ({
            ...posting,
            meta: {
              ...(posting.meta || {}),
              timeline,
            },
          })),
        });
        return res.status(201).json(doc);
      } catch (gErr: any) {
        console.error('Krysta generation failed', gErr);
        return res.status(500).json({ message: gErr?.message || 'Generation failed', error: String(gErr) });
      }
    }

    const doc = await RotationPlan.create({
      ...payload,
      meta: {
        ...(payload.meta || {}),
        timeline: Array.isArray(payload.meta?.timeline) ? payload.meta.timeline : [],
        phases: Array.isArray(payload.meta?.phases) ? payload.meta.phases : [],
        unvisitedUnits: Array.isArray(payload.meta?.unvisitedUnits) ? payload.meta.unvisitedUnits : [],
        unvisitedUnitGroups: Array.isArray(payload.meta?.unvisitedUnitGroups) ? payload.meta.unvisitedUnitGroups : [],
      },
      postings: (payload.postings || []).map((posting: any) => ({
        ...posting,
        meta: {
          ...(posting.meta || {}),
          timeline: Array.isArray(payload.meta?.timeline) ? payload.meta.timeline : [],
        },
      })),
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error('createRotationSchedule error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// GET /api/rotation-schedules
export const listRotationSchedules = async (req: Request, res: Response) => {
  try {
    const { classId, query, page = 1, limit = 50 } = req.query as any;
    const filter: any = {};
    if (classId) filter.class = classId;
    if (query) filter.name = { $regex: String(query), $options: 'i' };

    const docs = await RotationPlan.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    const total = await RotationPlan.countDocuments(filter);
    res.json({ schedules: docs, total, page: +page, limit: +limit });
  } catch (err) {
    console.error('listRotationSchedules error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

export const listMyStudentRotationSchedules = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = String(req.user?._id ?? '');
    if (!studentId) return res.status(401).json({ message: 'Not authorized' });

    const schedules = await RotationPlan.find({
      'meta.timeline.studentIds': { $in: [studentId, req.user?._id] },
    }).sort({ createdAt: -1 }).lean();

    const studentSchedules = schedules.flatMap((schedule: any) => {
      const timeline = Array.isArray(schedule?.meta?.timeline) ? schedule.meta.timeline : [];
      const studentTimeline = timeline.filter((window: any) =>
        Array.isArray(window?.studentIds) && window.studentIds.some((id: unknown) => String(id) === studentId),
      );

      if (!studentTimeline.length) return [];

      return [{
        _id: schedule._id,
        name: schedule.name,
        postings: Array.isArray(schedule.postings)
          ? schedule.postings.map((posting: any) => ({ name: posting?.name, startDate: posting?.startDate, endDate: posting?.endDate }))
          : [],
        meta: { timeline: studentTimeline },
      }];
    });

    return res.json({ schedules: studentSchedules });
  } catch (error) {
    console.error('listMyStudentRotationSchedules error', error);
    return res.status(500).json({ message: 'Unable to load student posting schedules' });
  }
};

// GET /api/rotation-schedules/:id
export const getRotationScheduleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await RotationPlan.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'Schedule not found' });
    res.json(doc);
  } catch (err) {
    console.error('getRotationScheduleById error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// DELETE /api/rotation-schedules/:id
export const deleteRotationSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await RotationPlan.findByIdAndDelete(id).lean();
    if (!doc) return res.status(404).json({ message: 'Schedule not found' });
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    console.error('deleteRotationSchedule error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

const getSupervisorIdentityById = async (supervisorId: string | null) => {
  if (!supervisorId) return { name: null, email: null };
  const supervisor = await User.findById(supervisorId).select('name email').lean();
  return {
    name: supervisor?.name || null,
    email: supervisor?.email || null,
  };
};

// POST /api/rotation-schedules/:id/assign-supervisor
export const assignSupervisorToWindow = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { windowIndex, supervisorId } = req.body as any;
    if (typeof windowIndex !== 'number' && !req.body.matching) return res.status(400).json({ message: 'Missing windowIndex or matching criteria' });

    const plan = await RotationPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Schedule not found' });

    const timeline = (plan.meta && plan.meta.timeline) || [];
    const supervisorIdentity = await getSupervisorIdentityById(supervisorId || null);
    const supervisorName = supervisorIdentity.name;
    const supervisorEmail = supervisorIdentity.email;

    if (typeof windowIndex === 'number') {
      if (!timeline[windowIndex]) return res.status(400).json({ message: 'Invalid windowIndex' });
      timeline[windowIndex].supervisorId = supervisorId;
      timeline[windowIndex].supervisorName = supervisorName;
      timeline[windowIndex].supervisorEmail = supervisorEmail;
    } else if (req.body.matching) {
      // allow matching criteria to set multiple windows: { matching: { departmentIndex, departmentGroupIndex, unitGroupIndex } }
      const m = req.body.matching || {};
      for (let i = 0; i < timeline.length; i++) {
        const t = timeline[i];
        let ok = true;
        if (m.departmentIndex !== undefined) ok = ok && t.departmentIndex === m.departmentIndex;
        if (m.departmentGroupIndex !== undefined) ok = ok && t.departmentGroupIndex === m.departmentGroupIndex;
        if (m.unitGroupIndex !== undefined) ok = ok && t.unitGroupIndex === m.unitGroupIndex;
        if (ok) {
          t.supervisorId = supervisorId;
          t.supervisorName = supervisorName;
          t.supervisorEmail = supervisorEmail;
        }
      }
    }

    plan.meta = { ...(plan.meta || {}), timeline };

    // Also persist supervisor in postings.groups for easier lookup and keep posting timeline copy in sync
    const postings = plan.postings || [];
    for (const p of postings) {
      p.meta = { ...(p.meta || {}), timeline };
      const groups = p.groups || [];
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        // Match this group with windows that have matching departmentGroupIndex
        let supervisorForGroup: any = null;
        let supervisorNameForGroup: string | null = null;
        let supervisorEmailForGroup: string | null = null;
        for (const t of timeline) {
          if (t.departmentGroupIndex === i && t.supervisorId) {
            supervisorForGroup = t.supervisorId;
            supervisorNameForGroup = t.supervisorName || null;
            supervisorEmailForGroup = t.supervisorEmail || null;
            break;
          }
        }
        if (supervisorForGroup) {
          g.supervisor = supervisorForGroup;
          g.supervisorName = supervisorNameForGroup || undefined;
          g.supervisorEmail = supervisorEmailForGroup || undefined;
          g.departmentSupervisor = supervisorForGroup;
          g.departmentSupervisorName = supervisorNameForGroup || undefined;
          g.departmentSupervisorEmail = supervisorEmailForGroup || undefined;
        }
      }
    }

    await plan.save();
    res.json({ message: 'Supervisor assigned', id, timeline });
  } catch (err) {
    console.error('assignSupervisorToWindow error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// GET /api/rotation-schedules/student-assignments?studentId=...
export const getStudentAssignments = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query as any;
    if (!studentId) return res.status(400).json({ message: 'Missing studentId' });

    const schedules = await RotationPlan.find({}).sort({ createdAt: -1 }).limit(200).lean();
    const assignments: Record<string, { groupName?: string; supervisorName?: string }> = {};

    for (const s of schedules) {
      const postings = s.postings || [];
      for (const p of postings) {
        const groups = p.groups || [];
        for (const g of groups) {
          // g.group may be embedded with students
          const groupObj = g.group || {};
          const students = Array.isArray(groupObj.students) ? groupObj.students : [];
          if (students.some((st: any) => String(st) === String(studentId) || (st && st._id && String(st._id) === String(studentId)))) {
            assignments[p.name || 'Posting'] = { groupName: groupObj.name || g.groupId || 'Group', supervisorName: g.supervisorName || '' };
          }
        }
      }
    }

    res.json({ assignments });
  } catch (err) {
    console.error('getStudentAssignments error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// GET /api/rotation-schedules/student/:studentId/current
export const getStudentCurrentSchedule = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params as any;
    if (!studentId) return res.status(400).json({ message: 'Missing studentId' });

    const now = new Date();
    const student = await User.findById(studentId).select('studentClasses').lean();
    const studentClassId = student?.studentClasses
      ? String((student.studentClasses as any)?._id ?? student.studentClasses)
      : null;
    const classDoc = studentClassId
      ? await ClassModel.findById(studentClassId)
        .select('academicYear courses')
        .populate('courses', 'name code')
        .lean()
      : null;
    const clock = classDoc?.academicYear
      ? await AcademicClock.findOne({
        classId: studentClassId,
        academicYear: classDoc.academicYear,
      }).lean()
      : null;
    const activePhase = clock ? resolveAcademicClockPhase(clock, now) : null;
    const phaseConfig = activePhase?.phase as Record<string, any> | null;
    const scheduleId = phaseConfig?.postingScheduleId
      ? String(phaseConfig.postingScheduleId)
      : phaseConfig?.postingId
        ? String(phaseConfig.postingId)
        : null;
    const postingName = phaseConfig?.postingName
      ? String(phaseConfig.postingName)
      : null;
    const postingRequired = phaseRequiresPostingSchedule(phaseConfig);
    const phaseDriven = hasConfiguredAcademicClockPhases(clock?.phaseConfig);
    const hasPhasePostingConfiguration = postingRequired || Boolean(scheduleId || postingName);
    const classCourses = (((classDoc as any)?.courses ?? []) as any[]);
    const phaseCourseIds = Array.isArray(phaseConfig?.courseIds)
      ? phaseConfig.courseIds.map(String)
      : [];
    const phaseCourses = classCourses.filter((course: any) =>
      phaseCourseIds.length === 0 || phaseCourseIds.includes(String(course._id)),
    );
    const courseById = new Map(classCourses.map((course: any) => [String(course._id), course]));
    const learningObjectives = (phaseConfig?.learningObjectives ?? []).map((objective: any) => ({
      ...objective,
      courseName: objective.courseId
        ? courseById.get(String(objective.courseId))?.name ?? null
        : null,
      courseCode: objective.courseId
        ? courseById.get(String(objective.courseId))?.code ?? null
        : null,
    }));
    const phaseIsActive = !activePhase?.startsAt || !activePhase?.endsAt ||
      (now >= activePhase.startsAt && now < activePhase.endsAt);
    const phaseResponse = {
      phaseId: activePhase?.phaseId ?? null,
      phaseName: phaseConfig?.name ?? null,
      phaseStartsAt: activePhase?.startsAt ?? null,
      phaseEndsAt: activePhase?.endsAt ?? null,
      phaseDriven,
      postingRequired,
      postingConfigured: hasPhasePostingConfiguration
        ? Boolean(scheduleId && postingName)
        : null,
      phaseCourseIds,
      phaseCourses,
      learningObjectives,
    };
    if (phaseDriven && !hasPhasePostingConfiguration) {
      return res.json({ current: [], ...phaseResponse });
    }
    if (phaseDriven && (!phaseIsActive || !scheduleId || !postingName)) {
      return res.json({
        current: [],
        ...phaseResponse,
      });
    }
    if (phaseDriven && !mongoose.isValidObjectId(scheduleId)) {
      return res.json({
        current: [],
        ...phaseResponse,
        postingConfigured: false,
      });
    }

    const schedules = phaseDriven
      ? await RotationPlan.find({ _id: scheduleId, class: studentClassId }).lean()
      : await RotationPlan.find({}).sort({ createdAt: -1 }).limit(200).lean();
    const current: any[] = [];

    for (const s of schedules) {
      if (
        phaseDriven &&
        !s.postings?.some((posting: any) => String(posting.name) === postingName)
      ) continue;
      const timeline = (s.meta && s.meta.timeline) || [];
      for (let i = 0; i < timeline.length; i++) {
        const t = timeline[i];
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        const students = Array.isArray(t.studentIds) ? t.studentIds : [];
        if (students.some((st: any) => String(st) === String(studentId))) {
          if (start <= now && now < end) {
            // include minimal schedule info so clients can access postings/groups
            const activePostings = phaseDriven
              ? (s.postings ?? []).filter((posting: any) => String(posting.name) === postingName)
              : s.postings ?? [];
            current.push({
              scheduleId: s._id,
              postingName: postingName ?? s.postings?.[0]?.name ?? s.name,
              windowIndex: i,
              window: t,
              schedule: { _id: s._id, postings: activePostings, meta: s.meta || {} },
            });
          }
        }
      }
    }

    res.json({
      current,
      ...phaseResponse,
    });
  } catch (err) {
    console.error('getStudentCurrentSchedule error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// GET /api/rotation-schedules/student/:studentId/upcoming
export const getStudentUpcomingSchedule = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params as any;
    const limit = Number(req.query.limit || 5);
    if (!studentId) return res.status(400).json({ message: 'Missing studentId' });

    const schedules = await RotationPlan.find({}).sort({ createdAt: -1 }).limit(200).lean();
    const now = new Date();
    const upcoming: any[] = [];

    for (const s of schedules) {
      const timeline = (s.meta && s.meta.timeline) || [];
      for (let i = 0; i < timeline.length; i++) {
        const t = timeline[i];
        const start = new Date(t.startDate);
        const students = Array.isArray(t.studentIds) ? t.studentIds : [];
        if (students.some((st: any) => String(st) === String(studentId))) {
          if (start > now) {
            upcoming.push({ scheduleId: s._id, postingName: s.postings?.[0]?.name || s.name, windowIndex: i, window: t });
          }
        }
      }
    }

    upcoming.sort((a, b) => new Date(a.window.startDate).getTime() - new Date(b.window.startDate).getTime());
    res.json({ upcoming: upcoming.slice(0, limit) });
  } catch (err) {
    console.error('getStudentUpcomingSchedule error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// GET /api/rotation-schedules/student/:studentId/history
export const getStudentScheduleHistory = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params as any;
    const limit = Number(req.query.limit || 50);
    if (!studentId) return res.status(400).json({ message: 'Missing studentId' });

    const schedules = await RotationPlan.find({}).sort({ createdAt: -1 }).limit(200).lean();
    const now = new Date();
    const history: any[] = [];

    for (const s of schedules) {
      const timeline = (s.meta && s.meta.timeline) || [];
      for (let i = 0; i < timeline.length; i++) {
        const t = timeline[i];
        const end = new Date(t.endDate);
        const students = Array.isArray(t.studentIds) ? t.studentIds : [];
        if (students.some((st: any) => String(st) === String(studentId))) {
          if (end <= now) {
            history.push({ scheduleId: s._id, postingName: s.postings?.[0]?.name || s.name, windowIndex: i, window: t });
          }
        }
      }
    }

    history.sort((a, b) => new Date(b.window.startDate).getTime() - new Date(a.window.startDate).getTime());
    res.json({ history: history.slice(0, limit) });
  } catch (err) {
    console.error('getStudentScheduleHistory error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// POST /api/rotation-schedules/:id/run
export const runRotationRunner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { snapshotTime, windowIndex } = req.body as any;
    const snap = await runRotationSnapshot(id, { snapshotTime, windowIndex });
    res.json({ message: 'Snapshot persisted', snapshot: snap });
  } catch (err) {
    console.error('runRotationRunner error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// GET /api/rotation-schedules/:id/supervisors
export const listScheduleSupervisors = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const plan = await RotationPlan.findById(id).lean();
    if (!plan) return res.status(404).json({ message: 'Schedule not found' });

    const timeline = (plan.meta && plan.meta.timeline) || [];
    const supervisors: Record<string, any> = {};

    // Build supervisor map from timeline windows
    for (const t of timeline) {
      if (t.supervisorId) {
        const key = `dept_${t.departmentIndex}_group_${t.departmentGroupIndex}`;
        if (!supervisors[key]) {
          supervisors[key] = {
            departmentIndex: t.departmentIndex,
            departmentGroupIndex: t.departmentGroupIndex,
            supervisorId: t.supervisorId,
            supervisorName: t.supervisorName || null,
          };
        }
      }
    }

    res.json({ id, supervisors: Object.values(supervisors) });
  } catch (err) {
    console.error('listScheduleSupervisors error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// GET /api/rotation-schedules/events?classId=...&start=...&end=...
export const listScheduleEvents = async (req: Request, res: Response) => {
  try {
    const { classId, start, end } = req.query as any;
    if (!classId) return res.status(400).json({ message: 'Missing classId' });

    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    const planQuery: Record<string, unknown> = { class: classId };
    let activePostingName: string | null = null;
    if (req.query.activePhaseOnly === 'true') {
      const classDoc = await ClassModel.findById(classId).select('academicYear').lean();
      const clock = classDoc?.academicYear
        ? await AcademicClock.findOne({
          classId,
          academicYear: classDoc.academicYear,
        }).lean()
        : null;
      if (hasConfiguredAcademicClockPhases(clock?.phaseConfig)) {
        const activePhase = resolveAcademicClockPhase(clock);
        const phaseConfig = activePhase.phase as Record<string, any> | null;
        if (!phaseRequiresPostingSchedule(phaseConfig)) {
          return res.json({ events: [] });
        }
        const scheduleId = phaseConfig?.postingScheduleId ?? phaseConfig?.postingId;
        activePostingName = phaseConfig?.postingName ? String(phaseConfig.postingName) : null;
        if (!scheduleId || !mongoose.isValidObjectId(String(scheduleId))) {
          return res.json({ events: [] });
        }
        planQuery._id = String(scheduleId);
      }
    }

    const plans = await RotationPlan.find(planQuery).lean();
    const events: any[] = [];

    for (const p of plans) {
      if (
        activePostingName &&
        !p.postings?.some((posting: any) => String(posting.name) === activePostingName)
      ) continue;
      const timeline = (p.meta && p.meta.timeline) || [];
      for (let i = 0; i < timeline.length; i++) {
        const t = timeline[i];
        const s = t.startDate ? new Date(t.startDate) : null;
        const e = t.endDate ? new Date(t.endDate) : null;
        // if start/end filters provided, ensure overlap
        if (startDate && endDate && s && e) {
          if (!(e > startDate && s < endDate)) continue;
        }

        events.push({
          id: `${p._id}-${i}`,
          scheduleId: p._id,
          postingId: p.postings?.[0]?.postingId || null,
          postingName: p.postings?.[0]?.name || p.name,
          startDate: t.startDate,
          endDate: t.endDate,
          supervisorId: t.supervisorId || null,
          supervisorName: t.supervisorName || null,
          completed: Boolean(t.completed),
          status: t.completed ? 'completed' : (t.supervisorId ? 'assigned' : 'upcoming'),
        });
      }
    }

    res.json({ events });
  } catch (err) {
    console.error('listScheduleEvents error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// PATCH /api/rotation-schedules/:id/windows/:index
export const updateWindowInSchedule = async (req: Request, res: Response) => {
  try {
    const { id, index } = req.params as any;
    const payload = req.body || {};

    const plan: any = await RotationPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Schedule not found' });

    const idx = Number(index);
    const timeline = (plan.meta && plan.meta.timeline) || [];
    if (isNaN(idx) || idx < 0 || idx >= timeline.length) return res.status(400).json({ message: 'Invalid window index' });

    const window = timeline[idx];
    if (payload.startDate !== undefined) window.startDate = payload.startDate;
    if (payload.endDate !== undefined) window.endDate = payload.endDate;
    if (payload.supervisorId !== undefined) {
      const supervisorIdentity = await getSupervisorIdentityById(payload.supervisorId || null);
      window.supervisorId = payload.supervisorId;
      window.supervisorName = supervisorIdentity.name;
      window.supervisorEmail = supervisorIdentity.email;

      const groupIndex = typeof window.departmentGroupIndex === 'number' ? window.departmentGroupIndex : null;
      if (groupIndex !== null) {
        const postings = plan.postings || [];
        for (const p of postings) {
          p.meta = { ...(p.meta || {}), timeline };
          const groups = p.groups || [];
          if (groups[groupIndex]) {
            groups[groupIndex].supervisor = payload.supervisorId;
            groups[groupIndex].supervisorName = window.supervisorName || undefined;
            groups[groupIndex].supervisorEmail = window.supervisorEmail || undefined;
            groups[groupIndex].departmentSupervisor = payload.supervisorId;
            groups[groupIndex].departmentSupervisorName = window.supervisorName || undefined;
            groups[groupIndex].departmentSupervisorEmail = window.supervisorEmail || undefined;
          }
        }
      }
    }
    if (payload.markComplete) window.completed = true;
    if (payload.status !== undefined) window.status = payload.status;

    plan.meta = { ...(plan.meta || {}), timeline };
    await plan.save();

    return res.json({ message: 'Window updated', window });
  } catch (err) {
    console.error('updateWindowInSchedule error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// PATCH /api/rotation-schedules/:id
export const updateRotationSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const plan = await RotationPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Schedule not found' });

    Object.assign(plan, updates);
    if (updates.meta) {
      plan.meta = {
        ...(plan.meta || {}),
        ...(updates.meta || {}),
        timeline: Array.isArray(updates.meta?.timeline) ? updates.meta.timeline : (plan.meta?.timeline || []),
        phases: Array.isArray(updates.meta?.phases) ? updates.meta.phases : (plan.meta?.phases || []),
        unvisitedUnits: Array.isArray(updates.meta?.unvisitedUnits) ? updates.meta.unvisitedUnits : (plan.meta?.unvisitedUnits || []),
        unvisitedUnitGroups: Array.isArray(updates.meta?.unvisitedUnitGroups) ? updates.meta.unvisitedUnitGroups : (plan.meta?.unvisitedUnitGroups || []),
      };
    }
    await plan.save();
    res.json(plan);
  } catch (err) {
    console.error('updateRotationSchedule error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// PATCH /api/rotation-schedules/:id/postings/:postingName
export const updatePostingInSchedule = async (req: Request, res: Response) => {
  try {
    const { id, postingName } = req.params as any;
    const updates = req.body || {};
    const plan: any = await RotationPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Schedule not found' });

    const name = decodeURIComponent(postingName);
    const postings = plan.postings || [];
    const idx = postings.findIndex((p: any) => String(p.name) === String(name) || String(p.postingId) === String(name));
    if (idx === -1) return res.status(404).json({ message: 'Posting not found' });

    Object.assign(postings[idx], updates);
    plan.postings = postings;
    await plan.save();
    res.json({ message: 'Posting updated', posting: postings[idx] });
  } catch (err) {
    console.error('updatePostingInSchedule error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// DELETE /api/rotation-schedules/:id/postings/:postingName
export const deletePostingFromSchedule = async (req: Request, res: Response) => {
  try {
    const { id, postingName } = req.params as any;
    const plan: any = await RotationPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Schedule not found' });

    const name = decodeURIComponent(postingName);
    const postings = plan.postings || [];
    const idx = postings.findIndex((p: any) => String(p.name) === String(name) || String(p.postingId) === String(name));
    if (idx === -1) return res.status(404).json({ message: 'Posting not found' });

    postings.splice(idx, 1);
    plan.postings = postings;
    await plan.save();
    res.json({ message: 'Posting deleted', id, postingName: name });
  } catch (err) {
    console.error('deletePostingFromSchedule error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// PATCH /api/rotation-schedules/:id/logbook-settings
// Teacher/admin: set required logbook entries per posting + weekly team schedule per group
export const updatePostingLogbookSettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any;
    const { postingIndex, requiredLogbookEntries, groupIndex, weeklySchedule } = req.body || {};
    const plan: any = await RotationPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Schedule not found' });

    const postings = plan.postings || [];
    const pIdx = Number(postingIndex);
    if (isNaN(pIdx) || pIdx < 0 || pIdx >= postings.length) {
      return res.status(400).json({ message: 'Invalid postingIndex' });
    }

    if (requiredLogbookEntries !== undefined) {
      const value = Number(requiredLogbookEntries);
      if (isNaN(value) || value < 0) return res.status(400).json({ message: 'requiredLogbookEntries must be a non-negative number' });
      postings[pIdx].logbookRequiredEntries = value;
    }

    if (weeklySchedule !== undefined) {
      if (!Array.isArray(weeklySchedule)) return res.status(400).json({ message: 'weeklySchedule must be an array of { day, activityType }' });
      const gIdx = Number(groupIndex);
      const groups = postings[pIdx].groups || [];
      if (isNaN(gIdx) || gIdx < 0 || gIdx >= groups.length) {
        return res.status(400).json({ message: 'Invalid groupIndex' });
      }
      groups[gIdx].weeklySchedule = weeklySchedule.map((item: any) => ({
        day: Number(item?.day),
        activityType: String(item?.activityType || ''),
      }));
      postings[pIdx].groups = groups;
    }

    plan.postings = postings;
    await plan.save();
    res.json({ message: 'Logbook settings updated', posting: postings[pIdx] });
  } catch (err) {
    console.error('updatePostingLogbookSettings error', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};
