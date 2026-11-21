import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Award, BookOpen, Clock, Loader2, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// PR A1 (G1) — student "My Results": released course grades + GPA (5.0 scale),
// and the withheld list (result-release gate, G2) with reasons and no scores.

interface GradeBand {
  letter: string;
  minPercent: number;
  gradePoints: number;
}

interface CourseGradeRow {
  _id: string;
  course: { _id?: string; name?: string; code?: string; courseID?: string; creditUnits?: number };
  class?: { name?: string } | null;
  caTestCount: number;
  caAverageRaw: number;
  caAveragePercent: number;
  examPercent: number;
  weightedPercent: number;
  letter: string;
  gradePoints: number;
  creditUnits: number;
  passed: boolean;
  hasCa: boolean;
  hasExam: boolean;
}

interface EligibilityInfo {
  eligible: boolean;
  issues: string[];
  feesPaid: boolean;
  clearancePaid: boolean;
  attendancePercent: number | null;
  attendanceTracked: boolean;
  hasCa: boolean;
  caAveragePercent: number | null;
}

interface ProgressionInfo {
  studentName: string;
  className: string | null;
  currentStep: { id: string; label: string } | null;
  nextStep: { id: string; label: string } | null;
  clockPhase: { phaseName: string | null; configured: boolean } | null;
  clockSynced: boolean;
  evaluation: { pendingCount: number; blockers: string[] };
}

interface WithheldRow {
  _id: string;
  course: { name?: string; code?: string };
  withheldReasons?: string[];
}

