import mongoose from "mongoose";
import Attendance from "../models/attendance";
import ClinicalAttendance from "../models/clinicalAttendance";

// Phase K — Central read accessor (D16). Lecture (LATIFAH) and clinical
// (KRYSTA) attendance keep their own stores; this module is the single
// place that reads from BOTH and normalizes the shape so every consumer
// (KPIs, records, dashboards, analytics) shows consistent data without any
// store migration. No component should hit the attendance collections
// directly — fetch through getAttendanceFor() instead.

export type AttendanceSource = "lecture" | "clinical";

export interface NormalizedAttendanceRecord {
  recordId: string;
  source: AttendanceSource;
  studentId: string;
  classId: string | null;
  academicYearId: string | null;
  date: string;
  status: string;
  displayStatus: "present" | "late" | "absent" | "excused" | "on-leave" | "pending";
  label: string;
  detail: string;
  sessionId: string | null;
  // Phase L (D13): true once the day-close job escalated the record to the
  // admin audit (lecture records only).
  escalatedToAdmin: boolean;
}

export interface AttendanceQuery {
  studentId?: string;
  classId?: string;
  startDate?: Date;
  endDate?: Date;
  scope?: "all" | "lecture" | "clinical";
  limit?: number;
}

// D12: "unverified" displays as pending in every consumer until it
// resolves; raw "pending" (clinical pre-check-in) also displays as
// pending. Anything unknown falls back to pending rather than guessing.
export const toDisplayStatus = (rawStatus?: string): NormalizedAttendanceRecord["displayStatus"] => {
  const status = String(rawStatus ?? "").toLowerCase();
  if (
    status === "present" ||
    status === "late" ||
    status === "absent" ||
    status === "excused" ||
    status === "on-leave"
  ) {
    return status as NormalizedAttendanceRecord["displayStatus"];
  }
  return "pending";
};

export const normalizeLectureRecord = (record: any): NormalizedAttendanceRecord => {
  const course = record?.course && typeof record.course === "object" ? record.course : null;
  const subject = record?.subject && typeof record.subject === "object" ? record.subject : null;
  const labelParts = [course?.name || course?.code, subject?.name || subject?.code].filter(Boolean);
  return {
    recordId: String(record?._id ?? ""),
    source: "lecture",
    studentId: String(record?.student?._id ?? record?.student ?? ""),
    classId: record?.class ? String(record?.class?._id ?? record?.class) : null,
    academicYearId: record?.academicYear ? String(record?.academicYear?._id ?? record?.academicYear) : null,
    date: new Date(record?.date ?? 0).toISOString(),
    status: String(record?.status ?? ""),
    displayStatus: toDisplayStatus(record?.status),
    label: labelParts.join(" - ") || "Lecture",
    detail: String(record?.absenceReason ?? ""),
    sessionId: record?.session ? String(record?.session?._id ?? record?.session) : null,
    escalatedToAdmin: Boolean(record?.escalatedToAdmin),
  };
};

export const normalizeClinicalEntry = (session: any, attendee: any): NormalizedAttendanceRecord => {
  const groupLabel = session?.supervisorGroupLabel || session?.department || session?.unitLabel || "";
  const title = session?.title || session?.activityType || "Clinical activity";
  return {
    recordId: String(attendee?._id ?? ""),
    source: "clinical",
    studentId: String(attendee?.student?._id ?? attendee?.student ?? ""),
    classId: session?.classId ? String(session?.classId?._id ?? session?.classId) : null,
    academicYearId: session?.academicYear ? String(session?.academicYear?._id ?? session?.academicYear) : null,
    date: new Date(session?.date ?? session?.startTime ?? 0).toISOString(),
    status: String(attendee?.status ?? ""),
    displayStatus: toDisplayStatus(attendee?.status),
    label: String(title),
    detail: [groupLabel, attendee?.notes].filter(Boolean).join(" - "),
    sessionId: session?._id ? String(session._id) : null,
    escalatedToAdmin: false,
  };
};

// D12 KPI math: present + late count in the rate; pending is its own state
// until it resolves; excused/on-leave do not count against the rate.
export const summarizeAttendance = (records: NormalizedAttendanceRecord[]) => {
  const counts = {
    total: records.length,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    onLeave: 0,
    pending: 0,
  };
  for (const record of records) {
    if (record.displayStatus === "present") counts.present += 1;
    else if (record.displayStatus === "late") counts.late += 1;
    else if (record.displayStatus === "absent") counts.absent += 1;
    else if (record.displayStatus === "excused") counts.excused += 1;
    else if (record.displayStatus === "on-leave") counts.onLeave += 1;
    else counts.pending += 1;
  }
  const resolved = counts.total - counts.pending;
  const counted = counts.present + counts.late;
  return {
    ...counts,
    resolved,
    attendanceRate: resolved > 0 ? Math.round((counted / resolved) * 100) : 0,
  };
};

const isValidId = (value?: string) => Boolean(value && mongoose.Types.ObjectId.isValid(value));

// Central read accessor (D16): reads from whichever store holds the data
// (LATIFAH lectures / KRYSTA clinical) and returns one normalized shape.
export const getAttendanceFor = async (query: AttendanceQuery) => {
  const scope = query.scope ?? "all";
  const records: NormalizedAttendanceRecord[] = [];
  const dateFilter: any = {};
  if (query.startDate || query.endDate) {
    dateFilter.$gte = query.startDate ?? new Date(0);
    dateFilter.$lte = query.endDate ?? new Date("2100-01-01");
  }

  if (scope === "all" || scope === "lecture") {
    const lectureFilter: any = {};
    if (query.studentId && isValidId(query.studentId)) {
      lectureFilter.student = new mongoose.Types.ObjectId(query.studentId);
    }
    if (query.classId && isValidId(query.classId)) {
      lectureFilter.class = new mongoose.Types.ObjectId(query.classId);
    }
    if (query.startDate || query.endDate) lectureFilter.date = dateFilter;
    const lectureRecords = await Attendance.find(lectureFilter)
      .populate("course", "name code")
      .populate("subject", "name code")
      .sort({ date: -1 })
      .limit(query.limit ?? 500)
      .lean<any[]>();
    for (const record of lectureRecords) {
      records.push(normalizeLectureRecord(record));
    }
  }

  if (scope === "all" || scope === "clinical") {
    const clinicalFilter: any = {};
    if (query.classId && isValidId(query.classId)) {
      clinicalFilter.classId = new mongoose.Types.ObjectId(query.classId);
    }
    if (query.studentId && isValidId(query.studentId)) {
      clinicalFilter.$or = [
        { expectedStudents: new mongoose.Types.ObjectId(query.studentId) },
        { "attendees.student": new mongoose.Types.ObjectId(query.studentId) },
      ];
    }
    if (query.startDate || query.endDate) clinicalFilter.date = dateFilter;
    const clinicalSessions = await ClinicalAttendance.find(clinicalFilter)
      .sort({ date: -1 })
      .limit(query.limit ?? 500)
      .lean<any[]>();
    for (const session of clinicalSessions) {
      const attendees = Array.isArray(session.attendees) ? session.attendees : [];
      const relevant = query.studentId
        ? attendees.filter(
            (attendee: any) =>
              String(attendee?.student?._id ?? attendee?.student) === String(query.studentId),
          )
        : attendees;
      for (const attendee of relevant) {
        records.push(normalizeClinicalEntry(session, attendee));
      }
    }
  }

  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { records, summary: summarizeAttendance(records) };
};
