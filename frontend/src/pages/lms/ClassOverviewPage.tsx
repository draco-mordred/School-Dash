import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, GraduationCap, UserRound, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const formatDate = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const StatCard = ({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <Card className="border-border/70 shadow-sm">
    <CardHeader className="space-y-1 pb-2">
      <CardDescription className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em]">
        {icon}
        {label}
      </CardDescription>
    </CardHeader>
    <CardContent className="pb-4">{children}</CardContent>
  </Card>
);

const ClassOverviewPage = () => {
  const { classId } = useParams();
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!classId) return;
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/classes/" + classId + "/overview");
        if (!cancelled) setOverview(data);
      } catch {
        if (!cancelled) setError("Could not load the class overview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  if (loading) {
    return (
      <div id="page-class-overview" className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div id="page-class-overview" className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Class overview unavailable</CardTitle>
            <CardDescription>{error || "Class not found."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/lms/materials">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to learning materials
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teacher = overview.classTeacher;
  const phase = overview.activePhase;

  return (
    <div id="page-class-overview" className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Class overview</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{overview.name || "Class"}</h1>
          {overview.academicYear?.name ? (
            <p className="mt-1 text-sm text-muted-foreground">Academic year: {overview.academicYear.name}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/lms/materials">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" icon={<Users className="h-3.5 w-3.5" />}>
          <p className="text-2xl font-semibold text-foreground">{overview.studentCount}</p>
          {overview.capacity ? (
            <p className="text-xs text-muted-foreground">Capacity: {overview.capacity}</p>
          ) : null}
        </StatCard>

        <StatCard label="Total courses" icon={<GraduationCap className="h-3.5 w-3.5" />}>
          <p className="text-2xl font-semibold text-foreground">{overview.courseCount}</p>
          <p className="text-xs text-muted-foreground">Courses assigned to this class</p>
        </StatCard>

        <StatCard label="Class teacher / HOD" icon={<UserRound className="h-3.5 w-3.5" />}>
          {teacher ? (
            <div>
              <p className="text-sm font-semibold text-foreground">{teacher.name || "Unnamed"}</p>
              {teacher.email ? <p className="truncate text-xs text-muted-foreground">{teacher.email}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not assigned yet</p>
          )}
        </StatCard>

        <StatCard label="Current posting / phase" icon={<CalendarClock className="h-3.5 w-3.5" />}>
          {phase ? (
            <div>
              <p className="truncate text-sm font-semibold text-foreground">{phase.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(phase.startsAt)} — {formatDate(phase.endsAt)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No academic clock configured for this class</p>
          )}
        </StatCard>
      </div>

      {phase ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Active posting details
            </CardTitle>
            <CardDescription>
              Resolved from the class academic clock (current phase).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-foreground">
              <span className="font-medium">Phase:</span> {phase.name}
            </p>
            {phase.postingType ? (
              <p className="text-foreground">
                <span className="font-medium">Posting type:</span> {phase.postingType}
              </p>
            ) : null}
            {phase.subPostings?.length ? (
              <div>
                <p className="font-medium text-foreground">Sub-postings:</p>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {phase.subPostings.map((sub: any, index: number) => (
                    <li key={index}>{typeof sub === "string" ? sub : sub?.name ?? "Sub-posting"}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Window:</span> {formatDate(phase.startsAt)} — {formatDate(phase.endsAt)}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default ClassOverviewPage;
