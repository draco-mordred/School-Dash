import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SessionRecord = {
  _id: string;
  status: string;
  date: string | Date;
  lecturer?: { _id: string; name: string; email?: string } | string;
  course?: { _id: string; name: string; code?: string } | string;
  subject?: { _id: string; name: string; code?: string } | string;
  class?: { _id: string; name: string } | string;
};

// Teacher attendance performance summary — the teacher’s own records,
// grouped by class + subject, with overall student performance rates.
const TeacherClassPerformanceCard = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/attendance/lists");
        if (mounted) setRecords((data?.records ?? []) as SessionRecord[]);
      } catch {
        toast.error("Failed to load attendance records");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    const myId = user?._id ? String(user._id) : "";
    const groups = new Map<string, {
      className: string;
      subjectName: string;
      sessions: Set<string>;
      present: number;
      absent: number;
      late: number;
      excused: number;
      pending: number;
    }>();

    records.forEach((record) => {
      const lecturerId =
        record.lecturer && typeof record.lecturer === "object"
          ? record.lecturer._id
          : record.lecturer;
      if (myId && lecturerId && String(lecturerId) !== myId) return;

      const className =
        record.class && typeof record.class === "object"
          ? record.class.name
          : typeof record.class === "string"
            ? record.class
            : "Unknown class";
      const subjectName =
        record.subject && typeof record.subject === "object"
          ? record.subject.name ?? record.subject.code
          : typeof record.subject === "string"
            ? record.subject
            : "General";
      const courseId =
        record.course && typeof record.course === "object"
          ? record.course._id
          : record.course;
      const subjectId =
        record.subject && typeof record.subject === "object"
          ? record.subject._id
          : undefined;

      const key = className + "|" + subjectName;
      const group = groups.get(key) ?? {
        className,
        subjectName,
        sessions: new Set<string>(),
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        pending: 0,
      };
      group.sessions.add(
        String(record.date) + "|" + String(courseId ?? "") + "|" + String(subjectId ?? ""),
      );
      if (record.status === "present") group.present += 1;
      else if (record.status === "absent") group.absent += 1;
      else if (record.status === "late") group.late += 1;
      else if (record.status === "excused") group.excused += 1;
      else group.pending += 1;
      groups.set(key, group);
    });

    return Array.from(groups.values())
      .map((group) => {
        const resolved = group.present + group.absent + group.late + group.excused;
        const total = resolved + group.pending;
        return {
          ...group,
          sessions: group.sessions.size,
          total,
          resolved,
          presentRate:
            resolved > 0
              ? Math.round(((group.present + group.late) / resolved) * 100)
              : 0,
        };
      })
      .sort(
        (a, b) =>
          a.className.localeCompare(b.className) ||
          a.subjectName.localeCompare(b.subjectName),
      );
  }, [records, user?._id]);

  const overall = useMemo(() => {
    const resolvedTotal = rows.reduce((sum, row) => sum + row.resolved, 0);
    return {
      classes: new Set(rows.map((row) => row.className)).size,
      sessions: rows.reduce((sum, row) => sum + row.sessions, 0),
      records: rows.reduce((sum, row) => sum + row.total, 0),
      pending: rows.reduce((sum, row) => sum + row.pending, 0),
      presentRate:
        resolvedTotal > 0
          ? Math.round(
              (rows.reduce((sum, row) => sum + row.present + row.late, 0) /
                resolvedTotal) *
                100,
            )
          : 0,
    };
  }, [rows]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            My classes — attendance performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          My classes — attendance performance
        </CardTitle>
        <CardDescription>
          Summary of your lecture attendance records and overall student performance per class and subject.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attendance records yet for your classes.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{overall.classes} classes</Badge>
              <Badge variant="outline">{overall.sessions} sessions</Badge>
              <Badge variant="outline">{overall.records} records</Badge>
              <Badge variant="outline">
                Overall present rate: {overall.presentRate}%
              </Badge>
              {overall.pending > 0 ? (
                <Badge variant="secondary">
                  {overall.pending} pending verification
                </Badge>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2">Class</th>
                    <th className="px-2 py-2">Subject</th>
                    <th className="px-2 py-2">Sessions</th>
                    <th className="px-2 py-2">Records</th>
                    <th className="px-2 py-2">Present rate</th>
                    <th className="px-2 py-2">Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.className + "|" + row.subjectName}
                      className="border-b last:border-0"
                    >
                      <td className="px-2 py-2 font-medium">{row.className}</td>
                      <td className="px-2 py-2">{row.subjectName}</td>
                      <td className="px-2 py-2 tabular-nums">{row.sessions}</td>
                      <td className="px-2 py-2 tabular-nums">{row.total}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className={
                                "h-full rounded-full " +
                                (row.presentRate >= 75
                                  ? "bg-green-500"
                                  : row.presentRate >= 50
                                    ? "bg-yellow-500"
                                    : "bg-red-500")
                              }
                              style={{ width: row.presentRate + "%" }}
                            />
                          </div>
                          <span className="tabular-nums">{row.presentRate}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          <Badge variant="outline" className="text-green-600">
                            {row.present} present
                          </Badge>
                          <Badge variant="outline" className="text-red-600">
                            {row.absent} absent
                          </Badge>
                          <Badge variant="outline" className="text-yellow-600">
                            {row.late} late
                          </Badge>
                          <Badge variant="outline" className="text-blue-600">
                            {row.excused} excused
                          </Badge>
                          {row.pending > 0 ? (
                            <Badge variant="secondary">{row.pending} pending</Badge>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherClassPerformanceCard;
