import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog";

import Course from "../models/courses";
import User from "../models/user";
import ClassModel from "../models/classes";
import AcademicYear from "../models/academicYear";

/**
 * COURSE REVAMP CONTROLLER
 *
 * Current model shape (see backend/src/models/courses.ts):
 * - Course is the top-level course instance for (courseID, department, unit, semester, year)
 * - Embedded Course.subjects[] holds:
 *   {
 *     name, code, subjectID, lecturer[], students[], isActive
 *   }
 *
 * Timetable periods still reference Course by ObjectId (see models/timetable.ts).
 */

// -----------------------------
// Create top-level course
// -----------------------------
//  @desc    Create a top-level Course (no embedded subject)
//  @route   POST /api/courses
//  @access  Private (Admin/Teacher/Unit)
export const createCourse = async (req: Request, res: Response) => {
  try {
    const {
      name,
      code,
      courseID,
      department,
      unit,
      semester,
      year,
      isActive,
      studentClasses,
      lecturer,
    } = req.body as any;

    const { academicYearId } = req.body as any;

    if (!name || !code || !courseID || !department || !unit || !academicYearId) {
      return res.status(400).json({
        message: "Missing required fields (name, code, courseID, department, unit, academicYearId).",
      });
    }

    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      return res.status(404).json({
        message: `AcademicYear not found for id=${academicYearId}`,
      });
    }

    const existing = await Course.findOne({ courseID, department, unit });
    if (existing) {
      return res.status(400).json({
        message: `Course already exists for courseID=${courseID} department=${department} unit=${unit}`,
      });
    }

    const created = await Course.create({
      name,
      code,
      courseID,
      department,
      unit,
      academicYear: academicYearId,
      semester: semester ?? null,
      year: year ?? null,
      isActive: Boolean(isActive ?? true),
      studentClasses: Array.isArray(studentClasses) ? studentClasses : [],
      lecturer: Array.isArray(lecturer) ? lecturer : [],
      subjects: [],
    });

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Course ${created.name} (${created.courseID}) created.`,
      });
    }

    return res.status(201).json(created);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// -----------------------------
// Create embedded subject
// -----------------------------
//  @desc    Create or add an embedded subject within a Course
//  @route   POST /api/courses/:courseId/subjects
//  @access  Private
export const addCourseSubject = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const { subject } = req.body as any;

    if (!subject?.subjectID || !subject?.name) {
      return res.status(400).json({
        message:
          "Missing subject payload. Expected subject: { subjectID, name, code?, lecturer?, isActive?, students? }",
      });
    }

    const topLevelCourse = await Course.findById(courseId);
    if (!topLevelCourse) {
      return res.status(404).json({ message: `Course ${courseId} not found` });
    }

    const lecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
    const studentIds = Array.isArray(subject?.students) ? subject.students : [];

    // Prevent duplicate subjectID within this course
    const existingSubject = (topLevelCourse.subjects ?? []).some(
      (s: any) => String(s.subjectID) === String(subject.subjectID)
    );

    if (existingSubject) {
      return res.status(400).json({
        message: `Subject with subjectID (${subject.subjectID}) already exists for this course.`,
      });
    }

    topLevelCourse.subjects.push({
      name: subject.name,
      code: subject.code ?? null,
      subjectID: subject.subjectID,
      lecturer: lecturerIds,
      isActive: Boolean(subject.isActive ?? true),
      students: studentIds,
    } as any);

    await topLevelCourse.save();

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Added subject ${subject.subjectID} to course ${topLevelCourse.name} (${topLevelCourse.courseID}).`,
      });
    }

    return res.status(200).json(topLevelCourse);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// -----------------------------
