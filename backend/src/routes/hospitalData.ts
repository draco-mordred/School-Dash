import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import {
  createHospitalUnit,
  listHospitalUnits,
  getHospitalUnit,
  updateHospitalUnit,
  createHospitalStaff,
  listHospitalStaff,
  getHospitalStaff,
  updateHospitalStaff,
  bulkImportStaff,
} from "../controllers/hospitalData";

const router = Router();

// ============ HOSPITAL UNITS ============

/**
 * POST /hospital-data/units
 * Create a new hospital unit (admin only)
 */
router.post("/units", protect, authorize(["admin"]), createHospitalUnit);

/**
 * GET /hospital-data/units
 * List hospital units
 */
router.get("/units", protect, listHospitalUnits);

/**
 * GET /hospital-data/units/:unitId
 * Get details of a specific unit
 */
router.get("/units/:unitId", protect, getHospitalUnit);

/**
 * PATCH /hospital-data/units/:unitId
 * Update a hospital unit (admin only)
 */
router.patch("/units/:unitId", protect, authorize(["admin"]), updateHospitalUnit);

// ============ HOSPITAL STAFF ============

/**
 * POST /hospital-data/staff
 * Create a new staff record (admin only)
 */
router.post("/staff", protect, authorize(["admin"]), createHospitalStaff);

/**
 * GET /hospital-data/staff
 * List hospital staff
 */
router.get("/staff", protect, listHospitalStaff);

/**
 * GET /hospital-data/staff/:staffId
 * Get details of a specific staff member
 */
router.get("/staff/:staffId", protect, getHospitalStaff);

/**
 * PATCH /hospital-data/staff/:staffId
 * Update a staff record (admin only)
 */
router.patch("/staff/:staffId", protect, authorize(["admin"]), updateHospitalStaff);

/**
 * POST /hospital-data/staff/bulk-import
 * Bulk import staff from roster data (admin only)
 */
router.post("/staff/bulk-import", protect, authorize(["admin"]), bulkImportStaff);

export default router;
