// PR E1 — real page for /student/timetable/download (was a generic
// StudentSection placeholder). Client-side export of the phase-aware
// weekly timetable: .ics calendar file (generated locally, no backend
// round-trip) and print-to-PDF via the browser print dialog.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Download, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getScheduleForDay, WEEKDAY_NAMES } from "@/lib/studentSchedule";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ICS_BYDAY: Record<string, string> = {
  monday: "MO",
  tuesday: "TU",
  wednesday: "WE",
  thursday: "TH",
  friday: "FR",
  saturday: "SA",
  sunday: "SU",
};

const pad = (n: number) => String(n).padStart(2, "0");

const toIcsDateTime = (date: Date, time: string) => {
  const [h, m] = time.split(":").map((p) => Number(p) || 0);
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`;
};

const escapeIcs = (value: string) =>
  String(value ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");

// Next calendar occurrence of the given weekday (today counts).
const nextDateOf = (dayLabel: string) => {
  const target = WEEKDAY_NAMES.findIndex((d) => d.toLowerCase() === dayLabel.toLowerCase());
  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const ahead = (target - todayIndex + 7) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
};

export default function StudentTimetableDownloadPage() {
  const { user } = useAuth();
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const classId = useMemo(() => {
    const studentClass = user?.studentClass ?? user?.studentClasses;
    if (typeof studentClass === "object" && studentClass !== null) return studentClass._id;
    return typeof studentClass === "string" ? studentClass : null;
  }, [user]);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      setError("Your student class could not be resolved yet. Please refresh and try again.");
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/timetables/${classId}`);
        if (!cancelled) setScheduleData(data?.schedule ?? []);
      } catch {
        if (!cancelled) setError("Unable to load your timetable right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [classId]);

  const totalPeriods = useMemo(
    () => scheduleData.reduce((sum, entry) => sum + (entry?.periods?.length ?? 0), 0),
    [scheduleData],
  );

  const downloadIcs = () => {
    setExporting(true);
    try {
      const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MedLog//Student Timetable//EN",
        "CALSCALE:GREGORIAN",
      ];

      for (const entry of scheduleData) {
        const byday = ICS_BYDAY[String(entry?.day ?? "").toLowerCase()];
        if (!byday) continue;
        const start = nextDateOf(entry.day);
        for (const period of entry?.periods ?? []) {
          if (!period?.startTime || !period?.endTime) continue;
          const startDateTime = toIcsDateTime(start, period.startTime);
          const endDateTime = toIcsDateTime(start, period.endTime);
          const summary = period?.subject?.name ?? period?.displayLabel ?? "Class period";
          lines.push(
            "BEGIN:VEVENT",
            `UID:${classId}-${entry.day}-${period._id ?? period.startTime}@medlog`,
            `DTSTART:${startDateTime}`,
            `DTEND:${endDateTime}`,
            `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
            `SUMMARY:${escapeIcs(summary)}`,
            `DESCRIPTION:${escapeIcs(period?.lecturer?.name ?? "")}`,
            "END:VEVENT",
          );
        }
      }

      lines.push("END:VCALENDAR");
      const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-timetable.ics";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Download Timetable</CardTitle>
            <CardDescription>
              Export your phase-aware weekly timetable as a calendar file (.ics) for Google Calendar / Outlook / Apple Calendar, or print / save it as a PDF.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/timetable">Weekly Timetable</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/student-portal">Back to Portal</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadIcs} disabled={exporting || loading || !totalPeriods}>
              <Download className="mr-1 h-4 w-4" /> Download calendar (.ics)
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={loading || !totalPeriods}>
              <Printer className="mr-1 h-4 w-4" /> Print / Save as PDF
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
          ) : !totalPeriods ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              Your timetable has no periods yet — nothing to export.
            </div>
          ) : (
            <section className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" /> Preview — weekly timetable
              </p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {WEEKDAY_NAMES.map((dayName) => {
                  const daySchedule = getScheduleForDay(scheduleData as any, dayName);
                  const periods = daySchedule?.periods ?? [];
                  return (
                    <div key={dayName} className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="text-sm font-semibold">{dayName}</p>
                      {periods.length ? (
                        <div className="mt-2 space-y-2">
                          {periods.map((period: any) => (
                            <div key={period._id} className="rounded-xl border border-border/70 bg-muted/40 p-2">
                              <p className="text-sm font-medium">{period.subject?.name ?? period.displayLabel ?? "Open period"}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{period.startTime} – {period.endTime}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No periods.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
