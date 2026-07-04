import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  // createClinicalRotation,
  // getAllClinicalRotations,
  // getClinicalRotationById,
  // updateClinicalRotation,
  // deleteClinicalRotation,
  // addRotationNote,
  // addPatientClerked,
  // approveRotation,
  // getRotationStats,
  // getAvailableRotations,
  // signupRotation,
  // listAllRotations,
} from "../controllers/for500LevelPosting";

// const clinicalRotationRouter = express.Router();

const routerFor500LevelPostings = express.Router();

// clinicalRotationRouter.post(
//   "/",
//   protect,
//   authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
//   createClinicalRotation
// );

// clinicalRotationRouter.get(
//   "/",
//   protect,
//   getAllClinicalRotations
// );

// clinicalRotationRouter.get(
//   "/stats",
//   protect,
//   getRotationStats
// );

// // search available/active rotations
// clinicalRotationRouter.get(
//   "/available",
//   protect,
//   getAvailableRotations
// );

// // student signup for a rotation
// clinicalRotationRouter.post(
//   "/:id/signup",
//   protect,
//   authorize(["student"]),
//   signupRotation
// );

// // list all rotations for browsing (no role-based restriction)
// clinicalRotationRouter.get(
//   "/list",
//   protect,
//   listAllRotations
// );

// clinicalRotationRouter.get(
//   "/:id",
//   protect,
//   getClinicalRotationById
// );

// clinicalRotationRouter.put(
//   "/:id",
//   protect,
//   authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
//   updateClinicalRotation
// );

// clinicalRotationRouter.delete(
//   "/:id",
//   protect,
//   authorize(["admin", "teacher"]),
//   deleteClinicalRotation
// );

// clinicalRotationRouter.post(
//   "/:id/approve",
//   protect,
//   authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
//   approveRotation
// );

// clinicalRotationRouter.post(
//   "/:id/notes",
//   protect,
//   addRotationNote
// );

// clinicalRotationRouter.post(
//   "/:id/patients",
//   protect,
//   authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
//   addPatientClerked
// );

// list all rotations for browsing (no role-based restriction)

// export default clinicalRotationRouter;

export default routerFor500LevelPostings;

