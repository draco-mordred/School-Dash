export interface AcademicAttendanceRecordLike {
  _id?: string;
  status?: string | null;
  excuseRequestStatus?: string | null;
  approvedBy?: string | { _id?: string } | null;
  excuseReason?: string | null;
  hodApproval?: "approved" | "not-approved" | null;
  excuseReviewNote?: string | null;
  course?: {
    _id?: string;
    name?: string;
    code?: string;
    subjects?: Array<{ _id?: string; name?: string; code?: string; subjectID?: string; subjectUID?: string }>;
  } | null;
  subject?: {
    _id?: string;
    name?: string;
    code?: string;
    subjectID?: string;
    subjectUID?: string;
  } | string | null;
  lecturer?: {
    _id?: string;
    name?: string;
    email?: string;
  } | string | null;
  date?: string | Date | null;
}

export interface AcademicCourseCatalogLike {
  _id?: string;
  name?: string;
  code?: string;
  subjects?: Array<{
    _id?: string;
    name?: string;
    code?: string;
    subjectID?: string;
    subjectUID?: string;
  }>;
}

export interface SubjectAttendanceSummary {
  subjectId: string;
  subjectName: string;
  totalSessions: number;
  attendedSessions: number;
  attendancePercent: number;
  lastAttendanceDate?: string | null;
  lecturerNames?: string[];
}

export interface CourseAttendanceSummary {
  courseId: string;
  courseName: string;
  courseCode?: string;
  totalSessions: number;
  attendedSessions: number;
  attendancePercent: number;
  subjectCount: number;
  subjects: SubjectAttendanceSummary[];
  requiresAttention: boolean;
}

export interface AcademicAttendanceSummary {
  courses: CourseAttendanceSummary[];
  overallPercent: number;
  totalSessions: number;
  attendedSessions: number;
  threshold: number;
  requiresAttention: boolean;
}

export interface AcademicAttendanceAggregate {
  courseId: string;
  subjectId?: string | null;
  courseName: string;
  courseCode?: string;
  subjectName: string;
  totalSessions: number;
  attendedSessions: number;
  lastAttendanceDate?: string | null;
}

const ATTENDED_STATUSES = new Set(["present", "late", "approved_absent"]);

const resolveCourseKey = (record: AcademicAttendanceRecordLike) => {
  const courseId = record.course?._id;
  if (courseId) return String(courseId);
  return `course:${record.course?.name ?? "unassigned"}`;
};

const resolveSubjectKey = (record: AcademicAttendanceRecordLike) => {
  if (!record.subject) return "subject:unassigned";
  if (typeof record.subject === "string") return `subject:${record.subject}`;
  const subjectId = record.subject._id ?? record.subject.subjectID ?? record.subject.subjectUID ?? record.subject.code;
  if (subjectId) return `subject:${subjectId}`;
  return `subject:${record.subject.name ?? "unassigned"}`;
};

const resolveSubjectName = (record: AcademicAttendanceRecordLike) => {
  if (!record.subject) return "Unassigned subject";
  if (typeof record.subject === "string") {
    const subjectMatch = record.course?.subjects?.find((subject) => {
      const subjectId = subject._id ?? subject.subjectID ?? subject.subjectUID ?? subject.code;
      return subjectId && String(subjectId) === String(record.subject);
    });
    return subjectMatch?.name || String(record.subject);
  }

  const subjectMatch = record.course?.subjects?.find((subject) => {
    const subjectId = subject._id ?? subject.subjectID ?? subject.subjectUID ?? subject.code;
    return subjectId && String(subjectId) === String(record.subject._id ?? "");
  });

  return subjectMatch?.name || record.subject.name || record.subject.code || "Unassigned subject";
};

const resolveLecturerName = (record: AcademicAttendanceRecordLike) => {
  if (!record.lecturer) return null;
  if (typeof record.lecturer === "string") return record.lecturer;
  return record.lecturer.name || record.lecturer.email || null;
};

