import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useInstitution } from "@/lib/useInstitution";
import {
  buildAcademicAttendanceSummary,
  sortCourseSummaries,
  sortSubjectSummaries,
  type AcademicAttendanceRecordLike,
  type AcademicCourseCatalogLike,
  type CourseAttendanceSummary,
  type SubjectAttendanceSummary,
} from "@/lib/studentAcademicAttendance";
import { AlertTriangle, BookOpen, BrainCircuit, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface InsightPayload {
  id?: string;
  type?: string;
  message?: string;
  targetUser?: string;
  timestamp?: string;
}

const AUTO_REFRESH_STORAGE_KEY = "student-academic-attendance:auto-refresh";

const formatAttendanceDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function StudentAcademicAttendancePage() {
  const { user } = useAuth();
  const { institution, loading: institutionLoading } = useInstitution();
  const [records, setRecords] = useState<AcademicAttendanceRecordLike[]>([]);
  const [courseCatalog, setCourseCatalog] = useState<AcademicCourseCatalogLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courseSort, setCourseSort] = useState<"asc" | "desc">("desc");
  const [subjectSort, setSubjectSort] = useState<"asc" | "desc">("asc");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(AUTO_REFRESH_STORAGE_KEY) === "true";
  });
  const [alertInsight, setAlertInsight] = useState<InsightPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alertTriggeredRef = useRef(false);

  const threshold = useMemo(() => {
    const rawThreshold = institution?.attendanceSettings?.minimumAttendancePercentage;
    const numeric = Number(rawThreshold ?? 75);
    return Number.isFinite(numeric) ? numeric : 75;
  }, [institution]);

  const loadAttendanceData = useCallback(async (showSpinner = false) => {
    if (!user?._id) {
      return;
    }

    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      const [attendanceResponse, courseResponse] = await Promise.all([
        api.get("/attendance/me"),
        api.get("/courses", { params: { topLevel: true } }),
      ]);
      const nextRecords = Array.isArray(attendanceResponse.data?.records) ? attendanceResponse.data.records : [];
      const nextCourseCatalog = Array.isArray(courseResponse.data?.courses) ? courseResponse.data.courses : [];
      setRecords(nextRecords);
      setCourseCatalog(nextCourseCatalog);
      setAlertInsight(null);
      alertTriggeredRef.current = false;
    } catch (err: any) {
      console.error("Unable to load academic attendance", err);
      setError(err?.response?.data?.message || "Unable to load your academic attendance right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user?._id) {
      void loadAttendanceData(true);
    }
  }, [loadAttendanceData, user?._id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, String(autoRefreshEnabled));
    }
  }, [autoRefreshEnabled]);

  useEffect(() => {
    if (!autoRefreshEnabled || !user?._id) {
      return;
    }

    void loadAttendanceData(false);

    const timer = window.setInterval(() => {
      void loadAttendanceData(false);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [autoRefreshEnabled, loadAttendanceData, user?._id]);

  const summary = useMemo(() => buildAcademicAttendanceSummary(records, threshold, courseCatalog), [courseCatalog, records, threshold]);

  const sortedCourses = useMemo(() => sortCourseSummaries(summary.courses, courseSort), [courseSort, summary.courses]);

  const overallStatus = summary.requiresAttention ? "Below threshold" : "On track";

  useEffect(() => {
    if (!summary.requiresAttention || alertTriggeredRef.current || !user?._id) {
      return;
    }

    alertTriggeredRef.current = true;

    api.post("/mordred/insights/attendance-alert", {
      studentId: user._id,
      overallPercent: summary.overallPercent,
      activeLocationTitle: "Academic attendance",
      activeLocationValue: "Course and subject breakdown",
      note: summary.overallPercent < threshold
        ? "Your academic attendance is below the institution minimum threshold."
        : "Your academic attendance is at the minimum threshold.",
    })
      .then(({ data }) => {
        if (data?.insight) {
          setAlertInsight(data.insight);
        }
      })
      .catch((err) => {
        console.error("Failed to create academic attendance alert", err);
      });
  }, [summary.overallPercent, summary.requiresAttention, threshold, user?._id]);

  const renderSubjectRow = (subject: SubjectAttendanceSummary) => {
    const subjectBadgeClass = subject.attendancePercent >= threshold
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

    return (
      <div key={subject.subjectId} className="flex min-h-[64px] flex-col gap-2 rounded-lg border border-border/70 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="marquee-clip w-full overflow-hidden text-left">
            <div
              className="marquee-track inline-flex min-w-max items-center whitespace-nowrap marquee-animate"
              style={{
                "--marquee-distance": "220px",
                "--marquee-duration": "10s",
              } as CSSProperties}
            >
              <span className="marquee-item inline-flex pr-8 font-medium">{subject.subjectName}</span>
              <span className="marquee-item inline-flex pr-8 font-medium">{subject.subjectName}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {subject.totalSessions} sessions • {subject.attendedSessions} attended
          </p>
          <p className="text-xs text-muted-foreground/90">
            {formatAttendanceDate(subject.lastAttendanceDate) ? `Last session: ${formatAttendanceDate(subject.lastAttendanceDate)}` : "No recent session date"}
            {subject.lecturerNames?.length ? ` • Lecturer: ${subject.lecturerNames.join(", ")}` : " • Lecturer pending"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={subjectBadgeClass}>{subject.attendancePercent}%</Badge>
          <div className="h-2.5 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, subject.attendancePercent)}%` }} />
          </div>
        </div>
      </div>
    );
  };

  const renderCourseCard = (course: CourseAttendanceSummary) => {
    const courseSubjects = sortSubjectSummaries(course.subjects, subjectSort).filter((subject) => subject.totalSessions > 0);

    return (
      <Card key={course.courseId} className="flex h-[380px] flex-col overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {course.courseName}
              </CardTitle>
              <CardDescription>
                {course.courseCode ? `${course.courseCode} • ` : ""}
                {course.subjectCount} subject{course.subjectCount === 1 ? "" : "s"} tracked
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={course.requiresAttention ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}>
                {course.attendancePercent}%
              </Badge>
              {course.requiresAttention ? (
                <Badge variant="outline" className="border-amber-200 text-amber-700">
                  Needs attention
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                  Healthy
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-4 overflow-hidden pt-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{course.totalSessions} total sessions</span>
            <span>{course.attendedSessions} attended</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, course.attendancePercent)}%` }} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Subjects</p>
              {courseSubjects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                  No attendance records have been generated for this course yet.
                </div>
              ) : (
                courseSubjects.map(renderSubjectRow)
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Academic attendance</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review your attendance by course and subject, and keep an eye on the institution minimum threshold.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadAttendanceData(false)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
          <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm">
            <input type="checkbox" checked={autoRefreshEnabled} onChange={() => setAutoRefreshEnabled((value) => !value)} />
            Auto-refresh
          </label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Overview
              </CardTitle>
              <CardDescription>
                {institutionLoading ? "Loading institutional threshold…" : `Minimum attendance threshold: ${threshold}%`}
              </CardDescription>
            </div>
            <Badge className={summary.requiresAttention ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}>
              {overallStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Overall attendance</p>
              <p className="mt-2 text-3xl font-semibold">{summary.overallPercent}%</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Total sessions</p>
              <p className="mt-2 text-3xl font-semibold">{summary.totalSessions}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Attended sessions</p>
              <p className="mt-2 text-3xl font-semibold">{summary.attendedSessions}</p>
            </div>
          </div>

          {summary.requiresAttention && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">Attendance needs attention</p>
                  <p className="mt-1">
                    Your academic attendance is below the set threshold. Review the course breakdown below and consider speaking with your lecturers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {alertInsight ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <div className="flex items-start gap-2">
                <BrainCircuit className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-semibold">MORDRED insight</p>
                  <p className="mt-1">{alertInsight.message || "A tailored attendance reminder has been created for you."}</p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Course sort</span>
          <Select value={courseSort} onValueChange={(value) => setCourseSort(value as "asc" | "desc")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Highest attendance</SelectItem>
              <SelectItem value="asc">Lowest attendance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Subject sort</span>
          <Select value={subjectSort} onValueChange={(value) => setSubjectSort(value as "asc" | "desc")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Highest attendance</SelectItem>
              <SelectItem value="asc">Lowest attendance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : summary.courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No academic attendance records are available yet for your class.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedCourses.map((course) => renderCourseCard(course))}
        </div>
      )}
    </div>
  );
}
