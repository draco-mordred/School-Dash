import { Request, Response } from "express";
import RotationScheduleModel, { RotationGroupModel } from "../models/rotationPlan";
import { inngest } from "../inngest";
import { logActivity } from "../utils/activitieslog";

// GET /api/rotation-schedules
export const listRotationSchedules = async (req: Request, res: Response) => {
  try {
    const { academicYearId, level, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    const { classId } = req.query as any;
    if (academicYearId) filter.academicYear = academicYearId;
    if (classId) filter.class = classId;
    if (level) filter.applicableLevels = { $in: [Number(level)] };
    const schedules = await RotationScheduleModel.find(filter)
      .populate({ path: "groups", populate: { path: "supervisor", select: "name email" } })
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    // For list views, attach populated group documents into postings.groups entries
    // so the frontend can render posting -> group -> supervisor details without an extra fetch.
    const transformed: any[] = [];
    for (const s of schedules) {
      const schedObj: any = (s as any).toObject ? (s as any).toObject() : s;
      // build a map of groupId -> group doc from the populated `groups` array
      const groupMap: Record<string, any> = {};
      if (Array.isArray(schedObj.groups)) {
        for (const g of schedObj.groups) {
          groupMap[String(g._id)] = g;
        }
      }

      const postings = (schedObj.postings || []).map((p: any) => ({
        ...p,
        groups: (p.groups || []).map((pg: any) => ({
          group: groupMap[String(pg.groupId)] || { _id: pg.groupId },
          assigned: pg.assigned || [],
        })),
      }));

      transformed.push({ ...schedObj, postings });
    }

    const total = await RotationScheduleModel.countDocuments(filter);
    res.json({ schedules: transformed, total, page: +page, limit: +limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};

// GET /api/rotation-schedules/:id
export const getRotationScheduleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scheduleDoc = await RotationScheduleModel.findById(id).lean();
    if (!scheduleDoc) return res.status(404).json({ message: "Rotation schedule not found" });

    // Populate groups and students
    const groupIds = (scheduleDoc.groups || []).map((g: any) => typeof g === 'string' ? g : String(g));
    const groups = await RotationGroupModel.find({ _id: { $in: groupIds } }).populate('students', 'name idNumber').populate('supervisor', 'name email');
    const groupMap: Record<string, any> = {};
    for (const g of groups) groupMap[String(g._id)] = g;

    // Attach group docs to postings.groups entries
    const postings = (scheduleDoc.postings || []).map((p: any) => ({
      ...p,
      groups: (p.groups || []).map((pg: any) => ({
        group: groupMap[String(pg.groupId)] || { _id: pg.groupId },
        assigned: pg.assigned || [],
      })),
    }));

    const result = { ...scheduleDoc, groups, postings };
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};

// GET /api/rotation-schedules/find-by-posting?name=PostingName
export const findSchedulePostingByName = async (req: Request, res: Response) => {
  try {
    const { name, classId } = req.query as any;
    if (!name) return res.status(400).json({ message: 'Provide posting name as ?name=...' });

    const filter: any = { 'postings.name': { $regex: `^${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } };
    if (classId) filter.class = classId;

    // find the first matching schedule
    const sched = await RotationScheduleModel.findOne(filter).lean();
    if (!sched) return res.status(404).json({ message: 'No schedule posting found matching that name' });

    // extract matching postings
    const postings = (sched.postings || []).filter((p: any) => p.name && String(p.name).toLowerCase() === String(name).toLowerCase());

    return res.json({ scheduleId: sched._id, scheduleName: sched.name, postings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/rotation-schedules/generate
// Triggers the Inngest function that runs the schedule generator
export const triggerGenerateRotationSchedule = async (req: Request, res: Response) => {
  try {
    const { academicYearId, classId, level, options } = req.body as any;
    const userId = (req as any).user?._id || "system";
    if (!academicYearId || !classId || !level) {
      return res.status(400).json({ message: "academicYearId, classId and level are required" });
    }

    await logActivity({ userId, action: "Triggered rotation schedule generation", details: `class:${classId} level:${level}` });

    await inngest.send({
      name: "rotation/generate",
      data: { academicYearId, classId, level, options: options || {}, generatedBy: userId },
    });

    return res.status(202).json({ message: "Rotation generation started" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};

export const deleteAllRotationSchedules = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Only admin can delete schedules' });
    const confirm = req.query.confirm === '1' || req.query.confirm === 'true';
    if (!confirm) return res.status(400).json({ message: 'Provide ?confirm=1 to delete all rotation schedules' });

    const deleted = await RotationScheduleModel.deleteMany({});
    // also clear scheduled notifications
    const ScheduledNotification = (await import('../models/scheduledNotification')).default;
    await ScheduledNotification.deleteMany({});
    await logActivity({ userId: user._id, action: 'Deleted all rotation schedules', details: `Deleted ${deleted.deletedCount} schedules` });
    return res.json({ success: true, deletedCount: deleted.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

export const deleteRotationScheduleById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Only admin can delete schedules' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Schedule id is required' });

    const sched = await RotationScheduleModel.findByIdAndDelete(id);
    if (!sched) return res.status(404).json({ message: 'Rotation schedule not found' });

    // remove any scheduled notifications referencing this schedule
    const ScheduledNotification = (await import('../models/scheduledNotification')).default;
    await ScheduledNotification.deleteMany({ ['metadata.scheduleId']: String(id) });

    await logActivity({ userId: user._id, action: 'Deleted rotation schedule', details: `Deleted schedule ${id}` });
    return res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/rotation-schedules/:id/postings/:postingName
export const updatePostingInSchedule = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) return res.status(403).json({ message: 'Only admin/teacher can update postings' });
    const { id, postingName } = req.params;
    const updates = req.body as any;
    if (!id || !postingName) return res.status(400).json({ message: 'Schedule id and postingName required' });

    const sched = await RotationScheduleModel.findById(id);
    if (!sched) return res.status(404).json({ message: 'Schedule not found' });

    const idx = (sched.postings || []).findIndex((p: any) => String(p.name).toLowerCase() === String(postingName).toLowerCase());
    if (idx === -1) return res.status(404).json({ message: 'Posting not found in schedule' });

    // apply allowed updates
    const allowed = ['name', 'category', 'startDate', 'endDate', 'unitRotationWeeks', 'units'];
    for (const k of Object.keys(updates)) {
      if (allowed.includes(k)) {
        (sched.postings as any[])[idx][k] = updates[k];
      }
    }

    await sched.save();
    // return updated schedule with populated groups
    const groupIds = (sched.groups || []).map((g: any) => typeof g === 'string' ? g : String(g));
    const groups = await RotationGroupModel.find({ _id: { $in: groupIds } }).populate('students', 'name idNumber').populate('supervisor', 'name email');
    const groupMap: Record<string, any> = {};
    for (const g of groups) groupMap[String(g._id)] = g;
    const postings = (sched.postings || []).map((p: any) => ({ ...p, groups: (p.groups || []).map((pg: any) => ({ group: groupMap[String(pg.groupId)] || { _id: pg.groupId }, assigned: pg.assigned || [] })) }));
    return res.json({ ...sched.toObject(), groups, postings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// DELETE /api/rotation-schedules/:id/postings/:postingName
export const deletePostingInSchedule = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) return res.status(403).json({ message: 'Only admin/teacher can delete postings' });
    const { id, postingName } = req.params;
    if (!id || !postingName) return res.status(400).json({ message: 'Schedule id and postingName required' });

    const sched = await RotationScheduleModel.findById(id);
    if (!sched) return res.status(404).json({ message: 'Schedule not found' });

    const origLen = (sched.postings || []).length;
    sched.postings = (sched.postings || []).filter((p: any) => String(p.name).toLowerCase() !== String(postingName).toLowerCase());
    if ((sched.postings || []).length === origLen) return res.status(404).json({ message: 'Posting not found' });

    await sched.save();

    const groupIds = (sched.groups || []).map((g: any) => typeof g === 'string' ? g : String(g));
    const groups = await RotationGroupModel.find({ _id: { $in: groupIds } }).populate('students', 'name idNumber').populate('supervisor', 'name email');
    const groupMap: Record<string, any> = {};
    for (const g of groups) groupMap[String(g._id)] = g;
    const postings = (sched.postings || []).map((p: any) => ({ ...p, groups: (p.groups || []).map((pg: any) => ({ group: groupMap[String(pg.groupId)] || { _id: pg.groupId }, assigned: pg.assigned || [] })) }));

    return res.json({ success: true, schedule: { ...sched.toObject(), groups, postings } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

export default {};
