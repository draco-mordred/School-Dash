import express from "express";
import { generateTimeTable, getTimetable, addPeriod, updatePeriod, deletePeriod } from "../controllers/timetable";
import { protect, authorize } from "../middleware/auth";
const timeRouter = express.Router();
// Generate: Admin only (costs money/resources)
timeRouter.post("/generate", protect, authorize(["admin"]), generateTimeTable);
timeRouter.get("/:classId", protect, getTimetable);
// Timetable CRUD: Admin only
timeRouter.post("/:classId/periods", protect, authorize(["admin"]), addPeriod);
timeRouter.put("/:classId/periods", protect, authorize(["admin"]), updatePeriod);
timeRouter.delete("/:classId/periods", protect, authorize(["admin"]), deletePeriod);
// View: everyone (Students need to see their schdule)
// timetable.get("/:classId", protect, getTimeTable_;
export default timeRouter;
