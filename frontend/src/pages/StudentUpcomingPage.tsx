// PR E1 — real page for /student/schedule/upcoming (was a generic
// StudentSection placeholder). Reuses the student portal's existing
// upcoming content rather than duplicating it: exam/test deadlines
// (GET /exams) plus the next clinical posting windows
// (GET /rotation-schedules + buildTimelineWindowView, same as the
// portal cards and the Clinicals section).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { buildTimelineWindowView } from "@/lib/rotationScheduleViews";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface UpcomingExam {
  _id: string;
  title: string;
  dueDate: string;
  subjectName: string | null;
}

export default function StudentUpcomingPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<UpcomingExam[]>([]);
  const [windows, setWindows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const classId = useMemo(() => {
    const studentClass = user?.studentClass ?? user?.studentClasses;
    if (typeof studentClass === "object" && studentClass !== null) return studentClass._id;
    return typeof studentClass === "string" ? studentClass : null;
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "student") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [examsRes, rotationRes] = await Promise.allSettled([
          api.get("/exams"),
          classId ? api.get("/rotation-schedules", { params: { classId } }) : Promise.resolve({ data: { schedules: [] } }),
        ]);
        if (cancelled) return;

        if (examsRes.status === "fulfilled") {
          const raw = Array.isArray(examsRes.value.data?.exams) ? examsRes.value.data.exams : Array.isArray(examsRes.value.data) ? examsRes.value.data : [];
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const upcomingExams = raw
            .filter((exam: any) => exam?.dueDate && new Date(exam.dueDate).getTime() >= startOfToday.getTime())
            .map((exam: any): UpcomingExam => ({
              _id: exam._id,
              title: exam.title ?? "Assessment",
              dueDate: exam.dueDate,
              subjectName: typeof exam.course === "string" ? exam.course : exam.course?.name ?? exam.subject?.name ?? null,
            }))
            .sort((a: UpcomingExam, b: UpcomingExam) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5);
          setExams(upcomingExams);
        }

        if (rotationRes.status === "fulfilled") {
          const schedules = Array.isArray(rotationRes.value.data?.schedules) ? rotationRes.value.data.schedules : Array.isArray(rotationRes.value.data) ? rotationRes.value.data : [];
          const studentId = user?._id ? String(user._id) : "";
          const normalized = schedules.flatMap((schedule: any) => {
            const timeline = Array.isArray(schedule?.meta?.timeline) ? schedule.meta.timeline : [];
            return timeline.flatMap((window: any, index: number) => {
              const view = buildTimelineWindowView(schedule, window, index, studentId);
              return view.matchesStudent ? [view] : [];
            });
          });
          normalized.sort((a: any, b: any) => (a.startDate?.getTime?.() ?? 0) - (b.startDate?.getTime?.() ?? 0));
          setWindows(normalized.filter((w: any) => w.status !== "completed").slice(0, 3));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [classId, user]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Your next posting windows, exams and deadlines in one place.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/board">Back to Portal</Link></Button>
            <Button asChild size="sm"><Link to="/student/schedule/calendar">Calendar</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[.2em] text-muted-foreground">Next clinical posting windows</p>
                {windows.length ? (
                  <div className="space-y-3">
                    {windows.map((window) => (
                      <div key={window.id} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">{window.postingName}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{window.departmentName} · {window.departmentGroupLabel} · {window.unitGroupLabel}</p>
                          </div>
                          <span className={"shrink-0 rounded-full px-3 py-1 text-xs font-medium " + (window.status === "current" ? "bg-emerald-500/10 text-emerald-600" : "bg-sky-500/10 text-sky-600")}>
                            {window.status === "current" ? "Current" : "Upcoming"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {window.startDate?.toLocaleDateString("en", { dateStyle: "medium" })} – {window.endDate?.toLocaleDateString("en", { dateStyle: "medium" })} · {window.durationLabel}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                    No upcoming posting windows were found for your class yet.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[.2em] text-muted-foreground">Exams, tests &amp; deadlines</p>
                {exams.length ? (
                  <div className="space-y-2">
                    {exams.map((exam) => (
                      <div key={exam._id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background p-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{exam.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{exam.subjectName ?? "—"}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          Due {new Date(exam.dueDate).toLocaleDateString("en", { dateStyle: "medium" })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                    No upcoming exams or tests right now.
                  </div>
                )}
              </section>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/rotation-schedule"><Stethoscope className="mr-1 h-4 w-4" /> Rotation schedule</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/lms/exams"><ClipboardList className="mr-1 h-4 w-4" /> All assessments</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/student/schedule/today">Today <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
