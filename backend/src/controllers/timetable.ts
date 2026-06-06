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
    .populate("schedule.periods.lecturer", "name email");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found!" });
    }
    res.json({ schedule: timetable.schedule })
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// @desc    Add a period to a specific day in the timetable
// @route   POST /api/timetables/:classId/periods
// @access  Private/Admin
export const addPeriod = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { day, period } = req.body;

    if (!day || !period || !period.subject || !period.startTime || !period.endTime) {
      res.status(400).json({ message: "day and period (subject, startTime, endTime) are required" });
      return;
    }

    const timetable = await Timetable.findOne({ class: classId });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }

    const dayIndex = timetable.schedule.findIndex(
      (d) => d.day.toLowerCase() === day.toLowerCase()
    );

    if (dayIndex === -1) {
      // Create a new day entry
      timetable.schedule.push({ day, periods: [period] });
    } else {
      timetable.schedule[dayIndex].periods.push(period);
    }

    await timetable.save();

    const updated = await Timetable.findById(timetable._id)
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.lecturer", "name email");

    await logActivity({
      userId: (req as any).user._id,
      action: `Added period to timetable`,
      details: `Class ${classId}, day ${day}, subject ${period.subject}`,
    });

    res.status(201).json({ schedule: updated?.schedule });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a period in the timetable
// @route   PUT /api/timetables/:classId/periods
// @access  Private/Admin
export const updatePeriod = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { dayIndex, periodIndex, period } = req.body;

    if (dayIndex === undefined || periodIndex === undefined || !period) {
      res.status(400).json({ message: "dayIndex, periodIndex, and period are required" });
      return;
    }

    const timetable = await Timetable.findOne({ class: classId });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }

    if (dayIndex < 0 || dayIndex >= timetable.schedule.length) {
      res.status(400).json({ message: "Invalid dayIndex" });
      return;
    }

    const daySchedule = timetable.schedule[dayIndex];
    if (periodIndex < 0 || periodIndex >= daySchedule.periods.length) {
      res.status(400).json({ message: "Invalid periodIndex" });
      return;
    }

    daySchedule.periods[periodIndex] = {
      ...daySchedule.periods[periodIndex],
      ...period,
    };

    await timetable.save();

    const updated = await Timetable.findById(timetable._id)
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.lecturer", "name email");

    await logActivity({
      userId: (req as any).user._id,
      action: `Updated timetable period`,
      details: `Class ${classId}, day ${dayIndex}, period ${periodIndex}`,
    });

    res.status(200).json({ schedule: updated?.schedule });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a period from the timetable
// @route   DELETE /api/timetables/:classId/periods
// @access  Private/Admin
export const deletePeriod = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { dayIndex, periodIndex } = req.body;

    if (dayIndex === undefined || periodIndex === undefined) {
      res.status(400).json({ message: "dayIndex and periodIndex are required" });
      return;
    }

    const timetable = await Timetable.findOne({ class: classId });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }

    if (dayIndex < 0 || dayIndex >= timetable.schedule.length) {
      res.status(400).json({ message: "Invalid dayIndex" });
      return;
    }

    const daySchedule = timetable.schedule[dayIndex];
    if (periodIndex < 0 || periodIndex >= daySchedule.periods.length) {
      res.status(400).json({ message: "Invalid periodIndex" });
      return;
    }

    daySchedule.periods.splice(periodIndex, 1);
    await timetable.save();

    const updated = await Timetable.findById(timetable._id)
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.lecturer", "name email");

    await logActivity({
      userId: (req as any).user._id,
      action: `Deleted timetable period`,
      details: `Class ${classId}, day ${dayIndex}, period ${periodIndex}`,
    });

    res.status(200).json({ schedule: updated?.schedule });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};