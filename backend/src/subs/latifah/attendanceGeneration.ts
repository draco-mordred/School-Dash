import mongoose from "mongoose";
import Attendance from "../../models/attendance";
import Course from "../../models/courses";
import Class from "../../models/classes";
import { logActivity } from "../../utils/activitieslog";
import { createNotificationAndEmitEvent } from "../tinasha/notificationService";
import { emitSystemEvent } from "../../events";

// Shared attendance generation core.
// Used by BOTH the direct HTTP path (attendanceService.generateAttendanceForClassSession)
// and the Inngest "attendance/generate" function, so the two can never drift:
// one weekend guard, one duplicate guard, one subject resolver, one event emit,
// one lecturer notification.

export class AttendanceGenerationError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AttendanceGenerationError";
    this.status = status;
    this.code = code;
  }
}

const DAY_MAP: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// Pure input validation — unit-tested in backend/tests/attendanceGeneration.spec.ts
export const validateAttendanceGenerationInput = (input: {
  courseId?: string;
  classId?: string;
  academicYearId?: string;
  date?: string;
  subjectId?: string;
}) => {
  const { courseId, classId, academicYearId, date, subjectId } = input;
  if (!courseId || !classId || !academicYearId || !date || !subjectId) {
    throw new AttendanceGenerationError(
      400,
      "MISSING_FIELDS",
      "courseId, classId, academicYearId, subjectId, and date are required.",
    );
  }
  const dateObj = new Date(date);
  if (Number.isNaN(dateObj.getTime())) {
    throw new AttendanceGenerationError(400, "INVALID_DATE", "Invalid date format.");
  }
  const dayName = DAY_MAP[dateObj.getDay()];
  if (dayName === "Saturday" || dayName === "Sunday") {
    throw new AttendanceGenerationError(
      400,
      "WEEKEND",
      "Attendance cannot be generated on weekends.",
    );
  }
  return { dateObj, dayName };
};

export const generateSessionRecords = async (input: {
  courseId: string;
  classId: string;
  academicYearId: string;
  date: string;
  subjectId: string;
  requesterId?: string;
}) => {
  const { courseId, classId, academicYearId, subjectId, requesterId } = input;
  const { dateObj, dayName } = validateAttendanceGenerationInput(input);

  const course = await Course.findById(courseId).populate({
    path: "subjects.lecturer",
    select: "_id name email departmentRole",
  });
  if (!course) {
    throw new AttendanceGenerationError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const matchingSubject = (course.subjects ?? []).find((subject: any) => {
    return (
      String(subject._id) === String(subjectId) ||
      String(subject.subjectUID) === String(subjectId) ||
      String(subject.subjectID) === String(subjectId) ||
      String(subject.name) === String(subjectId) ||
      String(subject.code ?? "") === String(subjectId)
    );
  });
  if (!matchingSubject) {
    throw new AttendanceGenerationError(
      404,
      "SUBJECT_NOT_FOUND",
      "Subject not found in selected course.",
    );
  }

  const classDoc = await Class.findById(classId).populate("students", "_id");
  if (!classDoc) {
    throw new AttendanceGenerationError(404, "CLASS_NOT_FOUND", "Class not found.");
  }

  const subjectLecturerId = Array.isArray(matchingSubject.lecturer)
    ? matchingSubject.lecturer[0]?._id ?? matchingSubject.lecturer[0]
    : null;
  const lecturer = subjectLecturerId ?? requesterId ?? null;

  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const existing = await Attendance.findOne({
    class: classId,
    course: courseId,
    subject: matchingSubject._id,
    date: { $gte: startOfDay, $lt: endOfDay },
  });
  if (existing) {
    throw new AttendanceGenerationError(
      409,
      "DUPLICATE_SESSION",
      "Attendance records already exist for this class, course, subject, and date.",
    );
  }

  const studentIds = (classDoc.students ?? []).map((student: any) => student._id ?? student);
  const attendanceRecords = await Promise.all(
    studentIds.map(async (studentId: any) => {
      const record = await Attendance.create({
        student: studentId,
        lecturer,
        course: courseId,
        subject: matchingSubject._id,
        class: classId,
        academicYear: academicYearId,
        date: dateObj,
        dayOfWeek: dayName,
        status: "present",
      });
      return record;
    }),
  );

  await logActivity({
    userId: lecturer ?? requesterId,
    action: "Generated attendance for class session",
    details:
      "Generated attendance for course ID: " +
      courseId +
      ", subject ID: " +
      String(matchingSubject._id) +
      ", class ID: " +
      classId +
      " on " +
      new Date(input.date).toDateString(),
  });

  if (lecturer) {
    try {
      await createNotificationAndEmitEvent({
        userId: typeof lecturer === "string" ? new mongoose.Types.ObjectId(lecturer) : lecturer,
        role: "teacher",
        title: "Attendance session prepared",
        message:
          "Attendance for " +
          (matchingSubject.name ?? matchingSubject.code ?? "the selected subject") +
          " on " +
          dateObj.toDateString() +
          " for " +
          classDoc.name +
          " has been generated and is ready for review.",
        type: "attendance",
        link: "/attendance",
        actorRole: "admin",
      });
    } catch (err) {
      console.warn("Failed to send attendance notification to lecturer", err);
    }
  }

  emitSystemEvent("attendance.session.generated", {
    classId,
    courseId,
    subjectId: String(matchingSubject._id),
    lecturer: String(lecturer ?? ""),
    date: dateObj.toISOString(),
    studentCount: studentIds.length,
  });

  return {
    message: "Attendance generated for class session",
    dayOfWeek: dayName,
    className: classDoc.name,
    studentCount: studentIds.length,
    attendanceRecords,
  };
};