export const buildAcademicAttendanceSummary = (
  records: AcademicAttendanceRecordLike[],
  threshold = 75,
  courseCatalog: AcademicCourseCatalogLike[] = [],
  aggregates?: AcademicAttendanceAggregate[],
): AcademicAttendanceSummary => {
  const courseMap = new Map<string, CourseAttendanceSummary>();

  const seedCourseFromCatalog = (course: AcademicCourseCatalogLike) => {
    const courseKey = String(course._id ?? course.name ?? "unassigned");
    const courseName = course.name ?? "Unassigned course";
    const courseCode = course.code;

    let existingCourse = courseMap.get(courseKey);
    if (!existingCourse) {
      existingCourse = {
        courseId: courseKey,
        courseName,
        courseCode,
        totalSessions: 0,
        attendedSessions: 0,
        attendancePercent: 0,
        subjectCount: 0,
        subjects: [],
        requiresAttention: false,
      };
      courseMap.set(courseKey, existingCourse);
    }

    (course.subjects ?? []).forEach((subject) => {
      const subjectKey = String(subject._id ?? subject.subjectID ?? subject.subjectUID ?? subject.code ?? `${courseKey}:${subject.name ?? "subject"}`);
      const subjectName = subject.name ?? subject.code ?? "Unassigned subject";
      let existingSubject = existingCourse!.subjects.find((entry) => entry.subjectId === subjectKey);
      if (!existingSubject) {
        existingSubject = {
          subjectId: subjectKey,
          subjectName,
          totalSessions: 0,
          attendedSessions: 0,
          attendancePercent: 0,
          lastAttendanceDate: null,
          lecturerNames: [],
        };
        existingCourse!.subjects.push(existingSubject);
      }
    });

    existingCourse.subjectCount = existingCourse.subjects.length;
    return existingCourse;
  };

  courseCatalog.forEach(seedCourseFromCatalog);

  if (aggregates) {
    aggregates.forEach((aggregate) => {
      const courseKey = String(aggregate.courseId);
      let course = courseMap.get(courseKey);
      if (!course) {
        course = {
          courseId: courseKey,
          courseName: aggregate.courseName,
          courseCode: aggregate.courseCode,
          totalSessions: 0,
          attendedSessions: 0,
          attendancePercent: 0,
          subjectCount: 0,
          subjects: [],
          requiresAttention: false,
        };
        courseMap.set(courseKey, course);
      }

      const subjectId = aggregate.subjectId ? String(aggregate.subjectId) : "subject:unassigned";
      let subject = course.subjects.find((entry) => entry.subjectId === subjectId);
      if (!subject) {
        subject = {
          subjectId,
          subjectName: aggregate.subjectName,
          totalSessions: 0,
          attendedSessions: 0,
          attendancePercent: 0,
          lastAttendanceDate: null,
          lecturerNames: [],
        };
        course.subjects.push(subject);
      }
      subject.totalSessions = aggregate.totalSessions;
      subject.attendedSessions = aggregate.attendedSessions;
      subject.lastAttendanceDate = aggregate.lastAttendanceDate ?? null;
    });

    courseMap.forEach((course) => {
      course.subjectCount = course.subjects.length;
      course.totalSessions = course.subjects.reduce((sum, subject) => sum + subject.totalSessions, 0);
      course.attendedSessions = course.subjects.reduce((sum, subject) => sum + subject.attendedSessions, 0);
    });
  } else {
    records.forEach((record) => {
      const courseKey = resolveCourseKey(record);
      const courseName = record.course?.name ?? "Unassigned course";
      const courseCode = record.course?.code;
      const subjectKey = resolveSubjectKey(record);
      const subjectName = resolveSubjectName(record);

      let course = courseMap.get(courseKey);
      if (!course) {
        course = {
          courseId: courseKey,
          courseName,
          courseCode,
          totalSessions: 0,
          attendedSessions: 0,
          attendancePercent: 0,
          subjectCount: 0,
          subjects: [],
          requiresAttention: false,
        };
        courseMap.set(courseKey, course);
      }

      let subject = course.subjects.find((entry) => entry.subjectId === subjectKey);
      if (!subject) {
        subject = {
          subjectId: subjectKey,
          subjectName,
          totalSessions: 0,
          attendedSessions: 0,
          attendancePercent: 0,
          lastAttendanceDate: null,
          lecturerNames: [],
        };
        course.subjects.push(subject);
      }

      subject.totalSessions += 1;

      const lecturerName = resolveLecturerName(record);
      if (lecturerName && !subject.lecturerNames?.includes(lecturerName)) {
        subject.lecturerNames = [...(subject.lecturerNames ?? []), lecturerName];
      }

      const recordDate = record.date ? new Date(record.date) : null;
      if (recordDate && recordDate.getTime()) {
        const previousDate = subject.lastAttendanceDate ? new Date(subject.lastAttendanceDate) : null;
        if (!previousDate || recordDate.getTime() > previousDate.getTime()) {
          subject.lastAttendanceDate = recordDate.toISOString();
        }
      }
      course.totalSessions += 1;

      const status = String(record.status ?? "").trim().toLowerCase();
      const isAttended = ATTENDED_STATUSES.has(status) ||
        (status === "excused" && (
          record.excuseRequestStatus === "approved" ||
          Boolean(record.approvedBy) ||
          record.hodApproval === "approved"
        ));
      if (isAttended) {
        subject.attendedSessions += 1;
        course.attendedSessions += 1;
      }

      course.subjectCount = course.subjects.length;
    });
  }

  const courses = Array.from(courseMap.values()).map((course) => {
    const subjects = course.subjects.map((subject) => {
      const attendancePercent = subject.totalSessions > 0
        ? Math.round((subject.attendedSessions / subject.totalSessions) * 100)
        : 0;
      return { ...subject, attendancePercent };
    });

    const subjectCount = subjects.length;
    const attendancePercent = course.totalSessions > 0
      ? Math.round((course.attendedSessions / course.totalSessions) * 100)
      : 0;

    return {
      ...course,
      subjectCount,
      subjects,
      attendancePercent,
      requiresAttention: attendancePercent < threshold,
    };
  });

  const totalSessions = courses.reduce((sum, course) => sum + course.totalSessions, 0);
  const attendedSessions = courses.reduce((sum, course) => sum + course.attendedSessions, 0);
  const overallPercent = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

  return {
    courses,
    overallPercent,
    totalSessions,
    attendedSessions,
    threshold,
    requiresAttention: overallPercent < threshold,
  };
};

export const sortCourseSummaries = (courses: CourseAttendanceSummary[], order: "asc" | "desc") => {
  const sorted = [...courses].sort((left, right) => {
    if (left.attendancePercent !== right.attendancePercent) {
      return left.attendancePercent - right.attendancePercent;
    }
    return left.courseName.localeCompare(right.courseName);
  });

  return order === "asc" ? sorted : sorted.reverse();
};

export const sortSubjectSummaries = (subjects: SubjectAttendanceSummary[], order: "asc" | "desc") => {
  const sorted = [...subjects].sort((left, right) => {
    if (left.attendancePercent !== right.attendancePercent) {
      return left.attendancePercent - right.attendancePercent;
    }
    return left.subjectName.localeCompare(right.subjectName);
  });

  return order === "asc" ? sorted : sorted.reverse();
};
