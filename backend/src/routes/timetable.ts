import express from "express";
import { generateTimeTable } from "../controllers/timetable";
import { protect, authorize } from "../middleware/auth";

const timeRouter = express.Router();

// Generate: Admin only (costs money/resources)
timeRouter.post(
  "/generate", protect, authorize(["admin"]), generateTimeTable
);

// View: everyone (Students need to see their schdule)
// timetable.get("/:classId", protect, getTimeTable_;

export default timeRouter;
