import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { BarChart3, RotateCcw } from "lucide-react";












type AttendanceStatus = "present" | "absent" | "late" | "excused" | string;

type AttendanceStat = {
  _id: AttendanceStatus;
  count: number;
};

type AttendanceRecord = {
  _id: string;
  status: AttendanceStatus;
  date: string | Date;
  class?: { name: string } | string;
  subject?: { name: string; code?: string } | string;
};

type SubjectAttendanceSummaryRow = {
  _id: string;
  subject?: Array<{ name: string; code?: string }>;
  present: number;
  absent: number;
  late: number;
  excused: number;
};

type ChartRow =
  | { kind: "status"; label: string; value: number }
  | {
      kind: "subject";
      key: string;
      label: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
    };

export default function Attendance() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  // const { toggleSidebar } = useSidebar();



 
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [subjectSummary, setSubjectSummary] = useState<SubjectAttendanceSummaryRow[]>([]);

  const [chartMode, setChartMode] = useState<"byStatus" | "bySubject">("byStatus");

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setStats([]);
      setRecords([]);
      setSubjectSummary([]);

      if (isStudent) {
        const { data } = await api.get("/attendance/me");
        setStats((data.stats ?? []) as AttendanceStat[]);
        setRecords((data.records ?? []) as AttendanceRecord[]);
      } else {
        const [meRes, subjRes] = await Promise.all([
          api.get("/attendance/me"),
          api.get("/attendance/subjects"),
        ]);

        setStats((meRes.data?.stats ?? []) as AttendanceStat[]);
        setRecords((meRes.data?.records ?? []) as AttendanceRecord[]);
        setSubjectSummary((subjRes.data?.summary ?? []) as SubjectAttendanceSummaryRow[]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const chartRows = useMemo<ChartRow[]>(() => {
    if (chartMode === "bySubject" && !isStudent) {
      return subjectSummary.slice(0, 8).map((r) => {
        const label = r.subject?.[0]?.name ?? r.subject?.[0]?.code ?? r._id ?? "Unknown";
        return {
          kind: "subject",
          key: r._id,
          label,
          present: r.present ?? 0,
          absent: r.absent ?? 0,
          late: r.late ?? 0,
          excused: r.excused ?? 0,
        };
      });
    }

    return stats
      .map((s) => ({
        kind: "status" as const,
        label: String(s._id ?? ""),
        value: Number(s.count ?? 0),
      }))
      .filter((r) => r.label);
  }, [chartMode, isStudent, stats, subjectSummary]);

  const maxStatusValue = useMemo(() => {
    if (chartMode !== "byStatus" || isStudent) return 0;
    const values = chartRows
      .filter((r): r is Extract<ChartRow, { kind: "status" }> => r.kind === "status")
      .map((r) => r.value);
    return values.reduce((m, v) => Math.max(m, v), 0);
  }, [chartMode, isStudent, chartRows]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground">Loading attendance chart…</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Chart</CardTitle>
              <CardDescription>Summary</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-60 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Latest Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
              <div className="h-2" />
              <Skeleton className="h-10 w-full" />
              <div className="h-2" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            {isStudent
              ? "Your attendance summary"
              : "Attendance overview (teacher/admin)"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sidebar toggle removed (dev test) */}



          {!isStudent && (
            <Select value={chartMode} onValueChange={(v) => setChartMode(v as "byStatus" | "bySubject")}>
              <SelectTrigger className="w-52">

                <SelectValue placeholder="Chart mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="byStatus">By Status</SelectItem>
                <SelectItem value="bySubject">By Subject</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" onClick={() => void fetchAttendance()}>
            <RotateCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <div>
                <CardTitle>Attendance Chart</CardTitle>
                <CardDescription>
                  {isStudent || chartMode === "byStatus"
                    ? "Counts grouped by status"
                    : "Present/Absent/Late/Excused grouped by subject"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {chartRows.length === 0 ? (
              <p className="text-muted-foreground">
                No {isStudent || chartMode === "byStatus" ? "data yet" : "subject data yet"}.
              </p>
            ) : chartMode === "bySubject" && !isStudent ? (
              <div className="space-y-3">
                {chartRows.map((row) => {
                  if (row.kind !== "subject") return null;
                  const total = row.present + row.absent + row.late + row.excused;
                  return (
                    <div key={row.key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground">Total: {total}</span>
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: total ? `${Math.round((row.present / total) * 100)}%` : "0%" }}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Present: {row.present}</div>
                        <div>Absent: {row.absent}</div>
                        <div>Late: {row.late}</div>
                        <div>Excused: {row.excused}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {chartRows.map((row) => {
                  if (row.kind !== "status") return null;
                  const percentage = maxStatusValue === 0 ? 0 : Math.round((row.value / maxStatusValue) * 100);
                  return (
                    <div key={row.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{row.label}</span>
                        <span className="font-medium">{row.value}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
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
            <CardTitle>Latest Records</CardTitle>
            <CardDescription>Most recent attendance entries</CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-muted-foreground">No records found.</p>
            ) : (
              <div className="space-y-3">
                {records.slice(0, 10).map((r) => {
                  const subjectLabel = typeof r.subject === "string" ? r.subject : r.subject?.name;
                  const classLabel = typeof r.class === "string" ? r.class : r.class?.name;
                  return (
                    <div
                      key={r._id}
                      className="flex items-start justify-between gap-3 border rounded-lg p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{subjectLabel ?? "Subject"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.date).toLocaleDateString()} • {classLabel ?? "Class"}
                        </p>
                      </div>
                      <span
                        className={
                          "text-xs font-semibold px-2 py-1 rounded-full capitalize " +
                          (r.status === "present"
                            ? "bg-green-500/15 text-green-600"
                            : r.status === "absent"
                              ? "bg-red-500/15 text-red-600"
                              : r.status === "late"
                                ? "bg-yellow-500/15 text-yellow-600"
                                : r.status === "excused"
                                  ? "bg-blue-500/15 text-blue-600"
                                  : "bg-muted text-foreground")
                        }
                      >
                        {r.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

