import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Loader2, Save, ShieldCheck } from "lucide-react";
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

// PR A2 (G2) — admin eligibility & clearance management: institution
// eligibility policy, per-student fees/clearance recording (manual entry v1)
// and the live eligibility evaluation that drives the result-release gate.

interface EligibilityPolicy {
  caThresholdPercent: number;
  attendanceCutoffPercent: number;
  requireSchoolFees: boolean;
  requireDepartmentalClearance: boolean;
}

interface FinanceItem {
  kind: "school_fees" | "departmental_clearance";
  label: string;
  amount: number;
  currency: string;
  paid: boolean;
  paidAt: string | null;
  note: string;
}

interface Evaluation {
  eligible: boolean;
  issues: string[];
  feesPaid: boolean;
  clearancePaid: boolean;
  attendancePercent: number | null;
  attendanceTracked: boolean;
  hasCa: boolean;
  caAveragePercent: number | null;
}

interface StudentOption {
  _id: string;
  name?: string;
  idNumber?: string;
  email?: string;
}

const EligibilityAdmin = () => {
  // Policy
  const [policy, setPolicy] = useState<EligibilityPolicy>({
    caThresholdPercent: 40,
    attendanceCutoffPercent: 75,
    requireSchoolFees: true,
    requireDepartmentalClearance: true,
  });
  const [policyLoading, setPolicyLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Students
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");

  // Clearance
  const [finance, setFinance] = useState<FinanceItem[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [clearanceLoading, setClearanceLoading] = useState(false);
  const [savingClearance, setSavingClearance] = useState(false);

  const loadPolicy = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const res = await api.get("/eligibility/policy");
      const p = res.data?.policy;
      if (p) {
        setPolicy({
          caThresholdPercent: Number(p.caThresholdPercent ?? 40),
          attendanceCutoffPercent: Number(p.attendanceCutoffPercent ?? 75),
          requireSchoolFees: p.requireSchoolFees === true,
          requireDepartmentalClearance: p.requireDepartmentalClearance === true,
        });
      }
    } catch {
      toast.error("Failed to load eligibility policy");
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
      const res = await api.put("/eligibility/policy", { policy });
      const p = res.data?.policy;
      if (p) {
        setPolicy({
          caThresholdPercent: Number(p.caThresholdPercent ?? policy.caThresholdPercent),
          attendanceCutoffPercent: Number(p.attendanceCutoffPercent ?? policy.attendanceCutoffPercent),
          requireSchoolFees: p.requireSchoolFees === true,
          requireDepartmentalClearance: p.requireDepartmentalClearance === true,
        });
      }
      toast.success("Eligibility policy saved");
    } catch {
      toast.error("Failed to save eligibility policy");
    } finally {
      setSavingPolicy(false);
    }
  };

  const loadClearance = useCallback(async (id: string) => {
    if (!id) return;
    setClearanceLoading(true);
    try {
      const res = await api.get("/eligibility/students/" + id);
      const data = res.data ?? {};
      setFinance(Array.isArray(data.finance?.items) ? data.finance.items : []);
      setEvaluation(data.evaluation ?? null);
    } catch {
      toast.error("Failed to load student clearance");
    } finally {
      setClearanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) void loadClearance(studentId);
    else {
      setFinance([]);
      setEvaluation(null);
    }
  }, [studentId, loadClearance]);

  const updateItem = (kind: FinanceItem["kind"], patch: Partial<FinanceItem>) => {
    setFinance((prev) => {
      const next = [...prev];
      const idx = next.findIndex((i) => i.kind === kind);
      if (idx >= 0) next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const itemFor = (kind: FinanceItem["kind"]) =>
    finance.find((i) => i.kind === kind);

  const saveClearance = async () => {
    if (!studentId) return;
    setSavingClearance(true);
    try {
      const items = (["school_fees", "departmental_clearance"] as const).map((kind) => {
        const existing = itemFor(kind);
        return {
          kind,
          label: existing?.label ?? (kind === "school_fees" ? "School fees" : "Departmental clearance"),
          amount: Number(existing?.amount ?? 0),
          paid: existing?.paid === true,
          note: existing?.note ?? "",
        };
      });
      await api.put("/eligibility/students/" + studentId, { items });
      toast.success("Clearance saved for " + (studentName || "student"));
      await loadClearance(studentId);
    } catch {
      toast.error("Failed to save clearance");
    } finally {
      setSavingClearance(false);
    }
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

  const selected = students.find((s) => s._id === studentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Eligibility &amp; Clearance</h1>
        <p className="text-muted-foreground">
          Set the exam-eligibility policy and record fees / departmental clearance per
          student. Students with outstanding issues still sit exams, but their results
          are withheld from release until cleared.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-4 w-4 text-primary" /> Eligibility policy
          </CardTitle>
          <CardDescription>
            Applied automatically when course results are released. Changes apply on the
            next release/recompute.
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
                  <Label htmlFor="caThresholdPercent">CA average threshold (%)</Label>
                  <Input
                    id="caThresholdPercent"
                    type="number"
                    min={0}
                    max={100}
                    value={policy.caThresholdPercent}
                    onChange={(e) => setPolicy({ ...policy, caThresholdPercent: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="attendanceCutoffPercent">Attendance cutoff (%)</Label>
                  <Input
                    id="attendanceCutoffPercent"
                    type="number"
                    min={0}
                    max={100}
                    value={policy.attendanceCutoffPercent}
                    onChange={(e) => setPolicy({ ...policy, attendanceCutoffPercent: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={policy.requireSchoolFees}
                    onChange={(e) => setPolicy({ ...policy, requireSchoolFees: e.target.checked })}
                  />
                  Require school fees paid
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={policy.requireDepartmentalClearance}
                    onChange={(e) => setPolicy({ ...policy, requireDepartmentalClearance: e.target.checked })}
                  />
                  Require departmental clearance
                </label>
              </div>
              <Button onClick={() => void savePolicy()} disabled={savingPolicy}>
                {savingPolicy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Save policy
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BadgeCheck className="h-4 w-4 text-primary" /> Student clearance
          </CardTitle>
          <CardDescription>
            Pick a student to view their eligibility evaluation and record school fees /
            departmental clearance (manual entry in this version).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentSearch">Find student</Label>
            <Input
              id="studentSearch"
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
                    onClick={() => {
                      setStudentId(s._id);
                      setStudentName(s.name || "");
                    }}
                  >
                    <span className="font-medium">{s.name}</span>
                    {s.idNumber ? <span className="text-muted-foreground"> · {s.idNumber}</span> : null}
                    {s.email ? <span className="text-muted-foreground"> · {s.email}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && clearanceLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : selected ? (
            <>
              {evaluation && (
                <div className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    {evaluation.eligible ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600">Eligible</Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600">Outstanding issues</Badge>
                    )}
                    {evaluation.attendanceTracked ? (
                      <Badge variant="secondary">Attendance {evaluation.attendancePercent}%</Badge>
                    ) : (
                      <Badge variant="secondary">Attendance not tracked</Badge>
                    )}
                    {evaluation.hasCa ? (
                      <Badge variant="secondary">CA {evaluation.caAveragePercent}%</Badge>
                    ) : (
                      <Badge variant="secondary">No CA record</Badge>
                    )}
                  </div>
                  {evaluation.issues.length > 0 ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {evaluation.issues.map((issue, idx) => (
                        <li key={idx}>• {issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No outstanding issues.</p>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {(["school_fees", "departmental_clearance"] as const).map((kind) => {
                  const item = itemFor(kind);
                  return (
                    <div key={kind} className="space-y-2 rounded-xl border p-3">
                      <Label>{kind === "school_fees" ? "School fees" : "Departmental clearance"}</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item?.paid === true}
                          onChange={(e) => updateItem(kind, { paid: e.target.checked })}
                        />
                        Paid / complete
                      </label>
                      <Input
                        type="number"
                        placeholder="Amount (NGN, optional)"
                        value={item?.amount ?? 0}
                        onChange={(e) => updateItem(kind, { amount: Number(e.target.value) })}
                      />
                      <Input
                        placeholder="Note (optional)"
                        value={item?.note ?? ""}
                        onChange={(e) => updateItem(kind, { note: e.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
              <Button onClick={() => void saveClearance()} disabled={savingClearance}>
                {savingClearance ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Save clearance
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              Select a student above to manage their clearance.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EligibilityAdmin;
