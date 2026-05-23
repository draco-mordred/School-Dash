import express from 'express';
import { protect, authorize } from '../middleware/auth'
import { getAllActivities } from '../controllers/activitieslog';

// we will do this later when getting all activities

const LogsRouter = express.Router();

LogsRouter.get("/", 
  protect, 
  authorize(["admin", "teacher"]), 
  getAllActivities)

export default LogsRouter; 