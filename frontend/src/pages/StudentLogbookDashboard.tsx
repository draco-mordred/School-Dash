import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, CheckCircle, Clock, AlertCircle, CalendarDays, Target, Filter } from "lucide-react";

type Mode = "statistics" | "approved" | "pending";

interface LogbookEntry {
  _id: string;
  entryDate: string;
  category?: string;
  categoryLabel?: string;
  title?: string;
  activity?: string;
  hours?: number;
  approvalStatus: "pending" | "approved" | "rejected";
  approvedBy?: { name?: string; designation?: string } | null;
  supervisorName?: string;
  groupLabel?: string;
  source?: "manual" | "clinical_attendance";
  autoSigned?: boolean;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  clerking: "Clerking",
  theatre: "Theatre",
  clinic: "Clinics",
  ward_round: "Ward Rounds",
  call_duty: "Call Duty",
  other: "Other Procedures",
};

const categoryLabel = (entry: LogbookEntry) => {
  if (entry.category === "other" && entry.categoryLabel) return entry.categoryLabel;
  return CATEGORY_LABELS[entry.category ?? ""] ?? entry.categoryLabel ?? "Uncategorized";
};

const statusBadge = (status: LogbookEntry["approvalStatus"]) => {
  if (status === "approved") return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
};

export default function StudentLogbookDashboard({ mode = "statistics" }: { mode?: Mode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [requiredEntries, setRequiredEntries] = useState<number | null>(null);
  const [currentPosting, setCurrentPosting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?._id) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [entriesRes, scheduleRes] = await Promise.allSettled([
          api.get(`/activity-entries/student/${user._id}`),
          api.get(`/rotation-schedules/student/${user._id}/current`),
        ]);
        if (cancelled) return;

        if (entriesRes.status === "rejected") {
          const reason: any = entriesRes.reason;
          setError(
            reason?.response?.data?.message ||
              reason?.response?.data?.error ||
              "Failed to load your logbook entries. Please log out and log back in, then try again.",
          );
        }

        const rawEntries =
          entriesRes.status === "fulfilled" && Array.isArray(entriesRes.value.data?.entries)
            ? entriesRes.value.data.entries
            : [];
        setEntries(rawEntries);

        if (scheduleRes.status === "fulfilled" && Array.isArray(scheduleRes.value.data?.current)) {
          const current = scheduleRes.value.data.current[0];
          if (current) {
            setCurrentPosting(current.postingName ?? null);
            const posting = (current.schedule?.postings ?? []).find(
              (p: any) => String(p.name) === String(current.postingName),
            );
            if (posting) {
              const req = Number(posting.logbookRequiredEntries ?? 0);
              setRequiredEntries(req > 0 ? req : null);
            }
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to load logbook data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?._id]);

  const stats = useMemo(() => {
    const approved = entries.filter((e) => e.approvalStatus === "approved");
    const pending = entries.filter((e) => e.approvalStatus === "pending");
    const rejected = entries.filter((e) => e.approvalStatus === "rejected");
    const now = new Date();
    const thisMonth = entries.filter(
      (e) => new Date(e.entryDate).getMonth() === now.getMonth() && new Date(e.entryDate).getFullYear() === now.getFullYear(),
    );
    const hours = entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    return { total: entries.length, approved, pending, rejected, thisMonth, hours };
  }, [entries]);

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      const label = e.category === "other" && e.categoryLabel ? e.categoryLabel : CATEGORY_LABELS[e.category ?? ""] ?? e.categoryLabel ?? "Uncategorized";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const visibleEntries = useMemo(() => {
    let list = entries;
    if (mode === "approved") list = stats.approved;
    if (mode === "pending") list = stats.pending;
    if (mode === "statistics" && statusFilter !== "all") list = list.filter((e) => e.approvalStatus === statusFilter);
    if (categoryFilter !== "all") {
      list = list.filter((e) => (e.category === "other" && e.categoryLabel ? e.categoryLabel : CATEGORY_LABELS[e.category ?? ""] ?? e.categoryLabel ?? "Uncategorized") === categoryFilter);
    }
    return [...list].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [entries, mode, statusFilter, categoryFilter, stats]);

  const signer = (entry: LogbookEntry) =>
    entry.approvedBy?.name ?? entry.supervisorName ?? "Pending sign-off";

  const renderEntry = (entry: LogbookEntry) => (
    <div key={entry._id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{entry.title || categoryLabel(entry)}</p>
          {statusBadge(entry.approvalStatus)}
          {entry.autoSigned && (
            <Badge variant="outline" className="text-xs">Auto-signed</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date(entry.entryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          {" · "}{categoryLabel(entry)}
          {entry.groupLabel ? ` · Team: ${entry.groupLabel}` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          Signed by: {signer(entry)}
          {entry.hours ? ` · ${entry.hours} hr${entry.hours === 1 ? "" : "s"} logged` : ""}
        </p>
        {entry.approvalStatus === "rejected" && entry.rejectionReason && (
          <p className="text-sm text-red-600">Reason: {entry.rejectionReason}</p>
        )}
        {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
      </div>
      <div className="text-sm font-medium text-muted-foreground">
        {entry.hours ?? 0}h
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const pageTitle = mode === "approved" ? "Approved Logbook Entries" : mode === "pending" ? "Pending Approvals" : "My Logbook Statistics";
  const pageDesc =
    mode === "approved"
      ? "Logbook entries approved by your supervisors."
      : mode === "pending"
        ? "Logbook entries awaiting approval by your supervisors."
        : "Trend of your clinical logbook performance across postings.";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">{pageDesc}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/student/logbook/statistics")}>
          <BookOpen className="mr-2 h-4 w-4" /> Full statistics
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {mode === "statistics" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2"><CardDescription>Total entries</CardDescription><CardTitle className="text-3xl">{stats.total}</CardTitle></CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{currentPosting ? `Posting: ${currentPosting}` : "All postings"}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Approved</CardDescription><CardTitle className="text-3xl text-green-600">{stats.approved.length}</CardTitle></CardHeader>
              <CardContent className="pt-0 flex items-center gap-1 text-sm text-muted-foreground"><CheckCircle className="h-3.5 w-3.5" /> Signed by supervisors</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Pending</CardDescription><CardTitle className="text-3xl text-amber-600">{stats.pending.length}</CardTitle></CardHeader>
              <CardContent className="pt-0 flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Awaiting approval</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Rejected</CardDescription><CardTitle className="text-3xl text-red-600">{stats.rejected.length}</CardTitle></CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">Needs correction</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Hours logged</CardDescription><CardTitle className="text-3xl">{Math.round(stats.hours * 10) / 10}</CardTitle></CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">Across all entries</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardDescription>This month</CardDescription><CardTitle className="text-2xl">{stats.thisMonth.length} entries</CardTitle></CardHeader>
              <CardContent className="pt-0 flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Category breakdown</CardDescription></CardHeader>
              <CardContent className="space-y-1.5 pt-0">
                {categoryBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
                {categoryBreakdown.map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Required entries</CardDescription></CardHeader>
              <CardContent className="pt-0">
                {requiredEntries ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground"><Target className="h-4 w-4" /> Progress</span>
                      <span className="font-medium">{stats.total} / {requiredEntries}</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.round((stats.total / requiredEntries) * 100))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Set by your posting supervisor{currentPosting ? ` for ${currentPosting}` : ""}.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Your supervisor has not set a required entries target for this posting yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Logbook activity</CardTitle>
                  <CardDescription>Each entry with its status, signer and activity category.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="all">All categories</option>
                    {categoryBreakdown.map(([label]) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries match this filter.</p>}
              {visibleEntries.map(renderEntry)}
            </CardContent>
          </Card>
        </>
      )}

      {(mode === "approved" || mode === "pending") && (
        <Card>
          <CardHeader>
            <CardTitle>{mode === "approved" ? "Approved entries" : "Awaiting supervisor approval"}</CardTitle>
            <CardDescription>
              {mode === "approved"
                ? `${stats.approved.length} entries approved with relevant details.`
                : `${stats.pending.length} entries submitted and awaiting your supervisor's sign-off.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {mode === "approved" ? "No approved entries yet." : "No entries awaiting approval."}
              </p>
            )}
            {visibleEntries.map(renderEntry)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
