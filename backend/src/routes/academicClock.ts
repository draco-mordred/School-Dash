import * as express from "express";
import {
  createAcademicClock,
  getAcademicClocks,
  getAcademicClockById,
  updateAcademicClock,
  deleteAcademicClock,
  deleteAcademicClockByClass,
} from "../controllers/academicClock";
import { completeAcademicClockByClass } from "../controllers/academicClockComplete";
import { authorize, protect } from "../middleware/auth";

const academicClockRouter = express.Router();

academicClockRouter
  .route("/create")
  .post(protect, authorize(["admin"]), createAcademicClock);

academicClockRouter
  .route("/")
  .get(
    protect,
    authorize(["admin", "teacher", "unitconsultant", "unitresident", "student", "parent"]),
    getAcademicClocks
  );

academicClockRouter
  .route("/:id")
  .get(
    protect,
    authorize(["admin", "teacher", "unitconsultant", "unitresident", "student", "parent"]),
    getAcademicClockById
  );

academicClockRouter
  .route("/update/:id")
  .patch(protect, authorize(["admin"]), updateAcademicClock);

academicClockRouter
  .route("/delete/by-class")
  .delete(protect, authorize(["admin"]), deleteAcademicClockByClass);

academicClockRouter
  .route("/complete/by-class")
  .post(protect, authorize(["admin"]), completeAcademicClockByClass);

academicClockRouter
  .route("/delete/:id")
  .delete(protect, authorize(["admin"]), deleteAcademicClock);

export default academicClockRouter;
