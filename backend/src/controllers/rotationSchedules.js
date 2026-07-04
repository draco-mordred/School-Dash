import RotationPlan from '../models/rotationPlan';
// POST /api/rotation-schedules
export const createRotationSchedule = async (req, res) => {
    try {
        const payload = req.body || {};
        payload.createdBy = req.user?._id;
        const doc = await RotationPlan.create(payload);
        res.status(201).json(doc);
    }
    catch (err) {
        console.error('createRotationSchedule error', err);
        res.status(500).json({ message: 'Server error', error: String(err) });
    }
};
// GET /api/rotation-schedules
export const listRotationSchedules = async (req, res) => {
    try {
        const { classId, query, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (classId)
            filter.class = classId;
        if (query)
            filter.name = { $regex: String(query), $options: 'i' };
        const docs = await RotationPlan.find(filter)
            .sort({ createdAt: -1 })
            .skip((+page - 1) * +limit)
            .limit(+limit)
            .lean();
        const total = await RotationPlan.countDocuments(filter);
        res.json({ schedules: docs, total, page: +page, limit: +limit });
    }
    catch (err) {
        console.error('listRotationSchedules error', err);
        res.status(500).json({ message: 'Server error', error: String(err) });
    }
};
// GET /api/rotation-schedules/:id
export const getRotationScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await RotationPlan.findById(id).lean();
        if (!doc)
            return res.status(404).json({ message: 'Schedule not found' });
        res.json(doc);
    }
    catch (err) {
        console.error('getRotationScheduleById error', err);
        res.status(500).json({ message: 'Server error', error: String(err) });
    }
};
// DELETE /api/rotation-schedules/:id
export const deleteRotationSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await RotationPlan.findByIdAndDelete(id).lean();
        if (!doc)
            return res.status(404).json({ message: 'Schedule not found' });
        res.json({ message: 'Schedule deleted' });
    }
    catch (err) {
        console.error('deleteRotationSchedule error', err);
        res.status(500).json({ message: 'Server error', error: String(err) });
    }
};
// GET /api/rotation-schedules/student-assignments?studentId=...
export const getStudentAssignments = async (req, res) => {
    try {
        const { studentId } = req.query;
        if (!studentId)
            return res.status(400).json({ message: 'Missing studentId' });
        const schedules = await RotationPlan.find({}).sort({ createdAt: -1 }).limit(200).lean();
        const assignments = {};
        for (const s of schedules) {
            const postings = s.postings || [];
            for (const p of postings) {
                const groups = p.groups || [];
                for (const g of groups) {
                    // g.group may be embedded with students
                    const groupObj = g.group || {};
                    const students = Array.isArray(groupObj.students) ? groupObj.students : [];
                    if (students.some((st) => String(st) === String(studentId) || (st && st._id && String(st._id) === String(studentId)))) {
                        assignments[p.name || 'Posting'] = { groupName: groupObj.name || g.groupId || 'Group', supervisorName: g.supervisorName || '' };
                    }
                }
            }
        }
        res.json({ assignments });
    }
    catch (err) {
        console.error('getStudentAssignments error', err);
        res.status(500).json({ message: 'Server error', error: String(err) });
    }
};
