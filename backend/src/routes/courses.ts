import express from "express";
import { authorize, protect } from "../middleware/auth";
import { createCourse } from "../controllers/courses";

const courseRouter = express.Router();

courseRouter
.route("/create")
.post(protect, authorize(["admin"]), createCourse);
// .get(protect, getAllCourses);

export default courseRouter;