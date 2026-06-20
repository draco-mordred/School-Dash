import express from "express";
import { listRotationSchedules, getRotationScheduleById, triggerGenerateRotationSchedule } from "../controllers/rotationSchedule";
import { protect } from "../middleware/auth";

const router = express.Router();

// list and get are protected (any authenticated user)
router.get("/", protect, listRotationSchedules);
// find posting by name
router.get("/find-by-posting", protect, async (req, res, next) => {
	const ctrl = await import("../controllers/rotationSchedule");
	return (ctrl.findSchedulePostingByName as any)(req, res, next);
});
// get per-student assignments for a schedule (single call for client)
router.get("/student-assignments", protect, async (req, res, next) => {
  const ctrl = await import("../controllers/rotationSchedule");
  return (ctrl.getStudentAssignments as any)(req, res, next);
});
router.get("/:id", protect, getRotationScheduleById);
// export schedule and assignments
router.get("/:id/export", protect, async (req, res, next) => {
	const ctrl = await import("../controllers/rotationSchedule");
	return (ctrl.exportRotationScheduleById as any)(req, res, next);
});

// update posting
router.patch("/:id/postings/:postingName", protect, async (req, res, next) => {
	const ctrl = await import("../controllers/rotationSchedule");
	return (ctrl.updatePostingInSchedule as any)(req, res, next);
});

// delete posting
router.delete("/:id/postings/:postingName", protect, async (req, res, next) => {
	const ctrl = await import("../controllers/rotationSchedule");
	return (ctrl.deletePostingInSchedule as any)(req, res, next);
});

// trigger generation - only admin/teacher allowed
router.post("/generate", protect, triggerGenerateRotationSchedule);
// DELETE /api/rotation-schedules?confirm=1  - admin only
router.delete("/", protect, async (req, res, next) => {
	// lazy import controller to avoid circular
	const ctrl = await import("../controllers/rotationSchedule");
	return (ctrl.deleteAllRotationSchedules as any)(req, res, next);
});

// DELETE /api/rotation-schedules/:id  - admin only (delete single schedule)
router.delete("/:id", protect, async (req, res, next) => {
  const ctrl = await import("../controllers/rotationSchedule");
  return (ctrl.deleteRotationScheduleById as any)(req, res, next);
});

export default router;
