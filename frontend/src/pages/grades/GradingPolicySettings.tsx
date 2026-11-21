import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// PR A1 (G1) — admin grading policy settings: CA/exam weights, CA test max
// score, pass mark and the 5.0 grade bands. Stored on the institution's
// AssessmentSettings via PUT /grades/policy; JUTH values are seeded on boot.

interface GradeBand {
  letter: string;
  minPercent: number;
  gradePoints: number;
}

interface Policy {
  caWeightPercent: number;
  examWeightPercent: number;
  caTestMaxScore: number;
  gpaScale: number;
  passMarkPercent: number;
  gradeBands: GradeBand[];
}

const DEFAULTS: Policy = {
  caWeightPercent: 40,
  examWeightPercent: 60,
  caTestMaxScore: 25,
  gpaScale: 5,
  passMarkPercent: 50,
  gradeBands: [
    { letter: "A", minPercent: 70, gradePoints: 5 },
    { letter: "B", minPercent: 60, gradePoints: 4 },
    { letter: "C", minPercent: 50, gradePoints: 3 },
    { letter: "D", minPercent: 45, gradePoints: 2 },
    { letter: "E", minPercent: 40, gradePoints: 1 },
    { letter: "F", minPercent: 0, gradePoints: 0 },
  ],
};

const GradingPolicySettings = () => {
  const [policy, setPolicy] = useState<Policy>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/grades/policy");
      const p = res.data?.policy;
      if (p && typeof p === "object") {
        setPolicy({
          caWeightPercent: Number(p.caWeightPercent ?? DEFAULTS.caWeightPercent),
          examWeightPercent: Number(p.examWeightPercent ?? DEFAULTS.examWeightPercent),
          caTestMaxScore: Number(p.caTestMaxScore ?? DEFAULTS.caTestMaxScore),
          gpaScale: Number(p.gpaScale ?? DEFAULTS.gpaScale),
          passMarkPercent: Number(p.passMarkPercent ?? DEFAULTS.passMarkPercent),
          gradeBands:
            Array.isArray(p.gradeBands) && p.gradeBands.length > 0
              ? p.gradeBands.map((b: GradeBand) => ({
                  letter: String(b.letter),
                  minPercent: Number(b.minPercent),
                  gradePoints: Number(b.gradePoints),
                }))
              : DEFAULTS.gradeBands,
        });
      }
    } catch {
      toast.error("Failed to load grading policy, showing defaults");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (policy.caWeightPercent + policy.examWeightPercent <= 0) {
      toast.error("CA + exam weights must add up to a positive value");
      return;
    }
    if (policy.gradeBands.length === 0) {
      toast.error("At least one grade band is required");
      return;
    }
    setSaving(true);
    try {
      await api.put("/grades/policy", { policy });
      toast.success("Grading policy saved");
    } catch {
      toast.error("Failed to save grading policy");
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: keyof Policy, value: number) =>
    setPolicy((prev) => ({ ...prev, [field]: value }));

  const setBand = (index: number, field: keyof GradeBand, value: string) =>
    setPolicy((prev) => {
      const bands = prev.gradeBands.map((b, i) =>
        i === index
          ? {
              letter: field === "letter" ? value : b.letter,
              minPercent: field === "minPercent" ? Number(value) : b.minPercent,
              gradePoints: field === "gradePoints" ? Number(value) : b.gradePoints,
            }
          : b
      );
      return { ...prev, gradeBands: bands };
    });

  const addBand = () =>
    setPolicy((prev) => ({ ...prev, gradeBands: [...prev.gradeBands, { letter: "", minPercent: 0, gradePoints: 0 }] }));

  const removeBand = (index: number) =>
    setPolicy((prev) => ({ ...prev, gradeBands: prev.gradeBands.filter((_, i) => i !== index) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Grading Policy</h1>
        <p className="text-muted-foreground">
          Institution-wide course grading: CA vs exam weights, CA test max score, pass mark
          and grade bands (GPA scale {policy.gpaScale}).
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading policy...</span>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weights and thresholds</CardTitle>
              <CardDescription>
                Course grade = CA average x CA weight + major exam x exam weight (weights are
                normalized if they do not sum to 100).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="ca-weight">CA weight (%)</Label>
                <Input
                  id="ca-weight"
                  type="number"
                  min={0}
                  value={policy.caWeightPercent}
                  onChange={(e) => setField("caWeightPercent", Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exam-weight">Exam weight (%)</Label>
                <Input
                  id="exam-weight"
                  type="number"
                  min={0}
                  value={policy.examWeightPercent}
                  onChange={(e) => setField("examWeightPercent", Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ca-max">CA test max score</Label>
                <Input
                  id="ca-max"
                  type="number"
                  min={1}
                  value={policy.caTestMaxScore}
                  onChange={(e) => setField("caTestMaxScore", Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass-mark">Pass mark (%)</Label>
                <Input
                  id="pass-mark"
                  type="number"
                  min={0}
                  max={100}
                  value={policy.passMarkPercent}
                  onChange={(e) => setField("passMarkPercent", Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Grade bands</CardTitle>
                <CardDescription>
                  Ordered automatically by minimum percent (GPA scale {policy.gpaScale}).
                </CardDescription>
              </div>
              <Button variant="outline" onClick={addBand}>
                <Plus className="mr-1 h-4 w-4" /> Add band
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {policy.gradeBands
                .slice()
                .sort((a, b) => b.minPercent - a.minPercent)
                .map((band) => {
                  const index = policy.gradeBands.indexOf(band);
                  return (
                    <div
                      key={band.letter + "-" + band.minPercent + "-" + index}
                      className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3 rounded-lg border p-3"
                    >
                      <div className="grid gap-1">
                        <Label>Letter</Label>
                        <Input
                          value={band.letter}
                          onChange={(e) => setBand(index, "letter", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label>Min %</Label>
                        <Input
                          type="number"
                          value={band.minPercent}
                          onChange={(e) => setBand(index, "minPercent", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label>Grade points</Label>
                        <Input
                          type="number"
                          value={band.gradePoints}
                          onChange={(e) => setBand(index, "gradePoints", e.target.value)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove band"
                        onClick={() => removeBand(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Save policy
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default GradingPolicySettings;
