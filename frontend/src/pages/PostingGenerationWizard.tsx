import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CalendarPlus,
  Layers,
  Trash2,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// PR C2 — custom posting-generation wizard: a NEW entry point exposing the
// FULL KRYSTA generator config (departments, rotation order, unit rotation,
// durations, clock-synced or manual dates). The engine is parameter-driven
// (services/krystaGenerator.ts) — this page only builds the payload and calls
// the existing POST /rotation-schedules endpoint. The generation flow inside
// ClinicalRotations.tsx is untouched.

type UnitOption = {
  unitId: string;
  name: string;
  code: string | null;
  hasDesignatedSupervisor: boolean;
};

type DepartmentOption = {
  id: string;
  identifier: string;
  name: string;
  code: string | null;
  source: "db" | "seed";
  units: UnitOption[];
};

type PhaseWindow = { startsAt: string; endsAt: string } | null;

type PhaseOption = {
  id: string;
  name: string;
  postingName: string | null;
  postingScheduleId: string | null;
  postingType: string | null;
  window: PhaseWindow;
};

type ClockOption = {
  clockId: string;
  classId: string;
  classLevel: string | null;
  clockStartDate: string | null;
  clockIsPaused: boolean;
  phases: PhaseOption[];
};

type ClassOption = {
  id: string;
  name: string;
  academicYear: string | null;
  studentCount: number;
};

type GeneratorOptions = {
  classes: ClassOption[];
  departments: DepartmentOption[];
  clocks: ClockOption[];
};

type DeptConfigDraft = {
  key: string;
  departmentId: string;
  useUnits: boolean;
  activeUnitIds: string[];
  departmentDurationWeeks: number;
  unitDurationDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
};

const addDaysIso = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();

const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";

