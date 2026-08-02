import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Search from "@/components/global/Search";
import { Plus, BookOpen, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface ActivityEntry {
  _id: string;
  entryDate: string;
  unit?: { name?: string; department?: string };
  umbrellaCategory?: string;
  clinicsAttended?: boolean;
  wardRoundsAttended?: string;
  callDutyCompleted?: boolean;
  approvedBy?: { name?: string; designation?: string };
  approvedAt?: string;
  approvalStatus?: string;
  notes?: string;
  duration?: number;
}

const STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  submitted: "Submitted",
  pending: "Pending approval",
  rejected: "Rejected",
  draft: "Draft",
};

const STATUS_CLASSES: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  submitted: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending: "bg-sky-100 text-sky-700 border-sky-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
};

const normalizeStatus = (status?: string) => {
  if (!status) return "draft";
  const value = status.toLowerCase();
  if (value === "pending") return "pending";
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  if (value === "submitted") return "submitted";
  return "draft";
};

export default function LogbookEntries() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [rotations, setRotations] = useState<Array<{ _id: string; rotationType?: string; class?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rotationFilter, setRotationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchEntries = useCallback(async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      setError(null);

      const rotationsRes = await api.get(`/rotation-schedules/student/${user._id}/current`);
      const rotationData: any[] = Array.isArray(rotationsRes.data?.current) ? rotationsRes.data.current : [];

      // Fetch logbook entries for each current rotation (student-facing endpoint)
      const entriesPerRotation = await Promise.all(
        rotationData.map(async (rotation: any) => {
          try {
            const rotationId = String(rotation.scheduleId ?? rotation._id ?? rotation.windowIndex ?? "");
            const res = await api.get(`/activity-entries/student/${user._id}/${rotationId}`);
            return Array.isArray(res.data?.entries) ? res.data.entries : [];
          } catch (e) {
            // ignore failures for individual rotations
            return [];
          }
        })
      );

      let rawEntries = entriesPerRotation.flat();

      // If no current rotations found or no entries from rotations, fall back to student-wide logbook
      if ((rotationData.length === 0 || rawEntries.length === 0)) {
        try {
          const allRes = await api.get(`/activity-entries/student/${user._id}`);
          rawEntries = Array.isArray(allRes.data?.entries) ? allRes.data.entries : rawEntries;
        } catch (e) {
          // ignore, keep existing rawEntries
        }
      }

      setEntries(rawEntries.map((entry) => ({
        _id: entry._id,
        entryDate: entry.entryDate,
        unit: entry.unit,
        umbrellaCategory: entry.umbrellaCategory,
        clinicsAttended: entry.clinicsAttended,
        wardRoundsAttended: entry.wardRoundsAttended,
        callDutyCompleted: entry.callDutyCompleted,
        approvedBy: entry.approvedBy,
        approvedAt: entry.approvedAt,
        approvalStatus: normalizeStatus(entry.approvalStatus),
        notes: entry.notes,
        duration: entry.duration ?? 8,
      })));

      setRotations(
        rotationData.map((rotation) => ({
          _id: String(rotation.scheduleId ?? rotation._id ?? rotation.windowIndex ?? ""),
          rotationType: rotation.postingName || rotation.window?.unitName || rotation.window?.departmentName || "Current posting",
          class: rotation.window?.departmentName || rotation.window?.department || "",
        }))
      );
    } catch (err: any) {
      console.error("Failed to load logbook entries", err);
      setError(err?.response?.data?.message || "Unable to load your logbook entries.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = searchQuery
        ? [entry.unit?.name, entry.umbrellaCategory, entry.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        : true;

      const matchesRotation = rotationFilter === "all" || entry.unit?.name === rotationFilter;
      const matchesStatus = statusFilter === "all" || normalizeStatus(entry.approvalStatus) === statusFilter;
      return matchesSearch && matchesRotation && matchesStatus;
    });
  }, [entries, searchQuery, rotationFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = entries.length;
    const approved = entries.filter((entry) => normalizeStatus(entry.approvalStatus) === "approved").length;
    const pending = entries.filter((entry) => normalizeStatus(entry.approvalStatus) === "pending").length;
    const submitted = entries.filter((entry) => normalizeStatus(entry.approvalStatus) === "submitted").length;
    const rejected = entries.filter((entry) => normalizeStatus(entry.approvalStatus) === "rejected").length;
    const totalHours = entries.reduce((sum, entry) => sum + (entry.duration ?? 8), 0);
    const thisMonth = entries.filter((entry) => {
      const date = new Date(entry.entryDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return { total, approved, submitted, pending, rejected, totalHours, thisMonth };
  }, [entries]);

  const categoryBreakdown = useMemo(() => {
    return entries.reduce<Record<string, number>>((acc, entry) => {
      const category = entry.umbrellaCategory || "Other";
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});
  }, [entries]);

  const rotationOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(rotations.map((rotation) => rotation.rotationType || "Unknown")));
    return ["all", ...uniqueNames];
  }, [rotations]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clinical Logbook Overview</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Review your clinical activity logbook at a glance, including dates, sign-off status, and rotation progress.
          </p>
        </div>
        <Button onClick={() => navigate("/clinical-activities")} className="gap-2">
          <Plus className="h-4 w-4" /> Submit Activity
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-700">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-yellow-700">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-red-700">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.totalHours}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.thisMonth}</p>
            <p className="text-sm text-muted-foreground mt-1">Activities added this month</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(categoryBreakdown).map(([category, count]) => (
                <div key={category} className="rounded-2xl border border-border/70 bg-muted p-3 text-sm">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">{category}</p>
                  <p className="mt-2 text-xl font-semibold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">Search</p>
            <Search
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by unit, activity, or note..."
              className="w-full"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">Rotation</p>
            <Select value={rotationFilter} onValueChange={setRotationFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All rotations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rotations</SelectItem>
                {rotationOptions.map((rotation) => (
                  rotation !== "all" && (
                    <SelectItem key={rotation} value={rotation}>{rotation}</SelectItem>
                  )
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">Status</p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logbook Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-28 rounded-[20px]" />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-3 py-10 text-center text-red-600">
              <AlertCircle className="mx-auto h-10 w-10" />
              <p>{error}</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-3 text-lg font-medium">No logbook activities found</p>
              <p className="mt-1 text-sm">Create a new clinical activity entry to start tracking your logbook.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => {
                const status = normalizeStatus(entry.approvalStatus);
                return (
                  <Card key={entry._id} className="border border-border/70">
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{format(new Date(entry.entryDate), "MMM d, yyyy")}</p>
                          <h2 className="text-lg font-semibold">{entry.unit?.name || entry.umbrellaCategory || "Clinical activity"}</h2>
                          <p className="text-sm text-muted-foreground">
                            {entry.unit?.department || "No department"} • {entry.umbrellaCategory || "General"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${STATUS_CLASSES[status]} border px-2 py-1 text-xs`}>{STATUS_LABELS[status]}</Badge>
                          <span className="text-xs text-muted-foreground">{entry.duration ?? 8} hrs</span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-muted/80 p-3 text-sm">
                          <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">Supervisor</p>
                          <p className="mt-2 font-medium">{entry.approvedBy?.name || "Pending"}</p>
                          <p className="text-xs text-muted-foreground">{entry.approvedBy?.designation || "No signature yet"}</p>
                        </div>
                        <div className="rounded-2xl bg-muted/80 p-3 text-sm">
                          <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">Approval date</p>
                          <p className="mt-2 font-medium">
                            {entry.approvedAt ? format(new Date(entry.approvedAt), "MMM d, yyyy") : "Not available"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-muted/80 p-3 text-sm">
                          <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">Ward rounds</p>
                          <p className="mt-2 font-medium">{entry.wardRoundsAttended ? entry.wardRoundsAttended : "No data"}</p>
                          <p className="text-xs text-muted-foreground">Clinic attended: {entry.clinicsAttended ? "Yes" : "No"}</p>
                        </div>
                      </div>

                      {entry.notes && (
                        <div className="rounded-2xl bg-muted/80 p-4 text-sm">
                          <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">Notes</p>
                          <p className="mt-2 whitespace-pre-line">{entry.notes}</p>
                        </div>
                      )}
                      {entry.umbrellaCategory === "SURGERY" && (entry as any).surgicalMetrics && (
                        <div className="rounded-2xl bg-muted/80 p-4 text-sm">
                          <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">Surgery Metrics</p>
                          <p className="mt-2"><strong>Theatre days:</strong> {(entry as any).surgicalMetrics.theatreDaysCount ?? 0}</p>
                          <p className="mt-1"><strong>Cases observed:</strong> {Array.isArray((entry as any).surgicalMetrics.casesObserved) ? (entry as any).surgicalMetrics.casesObserved.join(', ') : (entry as any).surgicalMetrics.casesObserved || 'None'}</p>
                          <p className="mt-1"><strong>Cases assisted:</strong> {Array.isArray((entry as any).surgicalMetrics.casesAssisted) ? (entry as any).surgicalMetrics.casesAssisted.join(', ') : (entry as any).surgicalMetrics.casesAssisted || 'None'}</p>
                        </div>
                      )}

                      {entry.umbrellaCategory === "MEDICINE" && (entry as any).medicalMetrics && (
                        <div className="rounded-2xl bg-muted/80 p-4 text-sm">
                          <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">Medicine Metrics</p>
                          <p className="mt-2"><strong>Procedures:</strong> {Array.isArray((entry as any).medicalMetrics.proceduresWitnessedOrDone) ? (entry as any).medicalMetrics.proceduresWitnessedOrDone.join(', ') : (entry as any).medicalMetrics.proceduresWitnessedOrDone || 'None'}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
