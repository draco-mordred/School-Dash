import { type Request, type Response} from 'express';
import ActivityLog from "../models/activitieslog";

// @desc    Get System Activity Log (inuding pagunation and filters)
// @route   Get /api/activity
// @access  Private/Admin 

export const getAllActivities = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const count  = await ActivityLog.countDocuments();

    const logs = await ActivityLog.find()
    .populate("user", "name email role") //populate user details
    .sort({ createdAt: -1 }) //latest first
    .skip(skip)
    .limit(limit);

    res.json({
      logs,
      page,
      pages: Math.ceil(count / limit),
      total: count,
    })

  } catch (error) {
    res.status(500).json({
      message: `Server error`,
      error
    })
  }
}