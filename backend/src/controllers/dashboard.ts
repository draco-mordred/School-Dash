import { type Request, type Response } from "express";
import ActivitiesLog from "../models/activitieslog";
import Exam from "../models/exam";
import ClassModel from "../models/classes";
import User from "../models/user";
import Submission from "../models/submission";
import Timetable from "../models/timetable";
import AcademicYear from "../models/academicYear";
import AcademicSession from "../models/academicSession";
import Semester from "../models/semester";
import Department from "../models/departments";
import Unit from "../models/units";
import Course from "../models/courses";
import ClinicalRotation from "../models/clinicalRotation";
import PostingAndRotation from "../models/postingsAndRotations";
import Institution from "../models/institution";
import AcademicClock from "../models/academicClock";

// Helper to get day name (e.g., "Monday")
const getTodayName = () => new Date().toLocaleDateString("en-us", { weekday: "long" });

export interface AcademicOverviewClassSummary {
  name: string;
  courseCount: number;
  assessmentCount: number;
  phaseLabel?: string | null;
}

export interface AcademicOverviewPayload {
  sessions: number;
  semesters: number;
  classes: number;
  courses: number;
  assessments: number;
  details: {
    activeAcademicYear: string | null;
    currentSemester: string | null;
    classes: AcademicOverviewClassSummary[];
  };
}

export interface ClinicalPostingSummary {
  className: string;
  phaseLabel: string | null;
  hasSchedule: boolean;
}

export interface ClinicalRotationTeamSummary {
  className: string;
  teamCount: number;
}

export interface ClinicalRotationSummary {
  className: string;
  name: string;
  dateRange: string;
  duration: string;
}

export interface ClinicalOverviewPayload {
  postings: number;
  departments: number;
  units: number;
  teams: number;
  rotations: number;
  details: {
    postings: ClinicalPostingSummary[];
    rotationTeams: ClinicalRotationTeamSummary[];
    rotations: ClinicalRotationSummary[];
  };
}

const formatClockPhaseLabel = (clockPhase?: string | null, phaseConfig?: Record<string, any> | null) => {
  if (!clockPhase) return null;

  const phaseName = phaseConfig?.[clockPhase]?.name;
  if (phaseName) {
    return `${clockPhase.replace("phase", "Phase ")} · ${phaseName}`;
  }

  return `${clockPhase.replace("phase", "Phase ")}`;
};

export const buildAcademicOverviewPayload = ({
  sessionsCount,
  semestersCount,
  classesCount,
  coursesCount,
  assessmentsCount,
  activeAcademicYearName,
  currentSemesterLabel,
  isPostingCalendar,
  classSummaries,
}: {
  sessionsCount: number;
  semestersCount: number;
  classesCount: number;
  coursesCount: number;
  assessmentsCount: number;
  activeAcademicYearName?: string | null;
  currentSemesterLabel?: string | null;
  isPostingCalendar?: boolean;
  classSummaries?: AcademicOverviewClassSummary[];
}): AcademicOverviewPayload => ({
  sessions: sessionsCount,
  semesters: semestersCount,
  classes: classesCount,
  courses: coursesCount,
  assessments: assessmentsCount,
  details: {
    activeAcademicYear: activeAcademicYearName ?? null,
    currentSemester: isPostingCalendar
      ? classSummaries?.find((summary) => summary.phaseLabel)?.phaseLabel ?? currentSemesterLabel ?? null
      : currentSemesterLabel ?? null,
    classes: (classSummaries ?? []).map((summary) => ({
      name: summary.name,
      courseCount: summary.courseCount ?? 0,
      assessmentCount: summary.assessmentCount ?? 0,
      phaseLabel: summary.phaseLabel ?? null,
    })),
  },
});

export const buildClinicalOverviewPayload = ({
  postingsCount,
  departmentsCount,
  unitsCount,
  teamsCount,
  rotationsCount,
  postingSummaries,
  rotationTeamSummaries,
  rotationSummaries,
}: {
  postingsCount: number;
  departmentsCount: number;
  unitsCount: number;
  teamsCount: number;
  rotationsCount: number;
  postingSummaries?: ClinicalPostingSummary[];
  rotationTeamSummaries?: ClinicalRotationTeamSummary[];
  rotationSummaries?: ClinicalRotationSummary[];
}): ClinicalOverviewPayload => ({
  postings: postingsCount,
  departments: departmentsCount,
  units: unitsCount,
  teams: teamsCount,
  rotations: rotationsCount,
  details: {
    postings: (postingSummaries ?? []).map((summary) => ({
      className: summary.className,
      phaseLabel: summary.phaseLabel ?? null,
      hasSchedule: summary.hasSchedule ?? false,
    })),
    rotationTeams: (rotationTeamSummaries ?? []).map((summary) => ({
      className: summary.className,
      teamCount: summary.teamCount ?? 0,
    })),
    rotations: (rotationSummaries ?? []).map((summary) => ({
      className: summary.className,
      name: summary.name,
      dateRange: summary.dateRange,
      duration: summary.duration,
    })),
  },
});

