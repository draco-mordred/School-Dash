import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog";
import { inngest } from "../inngest";
import Timetable from "../models/timetable";
import ClassModel from "../models/classes";
import AcademicClock from "../models/academicClock";
import User from "../models/user";
import mongoose from "mongoose";
import { build500LevelTimetablePlan, resolve500LevelCourse } from "../utils/500LevelTimetable";
import { resolveAcademicClockPhase } from "../utils/academicClockPhase";
import { getTimetableForPhase, saveTimetableForPhase } from "../utils/phaseTimetable";
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

    // Fetch class name to detect if it's 400 Level
    const classData = await ClassModel.findById(classIdValue);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    const enhancedSettings = {
      ...settings,
      className: classData.name
    };

    // Fast-path synchronous generation: if caller requests `settings.fast === true`,
    // run a lightweight greedy scheduler locally and return the generated timetable
    // immediately. This avoids the external AI step (which can take many seconds)
    // and gives a timetable within a few hundred milliseconds for typical class sizes.
    if (settings && settings.fast) {
      // Simple greedy generator
      const generated = await fastGenerateAndSave(classIdValue, academicYearValue, enhancedSettings);
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
          settings: enhancedSettings
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
    const classDoc = await ClassModel.findById(req.params.classId)
      .select("academicYear courses")
      .populate("courses", "name code")
      .lean();
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }
    const query: Record<string, unknown> = { class: req.params.classId };
    if (classDoc?.academicYear) query.academicYear = classDoc.academicYear;
    const clock = classDoc?.academicYear
      ? await AcademicClock.findOne({ classId: req.params.classId, academicYear: classDoc.academicYear }).lean()
      : null;
    const phase = clock ? resolveAcademicClockPhase(clock) : null;
    const phaseConfig = phase?.phase as Record<string, any> | null;
    const timetable = await Timetable.findOne(query)
    .populate({
      path: "schedule.periods.subject",
      select: "name code courseID subjects.name subjects.code subjects.subjectID subjects.date subjects.startTime subjects.endTime subjects.lecturer",
      populate: {
        path: "subjects.lecturer",
        select: "name email",
      },
    })
    .populate("schedule.periods.lecturer", "name email")
    .populate({
      path: "phaseSchedules.schedule.periods.subject",
      select: "name code courseID subjects.name subjects.code subjects.subjectID subjects.date subjects.startTime subjects.endTime subjects.lecturer",
      populate: {
        path: "subjects.lecturer",
        select: "name email",
      },
    })
    .populate("phaseSchedules.schedule.periods.lecturer", "name email");

    const phaseScheduleId = phaseConfig?.timetablePhaseId ?? phase?.phaseId ?? null;
    const storedPhaseSchedule = timetable?.phaseSchedules?.find(
      (entry: any) => entry.phaseId === phaseScheduleId,
    );
    const phaseCourseIds: string[] = Array.isArray(phaseConfig?.courseIds)
      ? phaseConfig.courseIds.map(String)
      : (storedPhaseSchedule?.courseIds ?? []).map(String);
    const allClassCourses = ((classDoc as any).courses ?? []) as Array<Record<string, any>>;
    const phaseCourses = allClassCourses.filter((course) =>
      phaseCourseIds.length === 0 || phaseCourseIds.includes(String(course._id)),
    );
    if (!timetable) {
      return res.json({
        schedule: [],
        phaseId: phase?.phaseId ?? null,
        phaseName: phaseConfig?.name ?? null,
        phaseStartsAt: phase?.startsAt ?? null,
        phaseEndsAt: phase?.endsAt ?? null,
        phaseCourseIds,
        phaseCourses,
        scheduleConfigured: false,
      });
    }
    const selected = getTimetableForPhase(
      timetable,
      phase?.phaseId ?? null,
      phaseConfig?.timetablePhaseId ?? null,
    );
    res.json({
      schedule: selected.schedule,
      phaseId: phase?.phaseId ?? null,
      phaseName: phaseConfig?.name ?? null,
      phaseStartsAt: phase?.startsAt ?? null,
      phaseEndsAt: phase?.endsAt ?? null,
      phaseCourseIds,
      phaseCourses,
      scheduleConfigured: selected.configured,
    })
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
    const clockContext = await getClassClockContext(classId);

    if (!day || !period || !period.subject || !period.startTime || !period.endTime) {
      res.status(400).json({ message: "day and period (subject, startTime, endTime) are required" });
      return;
    }

    const timetable = await Timetable.findOne({
      class: classId,
      ...(clockContext.academicYearId ? { academicYear: clockContext.academicYearId } : {}),
    });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }

    const schedule = [...getEditableSchedule(timetable, clockContext.phaseId, clockContext.sourcePhaseId)];
    const dayIndex = schedule.findIndex(
      (d) => d.day.toLowerCase() === day.toLowerCase()
    );

    if (dayIndex === -1) {
      // Create a new day entry
      schedule.push({ day, periods: [period] });
    } else {
      schedule[dayIndex].periods.push(period);
    }

    await saveEditableSchedule(timetable, clockContext.phaseId, clockContext.sourcePhaseId, schedule);

    const updated = await Timetable.findById(timetable._id)
      .populate("schedule.periods.subject", "name code subjects.subjectID")
      .populate("schedule.periods.lecturer", "name email")
      .populate("phaseSchedules.schedule.periods.subject", "name code subjects.subjectID")
      .populate("phaseSchedules.schedule.periods.lecturer", "name email");

    await logActivity({
      userId: (req as any).user._id,
      action: `Added period to timetable`,
      details: `Class ${classId}, day ${day}, subject ${period.subject}`,
    });

    res.status(201).json({
      schedule: updated ? getEditableSchedule(updated, clockContext.phaseId, clockContext.sourcePhaseId) : schedule,
      phaseId: clockContext.phaseId,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const getClassClockContext = async (classId: string) => {
  const classDoc = await ClassModel.findById(classId).select("academicYear").lean();
  const academicYearId = classDoc?.academicYear ? String(classDoc.academicYear) : "";
  const clock = academicYearId
    ? await AcademicClock.findOne({ classId, academicYear: academicYearId }).lean()
    : null;
  const phase = clock ? resolveAcademicClockPhase(clock) : null;
  const phaseConfig = phase?.phase as Record<string, any> | null;

  return {
    academicYearId,
    phaseId: phase?.phaseId ?? null,
    phaseConfig,
    sourcePhaseId: phaseConfig?.timetablePhaseId ?? null,
  };
};

const getEditableSchedule = (timetable: any, phaseId: string | null, sourcePhaseId: string | null) => {
  const source = sourcePhaseId || phaseId;
  if (!phaseId || source === "legacy") return timetable.schedule;

  const phaseEntry = (timetable.phaseSchedules ?? []).find((entry: any) => entry.phaseId === source);
  return phaseEntry?.schedule ?? [];
};

const saveEditableSchedule = async (
  timetable: any,
  phaseId: string | null,
  sourcePhaseId: string | null,
  schedule: any[],
) => {
  const source = sourcePhaseId || phaseId;
  if (!phaseId || source === "legacy") {
    timetable.schedule = schedule;
    await timetable.save();
    return;
  }

  const phaseSchedules = [...(timetable.phaseSchedules ?? [])];
  const index = phaseSchedules.findIndex((entry: any) => entry.phaseId === source);
  const entry = {
    phaseId: source,
    schedule,
    courseIds: timetable.phaseSchedules?.[index]?.courseIds ?? [],
    updatedAt: new Date(),
  };
  if (index === -1) phaseSchedules.push(entry);
  else phaseSchedules[index] = entry;
  timetable.phaseSchedules = phaseSchedules;
  await timetable.save();
};

// @desc    Update a period in the timetable
// @route   PUT /api/timetables/:classId/periods
// @access  Private/Admin
export const updatePeriod = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { dayIndex, periodIndex, period } = req.body;
    const clockContext = await getClassClockContext(classId);

    if (dayIndex === undefined || periodIndex === undefined || !period) {
      res.status(400).json({ message: "dayIndex, periodIndex, and period are required" });
      return;
    }

    const timetable = await Timetable.findOne({
      class: classId,
      ...(clockContext.academicYearId ? { academicYear: clockContext.academicYearId } : {}),
    });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }

    const schedule = [...getEditableSchedule(timetable, clockContext.phaseId, clockContext.sourcePhaseId)];
    if (dayIndex < 0 || dayIndex >= schedule.length) {
      res.status(400).json({ message: "Invalid dayIndex" });
      return;
    }

    const daySchedule = schedule[dayIndex];
    if (periodIndex < 0 || periodIndex >= daySchedule?.periods.length) {
      res.status(400).json({ message: "Invalid periodIndex" });
      return;
    }

    daySchedule.periods[periodIndex] = {
      ...daySchedule?.periods[periodIndex],
      ...period,
    };

    await saveEditableSchedule(timetable, clockContext.phaseId, clockContext.sourcePhaseId, schedule);

    const updated = await Timetable.findById(timetable._id)
      .populate("schedule.periods.subject", "name code subjects.subjectID")
      .populate("schedule.periods.lecturer", "name email")
      .populate("phaseSchedules.schedule.periods.subject", "name code subjects.subjectID")
      .populate("phaseSchedules.schedule.periods.lecturer", "name email");

    await logActivity({
      userId: (req as any).user._id,
      action: `Updated timetable period`,
      details: `Class ${classId}, day ${dayIndex}, period ${periodIndex}`,
    });

    res.status(200).json({
      schedule: updated ? getEditableSchedule(updated, clockContext.phaseId, clockContext.sourcePhaseId) : schedule,
      phaseId: clockContext.phaseId,
    });
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
    const clockContext = await getClassClockContext(classId);

    if (dayIndex === undefined || periodIndex === undefined) {
      res.status(400).json({ message: "dayIndex and periodIndex are required" });
      return;
    }

    const timetable = await Timetable.findOne({
      class: classId,
      ...(clockContext.academicYearId ? { academicYear: clockContext.academicYearId } : {}),
    });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }

    const schedule = [...getEditableSchedule(timetable, clockContext.phaseId, clockContext.sourcePhaseId)];
    if (dayIndex < 0 || dayIndex >= schedule.length) {
      res.status(400).json({ message: "Invalid dayIndex" });
      return;
    }

    const daySchedule = schedule[dayIndex];
    if (periodIndex < 0 || periodIndex >= daySchedule?.periods.length) {
      res.status(400).json({ message: "Invalid periodIndex" });
      return;
    }

    daySchedule?.periods.splice(periodIndex, 1);
    await saveEditableSchedule(timetable, clockContext.phaseId, clockContext.sourcePhaseId, schedule);

    const updated = await Timetable.findById(timetable._id)
      .populate("schedule.periods.subject", "name code subjects.subjectID")
      .populate("schedule.periods.lecturer", "name email")
      .populate("phaseSchedules.schedule.periods.subject", "name code subjects.subjectID")
      .populate("phaseSchedules.schedule.periods.lecturer", "name email");

    await logActivity({
      userId: (req as any).user._id,
      action: `Deleted timetable period`,
      details: `Class ${classId}, day ${dayIndex}, period ${periodIndex}`,
    });

    res.status(200).json({
      schedule: updated ? getEditableSchedule(updated, clockContext.phaseId, clockContext.sourcePhaseId) : schedule,
      phaseId: clockContext.phaseId,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

async function fastGenerateAndSave(classId: string, academicYearId: string, settings: any) {
  const clockContext = await getClassClockContext(classId);
  const phaseSettings = {
    ...settings,
    clockPhase: clockContext.phaseId ?? settings?.clockPhase,
    timetableSourcePhaseId: clockContext.sourcePhaseId ?? clockContext.phaseId,
    phaseCourseIds: clockContext.phaseConfig?.courseIds ?? [],
  };
  // settings: { startTime: '08:00', endTime: '16:00', periods: number }
  // Check if this is a 400 Level class
  const is400Level = /^400\s*level/i.test(settings?.className || "");
  const is500Level = /^500\s*level/i.test(settings?.className || "");

  if (is400Level) {
    // Special schedule for 400 Level classes
    return await generate400LevelSchedule(classId, academicYearId, phaseSettings);
  }

  if (is500Level) {
    // Phase-based schedule for 500 Level classes
    return await generate500LevelSchedule(classId, academicYearId, phaseSettings);
  }

  // Simple round-robin assignment: gather courses and lecturers, then fill days x periods
  const cls = await ClassModel.findById(classId).populate("courses");
  if (!cls) throw new Error("Class not found");

  const selectedCourseIds = Array.isArray(phaseSettings.phaseCourseIds)
    ? new Set(phaseSettings.phaseCourseIds.map(String))
    : new Set<string>();
  const allCourses: any[] = (cls.courses || []).map((c: any) => ({ id: String(c._id), name: c.name }));
  const courses = selectedCourseIds.size > 0
    ? allCourses.filter((course) => selectedCourseIds.has(course.id))
    : allCourses;
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
  await saveTimetableForPhase(Timetable, {
    classId,
    academicYearId,
    phaseId: getTimetableSavePhaseId(phaseSettings),
    schedule,
    courseIds: courses.map((course) => course.id),
  });
  const saved = await Timetable.findOne({ class: classId, academicYear: academicYearId })
    .populate("schedule.periods.subject", "name code subjects.subjectID")
    .populate("schedule.periods.lecturer", "name email idNumber")
    .populate("phaseSchedules.schedule.periods.subject", "name code subjects.subjectID")
    .populate("phaseSchedules.schedule.periods.lecturer", "name email idNumber");

  const savedPhaseId = getTimetableSavePhaseId(phaseSettings);
  const savedSchedule = savedPhaseId
    ? saved?.phaseSchedules?.find((entry: any) => entry.phaseId === savedPhaseId)?.schedule
    : saved?.schedule;
  return { success: true, schedule: savedSchedule ?? schedule, phaseId: clockContext.phaseId };
}

const getTimetableSavePhaseId = (settings: any): string | null =>
  settings?.timetableSourcePhaseId === "legacy"
    ? null
    : settings?.timetableSourcePhaseId ?? settings?.clockPhase ?? null;

// Specialized schedule generator for 500 Level classes (phase-based)
async function generate500LevelSchedule(classId: string, academicYearId: string, settings: any) {
  const cls = await ClassModel.findById(classId).populate("courses");
  if (!cls) throw new Error("Class not found");

  const academicYearDoc = await (await import("../models/academicYear")).default.findById(academicYearId);
  const clockPhase =
    (settings?.clockPhase as string | undefined) ??
    academicYearDoc?.clockPhase ??
    "phase1";

  console.log(`[500-Level Timetable] Generating for class: ${cls.name}, phase: ${clockPhase}, from DB: ${academicYearDoc?.clockPhase ?? "N/A"}, from settings: ${settings?.clockPhase ?? "N/A"}`);

  const teachers = await User.find({ role: "teacher" }).select("_id teacherSubject");
  const teachersByCourse: Record<string, string[]> = {};
  for (const t of teachers as any[]) {
    const subs: string[] = Array.isArray(t.teacherSubject) ? t.teacherSubject.map(String) : [];
    for (const s of subs) {
      teachersByCourse[s] = teachersByCourse[s] || [];
      teachersByCourse[s].push(String(t._id));
    }
  }

  const getLecturerForCourseId = (courseDbId: string | null) => {
    if (!courseDbId) return null;
    const list = teachersByCourse[courseDbId] ?? [];
    return list.length ? list[0] : null;
  };

  const selectedCourseIds = new Set(
    Array.isArray(settings?.phaseCourseIds) ? settings.phaseCourseIds.map(String) : [],
  );
  const phaseCourses = selectedCourseIds.size
    ? cls.courses.filter((course: any) => selectedCourseIds.has(String(course?._id ?? course)))
    : cls.courses;
  const plan = build500LevelTimetablePlan(clockPhase, phaseCourses as any[]);
  const schedule = plan.map(({ day, periods }) => ({
    day,
    periods: periods.map((period) => {
      const course = period.courseCode ? resolve500LevelCourse(phaseCourses as any[], period.courseCode) : null;
      const courseDbId = course?._id ? String(course._id) : null;
      const lecturerId = getLecturerForCourseId(courseDbId);

      return {
        subject: courseDbId ? new mongoose.Types.ObjectId(courseDbId) : undefined,
        lecturer: lecturerId ? new mongoose.Types.ObjectId(lecturerId) : undefined,
        startTime: period.startTime,
        endTime: period.endTime,
        ...(period.kind === "clinical" ? { isClinical: true } : {}),
        ...(period.kind === "optional" || period.isOptional ? { isOptional: true, displayLabel: period.displayLabel ?? (period.kind === "optional" ? "Optional Activity" : undefined) } : {}),
      };
    }),
  }));

  await saveTimetableForPhase(Timetable, {
    classId,
    academicYearId,
    phaseId: getTimetableSavePhaseId(settings),
    schedule,
    courseIds: Array.isArray(settings?.phaseCourseIds) ? settings.phaseCourseIds : [],
  });

  const saved = await Timetable.findOne({ class: classId, academicYear: academicYearId })
    .populate("schedule.periods.subject", "name code subjects.subjectID")
    .populate("schedule.periods.lecturer", "name email idNumber")
    .populate("phaseSchedules.schedule.periods.subject", "name code subjects.subjectID")
    .populate("phaseSchedules.schedule.periods.lecturer", "name email idNumber");

  const savedPhaseId = getTimetableSavePhaseId(settings);
  const savedSchedule = savedPhaseId
    ? saved?.phaseSchedules?.find((entry: any) => entry.phaseId === savedPhaseId)?.schedule
    : saved?.schedule;
  return { success: true, schedule: savedSchedule ?? schedule, phaseId: settings?.clockPhase ?? null };
}

// Specialized schedule generator for 400 Level classes
async function generate400LevelSchedule(classId: string, academicYearId: string, settings: any) {

  const cls = await ClassModel.findById(classId).populate("courses");
  if (!cls) throw new Error("Class not found");

  // Map courses by name for easy lookup
  const coursesByName = new Map<string, string>();
  const courseMap = new Map<string, string>();
  
  for (const course of cls.courses) {
    const courseObj = course as any;
    const courseName = (courseObj.name as string)?.toLowerCase() ?? "";
    const courseId = String(courseObj._id ?? course);
    if (courseName) {
      coursesByName.set(courseName, courseId);
      courseMap.set(courseObj.name, courseId);
    }
  }

  // Get lecturers for each course
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

  // Helper to get lecturer for a course
  const getLecturerForCourse = (courseId: string) => {
    const lecturers = teachersByCourse[courseId] || [];
    return lecturers.length > 0 ? lecturers[0] : null;
  };

  // Fixed 400 Level Schedule
  const schedule: any[] = [
    {
      day: "Monday",
      periods: [
        // 08:00-09:00 Medicine
        {
          subject: coursesByName.get("medicine") ? new mongoose.Types.ObjectId(coursesByName.get("medicine")!) : null,
          lecturer: coursesByName.get("medicine") ? (getLecturerForCourse(coursesByName.get("medicine")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine")!)!) : null) : null,
          startTime: "08:00",
          endTime: "09:00"
        },
        // 09:00-10:00 Surgery
        {
          subject: coursesByName.get("surgery") ? new mongoose.Types.ObjectId(coursesByName.get("surgery")!) : null,
          lecturer: coursesByName.get("surgery") ? (getLecturerForCourse(coursesByName.get("surgery")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery")!)!) : null) : null,
          startTime: "09:00",
          endTime: "10:00"
        },
        // 10:00-12:00 Clinical Activities
        {
          subject: null,
          lecturer: null,
          startTime: "10:00",
          endTime: "12:00",
          isClinical: true
        },
        // 12:00-14:00 Chemical Pathology
        {
          subject: coursesByName.get("chemical pathology") ? new mongoose.Types.ObjectId(coursesByName.get("chemical pathology")!) : null,
          lecturer: coursesByName.get("chemical pathology") ? (getLecturerForCourse(coursesByName.get("chemical pathology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("chemical pathology")!)!) : null) : null,
          startTime: "12:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Chemical Pathology Practicals
        {
          subject: coursesByName.get("chemical pathology") ? new mongoose.Types.ObjectId(coursesByName.get("chemical pathology")!) : null,
          lecturer: coursesByName.get("chemical pathology") ? (getLecturerForCourse(coursesByName.get("chemical pathology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("chemical pathology")!)!) : null) : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    },
    {
      day: "Tuesday",
      periods: [
        // 08:00-09:00 Surgery
        {
          subject: coursesByName.get("surgery") ? new mongoose.Types.ObjectId(coursesByName.get("surgery")!) : null,
          lecturer: coursesByName.get("surgery") ? (getLecturerForCourse(coursesByName.get("surgery")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery")!)!) : null) : null,
          startTime: "08:00",
          endTime: "09:00"
        },
        // 09:00-10:00 Medicine
        {
          subject: coursesByName.get("medicine") ? new mongoose.Types.ObjectId(coursesByName.get("medicine")!) : null,
          lecturer: coursesByName.get("medicine") ? (getLecturerForCourse(coursesByName.get("medicine")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine")!)!) : null) : null,
          startTime: "09:00",
          endTime: "10:00"
        },
        // 10:00-12:00 Clinical Activities
        {
          subject: null,
          lecturer: null,
          startTime: "10:00",
          endTime: "12:00",
          isClinical: true
        },
        // 12:00-14:00 Medical Microbiology
        {
          subject: coursesByName.get("medical microbiology") ? new mongoose.Types.ObjectId(coursesByName.get("medical microbiology")!) : null,
          lecturer: coursesByName.get("medical microbiology") ? (getLecturerForCourse(coursesByName.get("medical microbiology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medical microbiology")!)!) : null) : null,
          startTime: "12:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Medical Microbiology Practicals
        {
          subject: coursesByName.get("medical microbiology") ? new mongoose.Types.ObjectId(coursesByName.get("medical microbiology")!) : null,
          lecturer: coursesByName.get("medical microbiology") ? (getLecturerForCourse(coursesByName.get("medical microbiology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medical microbiology")!)!) : null) : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    },
    {
      day: "Wednesday",
      periods: [
        // 08:00-09:00 Medicine
        {
          subject: coursesByName.get("medicine") ? new mongoose.Types.ObjectId(coursesByName.get("medicine")!) : null,
          lecturer: coursesByName.get("medicine") ? (getLecturerForCourse(coursesByName.get("medicine")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine")!)!) : null) : null,
          startTime: "08:00",
          endTime: "09:00"
        },
        // 09:00-10:00 Surgery
        {
          subject: coursesByName.get("surgery") ? new mongoose.Types.ObjectId(coursesByName.get("surgery")!) : null,
          lecturer: coursesByName.get("surgery") ? (getLecturerForCourse(coursesByName.get("surgery")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery")!)!) : null) : null,
          startTime: "09:00",
          endTime: "10:00"
        },
        // 10:00-12:00 Clinical Activities
        {
          subject: null,
          lecturer: null,
          startTime: "10:00",
          endTime: "12:00",
          isClinical: true
        },
        // 12:00-14:00 Hematology
        {
          subject: coursesByName.get("hematology") ? new mongoose.Types.ObjectId(coursesByName.get("hematology")!) : null,
          lecturer: coursesByName.get("hematology") ? (getLecturerForCourse(coursesByName.get("hematology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("hematology")!)!) : null) : null,
          startTime: "12:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Hematology Practicals
        {
          subject: coursesByName.get("hematology") ? new mongoose.Types.ObjectId(coursesByName.get("hematology")!) : null,
          lecturer: coursesByName.get("hematology") ? (getLecturerForCourse(coursesByName.get("hematology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("hematology")!)!) : null) : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    },
    {
      day: "Thursday",
      periods: [
        // 08:00-09:00 Surgery
        {
          subject: coursesByName.get("surgery") ? new mongoose.Types.ObjectId(coursesByName.get("surgery")!) : null,
          lecturer: coursesByName.get("surgery") ? (getLecturerForCourse(coursesByName.get("surgery")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery")!)!) : null) : null,
          startTime: "08:00",
          endTime: "09:00"
        },
        // 09:00-10:00 Medicine
        {
          subject: coursesByName.get("medicine") ? new mongoose.Types.ObjectId(coursesByName.get("medicine")!) : null,
          lecturer: coursesByName.get("medicine") ? (getLecturerForCourse(coursesByName.get("medicine")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine")!)!) : null) : null,
          startTime: "09:00",
          endTime: "10:00"
        },
        // 10:00-12:00 Clinical Activities
        {
          subject: null,
          lecturer: null,
          startTime: "10:00",
          endTime: "12:00",
          isClinical: true
        },
        // 12:00-14:00 Histopathology
        {
          subject: coursesByName.get("histopathology") ? new mongoose.Types.ObjectId(coursesByName.get("histopathology")!) : null,
          lecturer: coursesByName.get("histopathology") ? (getLecturerForCourse(coursesByName.get("histopathology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("histopathology")!)!) : null) : null,
          startTime: "12:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Histopathology Practicals
        {
          subject: coursesByName.get("histopathology") ? new mongoose.Types.ObjectId(coursesByName.get("histopathology")!) : null,
          lecturer: coursesByName.get("histopathology") ? (getLecturerForCourse(coursesByName.get("histopathology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("histopathology")!)!) : null) : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    },
    {
      day: "Friday",
      periods: [
        // 08:00-10:00 Community Medicine
        {
          subject: coursesByName.get("community medicine") ? new mongoose.Types.ObjectId(coursesByName.get("community medicine")!) : null,
          lecturer: coursesByName.get("community medicine") ? (getLecturerForCourse(coursesByName.get("community medicine")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("community medicine")!)!) : null) : null,
          startTime: "08:00",
          endTime: "10:00"
        },
        // 10:00-14:00 Pharmacology
        {
          subject: coursesByName.get("pharmacology") ? new mongoose.Types.ObjectId(coursesByName.get("pharmacology")!) : null,
          lecturer: coursesByName.get("pharmacology") ? (getLecturerForCourse(coursesByName.get("pharmacology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("pharmacology")!)!) : null) : null,
          startTime: "10:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Pharmacology Practicals
        {
          subject: coursesByName.get("pharmacology") ? new mongoose.Types.ObjectId(coursesByName.get("pharmacology")!) : null,
          lecturer: coursesByName.get("pharmacology") ? (getLecturerForCourse(coursesByName.get("pharmacology")!) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("pharmacology")!)!) : null) : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    }
  ];

  const selectedCourseIds = new Set(
    Array.isArray(settings?.phaseCourseIds) ? settings.phaseCourseIds.map(String) : [],
  );
  if (selectedCourseIds.size) {
    for (const day of schedule) {
      day.periods = day.periods.filter(
        (period: any) => period.isClinical || !period.subject || selectedCourseIds.has(String(period.subject)),
      );
    }
  }

  // Persist
  await saveTimetableForPhase(Timetable, {
    classId,
    academicYearId,
    phaseId: getTimetableSavePhaseId(settings),
    schedule,
    courseIds: selectedCourseIds.size
      ? [...selectedCourseIds]
      : cls.courses.map((course: any) => String(course?._id ?? course)),
  });
  const saved = await Timetable.findOne({ class: classId, academicYear: academicYearId })
    .populate("schedule.periods.subject", "name code subjects.subjectID")
    .populate("schedule.periods.lecturer", "name email idNumber")
    .populate("phaseSchedules.schedule.periods.subject", "name code subjects.subjectID")
    .populate("phaseSchedules.schedule.periods.lecturer", "name email idNumber");

  const savedPhaseId = getTimetableSavePhaseId(settings);
  const savedSchedule = savedPhaseId
    ? saved?.phaseSchedules?.find((entry: any) => entry.phaseId === savedPhaseId)?.schedule
    : saved?.schedule;
  return { success: true, schedule: savedSchedule ?? schedule, phaseId: settings?.clockPhase ?? null };
}