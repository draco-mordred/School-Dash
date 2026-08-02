import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, BookOpen, Stethoscope, CalendarDays, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import type { AcademicAttendanceRecordLike } from "@/lib/studentAcademicAttendance";

interface ClinicalAttendanceSessionLike {
  _id: string;
  title?: string;
  activityType?: string;
  date?: string | Date;
  startTime?: string | Date;
  endTime?: string | Date;
  unit?: { _id?: string; name?: string } | null;
  department?: string;
  supervisor?: { _id?: string; name?: string; email?: string } | string | null;
  attendees?: Array<{ student?: { _id?: string } | string; status?: string; notes?: string }>;
  status?: string;
}

interface AttendanceHistoryItem {
  id: string;
  date: string;
  type: "Lecture" | "Clinical";
  groupName: string;
  subjectLabel: string;
  status: string;
  instructor: string;
  location: string;
  rawData: AcademicAttendanceRecordLike | ClinicalAttendanceSessionLike;
}

const ATTENDED_STATUSES = new Set(["present", "late", "excused", "approved_absent"]);

const formatAttendanceDate = (value?: string | Date | null) => {
  if (!value) return "Unknown";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return format(date, "MMM d, yyyy");
};

const formatAttendanceTime = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "p");
};

const getStatusLabel = (status?: string) => {
  if (!status) return "Unknown";
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "present") return "Present";
  if (normalized === "late") return "Late";
  if (normalized === "excused" || normalized === "approved_absent") return "Excused";
  if (normalized === "absent") return "Absent";
  if (normalized === "pending") return "Pending";
  return status;
};

