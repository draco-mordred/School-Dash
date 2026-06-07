import express from "express";
import { 
  createAcademicYear, 
  deleteAcedemicYear, 
  getAllAcademicYears, 
  getCurrentAcademicYear, 
  updateAcademicYear 
} from "../controllers/academicYear";
import { authorize, protect } from "../middleware/auth";

const academicYearRouter = express.Router();

academicYearRouter
.route("/create")
.post(protect, authorize(["admin"]), createAcademicYear)

academicYearRouter
.route("/")
.get(protect, authorize(["admin", "teacher", "parent"]), getAllAcademicYears)
 
academicYearRouter
.route("/current")
.get(getCurrentAcademicYear);

academicYearRouter
.route("/update/:id")
.patch(protect, authorize(["admin"]), updateAcademicYear)

academicYearRouter
.route("/delete/:id")
.delete(protect, authorize(["admin"]), deleteAcedemicYear)

export default academicYearRouter;