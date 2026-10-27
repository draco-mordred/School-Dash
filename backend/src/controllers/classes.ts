import { type Request, type Response } from "express";
import ClassModel from "../models/classes";
import UserModel from "../models/user";
import { logActivity } from "../utils/activitieslog";
import { resolveSharedDriveAccessTokenCandidates } from "../utils/driveAccessToken";
import AcademicClock from "../models/academicClock";
import ExamModel from "../models/exam";
import { phaseRequiresPostingSchedule, resolveAcademicClockPhase } from "../utils/academicClockPhase";
import { getUpcomingImportantDates } from "../utils/importantDates";
import {
  classDriveMaterialsService,
  extractGoogleDriveFolderId,
} from "../subs/adam/classDriveMaterialsService";

const { buildDriveMaterialsPayload } = classDriveMaterialsService;

export const saveClassCloudStorage = async (req: Request, res: Response) => {
  try {
    const { provider = "google-drive", rootUrl } = req.body ?? {};
    const classId = req.params.id;

    if (!rootUrl || !String(rootUrl).trim()) {
      return res.status(400).json({ message: "A cloud storage link is required." });
    }

    const folderId = extractGoogleDriveFolderId(String(rootUrl).trim());
    const cls = await ClassModel.findById(classId);
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
 
    cls.cloudStorage = {
      provider,
      rootUrl: String(rootUrl).trim(),
      folderId: folderId ?? "",
      status: folderId ? "ready" : "error",
      lastError: folderId ? null : "Invalid or unsupported Drive folder link.",
      lastSyncedAt: new Date(),
      syncedBy: (req as any).user?._id ?? null,
    };

    await cls.save();
    return res.json({
      message: "Class cloud storage link saved.",
      classId: cls._id,
      cloudStorage: cls.cloudStorage,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getClassCourseMaterials = async (req: Request, res: Response) => {
  try {
    const cls = await ClassModel.findById(req.params.id)
      .populate({
        path: "courses",
        select: "_id name code",
      })
      .lean();

    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    const rootUrl = cls.cloudStorage?.rootUrl ?? "";
    const courseDocs = Array.isArray((cls as any).courses) ? (cls as any).courses : [];
    const courseIdFilter =
      typeof req.query.courseId === "string" ? req.query.courseId.trim() : "";
    const coursesToSync = courseIdFilter
      ? courseDocs.filter((course: any) => String(course?._id) === courseIdFilter)
      : courseDocs;
    // Resolve ALL usable Drive token candidates: the signed-in user's own
    // account, else recently connected admin accounts (shared class
    // materials access), else the server env token. The service tries each
    // until one can actually list the folder, so an admin whose personal
    // Google account lacks access to the class Drive still sees materials.
    // Tokens are used here only and are never included in the response.
    const tokenCandidates = await resolveSharedDriveAccessTokenCandidates(
      (req as any).user?._id ? String((req as any).user._id) : null,
    );

    if (!rootUrl) {
      return res.json({
        classId: String(cls._id),
        synced: false,
        cloudStorage: cls.cloudStorage ?? null,
        message: "No cloud storage link has been configured for this class yet.",
        courseMaterials: [],
      });
    }

    const payload = await buildDriveMaterialsPayload(
      rootUrl,
      coursesToSync,
      tokenCandidates[0] ?? null,
      tokenCandidates,
    );

    return res.json({
      classId: String(cls._id),
      cloudStorage: cls.cloudStorage ?? null,
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const cls = await ClassModel.findById(req.params.id)
      .populate("academicYear", "name")
      .populate("classTeacher", "name email")
      .populate({
        path: "courses",
        select: "name code subjects._id subjects.name subjects.code subjects.subjectID subjects.date subjects.startTime subjects.endTime subjects.lecturer",
        populate: {
          path: "subjects.lecturer",
          select: "name email _id",
        },
      })
      .select("name academicYear classTeacher courses cloudStorage");
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.json(cls);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get students for a class
// @route   GET /api/classes/:id/students
// @access  Private (admin, teacher, student, parent)
export const getStudentsForClass = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    // Find users who have this class set in `studentClasses` and are students
    const students = await UserModel.find({ studentClasses: classId, role: "student" }).select("name email idNumber studentClasses");
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Create a New Class
// @route   POST /api/classes
// @access  Private/Admin

export const createClass = async (
  req: Request,
  res: Response
) => {
 try {
  const { name, academicYear, classTeacher, capacity, courses, students } = req.body;
  const existingClass = await ClassModel.findOne({ name, academicYear });
  if (existingClass) {
    return res
    .status(400)
    .json({
      message: `Class with the same name already exists for the specified academic year!`
    })
  }
  const studentIds = Array.isArray(students) ? students : [];
  const newClass  = await ClassModel.create(
    {
    name,
    academicYear,
    classTeacher,
    capacity,
    courses: Array.isArray(courses) ? courses : [],
    students: studentIds,
  }
);
  if (studentIds.length > 0) {
    await UserModel.updateMany(
      { _id: { $in: studentIds }, role: "student" },
      { $set: { studentClasses: newClass._id } }
    );
  }
  await logActivity({
    userId: (req as any).user?._id,
    action: `Created new class: ${newClass.name}`
  });
  res.status(201).json({newClass})
 } catch (error) {
  res.status(500).json({ message: `Server error,`, error: `${error}`})
 }
}

//TEST THIS - VIDEO TIMESYNC = 2.30.00
//TEST VIA - THUNDERCLIENT SERVER CONNECTION ...
//TIMESYNC = 09:43 25/05/2026

// @desc    Get All Classes
// @route   Get /api/classes
// @access  Private/Admin

export const getAllClasses = async (
req: Request,
res: Response
) => {
  try {
    // 1. Parse the QUery Parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;


    // 2. Build Search Query (Case-insensitive regex on Name)
    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i"}
    }

    // 3. Execute Query (Count & Find)
    const [total, classes] = await Promise.all([
      ClassModel.countDocuments(query),
      ClassModel.find(query)
        .populate("academicYear", "name")
        .populate("classTeacher", "name email")
        .populate(
          "courses",
          "name code subjects._id subjects.subjectUID subjects._id subjects.subjectUID subjects.name subjects.code subjects.subjectID subjects.lecturer"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    //4. Return Data + Pagination Meta
    res.json({
      classes,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error", error
    })
  }
}

// @desc    Update Class
// @route   POST /api/classes/:id
// @access  Private/Admin

export const updateClass = async (
  req: Request,
  res: Response
) => {
  try {
    const classId = req.params.id;
    const { name, academicYear, classTeacher, capacity, courses, students } = req.body;

    const existingClass = await ClassModel.findOne({
      name,
      academicYear,
      _id: { $ne: classId },
    });

    if (existingClass) {
      return res.status(400).json({
        message:
          "Class with this name already exists for the specified academic year",
      });
    }

    const currentClass = await ClassModel.findById(classId);
    if (!currentClass) {
      return res.status(404).json({ message: "Class not found!" });
    }

    const oldStudentIds = (currentClass.students ?? []).map(String);
    const newStudentIds = students === undefined ? oldStudentIds : Array.isArray(students) ? students.map(String) : [];
    const addedStudentIds = newStudentIds.filter((id) => !oldStudentIds.includes(id));
    const removedStudentIds = oldStudentIds.filter((id) => !newStudentIds.includes(id));

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (academicYear !== undefined) updateData.academicYear = academicYear;
    if (classTeacher !== undefined) updateData.classTeacher = classTeacher;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (courses !== undefined) updateData.courses = Array.isArray(courses) ? courses : [];
    if (students !== undefined) updateData.students = newStudentIds;

    const updatedClass = await ClassModel.findByIdAndUpdate(
      classId,
      updateData,
      { returnDocument: "after", runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ message: "Class not found!" });
    }

    if (addedStudentIds.length > 0) {
      await UserModel.updateMany(
        { _id: { $in: addedStudentIds }, role: "student" },
        { $set: { studentClasses: updatedClass._id } }
      );
    }
    if (removedStudentIds.length > 0) {
      await UserModel.updateMany(
        { _id: { $in: removedStudentIds }, role: "student" },
        { $set: { studentClasses: null } }
      );
    }

    await logActivity({
      userId: (req as any).user.id,
      action: `Updated class: ${updatedClass?.name}`,
    });

    res.status(200).json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: `Server error`, error: `${error}` })
  }
}

// @desc    Delete Class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
export const deleteClass = async (
  req: Request,
  res: Response
) => {
  try {
    const deletedClass = await ClassModel.findByIdAndDelete(req.params.id);
    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `Deleted ${deletedClass?.name} Class`,
    });
    if (!deletedClass) {
      return res.status(404).json({
        message: `Class not found! - ${userId} Is ${deletedClass}.`,
      });
    }
    res.json({ message: `Class removed!` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove a course from a class (without deleting the course)
// @route   DELETE /api/classes/:classId/courses/:courseId
// @access  Private (Admin/Teacher/Unit)
export const removeCourseFromClass = async (req: Request, res: Response) => {
  try {
    const { classId, courseId } = req.params as { classId: string; courseId: string };

    const cls = await ClassModel.findById(classId);
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    const beforeCount = (cls.courses ?? []).length;
    cls.courses = (cls.courses ?? []).filter((c: any) => String(c) !== String(courseId));
    const afterCount = (cls.courses ?? []).length;

    if (beforeCount === afterCount) {
      return res.status(404).json({ message: "Course not found in this class" });
    }

    await cls.save();

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Removed course ${courseId} from class ${cls.name}`,
      });
    }

    return res.json({ message: "Course removed from class", classId: cls._id, courses: cls.courses });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};


// ─── Class overview + important dates ──────────────────────────────

// @desc    Get a class overview: name, student/course counts, active
//          clock phase (current posting) and class teacher/HOD.
// @route   GET /api/classes/:id/overview
// @access  Private (all roles)
export const getClassOverview = async (req: Request, res: Response) => {
  try {
    const cls = await ClassModel.findById(req.params.id)
      .populate("academicYear", "name fromYear toYear isCurrent")
      .populate("classTeacher", "name email role")
      .lean();

    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    const classId = String(cls._id);
    const academicYearId =
      cls.academicYear && typeof cls.academicYear === "object"
        ? String((cls.academicYear as any)._id)
        : cls.academicYear
          ? String(cls.academicYear)
          : null;

    const [studentCount, clock] = await Promise.all([
      UserModel.countDocuments({ studentClasses: classId, role: "student" }),
      academicYearId
        ? AcademicClock.findOne({ classId, academicYear: academicYearId }).lean()
        : AcademicClock.findOne({ classId }).lean(),
    ]);

    let activePhase: any = null;
    if (clock) {
      const resolved = resolveAcademicClockPhase(clock);
      if (resolved.phase) {
        activePhase = {
          id: resolved.phaseId,
          name: resolved.phase.name ?? resolved.phaseId,
          postingType: resolved.phase.postingType ?? null,
          subPostings: Array.isArray(resolved.phase.subPostings) ? resolved.phase.subPostings : [],
          requiresPostingSchedule: phaseRequiresPostingSchedule(resolved.phase),
          startsAt: resolved.startsAt,
          endsAt: resolved.endsAt,
        };
      }
    }

    return res.json({
      classId,
      name: cls.name ?? "",
      academicYear: cls.academicYear ?? null,
      classTeacher: cls.classTeacher ?? null,
      capacity: cls.capacity ?? null,
      studentCount,
      courseCount: Array.isArray(cls.courses) ? cls.courses.length : 0,
      activePhase,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get upcoming important dates for a class: upcoming tests and
//          assessments (Exam model), Nigerian public holidays, world
//          observance days, and the active clock phase end date.
// @route   GET /api/classes/:id/important-dates
// @access  Private (all roles)
export const getClassImportantDates = async (req: Request, res: Response) => {
  try {
    const cls = await ClassModel.findById(req.params.id).select("name academicYear").lean();
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    const parsedMonths = parseInt(String(req.query.months ?? "12"), 10);
    const months = Math.min(Math.max(Number.isFinite(parsedMonths) ? parsedMonths : 12, 1), 24);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const windowEnd = new Date(todayStart);
    windowEnd.setMonth(windowEnd.getMonth() + months);

    const [exams, clock] = await Promise.all([
      ExamModel.find({
        class: req.params.id,
        isActive: true,
        dueDate: { $gte: todayStart, $lte: windowEnd },
      })
        .populate("course", "name")
        .select("title dueDate course duration")
        .sort({ dueDate: 1 })
        .lean(),
      AcademicClock.findOne({ classId: req.params.id }).lean(),
    ]);

    const assessments = (exams as any[]).map((exam) => ({
      id: String(exam._id),
      type: "assessment",
      title: exam.title ?? "Assessment",
      detail: exam.course?.name
        ? "Course: " + exam.course.name + (exam.duration ? " — " + exam.duration + " minutes" : "")
        : exam.duration ? exam.duration + " minutes" : "Scheduled test/assessment",
      date: exam.dueDate,
    }));

    const phaseItems: any[] = [];
    if (clock) {
      const resolved = resolveAcademicClockPhase(clock);
      const endsAt = resolved.endsAt ? new Date(resolved.endsAt) : null;
      if (resolved.phase && endsAt && endsAt >= todayStart && endsAt <= windowEnd) {
        phaseItems.push({
          id: "phase-" + resolved.phaseId,
          type: "phase",
          title: (resolved.phase.name ?? resolved.phaseId) + " ends",
          detail: "Current class clock phase",
          date: endsAt,
        });
      }
    }

    const holidays = getUpcomingImportantDates(todayStart, windowEnd).map((item) => ({
      ...item,
      date: item.date + "T00:00:00.000Z",
    }));

    return res.json({
      classId: String(cls._id),
      className: cls.name ?? "",
      window: { from: todayStart, to: windowEnd },
      dates: [...assessments, ...phaseItems, ...holidays].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
