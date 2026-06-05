import { type Request, type Response } from "express";
import Attendance from "../models/attendance";
import Course from "../models/courses";
import User from "../models/user";
import { logActivity } from "../utils/activitieslog";

export const recordAttendance = async (req: Request, res: Response) => {
  try {
    const { student, subject, class: classId, academicYear, status, notes } = req.body;
    const teacher = (req as any).user._id;

    if (!student || !subject || !classId || !academicYear || !status) {
      return res.status(400).json({ message: "Missing required attendance fields." });
    }

    const record = await Attendance.create({
      student,
      teacher,
      subject,
      class: classId,
      academicYear,
      status,
      notes, 
    });

    await logActivity({
      userId: teacher,
      action: "Recorded attendance",
      details: `Attendance for student ${student} on ${new Date(record.date).toDateString()} set to ${status}`,
    });

    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getMyAttendanceSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    if (userRole === "student") {
      const stats = await Attendance.aggregate([
        { $match: { student: userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const records = await Attendance.find({ student: userId })
        .populate("subject", "name code courseID")
        .populate("class", "name")
        .populate("teacher", "name email")
        .sort({ date: -1 })
        .limit(20);

      res.json({ stats, records });
      return;
    }

    const stats = await Attendance.aggregate([
      { $match: { teacher: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const records = await Attendance.find({ teacher: userId })
      .populate("subject", "name code courseID")
      .populate("class", "name")
      .populate("student", "name email")
      .sort({ date: -1 })
      .limit(20);

    res.json({ stats, records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getSubjectsAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const summary = await Attendance.aggregate([
      { $match: { teacher: userId } },
      {
        $group: {
          _id: "$subject",
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "absent"] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [{ $eq: ["$status", "late"] }, 1, 0],
            },
          },
          excused: {
            $sum: {
              $cond: [{ $eq: ["$status", "excused"] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: "$subject" },
    ]);

    res.json({ summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
