import express from 'express';
import { createRotationSchedule, listRotationSchedules, getRotationScheduleById, deleteRotationSchedule, getStudentAssignments, assignSupervisorToWindow, getStudentCurrentSchedule, getStudentUpcomingSchedule, getStudentScheduleHistory, runRotationRunner, listScheduleSupervisors } from '../controllers/rotationSchedules';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, authorize(['admin','teacher']), createRotationSchedule);
router.get('/', protect, listRotationSchedules);
// Development-only: return the first rotation schedule without auth for inspection
if (process.env.NODE_ENV === 'development') {
	router.get('/debug/first', async (req, res) => {
		try {
			const RotationPlan = require('../models/rotationPlan').default;
			const doc = await RotationPlan.findOne({}).lean();
			if (!doc) return res.status(404).json({ message: 'No rotation schedules found' });
			return res.status(200).json({ schedule: doc });
		} catch (err: any) {
			console.error('debug schedule fetch error', err);
			return res.status(500).json({ message: 'Server error', error: String(err) });
		}
	});
}
router.get('/student-assignments', protect, getStudentAssignments);
router.get('/student/:studentId/current', protect, getStudentCurrentSchedule);
router.get('/student/:studentId/upcoming', protect, getStudentUpcomingSchedule);
router.get('/student/:studentId/history', protect, getStudentScheduleHistory);
router.get('/:id', protect, getRotationScheduleById);
router.get('/:id/supervisors', protect, listScheduleSupervisors);
router.delete('/:id', protect, authorize(['admin','teacher']), deleteRotationSchedule);
router.post('/:id/assign-supervisor', protect, authorize(['admin','teacher']), assignSupervisorToWindow);
router.post('/:id/run', protect, authorize(['admin','teacher']), runRotationRunner);

export default router;
