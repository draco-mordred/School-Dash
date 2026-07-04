import ActivityLog from "../models/activitieslog";
import User from "../models/user";
// @desc    Get System Activity Log (including pagination and filters)
// @route   Get /api/activities
// @access  Private/Admin
export const getAllActivities = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const role = req.query.role;
        const search = req.query.search;
        const filter = {};
        if (role && role !== "all") {
            filter["user.role"] = role;
        }
        if (search) {
            filter.$or = [
                { "user.name": { $regex: search, $options: "i" } },
                { action: { $regex: search, $options: "i" } },
                { details: { $regex: search, $options: "i" } },
            ];
        }
        const count = await ActivityLog.countDocuments(filter);
        const logs = await ActivityLog.find(filter)
            .populate("user", "name email role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        res.json({
            logs,
            page,
            pages: Math.ceil(count / limit),
            total: count,
        });
    }
    catch (error) {
        res.status(500).json({ message: `Server error`, error });
    }
};
// @desc    Get user role distribution for admin dashboard
// @route   Get /api/activities/role-stats
// @access  Private/Admin
export const getRoleStats = async (req, res) => {
    try {
        // Return counts of active vs inactive users per role
        const active = await User.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: "$role", count: { $sum: 1 } } },
        ]);
        const inactive = await User.aggregate([
            { $match: { isActive: false } },
            { $group: { _id: "$role", count: { $sum: 1 } } },
        ]);
        // Merge results into a map for easy consumption by frontend
        const roleMap = {};
        const ensureRole = (r) => {
            if (!roleMap[r])
                roleMap[r] = { role: r, active: 0, inactive: 0 };
        };
        active.forEach((a) => {
            ensureRole(a._id);
            roleMap[a._id].active = a.count;
        });
        inactive.forEach((a) => {
            ensureRole(a._id);
            roleMap[a._id].inactive = a.count;
        });
        // Ensure known roles appear even with zero counts
        const knownRoles = ["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"];
        knownRoles.forEach((r) => ensureRole(r));
        const stats = Object.values(roleMap);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ message: `Server error`, error });
    }
};
// @desc    Get weekly activity counts for students
// @route   Get /api/activities/weekly
// @access  Private/Admin
export const getWeeklyActivityCounts = async (req, res) => {
    try {
        const weeks = Number(req.query.weeks) || 8;
        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - weeks * 7);
        // categorize actions into types (attendance, rotation, other)
        const results = await ActivityLog.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: { 'user.role': 'student' } },
            { $addFields: {
                    actionType: {
                        $switch: {
                            branches: [
                                { case: { $regexMatch: { input: '$action', regex: /attendance/i } }, then: 'attendance' },
                                { case: { $regexMatch: { input: '$action', regex: /rotation|clinical/i } }, then: 'rotation' },
                            ],
                            default: 'other'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: { week: { $dateTrunc: { date: '$createdAt', unit: 'week' } }, type: '$actionType' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.week': 1 } },
        ]);
        // Build continuous weekly series so frontend can plot missing weeks as 0
        const seriesWeeks = [];
        const curr = new Date(start);
        // align to week boundaries by using the dateTrunc behavior (approx)
        while (curr <= end) {
            seriesWeeks.push(new Date(curr));
            curr.setDate(curr.getDate() + 7);
        }
        // Map results into { weekISO -> { attendance, rotation, other } }
        const map = new Map();
        results.forEach((r) => {
            const wk = new Date(r._id.week).toISOString();
            if (!map.has(wk))
                map.set(wk, { attendance: 0, rotation: 0, other: 0 });
            const entry = map.get(wk);
            if (r._id.type === 'attendance')
                entry.attendance = r.count;
            else if (r._id.type === 'rotation')
                entry.rotation = r.count;
            else
                entry.other = r.count;
        });
        const out = seriesWeeks.map((d) => {
            const wk = d.toISOString();
            const counts = map.get(wk) ?? { attendance: 0, rotation: 0, other: 0 };
            return { weekStart: wk, ...counts };
        });
        res.json({ weeks: out });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
