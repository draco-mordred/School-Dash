import express from "express";
import { generateTimeTable, getTimetable } from "../controllers/timetable";
import { protect, authorize } from "../middleware/auth";

const timeRouter = express.Router();

// Generate: Admin only (costs money/resources)
timeRouter.post(
  "/generate", protect, authorize(["admin"]), generateTimeTable
);

timeRouter.get("/:classId", protect, getTimetable)

// View: everyone (Students need to see their schdule)
// timetable.get("/:classId", protect, getTimeTable_;

export default timeRouter;
