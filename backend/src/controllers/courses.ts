import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog";

import Course, { type ICourse } from "../models/courses";
import User from "../models/user";
import ClassModel from "../models/classes";


//  @desc    Create a new course subject
//  @route   POST /api/courses
//  @access  Private (Admin)
export const createCourseSubject = async (
  req: Request, 
  res: Response
) => {
  try {
    const { name, isActive, code, lecturer, courseID } = req.body;

    const courseExists = await Course.findOne({ code });

    if (courseExists) {
      return res.status(400).json({
        message: `Course code (${code}) already exists!`
      })
    }
    const newCourseSubject = await Course.create({
      name,
      code,
      isActive,
      lecturer: Array.isArray(lecturer) ? lecturer : [],
      courseID,
    });

    if (newCourseSubject) {
      const userId = (req as any).user._id; // Assuming user ID is stored in req.user
      await logActivity({
        userId, 
        action: `Course ${newCourseSubject.name} under ${newCourseSubject.courseID} with code ${newCourseSubject.code} was created.`
      });
      res.status(201).json(newCourseSubject);
    }

  } catch (error) {
    res.status(500).json({
      message: "Server error", error
    })
  }
}

//  @desc    Get all course subjects
//  @route   GET /api/courses
//  @access  Private (Admin)
export const getAllCourseSubjects = async(
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const search = req.query.search as string;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { courseID: { $regex: search, $options: "i" } },
      ];
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    let courses: ICourse[] = [];
    let total = 0;

    if (userRole === "teacher") {
      courses = await Course.find({ ...query, lecturer: userId })
        .populate("lecturer", "name email")
        .sort({ createdAt: -1 });
      total = courses.length;
    } else if (userRole === "student") {
      const student = await User.findById(userId).populate({
        path: "studentClasses",
        populate: { path: "courses", select: "name code courseID lecturer isActive" },
      });

      const studentClass = student?.studentClasses as any;
      const classCourses = studentClass?.courses ?? [];

      courses = Array.isArray(classCourses)
        ? classCourses.map((course: any) => ({
            ...course.toObject?.(),
            lecturer: course.lecturer,
          }))
        : [];
      total = courses.length;
    } else {
      total = await Course.countDocuments(query);
      courses = await Course.find(query)
        .populate("lecturer", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    }

    res.json({
      courses,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      }, 
    });
  } catch(error){
    console.log(error);
    res.status(500).json({ message: `Server error`, error })
  }
}

//  @desc    Update course subjects
//  @route   PATCH /api/courses/update/:id
//  @access  Private (Admin)
export const updateCourseSubjects = async(
  req: Request,
  res: Response
) => {
  try {
    const { name, isActive, code, lecturer, courseID } = req.body;
    // Catch all required fields
    // if (!name || !code || !courseID) {
    //   return res.status(400).json({
    //     message: "Please provide all required fields (name, code, courseID)!"
    //   })
    // }
    const updatedCourseSubject = await Course.findByIdAndUpdate(
      req.params.id,
      { name,
        isActive, 
        code, 
        lecturer: Array.isArray(lecturer) ? lecturer : [], 
        courseID 
      },
      { new: true, 
        runValidators: true 
      }
    );

    const userId = (req as any).user._id;
    // Log this activity
    await logActivity({
      userId,
      action: `Course ${updatedCourseSubject?.name} under ${ updatedCourseSubject?.courseID} with code ${updatedCourseSubject?.code} was updated Successfully!`
    })

    if (!updatedCourseSubject) {
      return res.status(404).json({
        message: `Course subject with ID ${req.params.id} not found!`
      })
    }
    res.json(updatedCourseSubject);
  } catch(error){
    console.log(error);
    res.status(500).json({ message: `Server error`, error })
  }
}

//  @desc    Delete course subjects
//  @route   DELETE /api/courses/delete/:id
//  @access  Private (Admin)
export const deleteCourseSubjects = async(
  req: Request,
  res: Response
) => {
  try {
    const deletedCourseSubjects = await Course.findByIdAndDelete(req.params.id);
    const userId = (req as any).user._id;

    await logActivity({
      userId,
      action: `Course ${deletedCourseSubjects?.name} under ${ deletedCourseSubjects?.courseID} with code ${deletedCourseSubjects?.code} was deleted Successfully!`
    })
    if (!deletedCourseSubjects){
      return res.status(404).json(
        { message: `Course subject with ID ${req.params.id} not found!` }
      )
    };
    res.json(
      { message: `Course ${deletedCourseSubjects?.name} under ${ deletedCourseSubjects?.courseID} with code ${deletedCourseSubjects?.code} was deleted Successfully!`}
    )
  }catch(error){
    console.log(error);
    res.status(500).json(
      { message: `Server error`, error}
    )
  }

}

//  @desc    Deduplicate class courses — remove duplicate course IDs from all classes
//  @route   POST /api/courses/deduplicate-classes
//  @access  Private (Admin)
export const deduplicateClassCourses = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    res.json({
      message: `Deduplication complete. Updated ${classesUpdated} classes, removed ${totalDeduplicated} duplicate entries.`,
      classesUpdated,
      totalDeduplicated,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};