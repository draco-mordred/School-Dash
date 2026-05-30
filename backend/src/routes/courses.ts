import express from "express";
import { authorize, protect } from "../middleware/auth";
import { 
  createCourseSubject, 
  deleteCourseSubjects, 
  getAllCourseSubjects, 
  updateCourseSubjects 
} from "../controllers/courses";

const courseRouter = express.Router();

courseRouter
.route("/create")
.post(protect, authorize(["admin"]), createCourseSubject);

courseRouter
.route("/")
.get(protect,  authorize(["admin", "teacher"]), getAllCourseSubjects);

courseRouter
.route("/delete/:id")
.delete(protect,  authorize(["admin"]), deleteCourseSubjects);

courseRouter
.route("/update/:id")
.patch(protect,  authorize(["admin"]), updateCourseSubjects);

export default courseRouter;