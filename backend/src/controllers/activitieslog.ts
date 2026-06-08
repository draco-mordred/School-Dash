import { type Request, type Response} from "express";
import ActivityLog from "../models/activitieslog";
import User from "../models/user";

// @desc    Get System Activity Log (including pagination and filters)
// @route   Get /api/activities
// @access  Private/Admin

export const getAllActivities = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const role = req.query.role as string;
    const search = req.query.search as string;

    const filter: any = {};
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
  } catch (error) {
    res.status(500).json({ message: `Server error`, error });
  }
};

// @desc    Get user role distribution for admin dashboard
// @route   Get /api/activities/role-stats
// @access  Private/Admin
export const getRoleStats = async (req: Request, res: Response): Promise<void> => {
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
    const roleMap: Record<string, { role: string; active: number; inactive: number }> = {};

    const ensureRole = (r: string) => {
      if (!roleMap[r]) roleMap[r] = { role: r, active: 0, inactive: 0 };
    };

    active.forEach((a: any) => {
      ensureRole(a._id);
      roleMap[a._id].active = a.count;
    });
    inactive.forEach((a: any) => {
      ensureRole(a._id);
      roleMap[a._id].inactive = a.count;
    });

    // Ensure known roles appear even with zero counts
    const knownRoles = ["admin", "teacher", "student", "parent", "unit_consultant", "unit_resident"];
    knownRoles.forEach((r) => ensureRole(r));

    const stats = Object.values(roleMap);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: `Server error`, error });
  }
};