// @desc  Get Dashboard Statistics (Role Based)
// route  GET /api/dashboard/stats
export const getDashboradStats = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;
    let stats = {};
    // Get last 5 activities system-wide (admin or personal)
    const activityQuery = user.role === "admin" ? {} : { user: user._id };
    const recentActivities = await ActivitiesLog.find(activityQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name");

    const formattedActivity = recentActivities.map(log => `${(log.user as any).name}: ${log.action} (${new Date(log.createdAt as any).toLocaleDateString([], { hour: "2-digit", minute: "2-digit" })})`);

    if (user.role === "admin") {
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
        recentActivities: formattedActivity,
      };
    } else if (user.role === "teacher") {
      // 1. Count classes assigned to teacher
      const myClassessCount = await ClassModel.countDocuments({
        classTeacher: user._id,
      });
      // 2. Pending Grading: Submissions for any exams that have no score yet
      // First find exams created by this teacher
      const myExams = await Exam.find({ teacher: user._id }).select("_id");
      const myExamsIds = myExams.map(exam => exam._id);
      const pendingGrading = await Submission.countDocuments({
        exam: { $in: myExamsIds },
        score: 0, // Assuming 0 or null means ungraded
      });
      // 3. Next Class (Simplified Logic)
      // Find timetables where Lecturer is Teaching Today
      const today = getTodayName();
      // Complex aggregation could go here, but let's do a simple find for now
      // this is a placeholder for the logic to find the specific period based on the current time
      const nextClass = " Pediatrics = 500 Level";
      const nextClassTime = "08:00 AM";

      stats = {
        myClassessCount,
        pendingGrading,
        nextClass,
        nextClassTime,
        recentActivities: formattedActivity,
      };
    } else if (user.role === "student") {
      // 1. Assignments/Exams Due
      const nextExam = await Exam.findOne({
        class: user.studentClass,
        dueDate: { $gte: new Date() },
      }).sort({ dueDate: 1 });

      const pendingAssignments = await Exam.countDocuments({
        class: user.studentClass,
        isActive: true,
        dueDate: { $gte: new Date() },
      });

      // 2. Attendance (Mock Data for now)
      const myAttendance = "98%";

      stats = {
        myAttendance,
        pendingAssignments,
        nextExam,
        nextExamDate: nextExam ? new Date(nextExam.dueDate).toLocaleDateString() : "",
        recentActivities: formattedActivity,
      };
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: `Server error: ${error}`,
    });
  }
};

