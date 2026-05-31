import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog";
import { inngest } from "../inngest";

// @desc    Generate a TimeTable using AI
// @route   POST /api/timetable/generate
// @access  Private/Admin

export const generateTimeTable = async (
  req: Request,
  res: Response
) => {
  try {
    const { classId, academicYear, settings } = req.body;
    await inngest.send(
      {
        name: "generate/timetable",
        data: {
          classId,
          academicYear,
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