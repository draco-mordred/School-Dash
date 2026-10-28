import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Save, Settings2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ACTIVITY_TYPES = [
  { value: "", label: "— No scheduled activity —" },
  { value: "ward_round", label: "Ward Round" },
  { value: "clinic", label: "Clinic" },
  { value: "theatre", label: "Theatre" },
  { value: "call_duty", label: "Call Duty / Tutorials" },
  { value: "clerking", label: "Clerking" },
  { value: "procedure", label: "Procedure" },
  { value: "practical", label: "Practical" },
  { value: "simulation", label: "Simulation" },
];

interface ScheduleSummary {
  _id: string;
  name: string;
  postings: Array<{
    name: string;
    logbookRequiredEntries?: number;
    groups: Array<{
      groupId?: string;
      group?: { name?: string } | null;
      supervisorName?: string;
      weeklySchedule?: Array<{ day: number; activityType: string }>;
    }>;
  }>;
}

export default function PostingLogbookSettings() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedPostingIndex, setSelectedPostingIndex] = useState("");
  const [selectedGroupIndex, setSelectedGroupIndex] = useState("");
  const [requiredEntries, setRequiredEntries] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rotation-schedules?limit=50");
      const raw = Array.isArray(res.data?.schedules) ? res.data.schedules : [];
      setSchedules(raw);
      if (raw.length > 0 && !selectedScheduleId) setSelectedScheduleId(String(raw[0]._id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load rotation schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => String(s._id) === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId],
  );

  const selectedPosting = useMemo(() => {
    if (!selectedSchedule || selectedPostingIndex === "") return null;
    return selectedSchedule.postings?.[Number(selectedPostingIndex)] ?? null;
  }, [selectedSchedule, selectedPostingIndex]);

  const selectedGroup = useMemo(() => {
    if (!selectedPosting || selectedGroupIndex === "") return null;
    return selectedPosting.groups?.[Number(selectedGroupIndex)] ?? null;
  }, [selectedPosting, selectedGroupIndex]);

  // When the posting changes, load its current required-entry target
  useEffect(() => {
    if (selectedPosting) {
      setRequiredEntries(String(selectedPosting.logbookRequiredEntries ?? ""));
    } else {
      setRequiredEntries("");
    }
  }, [selectedPostingIndex, selectedScheduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the group changes, load its weekly schedule
  useEffect(() => {
    if (selectedGroup) {
      const next: Record<number, string> = {};
      for (const item of selectedGroup.weeklySchedule ?? []) {
        next[Number(item.day)] = item.activityType;
      }
      setWeeklySchedule(next);
    } else {
      setWeeklySchedule({});
    }
  }, [selectedGroupIndex, selectedPostingIndex, selectedScheduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveRequiredEntries = async () => {
    if (!selectedSchedule || selectedPostingIndex === "") {
      toast.error("Select a schedule and posting first");
      return;
    }
    const value = Number(requiredEntries);
    if (isNaN(value) || value < 0) {
      toast.error("Required entries must be a non-negative number");
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/rotation-schedules/${selectedSchedule._id}/logbook-settings`, {
        postingIndex: Number(selectedPostingIndex),
        requiredLogbookEntries: value,
      });
      toast.success("Required logbook entries updated");
      await loadSchedules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update required entries");
    } finally {
      setSaving(false);
    }
  };

  const saveWeeklySchedule = async () => {
    if (!selectedSchedule || selectedPostingIndex === "" || selectedGroupIndex === "") {
      toast.error("Select a schedule, posting and group first");
      return;
    }
    const payload = Object.entries(weeklySchedule)
      .filter(([, activityType]) => activityType !== "")
      .map(([day, activityType]) => ({ day: Number(day), activityType }));
    try {
      setSaving(true);
      await api.patch(`/rotation-schedules/${selectedSchedule._id}/logbook-settings`, {
        postingIndex: Number(selectedPostingIndex),
        groupIndex: Number(selectedGroupIndex),
        weeklySchedule: payload,
      });
      toast.success("Team weekly schedule saved");
      await loadSchedules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save weekly schedule");
    } finally {
      setSaving(false);
    }
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logbook & Team Schedule Settings</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Set the total number of logbook entries required per student for a posting, and your team&apos;s weekly
          schedule. Days tagged as theatre, clinic or ward round are auto-signed in students&apos; logbooks when their
          clinical attendance is recorded as present.
        </p>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Settings2 className="mx-auto h-10 w-10 opacity-50" />
            <p className="mt-3">No rotation schedules found. Create a clinical rotation schedule first.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select schedule & posting</CardTitle>
              <CardDescription>Pick the rotation schedule, posting and group to configure.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Schedule</p>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedPostingIndex(""); setSelectedGroupIndex(""); }}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {schedules.map((s) => (
                    <option key={s._id} value={String(s._id)}>{s.name || s._id}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Posting</p>
                <select
                  value={selectedPostingIndex}
                  onChange={(e) => { setSelectedPostingIndex(e.target.value); setSelectedGroupIndex(""); }}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={!selectedSchedule}
                >
                  <option value="">Select posting</option>
                  {(selectedSchedule?.postings ?? []).map((p, idx) => (
                    <option key={`${p.name}-${idx}`} value={String(idx)}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Group / Team</p>
                <select
                  value={selectedGroupIndex}
                  onChange={(e) => setSelectedGroupIndex(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={!selectedPosting}
                >
                  <option value="">Select group</option>
                  {(selectedPosting?.groups ?? []).map((g, idx) => (
                    <option key={idx} value={String(idx)}>
                      {g.group?.name || g.groupId || `Group ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required logbook entries per student</CardTitle>
              <CardDescription>
                The total number of logbook entries each student must record for this posting. Students see their
                progress against this target on their logbook overview and statistics pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Required entries</p>
                <Input
                  type="number"
                  min="0"
                  value={requiredEntries}
                  onChange={(e) => setRequiredEntries(e.target.value)}
                  placeholder="e.g. 30"
                  disabled={selectedPostingIndex === ""}
                />
              </div>
              <Button onClick={saveRequiredEntries} disabled={saving || selectedPostingIndex === ""} className="gap-2">
                <Save className="h-4 w-4" /> Save target
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team weekly schedule</CardTitle>
              <CardDescription>
                Tag each day of the week with the activity your team schedules on that day (e.g. Monday = Theatre).
                When clinical attendance is signed as present on a tagged day, students&apos; logbook entries are
                auto-signed with that activity category, the date, their team and your name as supervisor.
                {selectedGroup?.supervisorName ? ` Supervisor: ${selectedGroup.supervisorName}.` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedGroupIndex === "" ? (
                <p className="text-sm text-muted-foreground">Select a group above to configure its weekly schedule.</p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {DAYS.map((day, dayIndex) => (
                      <div key={day} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{day}</p>
                          {weeklySchedule[dayIndex] ? (
                            <Badge variant="outline" className="text-xs capitalize">
                              {weeklySchedule[dayIndex].replace(/_/g, " ")}
                            </Badge>
                          ) : null}
                        </div>
                        <select
                          value={weeklySchedule[dayIndex] ?? ""}
                          onChange={(e) => setWeeklySchedule((prev) => ({ ...prev, [dayIndex]: e.target.value }))}
                          className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          {ACTIVITY_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <Button onClick={saveWeeklySchedule} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" /> Save weekly schedule
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
