import { type Request, type Response } from "express";
import mongoose from "mongoose";
import { logActivity } from "../utils/activitieslog";

import Course from "../models/courses";
import User from "../models/user";
import ClassModel from "../models/classes";
import AcademicYear from "../models/academicYear";
import Department from "../models/departments";
import Unit from "../models/units";
import {
  getAllDepartments,
  getDepartmentUnits,
  getDepartmentUnitsByCode,
  getAllDepartmentCourses,
  DEPARTMENT_UNITS,
  DEPARTMENT_COURSES,
} from "../constants/departments";

/*
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
const isObjectId = (value: string) => /^[0-9a-fA-F]{24}$/.test(value);

const findOrCreateDepartment = async (identifier: string) => {
  if (!identifier) return null;

  let departmentDoc = null;
  if (isObjectId(identifier)) {
    departmentDoc = await Department.findById(identifier);
  }

  if (!departmentDoc) {
    departmentDoc = await Department.findOne({ code: identifier });
  }

  if (!departmentDoc) {
    departmentDoc = await Department.findOne({ departmentID: identifier });
  }

  if (!departmentDoc) {
    const constantsDept = getAllDepartments().find(
      (d) => d.code === identifier || d.departmentID === identifier || d.name === identifier
    );

    if (constantsDept) {
      departmentDoc = await Department.findOneAndUpdate(
        { code: constantsDept.code },
        {
          name: constantsDept.name,
          code: constantsDept.code,
          departmentID: constantsDept.departmentID,
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  }

  return departmentDoc;
};

const normalizeCourseCode = (departmentCode: string, code: string) => {
  const raw = String(code ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  const numberPart = raw.replace(/^[A-Z]{3}\s*/i, "").trim();
  if (!numberPart) return `${departmentCode} 000`;
  if (new RegExp(`^${departmentCode}\\s\\d{3}$`).test(raw)) return raw;
  return `${departmentCode} ${numberPart.padStart(3, "0")}`.trim();
};

const isValidCourseCode = (departmentCode: string, code: string) => {
  const raw = String(code ?? "").trim().toUpperCase();
  return new RegExp(`^${departmentCode}\\s\\d{3}$`).test(raw);
};

const deriveUnitCode = (name: string) =>
  String(name)
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0))
    .join("")
    .slice(0, 4)
    .toUpperCase() || "UNIT";

const getNormalizedDepartmentValue = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "object") {
    const obj = value as { _id?: string; name?: string; code?: string; departmentID?: string };
    return String(obj._id ?? obj.code ?? obj.departmentID ?? obj.name ?? "").trim().toLowerCase();
  }
  return "";
};

const isUserInDepartment = (user: any, departmentDoc: any) => {
  if (!user || !departmentDoc) return false;
  const userDept = getNormalizedDepartmentValue(user.department);
  const validDeptValues = new Set([
    String(departmentDoc._id).trim().toLowerCase(),
    String(departmentDoc.code).trim().toLowerCase(),
    String(departmentDoc.departmentID).trim().toLowerCase(),
    String(departmentDoc.name).trim().toLowerCase(),
  ]);
  return validDeptValues.has(userDept);
};

const normalizeClassIdValue = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
  }
  return undefined;
};

const getClassCourseDocuments = async (classId: string) => {
  if (!isObjectId(classId)) return null;
  return await ClassModel.findById(classId).populate({
    path: "courses",
    select: "name code courseID lecturer isActive subjects department unit",
    populate: [
      { path: "department", select: "name departmentID code head" },
      { path: "unit", select: "name unitID code" },
      { path: "lecturer", select: "name email" },
      { path: "subjects.lecturer", select: "name email" },
    ],
  });
};

const validateDepartmentLecturers = async (lecturerIds: string[], departmentDoc: any) => {
  if (!Array.isArray(lecturerIds) || lecturerIds.length === 0) return null;

  const users = await User.find({ _id: { $in: lecturerIds }, role: { $in: ["teacher", "admin"] } });
  if (users.length !== lecturerIds.length) {
    return "Some selected lecturers were not found or do not have teacher/admin roles.";
  }

  const invalid = users.find((user) => !isUserInDepartment(user, departmentDoc));
  if (invalid) {
    return `Lecturer ${invalid.name ?? invalid.email ?? invalid._id} is not assigned to department ${departmentDoc.name}.`;
  }

  return null;
};

