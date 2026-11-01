// PR E1 — real page for /student/academics/overview (was a generic
// StudentSection placeholder). Reuses the student portal's existing card
// data: attendance summary (/attendance/student-notifications), posting
// window (/clinical-attendance/my-team) and logbook progress
// (/activity-entries/student/:id).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryLike {
  className: string | null;
  academicYear: string | null;
  todayDay: string | null;
  totalAttended: number;
  totalClasses: number;
  percentage: number;
}

export default function StudentAcademicsOverviewPage() {
  const { user, year } = useAuth();
  const [summary, setSummary] = useState<SummaryLike | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [logbook, setLogbook] = useState<{ approved: number; total: number }>({ approved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "student") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const studentId = user._id ?? (user as any).id;
        const [summaryRes, teamRes, entriesRes] = await Promise.allSettled([
          api.get("/attendance/student-notifications"),
          api.get("/clinical-attendance/my-team"),
          studentId ? api.get(`/activity-entries/student/${studentId}`) : Promise.resolve({ data: { entries: [] } }),
        ]);
        if (cancelled) return;
        if (summaryRes.status === "fulfilled") setSummary(summaryRes.value.data ?? null);
        if (teamRes.status === "fulfilled") setTeam(teamRes.value.data?.data?.team ?? null);
        if (entriesRes.status === "fulfilled") {
          const entries = Array.isArray(entriesRes.value.data?.entries) ? entriesRes.value.data.entries : [];
          const approved = entries.filter((e: any) => String(e?.approvalStatus ?? e?.status ?? "").toLowerCase() === "approved").length;
          setLogbook({ approved, total: entries.length });
        }
        if (summaryRes.status === "rejected") setError("Unable to load your academic summary right now.");
      } catch {
        if (!cancelled) setError("Unable to load your academic summary right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user]);

  const cards = useMemo(() => [
    { title: "Attendance rate", value: summary ? summary.percentage + "%" : "—", hint: "of completed classes" },
    { title: "Classes attended", value: summary ? `${summary.totalAttended} / ${summary.totalClasses}` : "—", hint: summary?.todayDay ? `Today is ${summary.todayDay}` : "current academic year" },
    {
      title: "Posting window",
      value: team?.postingName ?? "Not in a posting",
      hint: team?.window?.startDate && team?.window?.endDate
        ? `${new Date(team.window.startDate).toLocaleDateString()} – ${new Date(team.window.endDate).toLocaleDateString()}`
        : team?.daysTotal ? `${team.daysElapsed ?? 0} of ${team.daysTotal} days` : "updates automatically once a posting starts",
    },
    {
      title: "Logbook progress",
      value: `${logbook.approved} approved`,
      hint: logbook.total ? `${logbook.total} total entries` : "no entries submitted yet",
    },
  ], [summary, team, logbook]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Academics Overview</CardTitle>
            <CardDescription>
              Your academic progress at a glance — attendance, posting window and logbook for {year?.name ?? "the current academic year"}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div key={card.title} className="rounded-3xl border border-border/70 bg-muted/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-[.2em] text-muted-foreground">{card.title}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/student/attendance/history"><ClipboardList className="mr-1 h-4 w-4" /> Attendance history</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/timetable"><CalendarDays className="mr-1 h-4 w-4" /> Timetable</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/student/logbook/statistics"><BookOpen className="mr-1 h-4 w-4" /> Logbook statistics</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/board">Portal <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
