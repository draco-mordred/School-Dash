import express from 'express';
import { createRotationSchedule, listRotationSchedules, getRotationScheduleById, deleteRotationSchedule, getStudentAssignments, assignSupervisorToWindow, getStudentCurrentSchedule, getStudentUpcomingSchedule, getStudentScheduleHistory } from '../controllers/rotationSchedules';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, authorize(['admin','teacher']), createRotationSchedule);
router.get('/', protect, listRotationSchedules);
router.get('/student-assignments', protect, getStudentAssignments);
router.get('/student/:studentId/current', protect, getStudentCurrentSchedule);
router.get('/student/:studentId/upcoming', protect, getStudentUpcomingSchedule);
router.get('/student/:studentId/history', protect, getStudentScheduleHistory);
router.get('/:id', protect, getRotationScheduleById);
router.delete('/:id', protect, authorize(['admin','teacher']), deleteRotationSchedule);
router.post('/:id/assign-supervisor', protect, authorize(['admin','teacher']), assignSupervisorToWindow);

export default router;