// Backward-compatible wrapper
// -----------------------------
//  @desc    Legacy: Create a top-level course AND add an embedded subject within it
//  @route   POST /api/courses/create
export const createCourseSubject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      code,
      courseID,
      department,
      unit,
      isActive,
      studentClasses,
      lecturer,
      subject,
      semester,
      year,
    } = req.body as any;

    if (!name || !code || !courseID || !department || !unit) {
      return res.status(400).json({
        message: "Missing required fields (name, code, courseID, department, unit).",
      });
    }

    if (!subject?.subjectID || !subject?.name) {
      return res.status(400).json({
        message:
          "Missing subject payload. Expected subject: { subjectID, name, code?, lecturer?, isActive?, students? }",
      });
    }

    const topLevelCourse = await Course.findOne({ courseID, department, unit });

    const lecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
    const studentIds = Array.isArray(subject?.students) ? subject.students : [];

    // Create course + subject if missing
    if (!topLevelCourse) {
      const created = await Course.create({
        name,
        code,
        courseID,
        department,
        unit,
        semester: semester ?? null,
        year: year ?? null,
        isActive: Boolean(isActive ?? true),
        studentClasses: Array.isArray(studentClasses) ? studentClasses : [],
        lecturer: Array.isArray(lecturer) ? lecturer : [],
        subjects: [
          {
            name: subject.name,
            code: subject.code ?? null,
            subjectID: subject.subjectID,
            lecturer: lecturerIds,
            isActive: Boolean(subject.isActive ?? true),
            students: studentIds,
          },
        ],
      });

      const userId = (req as any).user?._id;
      if (userId) {
        await logActivity({
          userId,
          action: `Course ${created.name} (${created.courseID}) created and subject ${subject.subjectID} added.`,
        });
      }

      return res.status(201).json(created);
    }

    // Prevent duplicate subjectID within this course
    const existingSubject = (topLevelCourse.subjects ?? []).some(
      (s: any) => String(s.subjectID) === String(subject.subjectID)
    );

    if (existingSubject) {
      return res.status(400).json({
        message: `Subject with subjectID (${subject.subjectID}) already exists for this course.`,
      });
    }

    // Update top-level legacy fields
    topLevelCourse.name = name;
    topLevelCourse.code = code;
    topLevelCourse.isActive = Boolean(isActive ?? topLevelCourse.isActive);

    if (Array.isArray(studentClasses)) topLevelCourse.studentClasses = studentClasses;
    if (Array.isArray(lecturer)) topLevelCourse.lecturer = lecturer;

    topLevelCourse.subjects.push({
      name: subject.name,
      code: subject.code ?? null,
      subjectID: subject.subjectID,
      lecturer: lecturerIds,
      isActive: Boolean(subject.isActive ?? true),
      students: studentIds,
    } as any);

    await topLevelCourse.save();

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Added subject ${subject.subjectID} to course ${topLevelCourse.name} (${topLevelCourse.courseID}).`,
      });
    }

    return res.status(200).json(topLevelCourse);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// -----------------------------
// List (flat embedded subjects)
// -----------------------------
//  @route   GET /api/courses
export const getAllCourseSubjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    const search = req.query.search as string | undefined;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { courseID: { $regex: search, $options: "i" } },
        { "subjects.subjectID": { $regex: search, $options: "i" } },
        { "subjects.name": { $regex: search, $options: "i" } },
        { "subjects.code": { $regex: search, $options: "i" } },
      ];
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const flattened: any[] = [];

    let topLevelCourses: any[] = [];
    if (userRole === "teacher") {
      topLevelCourses = await Course.find({
        ...query,
        "subjects.lecturer": userId,
      }).sort({ createdAt: -1 });
    } else if (userRole === "student") {
      const student = await User.findById(userId).populate({
        path: "studentClasses",
        populate: {
          path: "courses",
          select: "name code courseID lecturer isActive subjects",
        },
      });

      const studentClass = student?.studentClasses as any;
      const classCourses = studentClass?.courses ?? [];
      topLevelCourses = Array.isArray(classCourses) ? classCourses : [];
    } else {
      topLevelCourses = await Course.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    }

    for (const c of topLevelCourses) {
      const subjects = (c?.subjects ?? []) as any[];
      for (const s of subjects) {
        if (search) {
          const matches =
            String(s?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            String(s?.code ?? "").toLowerCase().includes(search.toLowerCase()) ||
            String(s?.subjectID ?? "").toLowerCase().includes(search.toLowerCase());
          if (!matches) continue;
        }

        if (userRole === "teacher") {
          const lecturerIds = Array.isArray(s?.lecturer) ? s.lecturer : [];
          const includesTeacher = lecturerIds.some((lid: any) => String(lid) === String(userId));
          if (!includesTeacher) continue;
        }

        flattened.push({
          _id: String(s?._id ?? s?.subjectID ?? ""),
          name: s?.name,
          code: s?.code,
          isActive: Boolean(s?.isActive ?? true),
          teacher:
            Array.isArray(s?.lecturer) && s.lecturer.length > 0
              ? s.lecturer.map((lid: any) => String(lid))
              : null,
        });
      }
    }

    const total = flattened.length;

    return res.json({
      courses: flattened,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// -----------------------------
// Update top-level course (legacy)
// -----------------------------
export const updateCourseSubjects = async (req: Request, res: Response) => {
  try {
    const { name, isActive, code, courseID, department, semester, year, unit } = req.body as any;

    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      {
        name,
        isActive,
        code,
        courseID,
        department,
        unit,
        semester,
        year,
      },
      { returnDocument: "after", runValidators: true }
    );

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Course ${updated?.name} was updated successfully.`,
      });
    }

    if (!updated) {
      return res.status(404).json({ message: `Course with ID ${req.params.id} not found!` });
    }

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// -----------------------------
// Delete top-level course
// -----------------------------
export const deleteCourseSubjects = async (req: Request, res: Response) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);

    const userId = (req as any).user?._id;
    if (userId && deleted) {
      await logActivity({
        userId,
        action: `Course ${deleted.name} was deleted successfully.`,
      });
    }

    if (!deleted) {
      return res.status(404).json({ message: `Course with ID ${req.params.id} not found!` });
    }

    return res.json({
      message: `Course ${deleted.name} deleted successfully.`,
      courseId: deleted._id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// -----------------------------
// Deduplicate classes courses
// -----------------------------
export const deduplicateClassCourses = async (req: Request, res: Response) => {
  try {
    const classes = await ClassModel.find({}, "name courses");

    let totalDeduplicated = 0;
    let classesUpdated = 0;

    for (const cls of classes) {
      const courseIds = (cls.courses ?? []).map((c: any) => String(c));
      const uniqueIds = [...new Set(courseIds)];

      if (uniqueIds.length < courseIds.length) {
        const removed = courseIds.length - uniqueIds.length;
        totalDeduplicated += removed;
        cls.courses = uniqueIds as any;
        await cls.save();
        classesUpdated++;
      }
    }

    return res.json({
      message: `Deduplication complete. Updated ${classesUpdated} classes, removed ${totalDeduplicated} duplicate entries.`,
      classesUpdated,
      totalDeduplicated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

