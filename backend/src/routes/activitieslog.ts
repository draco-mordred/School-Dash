import express from 'express';
import { protect, authorize } from '../middleware/auth'
import { getAllActivities, getRoleStats, getWeeklyActivityCounts } from '../controllers/activitieslog';

const LogsRouter = express.Router();

LogsRouter.get("/", protect, authorize(["admin", "teacher", "unit_consultant", "unit_resident"]), getAllActivities);
LogsRouter.get("/role-stats", protect, authorize(["admin"]), getRoleStats);
LogsRouter.get("/weekly", protect, authorize(["admin"]), getWeeklyActivityCounts);

export default LogsRouter;
