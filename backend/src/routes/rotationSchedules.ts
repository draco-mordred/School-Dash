import express from 'express';
import { createRotationSchedule, listRotationSchedules, getRotationScheduleById, getStudentAssignments } from '../controllers/rotationSchedules';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, authorize(['admin','teacher']), createRotationSchedule);
router.get('/', protect, listRotationSchedules);
router.get('/student-assignments', protect, getStudentAssignments);
router.get('/:id', protect, getRotationScheduleById);

export default router;
