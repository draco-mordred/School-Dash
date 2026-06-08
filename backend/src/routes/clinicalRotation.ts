import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  createClinicalRotation,
  getAllClinicalRotations,
  getClinicalRotationById,
  updateClinicalRotation,
  deleteClinicalRotation,
  addRotationNote,
  addPatientClerked,
  approveRotation,
  getRotationStats,
  getAvailableRotations,
  signupRotation,
  listAllRotations,
} from "../controllers/clinicalRotation";

const clinicalRotationRouter = express.Router();

clinicalRotationRouter.post(
  "/",
  protect,
  authorize(["admin", "teacher", "student", "unit_consultant", "unit_resident"]),
  createClinicalRotation
);

clinicalRotationRouter.get(
  "/",
  protect,
  getAllClinicalRotations
);

clinicalRotationRouter.get(
  "/stats",
  protect,
  getRotationStats
);

// search available/active rotations
clinicalRotationRouter.get(
  "/available",
  protect,
  getAvailableRotations
);

// student signup for a rotation
clinicalRotationRouter.post(
  "/:id/signup",
  protect,
  authorize(["student"]),
  signupRotation
);

clinicalRotationRouter.get(
  "/:id",
  protect,
  getClinicalRotationById
);

clinicalRotationRouter.put(
  "/:id",
  protect,
  authorize(["admin", "teacher", "student", "unit_consultant", "unit_resident"]),
  updateClinicalRotation
);

clinicalRotationRouter.delete(
  "/:id",
  protect,
  authorize(["admin", "teacher"]),
  deleteClinicalRotation
);

clinicalRotationRouter.post(
  "/:id/approve",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  approveRotation
);

clinicalRotationRouter.post(
  "/:id/notes",
  protect,
  addRotationNote
);

clinicalRotationRouter.post(
  "/:id/patients",
  protect,
  authorize(["admin", "teacher", "student", "unit_consultant", "unit_resident"]),
  addPatientClerked
);

// list all rotations for browsing (no role-based restriction)
clinicalRotationRouter.get(
  "/list",
  protect,
  listAllRotations
);

export default clinicalRotationRouter;
