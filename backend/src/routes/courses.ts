import express from "express";
import { authorize, protect } from "../middleware/auth";
import {
  createCourseSubject,
  deleteCourseSubjects,
  getAllCourseSubjects,
  updateCourseSubjects,
  deduplicateClassCourses,
} from "../controllers/courses";

const courseRouter = express.Router();

courseRouter
.route("/create")
.post(protect, authorize(["admin", "teacher"]), createCourseSubject);

courseRouter
.route("/deduplicate-classes")
.post(protect, authorize(["admin"]), deduplicateClassCourses);

courseRouter
.route("/")
.get(protect, getAllCourseSubjects);

courseRouter
.route("/delete/:id")
.delete(protect,  authorize(["admin"]), deleteCourseSubjects);

courseRouter
.route("/update/:id")
.patch(protect,  authorize(["admin", "teacher"]), updateCourseSubjects);

export default courseRouter;
