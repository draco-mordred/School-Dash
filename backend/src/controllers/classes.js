import ClassModel from "../models/classes";
import UserModel from "../models/user";
import { logActivity } from "../utils/activitieslog";
export const getClassById = async (req, res) => {
    try {
        const cls = await ClassModel.findById(req.params.id)
            .populate("academicYear", "name")
            .populate("classTeacher", "name email")
            .populate("courses", "name code subjects.subjectID")
            .select("name academicYear classTeacher courses");
        if (!cls) {
            return res.status(404).json({ message: "Class not found" });
        }
        res.json(cls);
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
// @desc    Get students for a class
// @route   GET /api/classes/:id/students
// @access  Private (admin, teacher, student, parent)
export const getStudentsForClass = async (req, res) => {
    try {
        const classId = req.params.id;
        // Find users who have this class set in `studentClasses` and are students
        const students = await UserModel.find({ studentClasses: classId, role: "student" }).select("name email idNumber studentClasses");
        res.json({ students });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
// @desc    Create a New Class
// @route   POST /api/classes
// @access  Private/Admin
export const createClass = async (req, res) => {
    try {
        const { name, academicYear, classTeacher, capacity, courses, students } = req.body;
        const existingClass = await ClassModel.findOne({ name, academicYear });
        if (existingClass) {
            return res
                .status(400)
                .json({
                message: `Class with the same name already exists for the specified academic year!`
            });
        }
        const studentIds = Array.isArray(students) ? students : [];
        const newClass = await ClassModel.create({
            name,
            academicYear,
            classTeacher,
            capacity,
            courses: Array.isArray(courses) ? courses : [],
            students: studentIds,
        });
        if (studentIds.length > 0) {
            await UserModel.updateMany({ _id: { $in: studentIds }, role: "student" }, { $set: { studentClasses: newClass._id } });
        }
        await logActivity({
            userId: req.user?._id,
            action: `Created new class: ${newClass.name}`
        });
        res.status(201).json({ newClass });
    }
    catch (error) {
        res.status(500).json({ message: `Server error,`, error: `${error}` });
    }
};
//TEST THIS - VIDEO TIMESYNC = 2.30.00
//TEST VIA - THUNDERCLIENT SERVER CONNECTION ...
//TIMESYNC = 09:43 25/05/2026
// @desc    Get All Classes
// @route   Get /api/classes
// @access  Private/Admin
export const getAllClasses = async (req, res) => {
    try {
        // 1. Parse the QUery Parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        // 2. Build Search Query (Case-insensitive regex on Name)
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }
        // 3. Execute Query (Count & Find)
        const [total, classes] = await Promise.all([
            ClassModel.countDocuments(query),
            ClassModel.find(query)
                .populate("academicYear", "name")
                .populate("classTeacher", "name email")
                .populate("courses", "name code subjects.subjectID lecturer")
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
    }
    catch (error) {
        res.status(500).json({
            message: "Server error", error
        });
    }
};
// @desc    Update Class
// @route   POST /api/classes/:id
// @access  Private/Admin
export const updateClass = async (req, res) => {
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
                message: "Class with this name already exists for the specified academic year",
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
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (academicYear !== undefined)
            updateData.academicYear = academicYear;
        if (classTeacher !== undefined)
            updateData.classTeacher = classTeacher;
        if (capacity !== undefined)
            updateData.capacity = capacity;
        if (courses !== undefined)
            updateData.courses = Array.isArray(courses) ? courses : [];
        if (students !== undefined)
            updateData.students = newStudentIds;
        const updatedClass = await ClassModel.findByIdAndUpdate(classId, updateData, { returnDocument: "after", runValidators: true });
        if (!updatedClass) {
            return res.status(404).json({ message: "Class not found!" });
        }
        if (addedStudentIds.length > 0) {
            await UserModel.updateMany({ _id: { $in: addedStudentIds }, role: "student" }, { $set: { studentClasses: updatedClass._id } });
        }
        if (removedStudentIds.length > 0) {
            await UserModel.updateMany({ _id: { $in: removedStudentIds }, role: "student" }, { $set: { studentClasses: null } });
        }
        await logActivity({
            userId: req.user.id,
            action: `Updated class: ${updatedClass?.name}`,
        });
        res.status(200).json(updatedClass);
    }
    catch (error) {
        res.status(500).json({ message: `Server error`, error: `${error}` });
    }
};
// @desc    Delete Class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
export const deleteClass = async (req, res) => {
    try {
        const deletedClass = await ClassModel.findByIdAndDelete(req.params.id);
        const userId = req.user._id;
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Remove a course from a class (without deleting the course)
// @route   DELETE /api/classes/:classId/courses/:courseId
// @access  Private (Admin/Teacher/Unit)
export const removeCourseFromClass = async (req, res) => {
    try {
        const { classId, courseId } = req.params;
        const cls = await ClassModel.findById(classId);
        if (!cls) {
            return res.status(404).json({ message: "Class not found" });
        }
        const beforeCount = (cls.courses ?? []).length;
        cls.courses = (cls.courses ?? []).filter((c) => String(c) !== String(courseId));
        const afterCount = (cls.courses ?? []).length;
        if (beforeCount === afterCount) {
            return res.status(404).json({ message: "Course not found in this class" });
        }
        await cls.save();
        const userId = req.user?._id;
        if (userId) {
            await logActivity({
                userId,
                action: `Removed course ${courseId} from class ${cls.name}`,
            });
        }
        return res.json({ message: "Course removed from class", classId: cls._id, courses: cls.courses });
    }
    catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};