// @desc  Get admin overview counts for the dashboard snapshot cards
// route  GET /api/dashboard/overview
export const getAdminOverview = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const [
      sessionsCount,
      semestersCount,
      classesCount,
      coursesCount,
      assessmentsCount,
      departmentsCount,
      unitsCount,
      postings,
      rotations,
      currentAcademicYear,
      institution,
    ] = await Promise.all([
      AcademicSession.countDocuments({ isCurrent: true }),
      Semester.countDocuments(),
      ClassModel.countDocuments(),
      Course.countDocuments(),
      Exam.countDocuments({ isActive: true }),
      Department.countDocuments(),
      Unit.countDocuments(),
      PostingAndRotation.find({}).lean(),
      ClinicalRotation.find({}).lean(),
      AcademicYear.findOne({ isCurrent: true }).lean(),
      Institution.findOne({}).lean(),
    ]);

    const activePostings = postings.filter((posting: any) => {
      const hasStart = posting.startDate;
      const hasEnd = posting.endDate;

      if (!hasStart && !hasEnd) return true;

      const start = hasStart ? new Date(posting.startDate) : null;
      const end = hasEnd ? new Date(posting.endDate) : null;

      if (start && end) {
        return now >= start && now <= end;
      }

      if (start) {
        return now >= start;
      }

      if (end) {
        return now <= end;
      }

      return true;
    }).length;

    const activeRotations = rotations.filter((rotation: any) => {
      if (rotation.isActive === false) {
        return false;
      }

      const hasStart = rotation.startDate;
      const hasEnd = rotation.endDate;

      if (!hasStart && !hasEnd) return true;

      const start = hasStart ? new Date(rotation.startDate) : null;
      const end = hasEnd ? new Date(rotation.endDate) : null;

      if (start && end) {
        return now >= start && now <= end;
      }

      if (start) {
        return now >= start;
      }

      if (end) {
        return now <= end;
      }

      return true;
    }).length;

    const teamCount = postings.reduce((total: number, posting: any) => {
      return total + (Array.isArray(posting.groups) ? posting.groups.length : 0);
    }, 0);

    const currentAcademicClasses = currentAcademicYear?._id
      ? await ClassModel.find({ academicYear: currentAcademicYear._id }).lean()
      : [];

    const academicClocks = currentAcademicYear?._id
      ? await AcademicClock.find({ academicYear: currentAcademicYear._id }).lean()
      : [];

    const academicClockByClassId = new Map(
      academicClocks.map((clock: any) => [String(clock.classId), clock])
    );

    const postingSummaries = currentAcademicClasses
      .filter((classDoc: any) => academicClockByClassId.has(String(classDoc._id)))
      .map((classDoc: any) => {
        const academicClock = academicClockByClassId.get(String(classDoc._id));
        const phaseLabel = academicClock?.clockPhase
          ? formatClockPhaseLabel(academicClock.clockPhase, academicClock.phaseConfig)
          : null;

        const hasSchedule = postings.some((posting: any) => {
          return Array.isArray(posting.groups) && posting.groups.some((group: any) => String(group.groupId) === String(classDoc._id));
        });

        return {
          className: classDoc.name,
          phaseLabel,
          hasSchedule,
        };
      });

    const rotationTeamSummaries = currentAcademicClasses.map((classDoc: any) => {
      const teamCountForClass = postings.reduce((total: number, posting: any) => {
        if (!Array.isArray(posting.groups)) return total;
        return total + posting.groups.filter((group: any) => String(group.groupId) === String(classDoc._id)).length;
      }, 0);

      return {
        className: classDoc.name,
        teamCount: teamCountForClass,
      };
    }).filter((summary) => summary.teamCount > 0);

    const activeRotationsForClasses = rotations.filter((rotation: any) => {
      if (rotation.isActive === false) {
        return false;
      }

      const hasStart = rotation.startDate;
      const hasEnd = rotation.endDate;

      if (!hasStart && !hasEnd) return true;

      const start = hasStart ? new Date(rotation.startDate) : null;
      const end = hasEnd ? new Date(rotation.endDate) : null;

      if (start && end) {
        return now >= start && now <= end;
      }

      if (start) {
        return now >= start;
      }

      if (end) {
        return now <= end;
      }

      return true;
    });

    const rotationSummaries = currentAcademicClasses.flatMap((classDoc: any) => {
      return activeRotationsForClasses
        .filter((rotation: any) => String(rotation.class) === String(classDoc._id))
        .map((rotation: any) => {
          const start = rotation.startDate ? new Date(rotation.startDate) : null;
          const end = rotation.endDate ? new Date(rotation.endDate) : null;
          const duration = start && end
            ? `${Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks`
            : "Open-ended";

          return {
            className: classDoc.name,
            name: rotation.name || "Clinical rotation",
            dateRange: start && end
              ? `${start.toLocaleDateString()} → ${end.toLocaleDateString()}`
              : "Dates pending",
            duration,
          };
        });
    });

    const activeSemester = institution?.academicSession
      ? await Semester.findOne({ academicSession: institution.academicSession, isActive: true })
          .sort({ order: 1 })
          .lean()
      : null;

    const isPostingCalendar = String(institution?.academicCalendarType ?? "")
      .toLowerCase()
      .includes("posting") || String(institution?.academicCalendarType ?? "")
      .toLowerCase()
      .includes("clinical");

    const classSummaries = currentAcademicYear?._id
      ? await Promise.all(
          (await ClassModel.find({ academicYear: currentAcademicYear._id }).lean()).map(async (classDoc: any) => {
            const [courseCount, assessmentCount, academicClock] = await Promise.all([
              Course.countDocuments({
                academicYear: currentAcademicYear._id,
                isActive: true,
                studentClasses: {
                  $elemMatch: { classID: classDoc._id },
                },
              }),
              Exam.countDocuments({ class: classDoc._id, isActive: true }),
              AcademicClock.findOne({ academicYear: currentAcademicYear._id, classId: classDoc._id }).lean(),
            ]);

            return {
              name: classDoc.name,
              courseCount,
              assessmentCount,
              phaseLabel: academicClock?.clockPhase
                ? formatClockPhaseLabel(academicClock.clockPhase, academicClock.phaseConfig)
                : null,
            };
          })
        )
      : [];

    const academicPayload = buildAcademicOverviewPayload({
      sessionsCount,
      semestersCount,
      classesCount,
      coursesCount,
      assessmentsCount,
      activeAcademicYearName: currentAcademicYear?.name ?? null,
      currentSemesterLabel: activeSemester?.name ?? null,
      isPostingCalendar,
      classSummaries,
    });

    const clinicalPayload = buildClinicalOverviewPayload({
      postingsCount: postingSummaries.length,
      departmentsCount,
      unitsCount,
      teamsCount: teamCount,
      rotationsCount: activeRotationsForClasses.length,
      postingSummaries,
      rotationTeamSummaries,
      rotationSummaries,
    });

    res.json({
      academic: academicPayload,
      clinical: clinicalPayload,
    });
  } catch (error) {
    res.status(500).json({
      message: `Server error: ${error}`,
    });
  }
};