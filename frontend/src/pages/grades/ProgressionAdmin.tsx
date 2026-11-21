import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Clock,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users2,
} from "lucide-react";
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

// PR A3 (G3) — admin progression & clock-sync management: institute progression
// policy (pass mark, release/clock gates, exam-cycle ladder) and per-student
// evaluation with advance / repeat / hold decisions (manual, audited).

interface LadderStep {
  id: string;
  label: string;
  exam?: string | null;
}

interface ProgressionPolicy {
  passMarkPercent: number;
  requireAllReleased: boolean;
  clockSyncRequired: boolean;
  ladder: LadderStep[];
}

interface ProgressionSnapshot {
  studentName: string;
  className: string | null;
  currentStep: LadderStep | null;
  nextStep: LadderStep | null;
  repeatStep: LadderStep | null;
  clockPhase: { phaseName: string | null; startsAt: string | null; endsAt: string | null; configured: boolean } | null;
  clockSynced: boolean;
  evaluation: {
    gradedCount: number;
    failedCount: number;
    pendingCount: number;
    unreleasedCount: number;
    withheldCount: number;
    missingExamCount: number;
    passedAll: boolean;
    readyToAdvance: boolean;
    blockers: string[];
  };
  history: Array<{
    _id: string;
    decision: string;
    fromStep?: string | null;
    toStep?: string | null;
    blockers?: string[];
    notes?: string | null;
    createdAt: string;
  }>;
}

interface StudentOption {
  _id: string;
  name?: string;
  idNumber?: string;
  email?: string;
}