const findOrCreateUnit = async (departmentDoc: any, unitIdentifier: string) => {
  if (!unitIdentifier) return null;

  const unitName = String(unitIdentifier).trim();
  if (!unitName) return null;

  let unitDoc = null;
  if (isObjectId(unitName)) {
    unitDoc = await Unit.findById(unitName);
  }

  if (!unitDoc) {
    unitDoc = await Unit.findOne({ name: unitName, department: departmentDoc._id });
  }

  if (!unitDoc) {
    const counter = Math.floor(Math.random() * 900) + 100;
    unitDoc = await Unit.create({
      name: unitName,
      code: deriveUnitCode(unitName),
      unitID: `${departmentDoc.code}-${deriveUnitCode(unitName)}-${counter}`,
      department: departmentDoc._id,
      supervisor: undefined,
      courses: [],
    });
  }

  if (String(unitDoc.department) !== String(departmentDoc._id)) {
    return null;
  }

  return unitDoc;
};

const syncUnitsFromConstants = async () => {
  const departments = getAllDepartments();

  await Promise.all(
    departments.map(async (constDept) => {
      const unitData = getDepartmentUnitsByCode(constDept.code);
      if (!unitData) return;

      const departmentDoc = await Department.findOne({ code: constDept.code });
      if (!departmentDoc) return;

      const normalizeUnitName = (unitEntry: any) =>
        typeof unitEntry === "string"
          ? String(unitEntry).trim()
          : unitEntry && typeof unitEntry.name === "string"
          ? unitEntry.name.trim()
          : "";

      const unitNames = [
        ...unitData.units.active.map(normalizeUnitName),
        ...unitData.units.reserve.map(normalizeUnitName),
      ].filter(Boolean);

      await Promise.all(
        unitNames.map(async (name, index) => {
          const cleanName = String(name).trim();
          if (!cleanName) return;

          await Unit.findOneAndUpdate(
            { name: cleanName, department: departmentDoc._id },
            {
              name: cleanName,
              code: deriveUnitCode(cleanName),
              unitID: `${constDept.code}-${deriveUnitCode(cleanName)}-${index + 1}`,
              department: departmentDoc._id,
            },
            { upsert: true }
          );
        })
      );
    })
  );
};

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

    if (!name || !code || !courseID || !department || !semester || !academicYearId) {
      return res.status(400).json({
        message: "Missing required fields (name, code, courseID, department, semester, academicYearId).",
      });
    }

    const departmentDoc = await findOrCreateDepartment(department);
    if (!departmentDoc) {
      return res.status(404).json({
        message: `Department not found for identifier=${department}`,
      });
    }

    if (String(courseID).trim().toUpperCase() !== String(departmentDoc.code).trim().toUpperCase()) {
      return res.status(400).json({
        message: `Course Group ID must match the selected department code (${departmentDoc.code}).`,
      });
    }

    const normalizedCode = normalizeCourseCode(departmentDoc.code, code);
    if (!isValidCourseCode(departmentDoc.code, normalizedCode)) {
      return res.status(400).json({
        message: `Course code must use the selected department code and three digits, e.g. ${departmentDoc.code} 501.`,
      });
    }

    const unitValue = unit && String(unit).trim() !== "" ? unit : null;
    if (unitValue) {
      const unitDoc = await Unit.findById(unitValue);
      if (!unitDoc) {
        return res.status(404).json({
          message: `Unit not found for id=${unitValue}`,
        });
      }

      if (String(unitDoc.department) !== String(departmentDoc._id)) {
        return res.status(400).json({
          message: `Unit ${unitDoc.name} does not belong to department ${departmentDoc.name}`,
        });
      }
    }

    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      return res.status(404).json({
        message: `AcademicYear not found for id=${academicYearId}`,
      });
    }

    const courseLecturerIds = Array.isArray(lecturer) ? lecturer : [];
    const lecturerValidationError = await validateDepartmentLecturers(courseLecturerIds, departmentDoc);
    if (lecturerValidationError) {
      return res.status(400).json({ message: lecturerValidationError });
    }

    const existing = await Course.findOne({
      name: String(name).trim(),
      code: normalizedCode,
      department: departmentDoc._id,
    });
    if (existing) {
      return res.status(400).json({
        message: `Course with name "${name}", code "${normalizedCode}", and department "${departmentDoc.name}" already exists.`,
      });
    }

    const created = await Course.create({
      name,
      code: normalizedCode,
      courseID: departmentDoc.code,
      department: departmentDoc._id,
      unit: unitValue,
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

    const departmentDoc = await Department.findById(topLevelCourse.department);
    if (!departmentDoc) {
      return res.status(404).json({ message: `Parent course department not found.` });
    }

    if (String(subject.subjectID).trim() !== String(departmentDoc.departmentID).trim()) {
      return res.status(400).json({
        message: `Subject ID must match the course department identifier (${departmentDoc.departmentID}).`,
      });
    }

    const lecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
    const subjectLecturerError = await validateDepartmentLecturers(lecturerIds, departmentDoc);
    if (subjectLecturerError) {
      return res.status(400).json({ message: subjectLecturerError });
    }

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
      unit: subject.unit ?? null,
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
      academicYearId,
    } = req.body as any;

    if (!name || !code || !courseID || !department) {
      return res.status(400).json({
        message: "Missing required fields (name, code, courseID, department).",
      });
    }

    if (!subject?.subjectID || !subject?.name) {
      return res.status(400).json({
        message:
          "Missing subject payload. Expected subject: { subjectID, name, code?, lecturer?, isActive?, students? }",
      });
    }

    const departmentDoc = await findOrCreateDepartment(department);
    if (!departmentDoc) {
      return res.status(404).json({
        message: `Department not found for identifier=${department}`,
      });
    }

    const unitValue = unit && String(unit).trim() !== "" ? unit : null;
    if (unitValue) {
      const unitDoc = await Unit.findById(unitValue);
      if (!unitDoc) {
        return res.status(404).json({
          message: `Unit not found for id=${unitValue}`,
        });
      }

      if (String(unitDoc.department) !== String(departmentDoc._id)) {
        return res.status(400).json({
          message: `Unit ${unitDoc.name} does not belong to department ${departmentDoc.name}`,
        });
      }
    }

    const topLevelCourse = await Course.findOne({ courseID, department: departmentDoc._id, unit: unitValue, academicYear: academicYearId ?? null });

    const courseLecturerIds = Array.isArray(lecturer) ? lecturer : [];
    const courseLecturerValidationError = await validateDepartmentLecturers(courseLecturerIds, departmentDoc);
    if (courseLecturerValidationError) {
      return res.status(400).json({ message: courseLecturerValidationError });
    }

    if (String(subject.subjectID).trim() !== String(departmentDoc.departmentID).trim()) {
      return res.status(400).json({
        message: `Subject ID must match the selected department identifier (${departmentDoc.departmentID}).`,
      });
    }

    const subjectLecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
    const subjectLecturerValidationError = await validateDepartmentLecturers(subjectLecturerIds, departmentDoc);
    if (subjectLecturerValidationError) {
      return res.status(400).json({ message: subjectLecturerValidationError });
    }

    const studentIds = Array.isArray(subject?.students) ? subject.students : [];

    // Create course + subject if missing
    if (!topLevelCourse) {
      const created = await Course.create({
        name,
        code,
        courseID,
        department: departmentDoc._id,
        unit: unitValue,
        academicYear: academicYearId ?? null,
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
            unit: subject.unit ?? null,
            lecturer: subjectLecturerIds,
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
    if (academicYearId) topLevelCourse.academicYear = academicYearId;

    if (Array.isArray(studentClasses)) topLevelCourse.studentClasses = studentClasses;
    if (Array.isArray(lecturer)) topLevelCourse.lecturer = lecturer;

    topLevelCourse.subjects.push({
      name: subject.name,
      code: subject.code ?? null,
      subjectID: subject.subjectID,
      unit: subject.unit ?? null,
      lecturer: subjectLecturerIds,
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
    const classIdQuery = (req.query.class as string | undefined) ?? (req.query.classId as string | undefined);

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
    const topLevelOnly = req.query.topLevel === "true";

    if (topLevelOnly) {
      if (classIdQuery || userRole === "student") {
        let effectiveClassId = classIdQuery;
        if (userRole === "student") {
          const studentClassId = normalizeClassIdValue((req as any).user?.studentClasses);
          effectiveClassId = studentClassId || effectiveClassId;
        }

        if (effectiveClassId) {
          const classDoc = await getClassCourseDocuments(effectiveClassId);
          let classCourses = (classDoc?.courses ?? []) as any[];
          
          // Deduplicate courses by name, code, and department
          const seen = new Set<string>();
          classCourses = classCourses.filter((course) => {
            const key = `${String(course.name).trim().toLowerCase()}-${String(course.code).trim().toLowerCase()}-${String(course.department?._id ?? course.department ?? "")}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          
          const total = classCourses.length;
          return res.json({
            courses: classCourses,
            pagination: {
              total,
              page,
              pages: Math.ceil(total / limit),
            },
          });
        }
      }

      const [total, courses] = await Promise.all([
        Course.countDocuments(query),
        Course.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("department", "name departmentID code head")
          .populate("unit", "name unitID code"),
      ]);

      return res.json({
        courses,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      });
    }

    const flattened: any[] = [];

    let topLevelCourses: any[] = [];
    if (classIdQuery || userRole === "student") {
      let effectiveClassId = classIdQuery;
      if (userRole === "student") {
        const studentClassId = normalizeClassIdValue((req as any).user?.studentClasses);
        effectiveClassId = studentClassId || effectiveClassId;
      }

      if (effectiveClassId) {
        const classDoc = await getClassCourseDocuments(effectiveClassId);
        topLevelCourses = (classDoc?.courses ?? []) as any[];
      }
    }

    if (topLevelCourses.length === 0) {
      if (userRole === "teacher") {
        topLevelCourses = await Course.find({
          ...query,
          "subjects.lecturer": userId,
        }).sort({ createdAt: -1 });
      } else if (userRole === "student") {
        // If a student has no assigned classes or the class fetch failed, return an empty list.
        topLevelCourses = [];
      } else {
        topLevelCourses = await Course.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("department", "name departmentID code head")
          .populate("unit", "name unitID code");
      }
    }

    for (const c of topLevelCourses) {
      const subjects = (c?.subjects ?? []) as any[];
      for (const s of subjects) {
        if (search) {
          const matches =
            String(s?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            String(s?.code ?? "").toLowerCase().includes(search.toLowerCase()) ||
            String(s?.subjectID ?? "").toLowerCase().includes(search.toLowerCase()) ||
            String(c?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            String(c?.code ?? "").toLowerCase().includes(search.toLowerCase());
          if (!matches) continue;
        }

        if (userRole === "teacher") {
          const lecturerIds = Array.isArray(s?.lecturer) ? s.lecturer : [];
          const includesTeacher = lecturerIds.some((lid: any) => String(lid) === String(userId));
          if (!includesTeacher) continue;
        }

        const lecturerData = Array.isArray(s?.lecturer) ? s.lecturer : [];
        flattened.push({
          _id: String(s?._id ?? s?.subjectID ?? ""),
          name: s?.name,
          code: s?.code,
          isActive: Boolean(s?.isActive ?? true),
          teacher: lecturerData.map((lect: any) =>
            typeof lect === "object" && lect !== null
              ? { _id: String(lect._id ?? ""), name: lect.name ?? "" }
              : { _id: String(lect), name: "" }
          ),
          course: {
            _id: String(c?._id ?? ""),
            name: c?.name,
            code: c?.code,
          },
          department: c?.department
            ? {
                _id: String(c.department._id ?? ""),
                name: c.department.name,
                code: c.department.code,
                head: c.department.head,
              }
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

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate("department", "name departmentID code head")
      .populate("unit", "name unitID code")
      .populate("lecturer", "name email")
      .populate("subjects.lecturer", "name email");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.json(course);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// -----------------------------
// Course metadata for frontend forms
// -----------------------------
export const getCourseMeta = async (req: Request, res: Response) => {
  try {
    await syncDepartmentsFromConstants();

    const departments = await Department.find({}).select("name departmentID code").sort({ name: 1 });
    const units = await Unit.find({}).select("name unitID code department").sort({ name: 1 });
    const academicYears = await AcademicYear.find({}).select("name").sort({ name: 1 });

    return res.json({ departments, units, academicYears });
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
    const { name, isActive, code, courseID, department, semester, year, unit, academicYearId } = req.body as any;

    const updateData: any = {
      name,
      isActive,
      code,
      courseID,
      department,
      semester,
      year,
    };
    if (unit !== undefined) {
      updateData.unit = unit === "" ? null : unit;
    }
    if (academicYearId) updateData.academicYear = academicYearId;

    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
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
      const uniqueIds = Array.from(new Set(courseIds));

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

// -----------------------------
// Seed departments from constants
// -----------------------------
// @desc    Seed all departments from the DEPARTMENTS_METADATA constant
// @route   POST /api/courses/seed/departments
// @access  Private (Admin)
export const bulkUploadCourses = async (req: Request, res: Response) => {
  try {
    const payload = req.body as {
      courses: Array<{
        name: string;
        code: string;
        courseID: string;
        department: string;
        unit: string;
        semester: string;
        year?: string;
        academicYearId: string;
        lecturer?: string | string[];
      }>;
    };

    if (!Array.isArray(payload?.courses) || payload.courses.length === 0) {
      return res.status(400).json({ message: "courses array is required for bulk upload." });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    for (let index = 0; index < payload.courses.length; index += 1) {
      const row = payload.courses[index]!;
      const rowNumber = index + 1;

      if (!row) {
        results.errors.push({ row: rowNumber, message: "Missing course row." });
        continue;
      }

      if (!row.name || !row.code || !row.courseID || !row.department || !row.unit || !row.semester || !row.academicYearId) {
        results.errors.push({ row: rowNumber, message: "Missing required course fields." });
        continue;
      }

      const departmentDoc = await findOrCreateDepartment(row.department);
      if (!departmentDoc) {
        results.errors.push({ row: rowNumber, message: `Department not found: ${row.department}` });
        continue;
      }

      if (String(row.courseID).trim().toUpperCase() !== String(departmentDoc.code).trim().toUpperCase()) {
        results.errors.push({ row: rowNumber, message: `Course Group ID must match department code ${departmentDoc.code}.` });
        continue;
      }

      const normalizedCode = normalizeCourseCode(departmentDoc.code, row.code);
      if (!normalizedCode || !isValidCourseCode(departmentDoc.code, normalizedCode)) {
        results.errors.push({ row: rowNumber, message: `Course code must be formatted as ${departmentDoc.code} 501.` });
        continue;
      }

      const unitDoc = await findOrCreateUnit(departmentDoc, row.unit);
      if (!unitDoc) {
        results.errors.push({ row: rowNumber, message: `Unit not found or invalid for department ${departmentDoc.name}: ${row.unit}` });
        continue;
      }

      const academicYear = await AcademicYear.findById(row.academicYearId);
      if (!academicYear) {
        results.errors.push({ row: rowNumber, message: `Academic year not found for id ${row.academicYearId}` });
        continue;
      }

      const existing = await Course.findOne({ courseID: departmentDoc.code, department: departmentDoc._id, unit: unitDoc._id, academicYear: row.academicYearId });
      if (existing) {
        results.skipped += 1;
        continue;
      }

      const yearValue = row.year ? String(row.year).trim() : undefined;
      await Course.create({
        name: row.name,
        code: normalizedCode,
        courseID: departmentDoc.code,
        department: departmentDoc._id,
        unit: unitDoc._id,
        academicYear: row.academicYearId,
        semester: row.semester,
        year: yearValue,
        isActive: true,
        studentClasses: [],
        lecturer: Array.isArray(row.lecturer)
          ? row.lecturer
          : row.lecturer
          ? [String(row.lecturer)]
          : [],
        subjects: [],
      });
      results.created += 1;
    }

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Bulk uploaded ${results.created} courses from spreadsheet`,
      });
    }

    return res.json({ message: "Bulk upload processed", results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const seedDepartments = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Only admins can seed departments" });
    }

    const departmentsData = getAllDepartments();

    // Upsert each department (create or update if exists)
    const results = await Promise.all(
      departmentsData.map((dept) =>
        Department.findOneAndUpdate(
          { code: dept.code },
          { name: dept.name, code: dept.code, departmentID: dept.departmentID },
          { upsert: true, returnDocument: "after" }
        )
      )
    );

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Seeded ${results.length} departments from constants`,
      });
    }

    return res.json({
      message: `Successfully seeded ${results.length} departments`,
      departments: results,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// -----------------------------
// Get available departments (frontend dropdown)
// -----------------------------
// @desc    Get all available departments for forms/dropdowns
// @route   GET /api/courses/departments
// @access  Private
const syncDepartmentsFromConstants = async () => {
  const constantDepartments = getAllDepartments();

  await Promise.all(
    constantDepartments.map(async (constDept) => {
      await Department.findOneAndUpdate(
        { code: constDept.code },
        {
          name: constDept.name,
          code: constDept.code,
          departmentID: constDept.departmentID,
        },
        { upsert: true }
      );
    })
  );

  await syncUnitsFromConstants();
};

export const getAvailableDepartments = async (req: Request, res: Response) => {
  try {
    await syncDepartmentsFromConstants();
    let departments = await Department.find({}).sort({ name: 1 });

    if (!departments.length) {
      const constantDepartments = getAllDepartments().map((dept) => ({
        _id: dept.departmentID,
        ...dept,
      }));
      return res.json({ departments: constantDepartments });
    }

    return res.json({ departments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const normalizeDepartmentPayload = (raw: any) => {
  const name = String(raw?.name || raw?.departmentName || raw?.["Department Name"] || "").trim();
  const code = String(raw?.code || raw?.departmentCode || raw?.["Department Code"] || "").trim().toUpperCase();
  const departmentID = String(
    raw?.departmentID || raw?.departmentId || raw?.["Department ID"] || raw?.["department id"] || ""
  ).trim();
  const head = String(raw?.head || raw?.departmentHead || "").trim();
  return { name, code, departmentID, head: head || undefined };
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, code, departmentID, head } = req.body as {
      name?: string;
      code?: string;
      departmentID?: string;
      head?: string;
    };

    if (!name || !code || !departmentID) {
      return res.status(400).json({ message: "Department name, code, and departmentID are required." });
    }

    const normalizedName = String(name).trim();
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedDepartmentID = String(departmentID).trim();

    const existing = await Department.findOne({
      $or: [
        { code: normalizedCode },
        { departmentID: normalizedDepartmentID },
        { name: normalizedName },
      ],
    });

    if (existing) {
      return res.status(409).json({ message: "A department with that code, ID, or name already exists." });
    }

    const department = await Department.create({
      name: normalizedName,
      code: normalizedCode,
      departmentID: normalizedDepartmentID,
      head: head && mongoose.isValidObjectId(head) ? head : undefined,
    } as any);

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Created department ${department.name} (${department.code})`,
      });
    }

    return res.status(201).json(department);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const { name, code, departmentID, head } = req.body as {
      name?: string;
      code?: string;
      departmentID?: string;
      head?: string;
    };

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (code !== undefined) updateData.code = String(code).trim().toUpperCase();
    if (departmentID !== undefined) updateData.departmentID = String(departmentID).trim();
    if (head !== undefined) updateData.head = head && mongoose.isValidObjectId(head) ? head : null;

    if (updateData.name || updateData.code || updateData.departmentID) {
      const duplicate = await Department.findOne({
        _id: { $ne: department._id },
        $or: [
          ...(updateData.code ? [{ code: updateData.code }] : []),
          ...(updateData.departmentID ? [{ departmentID: updateData.departmentID }] : []),
          ...(updateData.name ? [{ name: updateData.name }] : []),
        ],
      });

      if (duplicate) {
        return res.status(409).json({ message: "Another department with the same name, code, or departmentID already exists." });
      }
    }

    Object.assign(department, updateData);
    const updated = await department.save();

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Updated department ${updated.name} (${updated.code})`,
      });
    }

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const deleted = await Department.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Department not found" });
    }

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Deleted department ${deleted.name} (${deleted.code})`,
      });
    }

    return res.json({ message: `Department ${deleted.name} deleted successfully.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const bulkUploadDepartments = async (req: Request, res: Response) => {
  try {
    const payload = req.body as {
      departments: Array<{ name?: string; code?: string; departmentID?: string; head?: string }>;
    };

    if (!Array.isArray(payload?.departments) || payload.departments.length === 0) {
      return res.status(400).json({ message: "departments array is required for bulk upload." });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    for (let index = 0; index < payload.departments.length; index += 1) {
      const row = normalizeDepartmentPayload(payload.departments[index]);
      const rowNumber = index + 1;

      if (!row.name || !row.code || !row.departmentID) {
        results.errors.push({ row: rowNumber, message: "Missing required department fields." });
        results.skipped += 1;
        continue;
      }

      const filter = {
        $or: [{ code: row.code }, { departmentID: row.departmentID }],
      };

      const existing = await Department.findOne(filter);
      if (existing) {
        await Department.findByIdAndUpdate(existing._id, {
          name: row.name,
          code: row.code,
          departmentID: row.departmentID,
          head: row.head && mongoose.isValidObjectId(row.head) ? row.head : existing.head,
        });
        results.updated += 1;
        continue;
      }

      await Department.create({
        name: row.name,
        code: row.code,
        departmentID: row.departmentID,
        head: row.head && mongoose.isValidObjectId(row.head) ? row.head : undefined,
      } as any);
      results.created += 1;
    }

    const userId = (req as any).user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Bulk uploaded ${results.created} departments from spreadsheet`,
      });
    }

    return res.json({ message: "Bulk upload processed", results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getDepartmentConstants = async (req: Request, res: Response) => {
  try {
    return res.json({
      departments: getAllDepartments(),
      departmentUnits: DEPARTMENT_UNITS,
      departmentCourses: DEPARTMENT_COURSES,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

