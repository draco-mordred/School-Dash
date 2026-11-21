import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send, ShieldCheck, Undo2 } from "lucide-react"; // PR A2 (G2)
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// PR A1 (G1) — staff course results: pick a course, view computed course grades
// (CA average + major exam, institution weights), recompute, and
// release/unrelease results (admin, via the G2 result-release gate).

interface CourseOption {
  _id: string;
  name: string;
  code?: string;
  courseID?: string;
}

interface ResultRow {
  _id: string;
  student?: { _id?: string; name?: string; idNumber?: string; email?: string };
  class?: { name?: string } | null;
  caTestCount: number;
  caAveragePercent: number;
  examPercent: number;
  weightedPercent: number;
  letter: string;
  gradePoints: number;
  creditUnits: number;
  passed: boolean;
  released?: boolean;
  withheld?: boolean;
  withheldReasons?: string[];
  adminOverride?: boolean;
}

const CourseResults = () => {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [recomputing, setRecomputing] = useState(false);
  const [overridingId, setOverridingId] = useState<string | null>(null); // PR A2 (G2)

  const { user } = useAuth();
  const role = (user as any)?.role ?? "";

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/courses");
      const data = res.data;
      const list: CourseOption[] = Array.isArray(data)
        ? data
        : (data?.courses ?? data?.docs ?? []);
      setCourses(list.filter((c) => c && c._id));
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const loadResults = useCallback(async (id: string) => {
    if (!id) {
      setResults([]);
      return;
    }
    setResultsLoading(true);
    try {
      const res = await api.get("/grades/courses/" + id);
      setResults(Array.isArray(res.data?.results) ? res.data.results : []);
    } catch {
      toast.error("Failed to load course results");
    } finally {
      setResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (courseId) void loadResults(courseId);
    else setResults([]);
  }, [courseId, loadResults]);

  const recompute = async () => {
    if (!courseId) return;
    setRecomputing(true);
    try {
      const res = await api.post("/grades/courses/" + courseId + "/recompute", {});
      const n = res.data?.updated ?? 0;
      toast.success((n === 1 ? "1 student result" : n + " student results") + " recomputed");
      await loadResults(courseId);
    } catch {
      toast.error("Recompute failed");
    } finally {
      setRecomputing(false);
    }
  };

  const setReleased = async (released: boolean) => {
    if (!courseId) return;
    try {
      const res = await api.post("/grades/courses/" + courseId + "/release", { released });
      const data = res.data ?? {};
      const updated = typeof data.updated === "number" ? data.updated : 0;
      const withheldCount = typeof data.withheld === "number" ? data.withheld : 0;
      toast.success(
        released
          ? "Release complete: " + updated + " released" + (withheldCount > 0 ? ", " + withheldCount + " withheld pending eligibility" : "")
          : "Results unreleased"
      );
      await loadResults(courseId);
    } catch {
      toast.error("Failed to update release status");
    }
  };

  // PR A2 (G2) — per-student release-gate override (admin only).
  const toggleOverride = async (gradeId: string, sId: string, override: boolean) => {
    if (!courseId) return;
    setOverridingId(gradeId);
    try {
      await api.post("/eligibility/grades/" + courseId + "/students/" + sId + "/override", { override });
      toast.success(override ? "Release override enabled" : "Release override removed");
      await loadResults(courseId);
    } catch {
      toast.error("Failed to update release override");
    } finally {
      setOverridingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      ((c.name || "") + " " + (c.code || "") + " " + (c.courseID || "")).toLowerCase().includes(q)
    );
  }, [courses, search]);

  const selectedCourse = courses.find((c) => c._id === courseId);
  const isTeacherRole = role === "teacher" || role === "unitconsultant" || role === "unitresident";
  const isAdmin = role === "admin"; // PR A2 (G2)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Course Results</h1>
        <p className="text-muted-foreground">
          Course grades from CA tests and the major exam, weighted by institution policy.
          {role === "teacher" || role === "unitconsultant" || role === "unitresident" ? " You can manage grades for courses you lecture." : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select course</CardTitle>
          <CardDescription>Pick the course to view or compute grades for.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-2 md:max-w-md">
                <Label htmlFor="course-search">Search</Label>
                <Input
                  id="course-search"
                  placeholder="Filter courses by name or code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No courses found.</p>
                ) : (
                  filtered.map((c) => {
                    const active = c._id === courseId;
                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => setCourseId(c._id)}
                        className={
                          "rounded-xl border p-4 text-left transition " +
                          (active
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "bg-card/80 hover:border-primary/40 hover:shadow-sm")
                        }
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.code || c.courseID}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {courseId && (
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedCourse ? selectedCourse.name : "Results"}
              </CardTitle>
              <CardDescription>
                {results.length} student result{results.length === 1 ? "" : "s"} on record
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void recompute()} disabled={recomputing}>
                {recomputing ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                Recompute grades
              </Button>
              {!isTeacherRole && (
                <>
                  <Button variant="outline" onClick={() => void setReleased(true)}>
                    <Send className="mr-1 h-4 w-4" /> Release
                  </Button>
                  <Button variant="outline" onClick={() => void setReleased(false)}>
                    <Undo2 className="mr-1 h-4 w-4" /> Unrelease
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {resultsLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                No results yet for this course. Run "Recompute grades" after students submit
                CA tests or the major exam.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Student</th>
                      <th className="px-3 py-2">CA %</th>
                      <th className="px-3 py-2">Exam %</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Grade</th>
                      <th className="px-3 py-2">Units</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r._id} className="border-b last:border-0">
                        <td className="py-3 pr-3">
                          <div className="font-medium">{r.student?.name ?? "Unknown student"}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.student?.idNumber ?? r.student?.email ?? ""}
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
                        <td className="px-3 py-3">{r.creditUnits}</td>
                        <td className="px-3 py-3">
                          {r.withheld ? (
                            <div className="space-y-1">
                              <Badge className="bg-amber-500/15 text-amber-600">Withheld</Badge>
                              {(r.withheldReasons ?? []).length > 0 && (
                                <div className="max-w-[220px] text-xs text-muted-foreground">
                                  {(r.withheldReasons ?? []).join(", ")}
                                </div>
                              )}
                              {isAdmin && r.student?._id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={overridingId === r._id}
                                  onClick={() => void toggleOverride(r._id, r.student!._id!, !r.adminOverride)}
                                >
                                  {overridingId === r._id ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                  )}
                                  {r.adminOverride ? "Remove override" : "Override release"}
                                </Button>
                              )}
                            </div>
                          ) : r.released ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600">
                              Released{r.adminOverride ? " (override)" : ""}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not released</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourseResults;