const ProgressionAdmin = () => {
  // Policy
  const [policy, setPolicy] = useState<ProgressionPolicy>({
    passMarkPercent: 50,
    requireAllReleased: true,
    clockSyncRequired: false,
    ladder: [],
  });
  const [policyLoading, setPolicyLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Students
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");

  // Snapshot
  const [snapshot, setSnapshot] = useState<ProgressionSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [deciding, setDeciding] = useState(false);

  const loadPolicy = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const res = await api.get("/progression/policy");
      const p = res.data?.policy;
      if (p) {
        setPolicy({
          passMarkPercent: Number(p.passMarkPercent ?? 50),
          requireAllReleased: p.requireAllReleased === true,
          clockSyncRequired: p.clockSyncRequired === true,
          ladder: Array.isArray(p.ladder) ? p.ladder : [],
        });
      }
    } catch {
      toast.error("Failed to load progression policy");
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await api.get("/users");
      const data = res.data;
      const list: StudentOption[] = Array.isArray(data)
        ? data
        : (data?.users ?? data?.docs ?? data?.data ?? []);
      setStudents(list.filter((u) => u && u._id && u.name));
    } catch {
      toast.error("Failed to load students");
    }
  }, []);

  useEffect(() => {
    void loadPolicy();
    void loadStudents();
  }, [loadPolicy, loadStudents]);

  const savePolicy = async () => {
    setSavingPolicy(true);
    try {
      const res = await api.put("/progression/policy", {
        passMarkPercent: policy.passMarkPercent,
        requireAllReleased: policy.requireAllReleased,
        clockSyncRequired: policy.clockSyncRequired,
        ladder: policy.ladder,
      });
      const p = res.data?.policy;
      if (p && Array.isArray(p.ladder)) {
        setPolicy({
          passMarkPercent: Number(p.passMarkPercent ?? policy.passMarkPercent),
          requireAllReleased: p.requireAllReleased === true,
          clockSyncRequired: p.clockSyncRequired === true,
          ladder: p.ladder,
        });
      }
      toast.success("Progression policy saved");
    } catch {
      toast.error("Failed to save progression policy");
    } finally {
      setSavingPolicy(false);
    }
  };

  const loadSnapshot = useCallback(async (id: string) => {
    if (!id) return;
    setSnapshotLoading(true);
    try {
      const res = await api.get("/progression/students/" + id);
      setSnapshot(res.data?.progression ?? null);
    } catch {
      toast.error("Failed to load student progression");
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) void loadSnapshot(studentId);
    else setSnapshot(null);
  }, [studentId, loadSnapshot]);

  const decide = async (decision: "advance" | "repeat" | "hold") => {
    if (!studentId) return;
    setDeciding(true);
    try {
      await api.post("/progression/students/" + studentId + "/decide", {
        decision,
        notes: notes.trim() || undefined,
      });
      toast.success(
        decision === "advance"
          ? "Student advanced"
          : decision === "repeat"
            ? "Student set to repeat"
            : "Decision recorded: hold"
      );
      setNotes("");
      await loadSnapshot(studentId);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Progression decision failed");
    } finally {
      setDeciding(false);
    }
  };

  const updateStep = (index: number, patch: Partial<LadderStep>) => {
    setPolicy((prev) => {
      const ladder = [...prev.ladder];
      ladder[index] = { ...ladder[index], ...patch };
      return { ...prev, ladder };
    });
  };

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    return students
      .filter((s) =>
        ((s.name || "") + " " + (s.idNumber || "") + " " + (s.email || ""))
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 8);
  }, [students, search]);

  const ev = snapshot?.evaluation;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Progression</h1>
        <p className="text-muted-foreground">
          Configure the exam-cycle ladder and decide when students advance. Decisions are
          audited; advancing past the final step graduates the student.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-4 w-4 text-primary" /> Progression policy
          </CardTitle>
          <CardDescription>
            Gates and the ladder of exam-cycle steps. Advancing past the last step
            graduates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {policyLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="passMarkPercent">Pass mark (%)</Label>
                  <Input
                    id="passMarkPercent"
                    type="number"
                    min={0}
                    max={100}
                    value={policy.passMarkPercent}
                    onChange={(e) => setPolicy({ ...policy, passMarkPercent: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2 pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={policy.requireAllReleased}
                      onChange={(e) => setPolicy({ ...policy, requireAllReleased: e.target.checked })}
                    />
                    All results must be released (and not withheld) to advance
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={policy.clockSyncRequired}
                      onChange={(e) => setPolicy({ ...policy, clockSyncRequired: e.target.checked })}
                    />
                    Class academic clock must be configured/synced to advance
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ladder steps (ordered)</Label>
                {policy.ladder.map((s, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border p-2">
                    <Input
                      className="w-24"
                      placeholder="id"
                      value={s.id}
                      onChange={(e) => updateStep(i, { id: e.target.value })}
                    />
                    <Input
                      className="min-w-[220px] flex-1"
                      placeholder="Label"
                      value={s.label}
                      onChange={(e) => updateStep(i, { label: e.target.value })}
                    />
                    <Input
                      className="w-44"
                      placeholder="Exam (optional)"
                      value={s.exam ?? ""}
                      onChange={(e) => updateStep(i, { exam: e.target.value || null })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove step"
                      onClick={() =>
                        setPolicy((prev) => ({
                          ...prev,
                          ladder: prev.ladder.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPolicy((prev) => ({
                        ...prev,
                        ladder: [...prev.ladder, { id: "", label: "", exam: null }],
                      }))
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add step
                  </Button>
                  <Button onClick={() => void savePolicy()} disabled={savingPolicy}>
                    {savingPolicy ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    Save policy
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users2 className="h-4 w-4 text-primary" /> Student progression
          </CardTitle>
          <CardDescription>
            Pick a student to see their ladder position, clock sync and readiness.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="progStudentSearch">Find student</Label>
            <Input
              id="progStudentSearch"
              placeholder="Search by name, ID number or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filteredStudents.length > 0 && (
              <div className="rounded-xl border">
                {filteredStudents.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    className={
                      "block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/40 " +
                      (s._id === studentId ? "bg-primary/10" : "")
                    }
                    onClick={() => setStudentId(s._id)}
                  >
                    <span className="font-medium">{s.name}</span>
                    {s.idNumber ? <span className="text-muted-foreground"> · {s.idNumber}</span> : null}
                    {s.email ? <span className="text-muted-foreground"> · {s.email}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {studentId && snapshotLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : snapshot ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{snapshot.currentStep?.id ?? "no step"}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                {snapshot.nextStep ? (
                  <Badge>{snapshot.nextStep.id}</Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-600">Graduation</Badge>
                )}
                {snapshot.clockPhase && (
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    {snapshot.clockPhase.phaseName ?? "unknown phase"}
                    {snapshot.clockSynced ? " (synced)" : " (not synced)"}
                  </Badge>
                )}
                {ev && (ev.readyToAdvance ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600">Ready to advance</Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-600">Not ready</Badge>
                ))}
              </div>
              {snapshot.repeatStep && (
                <p className="text-xs text-muted-foreground">
                  On a fail here, the student repeats: {snapshot.repeatStep.label || snapshot.repeatStep.id}
                </p>
              )}
              {ev && (
                <p className="text-sm text-muted-foreground">
                  Graded {ev.gradedCount} · failed {ev.failedCount} · pending {ev.pendingCount}
                  (unreleased {ev.unreleasedCount}, withheld {ev.withheldCount}) · missing
                  exam {ev.missingExamCount}
                </p>
              )}
              {ev && ev.blockers.length > 0 && (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {ev.blockers.map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
              )}

              <div className="space-y-2">
                <Label htmlFor="decisionNotes">Decision notes (optional)</Label>
                <Input
                  id="decisionNotes"
                  placeholder="e.g. Passed 3rd MBBS, cleared all courses"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void decide("advance")} disabled={deciding}>
                  {deciding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1 h-4 w-4" />}
                  Advance
                </Button>
                <Button variant="outline" onClick={() => void decide("repeat")} disabled={deciding}>
                  Repeat
                </Button>
                <Button variant="outline" onClick={() => void decide("hold")} disabled={deciding}>
                  Hold
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Decision history</Label>
                {snapshot.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {snapshot.history.map((h) => (
                      <li key={h._id} className="rounded-lg border p-3 text-sm">
                        <div className="font-medium">
                          {h.fromStep ?? "?"} → {h.toStep ?? "?"} · {h.decision}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(h.createdAt).toLocaleString()}
                          {(h.blockers ?? []).length > 0 ? " · blockers: " + (h.blockers ?? []).join(", ") : ""}
                          {h.notes ? " · " + h.notes : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : studentId ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              No progression snapshot — check that the student is in a class that maps to a
              ladder step.
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              Select a student above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressionAdmin;