const getStatusVariant = (status?: string) => {
  const normalized = status ? String(status).trim().toLowerCase() : "unknown";
  switch (normalized) {
    case "present":
      return "bg-emerald-100 text-emerald-800";
    case "late":
      return "bg-amber-100 text-amber-800";
    case "excused":
    case "approved_absent":
      return "bg-sky-100 text-sky-800";
    case "absent":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const resolveLecturerName = (record: AcademicAttendanceRecordLike) => {
  if (!record.lecturer) return "Unknown";
  if (typeof record.lecturer === "string") return record.lecturer;
  return record.lecturer.name || record.lecturer.email || "Unknown";
};

export default function StudentAttendanceHistory() {
  const { user } = useAuth();
  const [academicRecords, setAcademicRecords] = useState<AcademicAttendanceRecordLike[]>([]);
  const [clinicalSessions, setClinicalSessions] = useState<ClinicalAttendanceSessionLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"all" | "lectures" | "clinical">("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [academicRes, clinicalRes] = await Promise.all([
          api.get("/attendance/me").catch(() => ({ data: { records: [] } })),
          api.get(`/clinical-attendance/student-record?studentId=${user._id}`).catch(() => ({ data: { data: { sessions: [] } } })),
        ]);

        const academicData = Array.isArray(academicRes.data?.records) ? academicRes.data.records : [];
        const clinicalData = Array.isArray(clinicalRes.data?.data?.sessions) ? clinicalRes.data.data.sessions : [];

        setAcademicRecords(academicData);
        setClinicalSessions(clinicalData);
      } catch (err) {
        console.error("Unable to load attendance history", err);
        setError("Unable to load attendance history right now.");
      } finally {
        setLoading(false);
      }
    };

    void fetchAttendance();
  }, [user?._id]);

  const historyItems = useMemo<AttendanceHistoryItem[]>(() => {
    const academicItems = academicRecords.map((record) => {
      const date = record.date ? String(record.date) : "";
      const courseName = record.course?.name ?? "Unassigned course";
      const subjectName = typeof record.subject === "string"
        ? record.subject
        : record.subject?.name ?? "Unassigned subject";
      const instructor = resolveLecturerName(record);
      let location = "Academic";
      if (record.course?.code) location = record.course.code;

      return {
        id: record._id ?? `${date}-${courseName}-${subjectName}`,
        date,
        type: "Lecture",
        groupName: courseName,
        subjectLabel: subjectName,
        status: getStatusLabel(record.status),
        instructor,
        location,
        rawData: record,
      };
    });

    const clinicalItems = clinicalSessions.map((session) => {
      const date = session.date ? String(session.date) : "";
      const groupName = session.unit?.name || session.department || session.title || "Clinical";
      const instructor = typeof session.supervisor === "string"
        ? session.supervisor
        : session.supervisor?.name || "Unknown";
      const studentRecord = session.attendees?.find((attendee) => {
        const studentId = typeof attendee.student === "string"
          ? attendee.student
          : attendee.student?._id;
        return studentId && String(studentId) === String(user?._id);
      });
      const status = getStatusLabel(studentRecord?.status ?? session.status);
      const activityLabel = session.title || session.activityType || "Clinical activity";
      const location = session.unit?.name || session.department || "Clinical";

      return {
        id: session._id ?? `${date}-${groupName}-${activityLabel}`,
        date,
        type: "Clinical",
        groupName,
        subjectLabel: activityLabel,
        status,
        instructor,
        location,
        rawData: session,
      };
    });

    return [...academicItems, ...clinicalItems].sort((left, right) => {
      const leftDate = new Date(left.date).getTime() || 0;
      const rightDate = new Date(right.date).getTime() || 0;
      return rightDate - leftDate;
    });
  }, [academicRecords, clinicalSessions, user?._id]);

  const attendanceStats = useMemo(() => {
    const lectureTotal = academicRecords.length;
    const lectureAttended = academicRecords.reduce((count, record) => {
      return count + (ATTENDED_STATUSES.has(String(record.status ?? "").trim().toLowerCase()) ? 1 : 0);
    }, 0);

    const clinicalTotal = clinicalSessions.length;
    const clinicalAttended = clinicalSessions.reduce((count, session) => {
      const studentRecord = session.attendees?.find((attendee) => {
        const studentId = typeof attendee.student === "string"
          ? attendee.student
          : attendee.student?._id;
        return studentId && String(studentId) === String(user?._id);
      });
      const status = String(studentRecord?.status ?? session.status ?? "").trim().toLowerCase();
      return count + (ATTENDED_STATUSES.has(status) ? 1 : 0);
    }, 0);

    const totalRecords = lectureTotal + clinicalTotal;
    const totalAttended = lectureAttended + clinicalAttended;
    const missedRecords = totalRecords - totalAttended;
    const overallPercent = totalRecords > 0 ? Math.round((totalAttended / totalRecords) * 100) : 0;

    return {
      totalRecords,
      lectureTotal,
      lectureAttended,
      clinicalTotal,
      clinicalAttended,
      totalAttended,
      overallPercent,
      missedRecords,
    };
  }, [academicRecords, clinicalSessions, user?._id]);

  const groupSummaries = useMemo(() => {
    const groups = new Map<string, {
      groupName: string;
      lectureTotal: number;
      lectureAttended: number;
      clinicalTotal: number;
      clinicalAttended: number;
      missedCount: number;
    }>();

    academicRecords.forEach((record) => {
      const courseName = record.course?.name ?? "Unassigned course";
      const key = courseName;
      const existing = groups.get(key) ?? {
        groupName: courseName,
        lectureTotal: 0,
        lectureAttended: 0,
        clinicalTotal: 0,
        clinicalAttended: 0,
        missedCount: 0,
      };

      existing.lectureTotal += 1;
      const attended = ATTENDED_STATUSES.has(String(record.status ?? "").trim().toLowerCase());
      if (attended) {
        existing.lectureAttended += 1;
      } else {
        existing.missedCount += 1;
      }

      groups.set(key, existing);
    });

    clinicalSessions.forEach((session) => {
      const groupName = session.unit?.name || session.department || session.title || "Clinical";
      const key = groupName;
      const existing = groups.get(key) ?? {
        groupName,
        lectureTotal: 0,
        lectureAttended: 0,
        clinicalTotal: 0,
        clinicalAttended: 0,
        missedCount: 0,
      };

      existing.clinicalTotal += 1;
      const studentRecord = session.attendees?.find((attendee) => {
        const studentId = typeof attendee.student === "string"
          ? attendee.student
          : attendee.student?._id;
        return studentId && String(studentId) === String(user?._id);
      });
      const status = String(studentRecord?.status ?? session.status ?? "").trim().toLowerCase();
      const attended = ATTENDED_STATUSES.has(status);
      if (attended) {
        existing.clinicalAttended += 1;
      } else {
        existing.missedCount += 1;
      }

      groups.set(key, existing);
    });

    return Array.from(groups.values()).sort((a, b) => b.lectureTotal + b.clinicalTotal - (a.lectureTotal + a.clinicalTotal));
  }, [academicRecords, clinicalSessions, user?._id]);

  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    historyItems.forEach((item) => groups.add(item.groupName));
    return ["all", ...Array.from(groups).sort()];
  }, [historyItems]);

  const filteredHistoryItems = useMemo(() => {
    return historyItems.filter((item) => {
      const typeMatch = selectedType === "all" || (selectedType === "lectures" && item.type === "Lecture") || (selectedType === "clinical" && item.type === "Clinical");
      const groupMatch = selectedGroup === "all" || item.groupName === selectedGroup;
      return typeMatch && groupMatch;
    });
  }, [historyItems, selectedType, selectedGroup]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Attendance History</h1>
            <p className="text-sm text-muted-foreground mt-1">Review your lecture and clinical attendance by course and department.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total records</p>
              <p className="mt-2 text-2xl font-semibold">{attendanceStats.totalRecords}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Lecture attendance</p>
              <p className="mt-2 text-2xl font-semibold">{attendanceStats.lectureAttended} / {attendanceStats.lectureTotal}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Clinical attendance</p>
              <p className="mt-2 text-2xl font-semibold">{attendanceStats.clinicalAttended} / {attendanceStats.clinicalTotal}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Overall attendance</p>
              <p className="mt-2 text-2xl font-semibold">{attendanceStats.overallPercent}%</p>
              <p className="text-xs text-muted-foreground mt-1">Missed {attendanceStats.missedRecords}</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine the history list by type or course/department.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">Attendance type</p>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as "all" | "lectures" | "clinical") }>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All attendance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="lectures">Lecture</SelectItem>
                <SelectItem value="clinical">Clinical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">Course / Department</p>
            <Select value={selectedGroup} onValueChange={(value) => setSelectedGroup(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((group) => (
                  <SelectItem key={group} value={group}>{group === "all" ? "All groups" : group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {groupSummaries.map((group) => {
          const groupTotal = group.lectureTotal + group.clinicalTotal;
          const groupAttended = group.lectureAttended + group.clinicalAttended;
          const overallPercent = groupTotal > 0 ? Math.round((groupAttended / groupTotal) * 100) : 0;

          return (
            <Card key={group.groupName} className="overflow-hidden">
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">{group.groupName}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">{groupTotal} records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Lecture</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{group.lectureAttended} / {group.lectureTotal}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Clinical</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{group.clinicalAttended} / {group.clinicalTotal}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Overall</span>
                    <span>{overallPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${overallPercent}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Missed</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{group.missedCount}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance history</CardTitle>
          <CardDescription>Showing {filteredHistoryItems.length} record{filteredHistoryItems.length === 1 ? "" : "s"}.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading attendance history…</div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : filteredHistoryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records match your filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Course / Dept</TableHead>
                  <TableHead>Subject / Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Instructor / Supervisor</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatAttendanceDate(item.date)}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.groupName}</TableCell>
                    <TableCell>{item.subjectLabel}</TableCell>
                    <TableCell>
                      <Badge className={getStatusVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>{item.instructor}</TableCell>
                    <TableCell>{item.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
