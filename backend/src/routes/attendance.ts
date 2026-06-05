import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  recordAttendance,
  getMyAttendanceSummary,
  getSubjectsAttendance,
} from "../controllers/attendance";

const attendanceRouter = express.Router();

attendanceRouter.post(
  "/record",
  protect,
  authorize(["admin", "teacher"]),
  recordAttendance
);
attendanceRouter.get("/me", protect, getMyAttendanceSummary);
attendanceRouter.get(
  "/subjects",
  protect,
  authorize(["admin", "teacher"]),
  getSubjectsAttendance
);

export default attendanceRouter;
 