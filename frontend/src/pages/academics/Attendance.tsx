import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Class, courses } from "@/types";
import { useNavigate } from "react-router-dom";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import Modal from "@/components/global/Modal";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  BarChart3,
  RotateCcw,
  Plus,
  Save,
  FileText,
  AlertTriangle,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AttendanceStat = {
  _id: AttendanceStatus;
  count: number;
};

type SessionRecord = {
  _id: string;
  status: AttendanceStatus;
  date: string | Date;
  dayOfWeek?: string;
  student?: { _id: string; name: string; email?: string; idNumber?: string };
  lecturer?: { _id: string; name: string; email?: string };
  course?: { _id: string; name: string; code?: string };
  class?: { _id: string; name: string };
  academicYear?: { _id: string; name: string };
  approvedBy?: { _id: string; name: string; email?: string } | null;
  lecturerApproval?: "approved" | "not-approved" | null;
  lecturerApprovalDate?: Date | null;
  hodApproval?: "approved" | "not-approved" | null;
  hodApprovalDate?: Date | null;
};

type AttendanceRecord = {
  _id: string;
  status: AttendanceStatus;
  date: string | Date;
  dayOfWeek?: string;
  class?: { _id: string; name: string } | string;
  subject?: { _id: string; name: string; code?: string } | string;
  student?: { _id: string; name: string; email?: string; idNumber?: string };
  lecturer?: { _id: string; name: string; email?: string };
  approvedBy?: { _id: string; name: string; email?: string } | null;
};

type SubjectAttendanceSummaryRow = {
  _id: string;
  subject?: Array<{ name: string; code?: string }>;
  present: number;
  absent: number;
  late: number;
  excused: number;
};

type ChartRow =
  | { kind: "status"; label: string; value: number }
  | {
      kind: "subject";
      key: string;
      label: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
    };

type WeeklyCourseRow = {
  courseId: string;
  courseName: string;
  courseCode?: string;
  dayOfWeek: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
};

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "bg-green-500" },
  { value: "absent", label: "Absent", color: "bg-red-500" },
  { value: "late", label: "Late", color: "bg-yellow-500" },
  { value: "excused", label: "Excused", color: "bg-blue-500" },
];

