import express from "express";
import { createAcademicYear, deleteAcedemicYear, getAllAcademicYears, getCurrentAcademicYear, updateAcademicYear } from "../controllers/academicYear";
import { authorize, protect } from "../middleware/auth";
const academicYearRouter = express.Router();
academicYearRouter
    .route("/create")
    .post(protect, authorize(["admin"]), createAcademicYear);
//uses POST method to create a new academic year, accessible only to authenticated users with the "admin" role.
academicYearRouter
    .route("/")
    .get(protect, authorize(["admin", "teacher", "parent", "student", "unitconsultant", "unitresident"]), getAllAcademicYears);
//uses GET method to retrieve all academic years, accessible to authenticated users with specific roles (admin, teacher, parent, student, unit consultant, unit resident).
academicYearRouter
    .route("/current")
    .get(getCurrentAcademicYear);
//uses GET method to retrieve the current academic year, accessible to all users without authentication.
academicYearRouter
    .route("/update/:id")
    .patch(protect, authorize(["admin"]), updateAcademicYear);
//uses PATCH method to update an academic year by its ID, with authentication and authorization for admin users only.
academicYearRouter
    .route("/delete/:id")
    .delete(protect, authorize(["admin"]), deleteAcedemicYear);
//uses DELETE method to delete an academic year by its ID, with authentication and authorization for admin users only.
export default academicYearRouter;
//exposes the academicYearRouter for use in other parts of the application, allowing it to be imported and used in the main server file or other modules.
