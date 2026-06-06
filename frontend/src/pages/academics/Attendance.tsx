import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Class, courses } from "@/types";
import { useNavigate } from "react-router";

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
} from "lucide-react";

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
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNoTimetableModal, setShowNoTimetableModal] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setStats([]);
      setRecords([]);
      setSubjectSummary([]);

      if (isStudent) {
        const { data } = await api.get("/attendance/me");
        setStats((data.stats ?? []) as AttendanceStat[]);
        setRecords((data.records ?? []) as AttendanceRecord[]);
      } else {
        const [meRes, subjRes, listsRes, weeklyRes] = await Promise.all([
          api.get("/attendance/me"),
          api.get("/attendance/subjects"),
          api.get("/attendance/lists"),
          api.get("/attendance/weekly"),
        ]);

        setStats((meRes.data?.stats ?? []) as AttendanceStat[]);
        setRecords((meRes.data?.records ?? []) as AttendanceRecord[]);
        setSubjectSummary((subjRes.data?.summary ?? []) as SubjectAttendanceSummaryRow[]);
        setAllLists((listsRes.data?.records ?? []) as SessionRecord[]);
        setWeeklyData((weeklyRes.data?.records ?? []) as WeeklyCourseRow[]);
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
      setIsManageOpen(true);
      await fetchSessionRecords(selectedClassId, selectedCourseId, sessionDate);
    } catch (e: any) {
      const msg = e.response?.data?.message || "Generation failed";
      if (msg.includes("NO_TIMETABLE")) {
        setIsGenerating(false);
        setShowNoTimetableModal(true);
      } else if (msg.includes("DUPLICATE")) {
        toast.error("Attendance records already exist for this session. Open the existing list to update.");
        setIsSessionOpen(false);
        setSessionRecords([]);
        setIsManageOpen(true);
        await fetchSessionRecords(selectedClassId, selectedCourseId, sessionDate);
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
        .map((r) => ({ attendanceId: r._id, status: r.status }));
      await api.patch("/attendance/bulk", { updates });
      toast.success("Attendance saved successfully");
      setIsManageOpen(false);
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
    <div className="p-6 space-y-4">
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
      {!isStudent && <SavedListsTable allLists={allLists} loading={loading} />}

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
            {chartRows.length === 0 ? (
              <p className="text-muted-foreground">
                No {isStudent || chartMode === "byStatus" ? "data yet" : "subject data yet"}.
              </p>
            ) : chartMode === "bySubject" && !isStudent ? (
              <div className="space-y-3">
                {chartRows.map((row) => {
                  if (row.kind !== "subject") return null;
                  const total = row.present + row.absent + row.late + row.excused;
                  return (
                    <div key={row.key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground">Total: {total}</span>
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: total ? `${Math.round((row.present / total) * 100)}%` : "0%" }}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Present: {row.present}</div>
                        <div>Absent: {row.absent}</div>
                        <div>Late: {row.late}</div>
                        <div>Excused: {row.excused}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {chartRows.map((row) => {
                  if (row.kind !== "status") return null;
                  const percentage = maxStatusValue === 0 ? 0 : Math.round((row.value / maxStatusValue) * 100);
                  return (
                    <div key={row.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{row.label}</span>
                        <span className="font-medium">{row.value}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
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
            {records.length === 0 ? (
              <p className="text-muted-foreground">No records found.</p>
            ) : (
              <div className="space-y-3">
                {records.slice(0, 10).map((r) => {
                  const subjectLabel = typeof r.subject === "string" ? r.subject : r.subject?.name;
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
                      {/* Lecturer & approval row */}
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
                    <div className="h-8 border-b border-dashed border-muted-foreground/40" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">HOD Signature</div>
                    <div className="h-8 border-b border-dashed border-muted-foreground/40" />
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
function SavedListsTable({
  allLists,
  loading,
}: {
  allLists: SessionRecord[];
  loading: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { date: string; dayOfWeek?: string; course?: { name: string; code?: string }; class?: { name: string; _id?: string }; lecturer?: { name: string }; records: SessionRecord[] }>();

    allLists.forEach((r) => {
      // Group by date + class so each class gets its own card on the same day
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

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allLists]);

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
          Saved Attendance Lists
        </CardTitle>
        <CardDescription>Saved attendance sessions — grouped by date, course, and class</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No saved attendance lists yet. Generate a session first.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map((session) => {
              const present = session.records.filter((r) => r.status === "present").length;
              const absent = session.records.filter((r) => r.status === "absent").length;
              const late = session.records.filter((r) => r.status === "late").length;
              const excused = session.records.filter((r) => r.status === "excused").length;
              const total = session.records.length;

              const sessionKey = `${session.date}-${session.class?._id ?? session.class?.name ?? "unknown"}`;
              return (
                <div key={sessionKey} className="border rounded-lg overflow-hidden">
                  {/* Session header - responsive stack on mobile */}
                  <div className="bg-muted/40 px-4 py-3 space-y-2">
                    {/* Date row */}
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
                      {/* Stats row - right-aligned on sm+ */}
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
                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span>
                        <span className="text-muted-foreground">Subject: </span>
                        <span className="font-medium">
                          {session.course?.name ?? "—"}{session.course?.code ? ` (${session.course.code})` : ""}
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Class: </span>
                        <span className="font-medium">{session.class?.name ?? "—"}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Lecturer: </span>
                        <span className="font-medium">{session.lecturer?.name ?? "—"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Student rows */}
                  <div className="overflow-auto max-h-[30vh]">
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
          subject: typeof r.subject === "object" && r.subject !== null ? r.subject : undefined,
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
                          {session.subject?.name ?? "—"}{session.subject?.code ? ` (${session.subject.code})` : ""}
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
                              {typeof r.subject === "object" && r.subject !== null ? r.subject.name : (r.subject ?? "—")}
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">This Week's Attendance</CardTitle>
        <CardDescription>Mon–Friday records for the current week</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : groupedByDay.every((d) => d.records.length === 0) ? (
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
      </CardContent>
    </Card>
  );
}