export default function Attendance() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const isTeacherOrAdmin = user?.role === "admin" || user?.role === "teacher";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [subjectSummary, setSubjectSummary] = useState<SubjectAttendanceSummaryRow[]>([]);
  const [chartMode, setChartMode] = useState<"byStatus" | "bySubject">("bySubject");
  const [allLists, setAllLists] = useState<SessionRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyCourseRow[]>([]);
  const [classAttendanceData, setClassAttendanceData] = useState<any[]>([]);

  // Deduplicated latest records (one per course+lecturer pair)
  const latestRecordsDeduplicated = useMemo(() => {
    const seen = new Set<string>();
    return records.filter((r) => {
      const courseId = typeof r.course === "object" ? r.course?._id : r.course;
      const lecturerId = typeof r.lecturer === "object" ? r.lecturer?._id : r.lecturer;
      const key = `${courseId ?? ""}-${lecturerId ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  }, [records]);

  // Session management state
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<{ _id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [lecturerApproval, setLecturerApproval] = useState<"approved" | "not-approved" | "">("");
  const [hodApproval, setHodApproval] = useState<"approved" | "not-approved" | "">("");
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNoTimetableModal, setShowNoTimetableModal] = useState(false);
  const [sessionLecturerApproval, setSessionLecturerApproval] = useState<"approved" | "not-approved" | null>(null);
  const [sessionHodApproval, setSessionHodApproval] = useState<"approved" | "not-approved" | null>(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setStats([]);
      setRecords([]);
      setSubjectSummary([]);
      setClassAttendanceData([]);

      if (isStudent) {
        const { data } = await api.get("/attendance/me");
        setStats((data.stats ?? []) as AttendanceStat[]);
        setRecords((data.records ?? []) as AttendanceRecord[]);
      } else {
        const [meRes, subjRes, listsRes, weeklyRes, statusRes] = await Promise.all([
          api.get("/attendance/me"),
          api.get("/attendance/subjects"),
          api.get("/attendance/lists"),
          api.get("/attendance/weekly"),
          api.get("/attendance/status"),
        ]);

        setStats((meRes.data?.stats ?? []) as AttendanceStat[]);
        setRecords((meRes.data?.records ?? []) as AttendanceRecord[]);
        setSubjectSummary((subjRes.data?.summary ?? []) as SubjectAttendanceSummaryRow[]);
        setAllLists((listsRes.data?.records ?? []) as SessionRecord[]);
        setWeeklyData((weeklyRes.data?.records ?? []) as WeeklyCourseRow[]);
        setClassAttendanceData(statusRes.data?.classes ?? []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesAndYears = async () => {
    try {
      const [clsRes, yearRes] = await Promise.all([
        api.get("/classes?page=1&limit=500"),
        api.get("/academic-years"),
      ]);
      setClasses((clsRes.data.classes ?? []) as Class[]);
      const years = Array.isArray(yearRes.data.years) ? yearRes.data.years : yearRes.data;
      setAcademicYears(years);
      const current = years.find((y: any) => y.isCurrent);
      if (current?._id) setSelectedAcademicYearId(current._id);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  const fetchSessionRecords = async (classId: string, courseId: string, date: string) => {
    try {
      setLoadingSession(true);
      const params = new URLSearchParams({ classId, courseId, date });
      const { data } = await api.get(`/attendance/session?${params.toString()}`);
      setSessionRecords((data.records ?? []) as SessionRecord[]);
    } catch {
      toast.error("Failed to load session records");
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    void fetchAttendance();
    if (isTeacherOrAdmin) {
      void fetchClassesAndYears();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c._id === selectedClassId) ?? null;
  }, [classes, selectedClassId]);

  const selectedClassCourses: courses[] = useMemo(() => {
    if (!selectedClass) return [];
    const courses = selectedClass.courses;
    if (Array.isArray(courses)) return courses;
    return (selectedClass as unknown as { subjects?: courses[] }).subjects ?? [];
  }, [selectedClass]);

  const selectedCourse = useMemo(() => {
    return selectedClassCourses.find((c) => c._id === selectedCourseId) ?? null;
  }, [selectedClassCourses, selectedCourseId]);

  const handleGenerateClick = async () => {
    if (!selectedClassId || !selectedCourseId || !sessionDate || !selectedAcademicYearId) {
      toast.error("Please select class, course, academic year, and date");
      return;
    }

    // Check if timetable exists first
    try {
      setIsGenerating(true);
      const { data: timetabledata } = await api.get("/attendance/timetable-check", {
        params: { classId: selectedClassId, academicYearId: selectedAcademicYearId },
      }) as { data: { exists: boolean } };

      if (!timetabledata.exists) {
        setIsGenerating(false);
        setShowNoTimetableModal(true);
        return;
      }
    } catch {
      // If check fails, proceed with generation anyway
    }

    await doGenerateAttendance();
  };

  const doGenerateAttendance = async () => {
    try {
      setIsGenerating(true);
      const { data } = await api.post("/attendance/generate", {
        classId: selectedClassId,
        courseId: selectedCourseId,
        date: sessionDate,
        academicYearId: selectedAcademicYearId,
      });
      toast.success(data.message || "Attendance generation started");
      setIsSessionOpen(false);
      setSessionRecords([]);

      // Poll until records are available
      const pollInterval = 2000;
      const maxAttempts = 30;
      let attempts = 0;

      const poll = async (): Promise<boolean> => {
        attempts++;
        try {
          const params = new URLSearchParams({ classId: selectedClassId, courseId: selectedCourseId, date: sessionDate });
          const { data: sessionData } = await api.get(`/attendance/session?${params.toString()}`);
          const records = sessionData.records ?? [];
          if (records.length > 0) {
            setSessionRecords(records as SessionRecord[]);
            setIsManageOpen(true);
            return true;
          }
        } catch {
          // ignore errors while polling
        }

        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          return poll();
        }
        return false;
      };

      const success = await poll();
      if (!success) {
        toast.error("Timed out waiting for attendance records. They may still be generating — check back shortly or refresh.");
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || "Generation failed";
      if (msg.includes("NO_TIMETABLE")) {
        setIsGenerating(false);
        setShowNoTimetableModal(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSession = async () => {
    if (sessionRecords.length === 0) return;
    try {
      setSaving(true);
      const updates = sessionRecords
        .filter((r) => r._id)
        .map((r) => ({
          attendanceId: r._id,
          status: r.status,
          lecturerApproval: r.lecturerApproval,
          hodApproval: r.hodApproval,
        }));
      await api.patch("/attendance/bulk", { updates });
      toast.success("Attendance saved successfully");
      setIsManageOpen(false);
      setSessionLecturerApproval(null);
      setSessionHodApproval(null);
      void fetchAttendance();
      // Refresh session records to reflect saved approvals
      const params = new URLSearchParams({ classId: selectedClassId, courseId: selectedCourseId, date: sessionDate });
      const { data: sessionData } = await api.get(`/attendance/session?${params.toString()}`);
      setSessionRecords((sessionData.records ?? []) as SessionRecord[]);
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const chartRows = useMemo<ChartRow[]>(() => {
    if (chartMode === "bySubject" && !isStudent) {
      // If we have weekly data, aggregate per course across all days
      if (weeklyData.length > 0) {
        const courseMap = new Map<string, ChartRow["kind" extends "subject" ? "subject" : never] & { label: string; present: number; absent: number; late: number; excused: number }>();
        weeklyData.forEach((row) => {
          const existing = courseMap.get(row.courseId);
          if (existing) {
            existing.present += row.present;
            existing.absent += row.absent;
            existing.late += row.late;
            existing.excused += row.excused;
          } else {
            courseMap.set(row.courseId, {
              kind: "subject",
              key: row.courseId,
              label: row.courseName,
              present: row.present,
              absent: row.absent,
              late: row.late,
              excused: row.excused,
            });
          }
        });
        return Array.from(courseMap.values()).slice(0, 8);
      }
      // Fallback to subject summary
      return subjectSummary.slice(0, 8).map((r) => {
        const label = r.subject?.[0]?.name ?? r.subject?.[0]?.code ?? r._id ?? "Unknown";
        return {
          kind: "subject",
          key: r._id,
          label,
          present: r.present ?? 0,
          absent: r.absent ?? 0,
          late: r.late ?? 0,
          excused: r.excused ?? 0,
        };
      });
    }

    return stats
      .map((s) => ({
        kind: "status" as const,
        label: String(s._id ?? ""),
        value: Number(s.count ?? 0),
      }))
      .filter((r) => r.label);
  }, [chartMode, isStudent, stats, subjectSummary, weeklyData]);

  const maxStatusValue = useMemo(() => {
    if (chartMode !== "byStatus" || isStudent) return 0;
    const values = chartRows
      .filter((r): r is Extract<ChartRow, { kind: "status" }> => r.kind === "status")
      .map((r) => r.value);
    return values.reduce((m, v) => Math.max(m, v), 0);
  }, [chartMode, isStudent, chartRows]);

  // Per-class pie chart data
  const classChartData = useMemo(() => {
    // Use classAttendanceData when records is empty (admin fallback from /attendance/status)
    if (records.length === 0 && classAttendanceData.length > 0) {
      return classAttendanceData.map((cls: any) => {
        const total = cls.present + cls.absent + cls.late + cls.excused;
        const chartSegments = [
          { name: "Present", value: cls.present, color: "#22c55e" },
          { name: "Absent", value: cls.absent, color: "#ef4444" },
          { name: "Late", value: cls.late, color: "#eab308" },
          { name: "Excused", value: cls.excused, color: "#3b82f6" },
        ].filter((s) => s.value > 0);
        return {
          classId: cls.classId,
          className: cls.className,
          present: cls.present,
          absent: cls.absent,
          late: cls.late,
          excused: cls.excused,
          total,
          chartSegments,
        };
      });
    }
    const map = new Map<string, { classId: string; className: string; present: number; absent: number; late: number; excused: number }>();
    records.forEach((r) => {
      const classId = typeof r.class === "string" ? r.class : r.class?._id ?? "unknown";
      const className = typeof r.class === "string" ? r.class : r.class?.name ?? "Unknown";
      if (!map.has(classId)) map.set(classId, { classId, className, present: 0, absent: 0, late: 0, excused: 0 });
      const s = map.get(classId)!;
      if (r.status === "present") s.present++;
      else if (r.status === "absent") s.absent++;
      else if (r.status === "late") s.late++;
      else if (r.status === "excused") s.excused++;
    });
    return Array.from(map.values()).map((cls) => {
      const total = cls.present + cls.absent + cls.late + cls.excused;
      const chartSegments = [
        { name: "Present", value: cls.present, color: "#22c55e" },
        { name: "Absent", value: cls.absent, color: "#ef4444" },
        { name: "Late", value: cls.late, color: "#eab308" },
        { name: "Excused", value: cls.excused, color: "#3b82f6" },
      ].filter((s) => s.value > 0);
      return { ...cls, total, chartSegments };
    });
  }, [records, classAttendanceData]);

  const sessionLecturer = useMemo(() => {
    return sessionRecords[0]?.lecturer ?? null;
  }, [sessionRecords]);

  const formattedDate = useMemo(() => {
    if (!sessionDate) return "";
    return new Date(sessionDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [sessionDate]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground">Loading attendance chart…</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Chart</CardTitle><CardDescription>Summary</CardDescription></CardHeader>
            <CardContent><Skeleton className="h-60 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Latest Records</CardTitle></CardHeader>
            <CardContent><Skeleton className="h-10 w-full" /><div className="h-2" /><Skeleton className="h-10 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div id="page-attendance" className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            {isStudent ? "Your attendance summary" : "Attendance overview and session management"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isStudent && (
            <>
              <Button variant="outline" size="sm" onClick={() => { void fetchClassesAndYears(); setIsSessionOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Generate Session
              </Button>
              <Select value={chartMode} onValueChange={(v) => setChartMode(v as "byStatus" | "bySubject")}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Chart mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="byStatus">By Status</SelectItem>
                  <SelectItem value="bySubject">By Subject</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <Button variant="outline" onClick={() => void fetchAttendance()}>
            <RotateCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Timetable Status Card — for admin/teacher */}
      {!isStudent && (
        <TimetableStatusCard />
      )}

      {/* Saved Attendance Lists Table — admin/teacher */}
      {!isStudent && (
        <SavedListsTable
          allLists={allLists}
          loading={loading}
          onEditSession={({ records, course, class: cls }) => {
            setSessionRecords(records as SessionRecord[]);
            const classId = cls?._id ?? "";
            const courseId = course?._id ?? "";
            setSelectedClassId(classId);
            setSelectedCourseId(courseId);
            setSessionDate((records[0] as any)?.date ?? "");
            setSessionLecturerApproval(null);
            setSessionHodApproval(null);
            // Ensure the class and course are in their lookup arrays so the modal header renders correctly
            setClasses((prev) => {
              if (prev.some((c) => c._id === classId)) {
                // If class exists but missing this course, merge the course in
                return prev.map((c) =>
                  c._id === classId && course
                    ? { ...c, courses: [...(c.courses ?? []), { _id: courseId, name: course.name ?? "", code: course.code ?? "" }] }
                    : c
                );
              }
              return cls && course
                ? [...prev, { _id: classId, name: cls.name ?? "", courses: [{ _id: courseId, name: course.name ?? "", code: course.code ?? "" }] } as Class]
                : cls
                ? [...prev, { _id: classId, name: cls.name ?? "", courses: [] } as Class]
                : prev;
            });
            setIsManageOpen(true);
          }}
        />
      )}

      {/* Latest Week Mon–Fri Table */}
      {!isStudent && <LatestWeekTable />}

      {/* Student: class-grouped attendance records */}
      {isStudent && <StudentRecordsByClass records={records} loading={loading} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <div>
                <CardTitle>Attendance Chart</CardTitle>
                <CardDescription>
                  {isStudent || chartMode === "byStatus"
                    ? "Counts grouped by status"
                    : "Present/Absent/Late/Excused grouped by subject"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {classChartData.length === 0 ? (
              <p className="text-muted-foreground">No attendance data yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {classChartData.map((cls) => (
                  <div key={cls.classId} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{cls.className}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">Total: {cls.total}</span>
                    </div>
                    {cls.total === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">No records</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={100}>
                        <PieChart>
                          <Pie
                            data={cls.chartSegments}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={22}
                            outerRadius={40}
                            paddingAngle={2}
                          >
                            {cls.chartSegments.map((seg) => (
                              <Cell key={seg.name} fill={seg.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [`${value}`, name]}
                            contentStyle={{ fontSize: 11 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                      {cls.chartSegments.map((seg) => (
                        <span key={seg.name} className="flex items-center gap-1 text-xs">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                          <span>{seg.name}: {seg.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Records</CardTitle>
            <CardDescription>Most recent attendance entries</CardDescription>
          </CardHeader>
          <CardContent>
            {latestRecordsDeduplicated.length === 0 ? (
              <p className="text-muted-foreground">No records found.</p>
            ) : (
              <div className="space-y-3">
                {latestRecordsDeduplicated.map((r) => {
                  const subjectLabel = typeof r.course === "string" ? r.course : r.course?.name ?? r.course?.code;
                  const classLabel = typeof r.class === "string" ? r.class : r.class?.name;
                  return (
                    <div key={r._id} className="flex flex-col gap-2 border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{subjectLabel ?? "Subject"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.date).toLocaleDateString()} • {classLabel ?? "Class"}
                          </p>
                        </div>
                        <span
                          className={
                            "text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 " +
                            (r.status === "present"
                              ? "bg-green-500/15 text-green-600"
                              : r.status === "absent"
                                ? "bg-red-500/15 text-red-600"
                                : r.status === "late"
                                  ? "bg-yellow-500/15 text-yellow-600"
                                  : r.status === "excused"
                                    ? "bg-blue-500/15 text-blue-600"
                                    : "bg-muted text-foreground")
                          }
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>Lecturer: {r.lecturer?.name ?? "—"}</span>
                        {r.status === "excused" && (
                          <span className={r.approvedBy ? "text-green-600 font-medium" : "text-amber-500"}>
                            {r.approvedBy ? `Approved by ${r.approvedBy.name}` : "Pending HOD approval"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Session Modal */}
      <Modal
        open={isSessionOpen}
        setOpen={setIsSessionOpen}
        title="Generate Attendance Session"
        description="Select class, course, academic year, and date to generate an attendance list."
      >
        <div className="space-y-4 overflow-auto max-h-[75vh] pr-1">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={selectedClassId}
              onValueChange={(v) => { setSelectedClassId(v); setSelectedCourseId(""); }}
            >
              <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Course / Subject</Label>
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={!selectedClassId}
            >
              <SelectTrigger><SelectValue placeholder="Select a course subject" /></SelectTrigger>
              <SelectContent>
                {selectedClassCourses.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select
              value={selectedAcademicYearId}
              onValueChange={setSelectedAcademicYearId}
            >
              <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y._id} value={y._id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date (Monday – Friday only)</Label>
            <Input
              type="date"
              value={sessionDate}
              min={(() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                return d.toISOString().split("T")[0];
              })()}
              max={(() => {
                const d = new Date();
                return d.toISOString().split("T")[0];
              })()}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => void handleGenerateClick()}
            disabled={!selectedClassId || !selectedCourseId || !sessionDate || !selectedAcademicYearId || isGenerating}
          >
            {isGenerating ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Attendance
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* No Timetable Modal */}
      <Modal
        open={showNoTimetableModal}
        setOpen={setShowNoTimetableModal}
        title="No Timetable Found"
        description="A timetable has not been generated for this class yet."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">This class does not have a timetable yet.</p>
              <p className="mt-1">Please generate the timetable first before creating attendance records.</p>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              setShowNoTimetableModal(false);
              setIsSessionOpen(false);
              // Navigate to timetable page would be ideal here
              toast.info("Go to Timetable Management to generate a timetable for this class first.");
            }}
          >
            Go to Timetable Management
          </Button>
        </div>
      </Modal>

      {/* Manage Attendance — Spreadsheet View */}
      <Modal
        open={isManageOpen}
        setOpen={setIsManageOpen}
        title="Attendance Register"
        description={`${selectedClass?.name ?? "Class"} — ${selectedCourse?.name ?? "Course"}`}
      >
        <div className="space-y-4">
          {loadingSession ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sessionRecords.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No attendance records found. Generate a session first.
            </p>
          ) : (
            <>
              {/* Spreadsheet Header Info */}
              <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium">{formattedDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Class: </span>
                    <span className="font-medium">{selectedClass?.name ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-medium">{selectedCourse?.name ?? "—"} ({selectedCourse?.code})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Academic Year: </span>
                    <span className="font-medium">{academicYears.find((y) => y._id === selectedAcademicYearId)?.name ?? "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Lecturer: </span>
                    <span className="font-medium">{sessionLecturer?.name ?? "—"}</span>
                  </div>
                </div>
                {/* Signature lines */}
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Lecturer Signature</div>
                    <Select
                      value={sessionLecturerApproval ?? "pending"}
                      onValueChange={(v) => setSessionLecturerApproval(v === "pending" ? null : v as "approved" | "not-approved")}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select approval status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">— Select —</SelectItem>
                        <SelectItem value="approved">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            Approved
                          </div>
                        </SelectItem>
                        <SelectItem value="not-approved">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            Not Approved
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {sessionLecturerApproval && (
                      <div className="text-xs text-muted-foreground">
                        {sessionLecturerApproval === "approved" ? "Approved" : "Not Approved"} on {new Date().toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">HOD Signature</div>
                    <Select
                      value={sessionHodApproval ?? "pending"}
                      onValueChange={(v) => setSessionHodApproval(v === "pending" ? null : v as "approved" | "not-approved")}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select approval status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">— Select —</SelectItem>
                        <SelectItem value="approved">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            Approved
                          </div>
                        </SelectItem>
                        <SelectItem value="not-approved">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            Not Approved
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {sessionHodApproval && (
                      <div className="text-xs text-muted-foreground">
                        {sessionHodApproval === "approved" ? "Approved" : "Not Approved"} on {new Date().toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <span className="font-medium">Mark Attendance:</span>
                {STATUS_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${opt.color}`} />
                    <span className="capitalize">{opt.label}</span>
                  </div>
                ))}
              </div>

              {/* Spreadsheet Table */}
              <div className="border rounded-lg overflow-auto max-h-[50vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-center w-10 px-2 py-2 font-medium text-muted-foreground">#</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-left">Student Name</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-left">ID Number</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-center">Attendance</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-center">Lect. Approval</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground text-center">HOD Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRecords.map((r, i) => (
                      <tr key={r._id} className="border-t last:border-b">
                        <td className="text-center px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium">
                          {r.student?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {r.student?.idNumber ?? "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={r.status}
                            onValueChange={(v) => {
                              setSessionRecords((prev) =>
                                prev.map((rec) => (rec._id === r._id ? { ...rec, status: v as AttendanceStatus } : rec))
                              );
                            }}
                          >
                            <SelectTrigger className="w-28 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${opt.color}`} />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={r.lecturerApproval ?? "pending"}
                            onValueChange={(v) => {
                              setSessionRecords((prev) =>
                                prev.map((rec) => (rec._id === r._id ? { ...rec, lecturerApproval: v === "pending" ? null : v as "approved" | "not-approved" } : rec))
                              );
                            }}
                          >
                            <SelectTrigger className="w-28 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">—</SelectItem>
                              <SelectItem value="approved">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-green-500" />
                                  Approved
                                </div>
                              </SelectItem>
                              <SelectItem value="not-approved">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-red-500" />
                                  Not Approved
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={r.hodApproval ?? "pending"}
                            onValueChange={(v) => {
                              setSessionRecords((prev) =>
                                prev.map((rec) => (rec._id === r._id ? { ...rec, hodApproval: v === "pending" ? null : v as "approved" | "not-approved" } : rec))
                              );
                            }}
                          >
                            <SelectTrigger className="w-28 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">—</SelectItem>
                              <SelectItem value="approved">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-green-500" />
                                  Approved
                                </div>
                              </SelectItem>
                              <SelectItem value="not-approved">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-red-500" />
                                  Not Approved
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                <span className="font-medium">Summary:</span>
                {STATUS_OPTIONS.map((opt) => (
                  <span key={opt.value}>
                    <span className={`h-2 w-2 rounded-full inline-block mr-1 ${opt.color}`} />
                    {opt.label}: {sessionRecords.filter((r) => r.status === opt.value).length}
                  </span>
                ))}
              </div>

              <Button className="w-full" onClick={() => void handleSaveSession()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save Attendance"}
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── Timetable Status Card ──────────────────────────────────────────
function TimetableStatusCard() {
  const [loading, setLoading] = useState(true);
  const [classStatuses, setClassStatuses] = useState<{ _id: string; name: string; hasTimetable: boolean }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [clsRes, yearRes] = await Promise.all([
          api.get("/classes?page=1&limit=500"),
          api.get("/academic-years"),
        ]);
        const clsData = (clsRes.data.classes ?? []) as Class[];
        const years = Array.isArray(yearRes.data.years) ? yearRes.data.years : yearRes.data;
        const current = years.find((y: any) => y.isCurrent);
        if (!current?._id || clsData.length === 0) { setLoading(false); return; }

        const checks = await Promise.all(
          clsData.map(async (cls) => {
            try {
              const { data } = await api.get("/attendance/timetable-check", {
                params: { classId: cls._id, academicYearId: current._id },
              });
              return { _id: cls._id, name: cls.name, hasTimetable: !!data.exists };
            } catch {
              return { _id: cls._id, name: cls.name, hasTimetable: false };
            }
          })
        );
        setClassStatuses(checks);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    void fetchStatuses();
  }, []);

  const withTimetable = classStatuses.filter((c) => c.hasTimetable);
  const withoutTimetable = classStatuses.filter((c) => !c.hasTimetable);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <CalendarDays className="h-4 w-4" />
          Timetable Status
        </CardTitle>
        <CardDescription>Timetable generation status across all classes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : classStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes found.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <span className="font-semibold text-green-700 text-sm">{withTimetable.length}</span>
                  <span className="text-green-700 text-xs ml-1">with timetable</span>
                </div>
              </div>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-amber-50 border-amber-200">
                <XCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-semibold text-amber-700 text-sm">{withoutTimetable.length}</span>
                  <span className="text-amber-700 text-xs ml-1">without timetable</span>
                </div>
              </div>
              <Button
                size="sm"
                className="col-span-2 md:col-span-1"
                onClick={() => navigate("/timetable")}
              >
                Go to Timetable
              </Button>
            </div>

            {withoutTimetable.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Missing timetable:</p>
                {withoutTimetable.slice(0, 5).map((cls) => (
                  <div key={cls._id} className="text-xs text-amber-700 flex items-center gap-1">
                    <XCircle className="h-3 w-3 shrink-0" />
                    {cls.name}
                  </div>
                ))}
                {withoutTimetable.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{withoutTimetable.length - 5} more</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Saved Attendance Lists Table ───────────────────────────────────
// ─── Saved Lists Table ────────────────────────────────────────────────
function SavedListsTable({
  allLists,
  loading,
  onEditSession,
}: {
  allLists: SessionRecord[];
  loading: boolean;
  onEditSession: (session: { records: SessionRecord[]; course?: { name: string; code?: string; _id?: string }; class?: { name: string; _id?: string }; lecturer?: { name: string } }) => void;
}) {
  const statusBadge = (status: string) => {
    const cls =
      status === "present"
        ? "bg-green-500/15 text-green-600"
        : status === "absent"
          ? "bg-red-500/15 text-red-600"
          : status === "late"
            ? "bg-yellow-500/15 text-yellow-600"
            : "bg-blue-500/15 text-blue-600";
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>
        {status}
      </span>
    );
  };

  // Step 1: group records into sessions (date + course within a class)
  const sessionsMap = useMemo(() => {
    const map = new Map<string, {
      date: string;
      dayOfWeek?: string;
      course?: { name: string; code?: string };
      class?: { name: string; _id?: string };
      lecturer?: { name: string };
      records: SessionRecord[];
    }>();

    allLists.forEach((r) => {
      const classId = r.class?._id ?? r.class?.name ?? "unknown";
      const dateKey = `${new Date(r.date).toDateString()}__${classId}`;
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: r.date,
          dayOfWeek: r.dayOfWeek,
          course: r.course,
          class: r.class,
          lecturer: r.lecturer,
          records: [],
        });
      }
      map.get(dateKey)!.records.push(r);
    });

    return map;
  }, [allLists]);

  // Step 2: group sessions by class
  const byClass = useMemo(() => {
    const map = new Map<string, {
      className: string;
      classId: string;
      sessions: Array<{
        date: string;
        dayOfWeek?: string;
        course?: { name: string; code?: string };
        class?: { name: string; _id?: string };
        lecturer?: { name: string };
        records: SessionRecord[];
      }>;
    }>();

    sessionsMap.forEach((session) => {
      const classId = session.class?._id ?? session.class?.name ?? "unknown";
      const className = session.class?.name ?? "Unknown Class";
      if (!map.has(classId)) {
        map.set(classId, { className, classId, sessions: [] });
      }
      map.get(classId)!.sessions.push(session);
    });

    // Sort sessions within each class by date (newest first)
    return Array.from(map.values()).sort((a, b) => {
      const aDate = a.sessions[0]?.date ?? "";
      const bDate = b.sessions[0]?.date ?? "";
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [sessionsMap]);

  const [openClass, setOpenClass] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <FileText className="h-4 w-4" />
          Saved Attendance Lists
        </CardTitle>
        <CardDescription>Saved attendance sessions — click a class card to expand its sessions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : byClass.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No saved attendance lists yet. Generate a session first.
          </p>
        ) : (
          <div className="space-y-3">
            {byClass.map((cls) => {
              const isOpen = openClass === cls.classId;
              const totalSessions = cls.sessions.length;
              const totalRecords = cls.sessions.reduce((sum, s) => sum + s.records.length, 0);
              const totalPresent = cls.sessions.reduce(
                (sum, s) => sum + s.records.filter((r) => r.status === "present").length,
                0
              );
              const totalAbsent = cls.sessions.reduce(
                (sum, s) => sum + s.records.filter((r) => r.status === "absent").length,
                0
              );

              return (
                <div key={cls.classId} className="border rounded-lg overflow-hidden">
                  {/* Class card header */}
                  <button
                    type="button"
                    onClick={() => setOpenClass(isOpen ? null : cls.classId)}
                    className="w-full bg-muted/40 hover:bg-muted/60 transition-colors px-4 py-3 text-left flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-sm truncate">{cls.className}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <span className="bg-muted px-1.5 py-0.5 rounded-full">
                          {totalSessions} session{totalSessions !== 1 ? "s" : ""}
                        </span>
                        <span>{totalRecords} records</span>
                      </div>
                    </div>
                    {/* Summary stats */}
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-green-600 font-medium">{totalPresent}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-red-600 font-medium">{totalAbsent}</span>
                      </span>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`} />
                  </button>

                  {/* Expanded sessions */}
                  {isOpen && (
                    <div className="divide-y">
                      {cls.sessions
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((session) => {
                          const present = session.records.filter((r) => r.status === "present").length;
                          const absent = session.records.filter((r) => r.status === "absent").length;
                          const late = session.records.filter((r) => r.status === "late").length;
                          const excused = session.records.filter((r) => r.status === "excused").length;
                          const total = session.records.length;

                          const sessionKey = `${session.date}-${cls.classId}`;

                          return (
                            <div key={sessionKey} className="px-4 py-3 space-y-2">
                              {/* Session meta */}
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                <span>
                                  <span className="text-muted-foreground">Date: </span>
                                  <span className="font-medium">
                                    {new Date(session.date).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  {session.dayOfWeek && (
                                    <span className="ml-1 text-muted-foreground">({session.dayOfWeek})</span>
                                  )}
                                </span>
                                <span>
                                  <span className="text-muted-foreground">Subject: </span>
                                  <span className="font-medium">
                                    {session.course?.name ?? "—"}{session.course?.code ? ` (${session.course.code})` : ""}
                                  </span>
                                </span>
                                <span>
                                  <span className="text-muted-foreground">Lecturer: </span>
                                  <span className="font-medium">{session.lecturer?.name ?? "—"}</span>
                                </span>
                                <span className="flex items-center gap-1 ml-auto">
                                  <div className="h-2 w-2 rounded-full bg-green-500" />
                                  <span className="text-green-600 font-medium">{present}</span>
                                  <div className="h-2 w-2 rounded-full bg-red-500 ml-1" />
                                  <span className="text-red-600 font-medium">{absent}</span>
                                  <div className="h-2 w-2 rounded-full bg-yellow-500 ml-1" />
                                  <span className="text-yellow-600 font-medium">{late}</span>
                                  <div className="h-2 w-2 rounded-full bg-blue-500 ml-1" />
                                  <span className="text-blue-600 font-medium">{excused}</span>
                                  <span className="text-muted-foreground ml-1">/ {total}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-3 h-6 text-xs"
                                    onClick={() =>
                                      onEditSession({
                                        records: session.records,
                                        course: session.course,
                                        class: session.class,
                                        lecturer: session.lecturer,
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                </span>
                              </div>

                              {/* Student table */}
                              <div className="overflow-auto max-h-[25vh] border rounded">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/30 sticky top-0">
                                    <tr>
                                      <th className="text-center w-10 px-2 py-2 font-medium text-muted-foreground text-xs">#</th>
                                      <th className="px-3 py-2 font-medium text-muted-foreground text-left text-xs">Student Name</th>
                                      <th className="px-3 py-2 font-medium text-muted-foreground text-left text-xs">ID Number</th>
                                      <th className="px-3 py-2 font-medium text-muted-foreground text-center text-xs">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {session.records.map((r, i) => (
                                      <tr key={r._id} className="border-t">
                                        <td className="text-center px-2 py-1.5 text-muted-foreground text-xs">{i + 1}</td>
                                        <td className="px-3 py-1.5 font-medium text-xs">{r.student?.name ?? "—"}</td>
                                        <td className="px-3 py-1.5 text-muted-foreground text-xs">{r.student?.idNumber ?? "—"}</td>
                                        <td className="px-3 py-1.5 text-center">{statusBadge(r.status)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Student Records by Class ────────────────────────────────────────
function StudentRecordsByClass({
  records,
  loading,
}: {
  records: AttendanceRecord[];
  loading: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, {
      date: string;
      dayOfWeek?: string;
      subject?: { name: string; code?: string };
      class?: { name: string; _id?: string };
      lecturer?: { name: string };
      records: AttendanceRecord[];
    }>();

    records.forEach((r) => {
      const classId = typeof r.class === "string" ? r.class : r.class?._id ?? "unknown";
      const dateKey = `${new Date(r.date).toDateString()}__${classId}`;
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: r.date,
          dayOfWeek: r.dayOfWeek,
          course: typeof r.course === "object" && r.course !== null ? r.course : undefined,
          class: typeof r.class === "object" && r.class !== null ? r.class : undefined,
          lecturer: r.lecturer ?? undefined,
          records: [],
        });
      }
      map.get(dateKey)!.records.push(r);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [records]);

  const statusBadge = (status: string) => {
    const cls =
      status === "present"
        ? "bg-green-500/15 text-green-600"
        : status === "absent"
          ? "bg-red-500/15 text-red-600"
          : status === "late"
            ? "bg-yellow-500/15 text-yellow-600"
            : "bg-blue-500/15 text-blue-600";
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>
        {status}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <FileText className="h-4 w-4" />
          My Attendance Records
        </CardTitle>
        <CardDescription>Your attendance history grouped by date and class</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No attendance records found.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map((session) => {
              const present = session.records.filter((r) => r.status === "present").length;
              const absent = session.records.filter((r) => r.status === "absent").length;
              const late = session.records.filter((r) => r.status === "late").length;
              const excused = session.records.filter((r) => r.status === "excused").length;
              const total = session.records.length;

              const sessionKey = `${session.date}-${typeof session.class === "object" ? session.class?._id ?? session.class?.name ?? "unknown" : session.class ?? "unknown"}`;
              return (
                <div key={sessionKey} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/40 px-4 py-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">
                          {new Date(session.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                        {session.dayOfWeek && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                            {session.dayOfWeek}
                          </span>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-green-600 font-medium">{present}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-red-600 font-medium">{absent}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span className="text-yellow-600 font-medium">{late}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-blue-600 font-medium">{excused}</span>
                        </span>
                        <span className="text-muted-foreground">/ {total}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span>
                        <span className="text-muted-foreground">Subject: </span>
                        <span className="font-medium">
                          {session.course?.name ?? "—"}{session.course?.code ? ` (${session.course.code})` : ""}
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Class: </span>
                        <span className="font-medium">{typeof session.class === "object" ? session.class?.name ?? "—" : session.class ?? "—"}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Lecturer: </span>
                        <span className="font-medium">{session.lecturer?.name ?? "—"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-auto max-h-[30vh]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr>
                          <th className="text-center w-10 px-2 py-2 font-medium text-muted-foreground text-xs">#</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground text-left text-xs">Subject</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground text-center text-xs">Status</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground text-left text-xs">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.records.map((r, i) => (
                          <tr key={r._id} className="border-t">
                            <td className="text-center px-2 py-1.5 text-muted-foreground text-xs">{i + 1}</td>
                            <td className="px-3 py-1.5 font-medium text-xs">
                              {r.course?.name ?? r.course?.code ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 text-center">{statusBadge(r.status)}</td>
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">
                              {r.status === "excused" && r.approvedBy
                                ? `Approved by ${r.approvedBy.name}`
                                : r.status === "excused"
                                ? "Pending HOD approval"
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Latest Week Mon–Fri Table ──────────────────────────────────────
function LatestWeekTable() {
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeek = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/attendance/me");
        const allRecords = (data.records ?? []) as SessionRecord[];

        // Filter to current week Mon–Fri
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
        const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        friday.setHours(23, 59, 59, 999);

        const filtered = allRecords.filter((r) => {
          const d = new Date(r.date);
          return d >= monday && d <= friday;
        });

        setRecords(filtered);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    void fetchWeek();
  }, []);

  const groupedByDay = useMemo(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    return days.map((day) => ({
      day,
      records: records.filter((r) => (r as any).dayOfWeek === day),
    }));
  }, [records]);

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // Build a per-class summary across all days
  const classSummary = useMemo(() => {
    const map = new Map<string, {
      className: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
    }>();
    records.forEach((r) => {
      const className = r.class && typeof r.class !== "string" ? r.class.name : "Unknown";
      if (!map.has(className)) map.set(className, { className, present: 0, absent: 0, late: 0, excused: 0 });
      const s = map.get(className)!;
      if (r.status === "present") s.present++;
      else if (r.status === "absent") s.absent++;
      else if (r.status === "late") s.late++;
      else if (r.status === "excused") s.excused++;
    });
    return Array.from(map.values());
  }, [records]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">This Week&apos;s Attendance</CardTitle>
        <CardDescription>Mon–Friday records for the current week</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <>
            {/* ── At-a-glance class summary (always shown) ── */}
            {classSummary.length > 0 && (
              <div className="border rounded-lg bg-muted/20 overflow-hidden mb-3">
                <div className="px-3 py-2 border-b bg-muted/40">
                  <p className="text-xs font-semibold text-muted-foreground">By Class</p>
                </div>
                <div className="divide-y">
                  {classSummary.map((cls) => {
                    const total = cls.present + cls.absent + cls.late + cls.excused;
                    return (
                      <div key={cls.className} className="flex items-center gap-3 px-3 py-2 text-xs">
                        <span className="font-medium min-w-0 truncate flex-1">{cls.className}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-0.5">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-green-600 font-medium">{cls.present}</span>
                          </span>
                          <span className="flex items-center gap-0.5">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="text-red-600 font-medium">{cls.absent}</span>
                          </span>
                          <span className="flex items-center gap-0.5">
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                            <span className="text-yellow-600 font-medium">{cls.late}</span>
                          </span>
                          <span className="flex items-center gap-0.5">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <span className="text-blue-600 font-medium">{cls.excused}</span>
                          </span>
                          <span className="text-muted-foreground text-[10px] ml-1">/ {total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No attendance records for this week yet.
              </p>
            ) : (
              <div className="space-y-3">
                {groupedByDay.map(({ day, records: dayRecords }) => (
                  <div key={day}>
                    <div className={`flex items-center gap-2 text-sm font-medium mb-1 ${day === todayName ? "text-primary" : "text-foreground"}`}>
                      <span className={day === todayName ? "font-bold" : ""}>{day}</span>
                      {day === todayName && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Today</span>}
                      <span className="text-xs text-muted-foreground font-normal ml-auto">{dayRecords.length} record{dayRecords.length !== 1 ? "s" : ""}</span>
                    </div>
                    {dayRecords.length === 0 ? (
                      <div className="border rounded-lg px-3 py-2 text-xs text-muted-foreground italic">
                        No records
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Subject</th>
                              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Class</th>
                              <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Status</th>
                              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayRecords.map((r) => (
                              <tr key={r._id} className="border-t">
                                <td className="px-2 py-1.5">{r.course?.name ?? "—"}</td>
                                <td className="px-2 py-1.5">{r.class && typeof r.class !== "string" ? r.class.name : "—"}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <span
                                    className={
                                      "px-1.5 py-0.5 rounded-full capitalize text-xs font-medium " +
                                      (r.status === "present"
                                        ? "bg-green-500/15 text-green-600"
                                        : r.status === "absent"
                                          ? "bg-red-500/15 text-red-600"
                                          : r.status === "late"
                                            ? "bg-yellow-500/15 text-yellow-600"
                                            : "bg-blue-500/15 text-blue-600")
                                    }
                                  >
                                    {r.status}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5">{new Date(r.date).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
