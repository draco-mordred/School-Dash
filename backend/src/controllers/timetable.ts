import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog";
import { inngest } from "../inngest";
import Timetable from "../models/timetable";
import ClassModel from "../models/classes";
import User from "../models/user";
import mongoose from "mongoose";
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

    // Fast-path synchronous generation: if caller requests `settings.fast === true`,
    // run a lightweight greedy scheduler locally and return the generated timetable
    // immediately. This avoids the external AI step (which can take many seconds)
    // and gives a timetable within a few hundred milliseconds for typical class sizes.
    if (settings && settings.fast) {
      // Simple greedy generator
      const generated = await fastGenerateAndSave(classIdValue, academicYearValue, settings);
      const userId = (req as any).user._id;
      await logActivity({ userId, action: `Generated timetable (fast) for class ID: ${classIdValue}` });
      return res.status(200).json({ message: "Timetable generated (fast)", schedule: generated.schedule });
    }

    // Otherwise, enqueue the AI-based generation via Inngest (longer-running)
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

async function fastGenerateAndSave(classId: string, academicYearId: string, settings: any) {
  // settings: { startTime: '08:00', endTime: '16:00', periods: number }
  // Simple round-robin assignment: gather courses and lecturers, then fill days x periods
  const cls = await ClassModel.findById(classId).populate("courses");
  if (!cls) throw new Error("Class not found");

  const courses: any[] = (cls.courses || []).map((c: any) => ({ id: String(c._id), name: c.name }));
  // Fetch lecturers and map by course id (teacherSubject)
  const teachers = await User.find({ role: "teacher" }).select("_id name teacherSubject");
  const teachersByCourse: Record<string, string[]> = {};
  for (const t of teachers) {
    const subs = Array.isArray((t as any).teacherSubject) ? (t as any).teacherSubject : [];
    for (const s of subs) {
      const key = String(s);
      teachersByCourse[key] = teachersByCourse[key] || [];
      teachersByCourse[key].push(String(t._id));
    }
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periodsPerDay = Number(settings?.periods) || 5;

  // compute time slots by evenly splitting start-end into periods if possible
  const parseHM = (h: string) => {
    const [hh, mm] = h.split(":").map(Number);
    return hh * 60 + mm;
  };
  const fmt = (mins: number) => {
    const hh = Math.floor(mins / 60).toString().padStart(2, "0");
    const mm = (mins % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };
  let start = parseHM(settings?.startTime || "08:00");
  let end = parseHM(settings?.endTime || "16:00");
  const total = Math.max(1, periodsPerDay);
  const slotLength = Math.floor((end - start) / total) || 60;

  const schedule: any[] = [];

  // Distribute courses round-robin across all slots
  const allSlots: { day: string; startTime: string; endTime: string }[] = [];
  for (const day of days) {
    let cur = start;
    for (let p = 0; p < periodsPerDay; p++) {
      const s = fmt(cur);
      cur += slotLength;
      const e = fmt(cur);
      allSlots.push({ day, startTime: s, endTime: e });
    }
  }

  let courseIdx = 0;
  for (const day of days) {
    const dayPeriods: any[] = [];
    for (let p = 0; p < periodsPerDay; p++) {
      const course = courses.length ? courses[courseIdx % courses.length] : null;
      let lecturerId: string | null = null;
      if (course && teachersByCourse[course.id] && teachersByCourse[course.id].length) {
        // pick teacher round-robin
        const list = teachersByCourse[course.id];
        lecturerId = list[(courseIdx) % list.length] || null;
      }
      const slot = allSlots.find((s) => s.day === day && s.startTime === fmt(start + p * slotLength));
      const startTime = slot ? slot.startTime : fmt(start + p * slotLength);
      const endTime = slot ? slot.endTime : fmt(start + (p + 1) * slotLength);

      dayPeriods.push({
        subject: course ? new mongoose.Types.ObjectId(course.id) : null,
        lecturer: lecturerId ? new mongoose.Types.ObjectId(lecturerId) : null,
        startTime,
        endTime,
      });
      courseIdx++;
    }
    schedule.push({ day, periods: dayPeriods });
  }

  // Persist
  await Timetable.findOneAndDelete({ class: classId, academicYear: academicYearId });
  await Timetable.create({ class: classId, academicYear: academicYearId, schedule });
  const saved = await Timetable.findOne({ class: classId, academicYear: academicYearId })
    .populate("schedule.periods.subject", "name code")
    .populate("schedule.periods.lecturer", "name email idNumber");

  return { success: true, schedule: saved?.schedule ?? schedule };
}