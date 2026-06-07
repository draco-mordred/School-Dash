import { type Request, type Response } from "express";
import ClassModel from "../models/classes";
import UserModel from "../models/user";
import { logActivity } from "../utils/activitieslog"

export const getClassById = async (req: Request, res: Response) => {
  try {
    const cls = await ClassModel.findById(req.params.id)
      .populate("academicYear", "name")
      .populate("courses", "name code")
      .select("name academicYear courses");
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.json(cls);
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
        .populate("courses", "name code lecturer")
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
    const oldStudentIds = (currentClass?.students ?? []).map(String);
    const newStudentIds = Array.isArray(students) ? students.map(String) : [];

    const addedStudentIds = newStudentIds.filter((id) => !oldStudentIds.includes(id));
    const removedStudentIds = oldStudentIds.filter((id) => !newStudentIds.includes(id));

    const updatedClass = await ClassModel.findByIdAndUpdate(
      classId,
      { name, academicYear, classTeacher, capacity, courses, students: newStudentIds },
      { new: true, runValidators: true }
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
    const deletedClass = await ClassModel.findByIdAndDelete( req.params.id )
    const userId = (req as any).user._id;
    await logActivity({ 
      userId, 
      action: `Deleted ${deletedClass?.name} Class`
    })
    if (!deletedClass) {
      return res.status(404).json({
        message: `Class not found! - ${userId} Is ${deletedClass}.`
      })
    }
    // res.json({ message: `Class '${deletedClass?.name}' removed`})
    res.json({ message: `Class removed!`})
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
}