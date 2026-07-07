import { type Request, type Response } from "express";
import ActivitiesLog from "../models/activitieslog";
import Exam from "../models/exam";
import ClassModel from "../models/classes";
import User from "../models/user";
import Submission from "../models/submission";
import Timetable from "../models/timetable";
import AcademicYear from "../models/academicYear";

// Helper to get day name (e.eg, "Monday")
const getTodayName = () => new Date().toLocaleDateString('en-us', {weekday: "long"});

// @desc  Get Dhasboard Statistics (Role Based)
// route  GET /api/dashboaard/stats
export const getDashboradStats = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;
    let stats = {};
    // Get last 5 activities system-wide (admin or personal)
    const activityQuery = user.role === "admin" ? {} : { user: user._id};
    const recentActivities = await ActivitiesLog.find(activityQuery)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("user", "name");

    const formattedActivity = recentActivities.map(log => `${(log.user as any).name}: ${log.action} (${new Date(log.createdAt as any).toLocaleDateString([], {hour: '2-digit', minute: "2-digit"})})`);

    if (user.role === 'admin'){
      const totalStudents = await User.countDocuments({ role: "student" });
      const totalParents = await User.countDocuments({ role: "parent" });
      const totalStaff = await User.countDocuments({ role: "teacher" });
      
      // Get the current active academic year
      const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
      const activeSession = currentAcademicYear?.name || "N/A";

      stats = {
        totalStudents,
        totalParents,
        totalStaff,
        activeSession,
        recentActivities: formattedActivity
      }
    }else if (user.role === "teacher") {
      // 1. Count classes assigned to teacher
      const myClassessCount = await ClassModel.countDocuments({
        classTeacher: user._id
      });
      //2. Pending Grading: Submissions for any exams that have no score yet
      //First find exams created by this teacher
      const myExams = await Exam.find({ teacher: user._id }).select("_id");
      const myExamsIds = myExams.map(exam => exam._id);
      const pendingGrading = await Submission.countDocuments({
        exam: { $in: myExamsIds },
        score: 0 // Assuming 0 or null means ungraded
      })
      //3. Next CLass (Simplified Logic)
      // Find timetables where Lecturer is Teaching Today
      const today = getTodayName();
      //Complex aggregation could go here, but let's do a simple find for now
      // this is a placeholder for the logic to find the specific period based on the current time
      const nextClass = " Pediatrics = 500 Level";
      const nextClassTime = "08:00 AM";

      stats = {
        myClassessCount,
        pendingGrading,
        nextClass,
        nextClassTime,
        recentActivities: formattedActivity
      }
    }else if (user.role === "student") {
      // 1. Assignments/Exams Due
      const nextExam = await Exam.findOne({
        class: user.studentClass,
        dueDate: { $gte: new Date() }
      }).sort({ dueDate: 1 });

      const pendingAssignments = await Exam.countDocuments({
        class: user.studentClass,
        isActive: true,
        dueDate: { $gte: new Date() }
      });

      //2. Attendance (Mock Data for now)
      const myAttendance = "98%"

      stats = {
        myAttendance,
        pendingAssignments,
        nextExam,
        nextExamDate: nextExam ? new Date(nextExam.dueDate).toLocaleDateString() : "",
        recentActivities: formattedActivity
      };
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: `Server error: ${error}`
    })
  }
}