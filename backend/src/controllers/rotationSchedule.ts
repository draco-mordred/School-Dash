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
      .populate({ path: "groups", populate: { path: "supervisor", select: "name email supervisorRank specialties" } })
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
    const groups = await RotationGroupModel.find({ _id: { $in: groupIds } }).populate('students', 'name idNumber').populate('supervisor', 'name email supervisorRank specialties');
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

    // also fetch student posting assignments for this schedule to allow per-student views
    const StudentPostingAssignment = (await import('../models/studentPostingAssignment.ts')).default;
    const assignments = await StudentPostingAssignment.find({ rotationSchedule: id }).populate('student', 'name idNumber email phone').populate('assignedGroup', 'name').lean();

    const result = { ...scheduleDoc, groups, postings, assignments };
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

// GET /api/rotation-schedules/student-assignments?studentId=&scheduleId=&classId=&level=
export const getStudentAssignments = async (req: Request, res: Response) => {
  try {
    const { studentId, scheduleId, classId, level, academicYearId } = req.query as any;
    const userId = (req as any).user?._id;
    const targetStudent = studentId || userId;
    if (!targetStudent) return res.status(400).json({ message: 'studentId required or must be authenticated' });

    const RotationSchedule = RotationScheduleModel;

    // Resolve schedule
    let scheduleDoc: any = null;
    if (scheduleId) {
      scheduleDoc = await RotationSchedule.findById(scheduleId).lean();
    }
    if (!scheduleDoc && classId) {
      scheduleDoc = await RotationSchedule.findOne({ class: classId, ...(level ? { applicableLevels: { $in: [Number(level)] } } : {}) }).sort({ createdAt: -1 }).lean();
    }
    if (!scheduleDoc && targetStudent) {
      // try to derive class from student profile
      try {
        const User = (await import('../models/user')).default;
        const u = await User.findById(targetStudent).select('studentClass studentClasses').lean();
        let classIds: string[] = [];
        if (u) {
          if (Array.isArray(u.studentClasses) && u.studentClasses.length) classIds = u.studentClasses.map((c: any) => String(c));
          else if (u.studentClass) classIds = [String(u.studentClass)];
        }
        if (classIds.length) {
          scheduleDoc = await RotationSchedule.findOne({ class: { $in: classIds }, ...(level ? { applicableLevels: { $in: [Number(level)] } } : {}) }).sort({ createdAt: -1 }).lean();
        }
      } catch (e) {
        // ignore
      }
    }
    if (!scheduleDoc) {
      // fallback to latest schedule
      scheduleDoc = await RotationSchedule.findOne({ ...(level ? { applicableLevels: { $in: [Number(level)] } } : {}) }).sort({ createdAt: -1 }).lean();
    }

    if (!scheduleDoc) return res.json({ scheduleId: null, assignments: {} });

    // Populate groups
    const groupIds = (scheduleDoc.groups || []).map((g: any) => typeof g === 'string' ? g : String(g));
    const groups = await RotationGroupModel.find({ _id: { $in: groupIds } }).populate('students', 'name idNumber').populate('supervisor', 'name email supervisorRank specialties').lean();
    const groupMap: Record<string, any> = {};
    for (const g of groups) groupMap[String(g._id)] = g;

    // Attach group docs to postings.groups entries
    const postings = (scheduleDoc.postings || []).map((p: any) => ({
      ...p,
      groups: (p.groups || []).map((pg: any) => ({ group: groupMap[String(pg.groupId)] || { _id: pg.groupId }, assigned: pg.assigned || [] })),
    }));

    // load student posting assignments for this schedule
    const StudentPostingAssignment = (await import('../models/studentPostingAssignment.ts')).default;
    const assignments = await StudentPostingAssignment.find({ student: targetStudent, rotationSchedule: scheduleDoc._id }).populate({ path: 'assignedGroup', populate: { path: 'supervisor', select: 'name email supervisorRank' } }).lean();

    const resultMap: Record<string, any> = {};
    for (const a of assignments) {
      const postingName = a.postingName;
      const grp = a.assignedGroup || {};
      const groupName = grp.name || '';
      const supervisor = grp.supervisor ? (grp.supervisor.name || '') : (grp.supervisorName || '');
      // find posting in schedule to extract period/unit mapping
      const posting = (postings || []).find((p: any) => String(p.name) === String(postingName));
      const periodsInfo: any[] = [];
      if (posting && posting.periods && Array.isArray(posting.periods)) {
        for (let pi = 0; pi < posting.periods.length; pi++) {
          const period = posting.periods[pi];
          const assignEntry = (period.assignments || []).find((x: any) => String(x.groupId) === String(a.assignedGroup?._id));
          periodsInfo.push({ periodIndex: pi+1, startDate: period.startDate, endDate: period.endDate, unitName: assignEntry?.unitName || assignEntry?.unit || '', supervisorName: assignEntry?.supervisorName || supervisor });
        }
      }

      resultMap[postingName] = { postingName, postingStartDate: a.postingStartDate, postingEndDate: a.postingEndDate, groupId: grp._id || null, groupName, supervisorName: supervisor, periods: periodsInfo };
    }

    return res.json({ scheduleId: scheduleDoc._id, scheduleName: scheduleDoc.name, assignments: resultMap });
  } catch (err) {
    console.error('getStudentAssignments failed', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

// GET /api/rotation-schedules/:id/export?format=csv|json
export const exportRotationScheduleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'csv' } = req.query as any;
    if (!id) return res.status(400).json({ message: 'Schedule id is required' });

    const scheduleDoc = await RotationScheduleModel.findById(id).lean();
    if (!scheduleDoc) return res.status(404).json({ message: 'Rotation schedule not found' });

    // populate groups and postings similar to getRotationScheduleById
    const groupIds = (scheduleDoc.groups || []).map((g: any) => typeof g === 'string' ? g : String(g));
    const groups = await RotationGroupModel.find({ _id: { $in: groupIds } }).populate('students', 'name idNumber').populate('supervisor', 'name email supervisorRank specialties');
    const groupMap: Record<string, any> = {};
    for (const g of groups) groupMap[String(g._id)] = g;

    const postings = (scheduleDoc.postings || []).map((p: any) => ({
      ...p,
      groups: (p.groups || []).map((pg: any) => ({ group: groupMap[String(pg.groupId)] || { _id: pg.groupId }, assigned: pg.assigned || [] })),
    }));

    // load associated student posting assignments and clinical rotations
    const StudentPostingAssignment = (await import('../models/studentPostingAssignment.ts')).default;
    const ClinicalRotation = (await import('../models/clinicalRotation.ts')).default;

    // columns selection
    const availableColumns = [
      'scheduleId','scheduleName','postingName','postingCategory','postingStartDate','postingEndDate','periodIndex','periodStartDate','periodEndDate','periodUnit','periodSupervisorName','periodSupervisorEmail','periodSupervisorRank','supervisorPhone','groupId','groupName','studentId','studentName','studentIdNumber','assignedUnits'
    ];
    const columnsQuery = (req.query.columns || '') as string;
    const selectedColumns = columnsQuery ? columnsQuery.split(',').filter(c => availableColumns.includes(c)) : availableColumns;

    // Stream assignments via aggregation cursor to avoid loading all into memory
    const mongoose = (await import('mongoose')).default;
    const ObjectId = mongoose.Types.ObjectId;

    const pipeline: any[] = [
      { $match: { rotationSchedule: new ObjectId(id) } },
      { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'student' } },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'rotationgroups', localField: 'assignedGroup', foreignField: '_id', as: 'group' } },
      { $unwind: { path: '$group', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'group.supervisor', foreignField: '_id', as: 'groupSupervisor' } },
      { $unwind: { path: '$groupSupervisor', preserveNullAndEmptyArrays: true } },
      // project only necessary fields
      { $project: {
        postingName: 1, postingCategory: 1, postingStartDate: 1, postingEndDate:1, completedUnits:1, sequenceIndex:1,
        student: { _id: '$student._id', name: '$student.name', idNumber: '$student.idNumber' },
        group: { _id: '$group._id', name: '$group.name' },
        groupSupervisor: { _id: '$groupSupervisor._id', name: '$groupSupervisor.name', email: '$groupSupervisor.email', supervisorRank: '$groupSupervisor.supervisorRank', phone: '$groupSupervisor.phone' },
      } }
    ];

    const cursor = await StudentPostingAssignment.aggregate(pipeline).cursor({ batchSize: 100 }).exec();

    const rotations = await ClinicalRotation.find({ generatedFromSchedule: id }).lean();

    if (String(format).toLowerCase() === 'json') {
      // Return schedule, postings, groups, assignments and rotations for JSON consumers
      const assignments = await StudentPostingAssignment.find({ rotationSchedule: id }).lean();
      return res.json({ schedule: { ...scheduleDoc, groups, postings }, assignments, rotations });
    }

    // Diagnostic log: incoming export request
    console.log('Export request', { scheduleId: id, format, columnsQuery, selectedCount: selectedColumns.length, postingsCount: (postings || []).length });

    // Stream CSV: one row per posting-period-assignment (periods split into rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rotation-schedule-${id}.csv"`);

    const escape = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return '"' + String(s).replace(/"/g, '""') + '"';
    };

    // Use selectedColumns to build CSV header in the requested order
    res.write(selectedColumns.join(',') + '\n');

    // iterate cursor
    const aggCursor: any = cursor;
    for await (const a of aggCursor) {
      try {
        const p = (postings || []).find((pp: any) => String(pp.name) === String(a.postingName)) || {};
        const grp = a.group || {};
        const groupSupervisor = a.groupSupervisor || {};
        const periodsArr = p.periods || [];

      if (periodsArr.length === 0) {
        const values: any[] = [];
        for (const col of selectedColumns) {
          switch (col) {
            case 'scheduleId': values.push(scheduleDoc._id); break;
            case 'scheduleName': values.push(scheduleDoc.name || ''); break;
            case 'postingName': values.push(a.postingName || ''); break;
            case 'postingCategory': values.push(a.postingCategory || ''); break;
            case 'postingStartDate': values.push(a.postingStartDate || ''); break;
            case 'postingEndDate': values.push(a.postingEndDate || ''); break;
            case 'periodIndex': values.push(''); break;
            case 'periodStartDate': values.push(''); break;
            case 'periodEndDate': values.push(''); break;
            case 'periodUnit': values.push(''); break;
            case 'periodSupervisorName': values.push(groupSupervisor.name || ''); break;
            case 'periodSupervisorEmail': values.push(groupSupervisor.email || ''); break;
            case 'periodSupervisorRank': values.push(groupSupervisor.supervisorRank || ''); break;
            case 'supervisorPhone': values.push(groupSupervisor.phone || ''); break;
            case 'groupId': values.push(grp._id || ''); break;
            case 'groupName': values.push(grp.name || ''); break;
            case 'studentId': values.push(a.student?._id || ''); break;
            case 'studentName': values.push(a.student?.name || ''); break;
            case 'studentIdNumber': values.push(a.student?.idNumber || ''); break;
            case 'assignedUnits': values.push(a.completedUnits || []); break;
            default: values.push('');
          }
        }
        res.write(values.map(escape).join(',') + '\n');
        continue;
      }

      for (let pi = 0; pi < periodsArr.length; pi++) {
        const period = periodsArr[pi];
        const assignEntry = (period.assignments || []).find((x: any) => String(x.groupId) === String(grp._id));
        const unitName = assignEntry?.unitName || '';

        const values: any[] = [];
        for (const col of selectedColumns) {
          switch (col) {
            case 'scheduleId': values.push(scheduleDoc._id); break;
            case 'scheduleName': values.push(scheduleDoc.name || ''); break;
            case 'postingName': values.push(a.postingName || ''); break;
            case 'postingCategory': values.push(a.postingCategory || ''); break;
            case 'postingStartDate': values.push(a.postingStartDate || ''); break;
            case 'postingEndDate': values.push(a.postingEndDate || ''); break;
            case 'periodIndex': values.push(pi + 1); break;
            case 'periodStartDate': values.push(period.startDate || ''); break;
            case 'periodEndDate': values.push(period.endDate || ''); break;
            case 'periodUnit': values.push(unitName); break;
            case 'periodSupervisorName': values.push(groupSupervisor.name || assignEntry?.supervisorName || ''); break;
            case 'periodSupervisorEmail': values.push(groupSupervisor.email || ''); break;
            case 'periodSupervisorRank': values.push(groupSupervisor.supervisorRank || ''); break;
            case 'supervisorPhone': values.push(groupSupervisor.phone || ''); break;
            case 'groupId': values.push(grp._id || ''); break;
            case 'groupName': values.push(grp.name || ''); break;
            case 'studentId': values.push(a.student?._id || ''); break;
            case 'studentName': values.push(a.student?.name || ''); break;
            case 'studentIdNumber': values.push(a.student?.idNumber || ''); break;
            case 'assignedUnits': values.push(a.completedUnits || []); break;
            default: values.push('');
          }
        }
        res.write(values.map(escape).join(',') + '\n');
      }
      } catch (errIn) {
        console.error('Error processing assignment for schedule', id, 'assignment=', a, 'error=', errIn);
        throw errIn;
      }
    }

    return res.end();
  } catch (err: any) {
    console.error('Export failed', err);
    res.status(500).json({ message: 'Server error', error: err?.stack || String(err) });
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
    const groups = await RotationGroupModel.find({ _id: { $in: groupIds } }).populate('students', 'name idNumber').populate('supervisor', 'name email supervisorRank specialties');
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
    const groups = await RotationGroupModel.find({ _id: { $in: groupIds } }).populate('students', 'name idNumber').populate('supervisor', 'name email supervisorRank specialties');
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
