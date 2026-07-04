import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { createActivityEntry, getPendingEntries, getStudentLogbook, approveActivityEntry, rejectActivityEntry, getActivityEntry, listActivityEntries, } from "../controllers/activityEntry";
const router = Router();
/**
 * POST /activity-entries
 * Create a new activity entry (student)
 */
router.post("/", protect, createActivityEntry);
/**
 * GET /activity-entries
 * List activity entries (admin/teacher)
 */
router.get("/", protect, authorize(["admin", "teacher"]), listActivityEntries);
/**
 * GET /activity-entries/pending
 * Get pending entries for the authenticated staff member (staff only)
 */
router.get("/pending", protect, authorize(["unitconsultant", "unitresident"]), getPendingEntries);
/**
 * GET /activity-entries/:entryId
 * Get details of a specific activity entry
 */
router.get("/:entryId", protect, getActivityEntry);
/**
 * GET /activity-entries/logbook/:studentId/:rotationId
 * Get student's approved logbook for a rotation
 */
router.get("/logbook/:studentId/:rotationId", protect, getStudentLogbook);
/**
 * POST /activity-entries/:entryId/approve
 * Approve an activity entry (staff sign-off)
 */
router.post("/:entryId/approve", protect, authorize(["unitconsultant", "unitresident"]), approveActivityEntry);
/**
 * POST /activity-entries/:entryId/reject
 * Reject an activity entry
 */
router.post("/:entryId/reject", protect, authorize(["unitconsultant", "unitresident"]), rejectActivityEntry);
export default router;
