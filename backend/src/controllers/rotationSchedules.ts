import { type Request, type Response } from 'express';
import RotationPlan from '../models/rotationPlan';
import generateKrystaSchedule from '../services/krystaGenerator';
import runRotationSnapshot from '../services/rotationRunner';

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

        // merge any additional meta and persist
        const doc = await RotationPlan.create(planObj);
        return res.status(201).json(doc);
      } catch (gErr: any) {
        console.error('Krysta generation failed', gErr);
        return res.status(500).json({ message: gErr?.message || 'Generation failed', error: String(gErr) });
      }
    }

    const doc = await RotationPlan.create(payload);
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

// POST /api/rotation-schedules/:id/assign-supervisor
export const assignSupervisorToWindow = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { windowIndex, supervisorId } = req.body as any;
    if (typeof windowIndex !== 'number' && !req.body.matching) return res.status(400).json({ message: 'Missing windowIndex or matching criteria' });

    const plan = await RotationPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Schedule not found' });

    const timeline = (plan.meta && plan.meta.timeline) || [];

    if (typeof windowIndex === 'number') {
      if (!timeline[windowIndex]) return res.status(400).json({ message: 'Invalid windowIndex' });
      timeline[windowIndex].supervisorId = supervisorId;
    } else if (req.body.matching) {
      // allow matching criteria to set multiple windows: { matching: { departmentIndex, departmentGroupIndex, unitGroupIndex } }
      const m = req.body.matching || {};
      for (let i = 0; i < timeline.length; i++) {
        const t = timeline[i];
        let ok = true;
        if (m.departmentIndex !== undefined) ok = ok && t.departmentIndex === m.departmentIndex;
        if (m.departmentGroupIndex !== undefined) ok = ok && t.departmentGroupIndex === m.departmentGroupIndex;
        if (m.unitGroupIndex !== undefined) ok = ok && t.unitGroupIndex === m.unitGroupIndex;
        if (ok) timeline[i].supervisorId = supervisorId;
      }
    }

    plan.meta = { ...(plan.meta || {}), timeline };

    // Also persist supervisor in postings.groups for easier lookup
    const postings = plan.postings || [];
    for (const p of postings) {
      const groups = p.groups || [];
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        // Match this group with windows that have matching departmentGroupIndex
        let supervisorForGroup: any = null;
        for (const t of timeline) {
          if (t.departmentGroupIndex === i && t.supervisorId) {
            supervisorForGroup = t.supervisorId;
            break;
          }
        }
        if (supervisorForGroup) {
          g.supervisor = supervisorForGroup;
          g.supervisorName = supervisorForGroup; // will be replaced on client with actual name
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

    const schedules = await RotationPlan.find({}).sort({ createdAt: -1 }).limit(200).lean();
    const now = new Date();
    const current: any[] = [];

    for (const s of schedules) {
      const timeline = (s.meta && s.meta.timeline) || [];
      for (let i = 0; i < timeline.length; i++) {
        const t = timeline[i];
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        const students = Array.isArray(t.studentIds) ? t.studentIds : [];
        if (students.some((st: any) => String(st) === String(studentId))) {
          if (start <= now && now < end) {
            current.push({ scheduleId: s._id, postingName: s.postings?.[0]?.name || s.name, windowIndex: i, window: t });
          }
        }
      }
    }

    res.json({ current });
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