const MyResults = () => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<CourseGradeRow[]>([]);
  const [withheld, setWithheld] = useState<WithheldRow[]>([]);
  const [gpa, setGpa] = useState<number | null>(null);
  const [gpaScale, setGpaScale] = useState(5);
  const [bands, setBands] = useState<GradeBand[]>([]);
  const [elig, setElig] = useState<EligibilityInfo | null>(null); // PR A2 (G2)
  const [prog, setProg] = useState<ProgressionInfo | null>(null); // PR A3 (G3)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, polRes, eligRes, progRes] = await Promise.all([
        api.get("/grades/my"),
        api.get("/grades/policy").catch(() => null),
        api.get("/eligibility/me").catch(() => null), // PR A2 (G2)
        api.get("/progression/my").catch(() => null), // PR A3 (G3)
      ]);
      const data = res.data ?? {};
      setResults(Array.isArray(data.results) ? data.results : []);
      setWithheld(Array.isArray(data.withheldResults) ? data.withheldResults : []);
      setGpa(typeof data.gpa === "number" ? data.gpa : null);
      if (typeof data.gpaScale === "number") setGpaScale(data.gpaScale);
      const ev = eligRes?.data?.evaluation ?? null;
      setElig(ev); // PR A2 (G2)
      setProg(progRes?.data?.progression ?? null); // PR A3 (G3)
      const pol = polRes?.data?.policy;
      if (pol && Array.isArray(pol.gradeBands)) setBands(pol.gradeBands);
    } catch {
      toast.error("Failed to load your results");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);


  const courseLabel = (c: CourseGradeRow["course"]) =>
    ((c.code || c.courseID || "") + " " + (c.name || "")).trim() || "Course";

  const totalCredits = results.reduce((s, r) => s + (r.creditUnits || 1), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">My Results</h1>
        <p className="text-muted-foreground">
          Course grades (CA + exam) and your GPA. Only released results appear here.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading results...</span>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardDescription>Current GPA</CardDescription>
                <CardTitle className="flex items-center gap-2 text-4xl">
                  <Award className="h-7 w-7 text-primary" />
                  {gpa === null ? "-" : gpa.toFixed(2)}
                  <span className="text-base font-normal text-muted-foreground">/ {gpaScale}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {results.length} graded course{results.length === 1 ? "" : "s"}
                  {totalCredits > 0 ? " · " + totalCredits + " credit units" : ""}
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardDescription>Grade scale</CardDescription>
                <CardTitle className="text-base font-medium">
                  {bands.length > 0
                    ? bands
                        .slice()
                        .sort((a, b) => b.minPercent - a.minPercent)
                        .map((b) => b.letter + " ≥ " + b.minPercent + "%")
                        .join(" · ")
                    : "Default scale applies"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Course results</CardTitle>
              <CardDescription>
                CA = average of cumulative CA tests, exam = major exam, combined with the
                institution's configured weights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  No released results yet. Grades appear here once an admin releases them.
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={() => void load()}>
                      <RefreshCw className="mr-1 h-4 w-4" /> Refresh
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Course</th>
                        <th className="px-3 py-2">CA</th>
                        <th className="px-3 py-2">Exam</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2">Grade</th>
                        <th className="px-3 py-2">Points</th>
                        <th className="px-3 py-2">Units</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r._id} className="border-b last:border-0">
                          <td className="py-3 pr-3">
                            <div className="font-medium">{courseLabel(r.course)}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.caTestCount} CA test{r.caTestCount === 1 ? "" : "s"}
                              {r.hasExam ? "" : " · no exam yet"}
                            </div>
                          </td>
                          <td className="px-3 py-3">{r.caAveragePercent}%</td>
                          <td className="px-3 py-3">{r.examPercent}%</td>
                          <td className="px-3 py-3 font-semibold">{r.weightedPercent}%</td>
                          <td className="px-3 py-3">
                            <Badge
                              className={
                                r.passed
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-red-500/15 text-red-600"
                              }
                            >
                              {r.letter}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">{r.gradePoints}</td>
                          <td className="px-3 py-3">{r.creditUnits}</td>
                          <td className="px-3 py-3">
                            <span
                              className={
                                "text-xs font-medium " +
                                (r.passed ? "text-emerald-600" : "text-red-600")
                              }
                            >
                              {r.passed ? "Passed" : "Not passed"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-4 w-4 text-amber-500" /> Withheld results
              </CardTitle>
              <CardDescription>
                These course results are held back until you clear the issues listed below
                (eligibility: fees, clearance, attendance or CA).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {withheld.length === 0 ? (
                <p className="text-sm text-muted-foreground">No withheld results.</p>
              ) : (
                <ul className="space-y-2">
                  {withheld.map((w) => (
                    <li key={w._id} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">{courseLabel(w.course)}</div>
                      <div className="text-xs text-muted-foreground">
                        {(w.withheldReasons ?? []).join(", ") || "Contact the admin office"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {prog && prog.currentStep && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-4 w-4 text-primary" />
                  My progression
                </CardTitle>
                <CardDescription>
                  Your position on the exam-cycle ladder
                  {prog.className ? " (class: " + prog.className + ")" : ""} and academic-clock sync.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{prog.currentStep.id}</Badge>
                  {prog.nextStep ? (
                    <Badge>{prog.nextStep.id} next</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/15 text-emerald-600">Graduation next</Badge>
                  )}
                  {prog.clockPhase && (
                    <Badge variant="secondary">
                      {prog.clockPhase.phaseName ?? "unknown phase"}
                      {prog.clockSynced ? " (synced)" : " (not synced)"}
                    </Badge>
                  )}
                </div>
                {prog.currentStep.label && prog.currentStep.label !== prog.currentStep.id && (
                  <p className="mt-2 text-xs text-muted-foreground">{prog.currentStep.label}</p>
                )}
                {prog.evaluation.blockers.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {prog.evaluation.blockers.map((b, i) => (
                      <li key={i}>• {b}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {elig && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className={"h-4 w-4 " + (elig.eligible ? "text-emerald-600" : "text-amber-500")} />
                  Exam eligibility
                </CardTitle>
                <CardDescription>
                  {elig.eligible
                    ? "You are currently clear to sit exams and receive results."
                    : "The outstanding items below withhold your results until cleared (or an admin override is set)."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">School fees {elig.feesPaid ? "paid" : "unpaid"}</Badge>
                  <Badge variant="secondary">Clearance {elig.clearancePaid ? "complete" : "missing"}</Badge>
                  <Badge variant="secondary">
                    Attendance {elig.attendanceTracked ? elig.attendancePercent + "%" : "not tracked"}
                  </Badge>
                  <Badge variant="secondary">CA {elig.hasCa ? elig.caAveragePercent + "%" : "no record"}</Badge>
                </div>
                {elig.issues.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {elig.issues.map((issue, idx) => (
                      <li key={idx}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Link to="/lms/exams" className="text-sm text-primary underline-offset-4 hover:underline">
              <BookOpen className="mr-1 inline h-4 w-4" /> Take an assessment
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default MyResults;