const PostingGenerationWizard = () => {
  const [options, setOptions] = useState<GeneratorOptions | null>(null);
  const [loading, setLoading] = useState(true);

  // Step 1 — basics
  const [classId, setClassId] = useState("");
  const [postingName, setPostingName] = useState("");
  const [dateMode, setDateMode] = useState<"clock" | "manual">("clock");
  const [phaseId, setPhaseId] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");

  // Step 2 — departments
  const [selected, setSelected] = useState<DeptConfigDraft[]>([]);
  const [addPicker, setAddPicker] = useState("");

  // Step 3 — generate
  const [generating, setGenerating] = useState(false);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/rotation-schedules/generator-options", { timeout: 90000 });
      setOptions({
        classes: response.data?.classes ?? [],
        departments: response.data?.departments ?? [],
        clocks: response.data?.clocks ?? [],
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load generator options.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOptions();
  }, [fetchOptions]);

  const classClocks = useMemo(() => {
    if (!options || !classId) return [] as ClockOption[];
    return options.clocks.filter((c) => c.classId === classId);
  }, [options, classId]);

  const availablePhases = useMemo(() => {
    const withWindows: PhaseOption[] = [];
    for (const clock of classClocks) {
      for (const phase of clock.phases) {
        withWindows.push(phase);
      }
    }
    return withWindows;
  }, [classClocks]);

  const selectedPhase = useMemo(
    () => availablePhases.find((p) => p.id === phaseId) ?? null,
    [availablePhases, phaseId],
  );

  const selectedClass = useMemo(
    () => options?.classes.find((c) => c.id === classId) ?? null,
    [options, classId],
  );

  const deptById = useMemo(() => {
    const map = new Map<string, DepartmentOption>();
    for (const d of options?.departments ?? []) map.set(d.identifier, d);
    return map;
  }, [options]);

  // Effective start date (clock window VS manual input).
  const effectiveStartIso = dateMode === "clock" ? (selectedPhase?.window?.startsAt ?? "") : (manualStart ? new Date(manualStart).toISOString() : "");

  // Computed rotation math — mirrors generateKrystaSchedule exactly:
  // blockDays = max(28, rotationBlockDays clock-fit ?? max dept duration).
  const computed = useMemo(() => {
    if (selected.length === 0) return null;
    const deptDays = selected.map((d) => d.departmentDurationWeeks * 7);
    let blockDays: number;
    if (dateMode === "clock" && selectedPhase?.window) {
      const phaseDays = Math.max(
        1,
        Math.round((new Date(selectedPhase.window.endsAt).getTime() - new Date(selectedPhase.window.startsAt).getTime()) / DAY_MS),
      );
      blockDays = Math.max(28, Math.floor(phaseDays / selected.length));
    } else {
      blockDays = Math.max(28, Math.max(0, ...deptDays));
    }
    const totalDays = blockDays * selected.length;
    return { deptDays, blockDays, totalDays };
  }, [selected, dateMode, selectedPhase]);

  const previewEndIso = effectiveStartIso && computed ? addDaysIso(effectiveStartIso, computed.totalDays) : "";

  const canAddDepartment = (identifier: string) =>
    identifier && !selected.some((d) => d.departmentId === identifier);

  const addDepartment = (identifier: string) => {
    const dept = deptById.get(identifier);
    if (!dept || !canAddDepartment(identifier)) return;
    setSelected((prev) => [
      ...prev,
      {
        key: "dept-" + identifier + "-" + prev.length,
        departmentId: identifier,
        useUnits: dept.units.length > 0,
        activeUnitIds: dept.units.map((u) => u.unitId),
        departmentDurationWeeks: 4,
        unitDurationDays: 7,
      },
    ]);
    setAddPicker("");
  };

  const updateDept = (key: string, patch: Partial<DeptConfigDraft>) =>
    setSelected((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const toggleUnit = (draft: DeptConfigDraft, unitId: string) => {
    const has = draft.activeUnitIds.includes(unitId);
    updateDept(draft.key, {
      activeUnitIds: has
        ? draft.activeUnitIds.filter((u) => u !== unitId)
        : [...draft.activeUnitIds, unitId],
    });
  };

  const moveDept = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    setSelected((prev) => {
      const next = prev.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const removeDept = (key: string) =>
    setSelected((prev) => prev.filter((d) => d.key !== key));

  const generate = async () => {
    if (!classId) return toast.error("Select the class first.");
    if (selected.length === 0) return toast.error("Add at least one department.");
    if (dateMode === "manual" && !manualStart) return toast.error("Pick a manual start date.");
    if (dateMode === "clock" && !phaseId) return toast.error("Select the Class Clock phase to sync from.");
    const departments = selected
      .map((d) => {
        const cfg: Record<string, unknown> = { departmentId: d.departmentId };
        if (d.useUnits) {
          cfg.useUnits = true;
          cfg.activeUnitIds = d.activeUnitIds;
          if (d.unitDurationDays !== 7) cfg.unitDurationDays = d.unitDurationDays;
        } else {
          cfg.useUnits = false;
        }
        return cfg;
      });
    const payload: Record<string, unknown> = {
      class: classId,
      name: postingName.trim() || (selectedClass ? selectedClass.name + " clinical posting" : "Clinical posting"),
      departments,
      generateWith: "krysta",
      dateMode,
    };
    if (dateMode === "clock") {
      payload.phaseId = phaseId;
      if (selectedPhase?.name) payload.phaseName = selectedPhase.name;
    } else {
      payload.startDate = manualStart;
      if (manualEnd) payload.endDate = manualEnd;
    }
    setGenerating(true);
    try {
      await api.post("/rotation-schedules", payload, { timeout: 120000 });
      toast.success("Posting schedule generated. Open Rotation Teams or Clinical Calendar to review it.");
    } catch (error: unknown) {
      console.error(error);
      const maybeResponse = error as { response?: { data?: { message?: string } } };
      toast.error(maybeResponse.response?.data?.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading posting wizard…</p>;
  }

  if (!options || options.classes.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold tracking-tight">Posting Generation Wizard</h1>
        <p className="text-sm text-muted-foreground">
          No classes found yet. Create classes first — the wizard assigns their students into
          department and unit rotation groups.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Wand2 className="h-5 w-5" /> Posting Generation Wizard
        </h1>
        <p className="text-sm text-muted-foreground">
          Full control over the KRYSTA rotation generator: departments, rotation order, unit
          rotation, durations, and whether dates sync from the Class Clock. The simple
          generation flow on the Clinical Rotations page remains unchanged.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" /> 1. Class, name and dates
          </CardTitle>
          <CardDescription>
            Clock mode starts the posting at the selected phase window and fits the rotation
            blocks into it (minimum 4 weeks per department; the posting may run past the phase
            end when the window is short).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="wiz-class">Class</Label>
            <select id="wiz-class" className={selectClass} value={classId} onChange={(e) => { setClassId(e.target.value); setPhaseId(""); }}>
              <option value="">Select a class…</option>
              {options.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wiz-name">Posting name</Label>
            <Input
              id="wiz-name"
              value={postingName}
              onChange={(e) => setPostingName(e.target.value)}
              placeholder={selectedClass ? selectedClass.name + " clinical posting" : "e.g. 500 Level O&G + Paeds posting"}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wiz-datemode">Dates</Label>
            <select
              id="wiz-datemode"
              className={selectClass}
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value === "clock" ? "clock" : "manual")}
            >
              <option value="clock">Sync from Class Clock phase</option>
              <option value="manual">Manual start date &amp; duration</option>
            </select>
          </div>
          {dateMode === "clock" ? (
            <div className="space-y-1">
              <Label htmlFor="wiz-phase">Class Clock phase</Label>
              <select id="wiz-phase" className={selectClass} value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
                <option value="">Select a phase…</option>
                {availablePhases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatDate(p.window?.startsAt)} – {formatDate(p.window?.endsAt)})
                  </option>
                ))}
              </select>
              {classClocks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No Class Clock with configured phases for this class — set one up or switch to manual dates.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:col-span-1">
              <div className="space-y-1">
                <Label htmlFor="wiz-start">Start date</Label>
                <Input id="wiz-start" type="date" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wiz-end">End date (informational)</Label>
                <Input id="wiz-end" type="date" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> 2. Departments and units ({selected.length})
          </CardTitle>
          <CardDescription>
            The order below IS the rotation order — each cohort starts at its own department and
            rotates to the next one each block, until every cohort has visited every department.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1 space-y-1">
              <Label htmlFor="wiz-add-dept">Add a department</Label>
              <select id="wiz-add-dept" className={selectClass} value={addPicker} onChange={(e) => addDepartment(e.target.value)}>
                <option value="">Select a department…</option>
                {options.departments.map((d) => (
                  <option key={d.identifier} value={d.identifier} disabled={!canAddDepartment(d.identifier)}>
                    {d.name} ({d.code ?? "?"}){canAddDepartment(d.identifier) ? "" : " — added"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments selected yet. Each selected department becomes one rotation group; the
              class's students are split equally across them.
            </p>
          ) : (
            <div className="space-y-3">
              {selected.map((draft, index) => {
                const dept = deptById.get(draft.departmentId);
                const unitCount = draft.useUnits ? draft.activeUnitIds.length : 0;
                const windowsPerBlock = unitCount > 0 ? Math.max(1, Math.floor((computed?.blockDays ?? 28) / draft.unitDurationDays)) : 0;
                return (
                  <div key={draft.key} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">
                        {index + 1}. {dept?.name ?? draft.departmentId}
                        {dept?.code ? " (" + dept.code + ")" : ""}
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {dept?.source === "seed" ? "from institution defaults" : "from Departments"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => moveDept(index, -1)} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => moveDept(index, 1)} disabled={index === selected.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeDept(draft.key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={"dur-" + draft.key}>Department block (weeks)</Label>
                        <Input
                          id={"dur-" + draft.key}
                          type="number"
                          min={4}
                          max={52}
                          value={draft.departmentDurationWeeks}
                          onChange={(e) => updateDept(draft.key, { departmentDurationWeeks: Math.max(0, Number(e.target.value) || 0) })}
                        />
                        <p className="text-xs text-muted-foreground">
                          The rotation block is the longest department block, minimum 4 weeks{computed ? " (currently " + computed.blockDays + " days)" : ""}.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.useUnits}
                            onChange={(e) => updateDept(draft.key, { useUnits: e.target.checked })}
                          />
                          Rotate students through units
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {dept && dept.units.length > 0
                            ? unitCount + " of " + dept.units.length + " units selected · each unit window " + draft.unitDurationDays + " day(s) · " + windowsPerBlock + " window(s) per block"
                            : draft.useUnits
                              ? "This department has no units in the catalog — the whole cohort stays together for the block."
                              : "Whole cohort stays together for the block."}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={"unitdur-" + draft.key}>Unit window (days)</Label>
                        <Input
                          id={"unitdur-" + draft.key}
                          type="number"
                          min={1}
                          max={27}
                          disabled={!draft.useUnits}
                          value={draft.unitDurationDays}
                          onChange={(e) => updateDept(draft.key, { unitDurationDays: Math.max(1, Number(e.target.value) || 1) })}
                        />
                      </div>
                      {draft.useUnits && dept && dept.units.length > 0 ? (
                        <div className="md:col-span-2">
                          <Label>Units in rotation</Label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {dept.units.map((u) => {
                              const checked = draft.activeUnitIds.includes(u.unitId);
                              return (
                                <label
                                  key={u.unitId}
                                  className={
                                    "cursor-pointer rounded-full border px-3 py-1 text-xs " +
                                    (checked
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "text-muted-foreground")
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    className="mr-1"
                                    checked={checked}
                                    onChange={() => toggleUnit(draft, u.unitId)}
                                  />
                                  {u.name}
                                  {u.hasDesignatedSupervisor ? " · designated supervisor" : ""}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
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
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> 3. Review and generate
          </CardTitle>
          <CardDescription>
            Supervisors are then assigned: one unique supervisor per department group and per unit
            window (never duplicated); exhausted pools leave windows unassigned and alert admins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Rotation block</p>
              <p className="text-lg font-semibold">{computed ? computed.blockDays + " days" : "—"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total postings length</p>
              <p className="text-lg font-semibold">{computed ? computed.totalDays + " days (" + Math.ceil(computed.totalDays / 7) + " weeks)" : "—"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Start → estimated end</p>
              <p className="text-lg font-semibold">{formatDate(effectiveStartIso)} → {formatDate(previewEndIso)}</p>
            </div>
          </div>
          {dateMode === "clock" && selectedPhase?.window && computed ? (
            <p className="text-xs text-muted-foreground">
              Phase window {formatDate(selectedPhase.window.startsAt)} – {formatDate(selectedPhase.window.endsAt)}
              {previewEndIso && new Date(previewEndIso) > new Date(selectedPhase.window.endsAt)
                ? " — the posting extends past the phase end so every department completes a full block."
                : ""}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={generating} onClick={() => void generate()}>
              <Wand2 className="mr-2 h-4 w-4" />
              {generating ? "Generating…" : "Generate posting schedule"}
            </Button>
            <Link to="/rotation-teams" className="text-sm text-primary underline-offset-4 hover:underline">
              Review in Rotation Teams
            </Link>
            <Link to="/clinical-schedules" className="text-sm text-primary underline-offset-4 hover:underline">
              Open Clinical Calendar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostingGenerationWizard;
