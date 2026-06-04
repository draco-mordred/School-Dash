import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog";
import { inngest } from "../inngest";
import Timetable from "../models/timetable";
// @desc    Generate a TimeTable using AI
// @route   POST /api/timetable/generate
// @access  Private/Admin

export const generateTimeTable = async (
  req: Request,
  res: Response
) => {
  try {
    const { classId, academicYear, academicYearId, settings } = req.body;
    const classIdValue = classId?._id ?? classId?.id ?? classId;
    const academicYearValue = academicYearId ?? academicYear?._id ?? academicYear?.id ?? academicYear;

    if (!classIdValue || !academicYearValue || !settings) {
      return res.status(400).json({ message: "classId, academicYear, and settings are required" });
    }

    await inngest.send(
      {
        name: "generate/timetable",
        data: {
          classId: classIdValue,
          academicYear,
          academicYearId: academicYearValue,
          settings
        }
      }
    )
    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `Requested timetable generation for class ID: ${classId} `
    });
    res.status(200).json({
      message: `Timetable generation initiated`
    })
  } catch (error) {
    res.status(500).json({ message: `Serve error`, error });
  }
}

// @desc    Get Timetable by Class
// @route   GET /api/timetables/:classId
// @access  Private/Admin

export const getTimetable = async (
  req: Request,
  res: Response
) => {
  try {
    const timetable = await Timetable.findOne({ class: req.params.classId })
    .populate("schedule.periods.subject", "name code courseID")
    .populate("schedule.periods.teacher", "name email");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found!" });
    }
    res.json({timetable})
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}