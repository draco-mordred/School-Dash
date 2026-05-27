import { type Request, type Response } from "express";
import ClassModel from "../models/classes";
import { logActivity } from "../utils/activitieslog"

// @desc    Create a New Class
// @route   POST /api/classes
// @access  Private/Admin

export const createClass = async (
  req: Request, 
  res: Response
) => {
 try {
  const { name, academicYear, classTeacher, capacity } = req.body;
  const existingClass = await ClassModel.findOne({ name, academicYear });
  if (existingClass) {
    return res
    .status(400)
    .json({
      message: `Class with the same name already exists for the specified academic year!`
    })
  }
  const newClass  = await ClassModel.create(
    {
    name,
    academicYear,
    classTeacher,
    capacity
  }
);
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
    const search = req.query.page as string;

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
    const { name, academicYear, classTeacher, capacity } = req.body;

    const existingClass = await ClassModel.findOne({ 
      _id: {$ne: classId}
    });
    if (existingClass) {
      const updatedClass = await ClassModel.findByIdAndUpdate(
        classId,
        req.body,
        { new: true, runValidators: true }
      )
      if (!updatedClass) {
        return res.status(404).json({ message: "Class not found!"})
      }
      await logActivity({
        userId: (req as any).user.id,
        action: `Updated class: ${updatedClass?.name}`
      })
      res.status(200).json( updatedClass )
    }
    // else{
    //   res.status(400).json({ message: "Class with this name already exists for the specified academic year",  })
    // }
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