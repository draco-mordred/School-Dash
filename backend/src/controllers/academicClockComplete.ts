import { Request, Response } from "express";
import AcademicClock from "../models/academicClock";
import AcademicYear from "../models/academicYear";
import User from "../models/user";
import ClassModel from "../models/classes";
import { createNotificationIfUnique } from "../utils/notificationUtils";

// Admin notification helper
export const completeAcademicClockByClass = async (req: Request, res: Response) => {
  try {
    const { academicYearId, classId } = req.body;
    if (!academicYearId || !classId) {
      res.status(400).json({ message: "academicYearId and classId are required" });
      return;
    }

    const clock = await AcademicClock.findOne({ academicYear: academicYearId, classId });
    if (!clock) return res.status(404).json({ message: "Academic clock not found" });

    // mark clock as paused/completed
    clock.clockIsPaused = true;
    await clock.save();

    const year = await AcademicYear.findById(academicYearId);
    const classDoc = await ClassModel.findById(classId).select("name");
    const className = classDoc?.name ?? classId;
    const executor = (req as any).user;
    const actorName = executor?.name ?? executor?.email ?? "An administrator";
    const actorRole = executor?.role ?? "admin";

    const adminUsers = await User.find({ role: "admin", isActive: true }).select("_id").lean();
    if (adminUsers.length > 0) {
      await Promise.all(
        adminUsers.map((user) =>
          createNotificationIfUnique({
            userId: user._id,
            role: "admin",
            title: "Academic Clock Completed",
            message: `${actorName} completed the academic clock for ${className} in ${year?.name ?? academicYearId}.`,            type: "system",
            actorName,
            actorRole,
            metadata: {
              academicYearId,
              classId,
            },
          })
        )
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to complete clock" });
  }
};
