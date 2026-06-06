import express from 'express';
import { protect, authorize } from '../middleware/auth'
import { getAllActivities, getRoleStats } from '../controllers/activitieslog';

const LogsRouter = express.Router();

LogsRouter.get("/", protect, authorize(["admin", "teacher"]), getAllActivities);
LogsRouter.get("/role-stats", protect, authorize(["admin"]), getRoleStats);

export default LogsRouter;
