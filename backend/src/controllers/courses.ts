import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog";

import Course from "../models/courses";
import User from "../models/user";
import ClassModel from "../models/classes";

/**
 * COURSE REVAMP CONTROLLER
 *
 * Current model shape (see backend/src/models/courses.ts):
 * - Course is the top-level course instance for (courseID, department, semester, year)
 * - Embedded Course.subjects[] holds: { name, code, subjectID, lecturer[], students[], isActive }
 *
 * IMPORTANT:
 * Timetable periods still reference Course by ObjectId (see models/timetable.ts).
 */

//  @desc    Create or add a subject within a Course
//  @route   POST /api/courses/create
//  @access  Private (Admin/Teacher/Unit)
//
// Expected payload:
// {
//   name, code, courseID,
//   department, semester, year,
//   isActive,
//   studentClasses,
//   subject: {
//     name, code, subjectID,
//     lecturer: ObjectId[],
//     isActive,
//     students: ObjectId[]
//   }
// }
export const createCourseSubject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      code,
      courseID,
      department,
      semester,
      year,
      isActive,
      studentClasses,
      subject,
    } = req.body as any;

    if (!name || !code || !courseID || !department || !semester || !year) {
      return res.status(400).json({
        message: "Missing required fields (name, code, courseID, department, semester, year).",
      });
    }

    if (!subject?.subjectID || !subject?.name) {
      return res.status(400).json({
        message:
          "Missing subject payload. Expected subject: { subjectID, name, code?, lecturer?, isActive?, students? }",
      });
    }

    const lecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
    const studentIds = Array.isArray(subject?.students) ? subject.students : [];

    const topLevelCourse = await Course.findOne({ courseID, department, semester, year });

    if (!topLevelCourse) {
      const created = await Course.create({
        name,
        code,
        courseID,
        department,
        semester,
        year,
        isActive: Boolean(isActive ?? true),
        studentClasses: Array.isArray(studentClasses) ? studentClasses : [],
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
    const existingSubject = topLevelCourse.subjects?.some(
      (s: any) => String(s.subjectID) === String(subject.subjectID)
    );

    if (existingSubject) {
      return res.status(400).json({
        message: `Subject with subjectID (${subject.subjectID}) already exists for this course.`,
      });
    }

    topLevelCourse.name = name;
    topLevelCourse.code = code;
    topLevelCourse.isActive = Boolean(isActive ?? topLevelCourse.isActive);

    if (Array.isArray(studentClasses)) {
      topLevelCourse.studentClasses = studentClasses;
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

//  @desc    Get all course subjects (supports teacher/student/admin filtering)
//  @route   GET /api/courses
//  @access  Private
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
        // also allow searching by embedded subjectID
        { "subjects.subjectID": { $regex: search, $options: "i" } },
      ];
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // We must return a *flat list of embedded subjects* that matches
    // frontend/src/types.ts -> `courses` interface.
    //
    // Row shape expected by UI:
    // {
    //   _id, name, code, teacher?: string[] | null, isActive
    // }

    const flattened: any[] = [];

    // Load candidate top-level courses
    // - teacher: only courses where user is in any embedded subject.lecturer
    // - student: legacy behavior keeps working (best-effort)
    // - admin: all
    let topLevelCourses: any[] = [];

    if (userRole === "teacher") {
      topLevelCourses = await Course.find({
        ...query,
        "subjects.lecturer": userId,
      }).sort({ createdAt: -1 });
    } else if (userRole === "student") {
      const student = await User.findById(userId).populate({
        path: "studentClasses",
        populate: { path: "courses", select: "name code courseID lecturer isActive" },
      });

      const studentClass = student?.studentClasses as any;
      const classCourses = studentClass?.courses ?? [];

      // best-effort: if legacy populated courses already contain subject-like docs,
      // just flatten their `subjects` if present.
      topLevelCourses = Array.isArray(classCourses)
        ? classCourses
        : [];
    } else {
      // For admin/other we still honor pagination for top-level courses,
      // but we flatten embedded subjects from only the selected top-level set.
      topLevelCourses = await Course.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    }

    // Flatten embedded subjects -> UI rows
    for (const c of topLevelCourses) {
      const subjects = (c?.subjects ?? []) as any[];
      for (const s of subjects) {
        // search filter for embedded subjectID/name/code
        if (search) {
          const matches =
            String(s?.name ?? "").toLowerCase().includes(String(search).toLowerCase()) ||
            String(s?.code ?? "").toLowerCase().includes(String(search).toLowerCase()) ||
            String(s?.subjectID ?? "").toLowerCase().includes(String(search).toLowerCase());
          if (!matches) continue;
        }

        // teacher role: only include subjects where this teacher is assigned
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
          teacher: (Array.isArray(s?.lecturer) && s.lecturer.length > 0)
            ? s.lecturer.map((lid: any) => String(lid))
            : null,
        });
      }
    }

    // total/pages are approximate when flattening, but at least consistent for the UI.
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

//  @desc    Update top-level course (legacy endpoint; for embedded subjects use a new endpoint later)
//  @route   PATCH /api/courses/update/:id
//  @access  Private
export const updateCourseSubjects = async (req: Request, res: Response) => {
  try {
    const { name, isActive, code, courseID, department, semester, year } = req.body as any;

    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      {
        name,
        isActive,
        code,
        courseID,
        department,
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

//  @desc    Delete course (top-level document)
//  @route   DELETE /api/courses/delete/:id
//  @access  Private
export const deleteCourseSubjects = async (req: Request, res: Response) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Course ${deleted?.name} was deleted successfully.`,
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

//  @desc    Deduplicate class courses — remove duplicate course IDs from all classes
//  @route   POST /api/courses/deduplicate-classes
//  @access  Private (Admin)
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

