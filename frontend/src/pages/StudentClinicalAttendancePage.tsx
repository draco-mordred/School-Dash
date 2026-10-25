import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Clock3, CalendarDays, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import QRCode from "qrcode";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ClinicalAttendanceSummary {
  _id: string;
  title: string;
  activityType: string;
  date: string;
  startTime: string;
  endTime?: string;
  unit?: { name?: string };
  supervisor?: { firstName?: string; lastName?: string };
  status?: string;
  supervisorGroupLabel?: string;
  department?: string;
  supervisorName?: string;
  supervisorEmail?: string;
  attendees?: Array<{
    student?: { _id?: string; firstName?: string; lastName?: string } | string;
    status?: string;
    checkInTime?: string;
    notes?: string;
    complaint?: { reason?: string; status?: string; resolution?: string; raisedAt?: string };
  }>;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
}

const getAttendanceStudentId = (
  attendee: NonNullable<ClinicalAttendanceSummary["attendees"]>[number] | undefined
) => typeof attendee?.student === "string"
  ? attendee.student
  : attendee?.student?._id ?? "";

interface StudentAttendanceState {
  status: "present" | "absent" | "late" | "approved_absent" | "pending" | "on-leave" | "unknown";
  sessionTitle?: string;
  sessionId?: string;
  checkedAt?: string;
  supervisorName?: string;
  notes?: string;
  groupLabel?: string;
  groupCode?: string;
  complaintStatus?: string;
  complaintResolution?: string;
}

interface StudentClinicalAssignment {
  postingName: string;
  groupLabel: string;
  groupType: "unit" | "department";
  departmentName: string;
  unitName: string;
  supervisorName: string;
  startDate: string;
  endDate: string;
}

interface StudentClinicalPhase {
  phaseId: string | null;
  phaseName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  postingRequired: boolean;
  postingConfigured: boolean;
}

export default function StudentClinicalAttendancePage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ClinicalAttendanceSummary[]>([]);
  const [assignment, setAssignment] = useState<StudentClinicalAssignment | null>(null);
  const [activePhase, setActivePhase] = useState<StudentClinicalPhase | null>(null);
  const [activeSession, setActiveSession] = useState<ClinicalAttendanceSummary | null>(null);
  const [studentState, setStudentState] = useState<StudentAttendanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [complaintText, setComplaintText] = useState("");
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  const loadAttendanceData = async (showLoading = true) => {
    if (!user?._id) {
      return;
    }

    try {
      setLoading(showLoading);
      const response = await api.get("/clinical-attendance/student-context");
      const context = response.data?.data ?? {};
      const sessionList = Array.isArray(context.sessions) ? context.sessions : [];
      setSessions(sessionList);
      setAssignment(context.assignment ?? null);
      setActiveSession(context.activeSession ?? null);
      setActivePhase(context.activePhase ?? null);
      setLoadError(null);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const latestSession = sessionList.find((session: ClinicalAttendanceSummary) =>
        new Date(session.date).getTime() <= endOfToday.getTime() &&
        session.attendees?.some((attendee: any) => {
          const studentId = getAttendanceStudentId(attendee);
          return studentId && String(studentId) === String(user._id);
        })
      ) ?? null;
      const attendeeRecord = latestSession?.attendees?.find((attendee: any) => {
        const studentId = getAttendanceStudentId(attendee);
        return studentId && String(studentId) === String(user._id);
      });

      const normalizedStatus = attendeeRecord?.status === "excused"
        ? "approved_absent"
        : ["present", "absent", "late", "on-leave"].includes(attendeeRecord?.status)
          ? attendeeRecord.status
          : "pending";

      setStudentState(
        attendeeRecord
          ? {
              status: normalizedStatus as StudentAttendanceState["status"],
              sessionTitle: latestSession?.title ?? "Clinical activity",
              sessionId: latestSession?._id,
              checkedAt: attendeeRecord.checkInTime,
              supervisorName: attendeeRecord?.approvedByName
                ? attendeeRecord.approvedByName
                : latestSession?.supervisor?.firstName && latestSession?.supervisor?.lastName
                ? `${latestSession.supervisor.firstName} ${latestSession.supervisor.lastName}`
                : latestSession?.supervisor?.firstName ?? "Pending",
              notes: attendeeRecord.notes ?? "No notes yet",
              groupLabel: latestSession?.supervisorGroupLabel || latestSession?.department || context.assignment?.groupLabel || "Current group",
              groupCode: latestSession?.supervisorGroupCode || "",
              complaintStatus: (attendeeRecord as any)?.complaint?.status ?? "",
              complaintResolution: (attendeeRecord as any)?.complaint?.resolution ?? "",
            }
          : null
      );
    } catch (error) {
      console.error("Unable to load student clinical attendance", error);
      setLoadError("Unable to load your clinical attendance details. Please try again.");
      toast.error("Unable to load your clinical attendance details right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      void loadAttendanceData();
    } else {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    const refreshAttendance = () => {
      void loadAttendanceData(false);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "clinical-attendance-last-update") {
        refreshAttendance();
      }
    };
    window.addEventListener("clinical-attendance-updated", refreshAttendance);
    window.addEventListener("storage", handleStorage);
    const refreshTimer = window.setInterval(refreshAttendance, 10_000);

    return () => {
      window.removeEventListener("clinical-attendance-updated", refreshAttendance);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(refreshTimer);
    };
  }, [user?._id]);

  useEffect(() => {
    setQrImageUrl(null);
    setOtpCode(null);
    setLastGeneratedAt(null);
  }, [activeSession?._id]);

  useEffect(() => {
    const ownAttendance = activeSession?.attendees?.find((attendee) => {
      const studentId = getAttendanceStudentId(attendee);
      return String(studentId ?? "") === String(user?._id ?? "");
    });
    if (ownAttendance && ownAttendance.status !== "pending") {
      setQrImageUrl(null);
      setOtpCode(null);
      setLastGeneratedAt(null);
    }
  }, [activeSession, user?._id]);

  const today = startOfDay(new Date());
  const sessionsByDate = new Map<string, ClinicalAttendanceSummary[]>();
  sessions.forEach((session) => {
    const dateKey = format(startOfDay(new Date(session.date)), "yyyy-MM-dd");
    sessionsByDate.set(dateKey, [...(sessionsByDate.get(dateKey) ?? []), session]);
  });
  const postingStart = assignment ? startOfDay(new Date(assignment.startDate)) : null;
  const postingEnd = assignment ? startOfDay(new Date(assignment.endDate)) : null;
  const firstHistoryDate = postingStart ?? (sessions.length > 0
    ? startOfDay(new Date(Math.min(...sessions.map((session) => new Date(session.date).getTime()))))
    : null);
  const lastHistoryDate = postingEnd ?? (sessions.length > 0
    ? startOfDay(new Date(Math.max(...sessions.map((session) => new Date(session.date).getTime()))))
    : null);
  const historyRows: Array<{ key: string; date: Date; period: "Past" | "Today" | "Upcoming"; session: ClinicalAttendanceSummary | null }> = [];
  if (firstHistoryDate && lastHistoryDate) {
    const cursor = new Date(firstHistoryDate);
    let daysAdded = 0;
    while ((cursor < lastHistoryDate || (!assignment && cursor <= lastHistoryDate)) && daysAdded < 366) {
      const date = new Date(cursor);
      const dateKey = format(date, "yyyy-MM-dd");
      const period = isBefore(date, today) ? "Past" : date.getTime() === today.getTime() ? "Today" : "Upcoming";
      const daySessions = sessionsByDate.get(dateKey) ?? [];
      if (daySessions.length > 0) {
        daySessions.forEach((session) => historyRows.push({ key: session._id, date, period, session }));
      } else {
        historyRows.push({ key: dateKey, date, period, session: null });
      }
      cursor.setDate(cursor.getDate() + 1);
      daysAdded += 1;
    }
  }

  const handleGenerateQr = async () => {
    if (!activeSession || !user?._id) {
      toast.error("No active clinical session is available yet.");
      return;
    }

    try {
      setGenerating(true);
      // Phase I4: capture GPS as a supporting signal. Optional — the QR
      // still generates if the student denies location access.
      let coords: { lat: number; lng: number } | null = null;
      try {
        coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
          if (!("geolocation" in navigator)) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
            () => resolve(null),
            { timeout: 8000 },
          );
        });
      } catch {
        coords = null;
      }

      const response = await api.post("/clinical-attendance/qr/generate", {
        sessionId: activeSession._id,
        coords,
      });

      const payload = response.data?.data?.qrPayload ?? response.data?.qrPayload ?? null;
      if (!payload) {
        throw new Error("No QR payload returned from the server.");
      }

      const dataUrl = await QRCode.toDataURL(payload, {
        width: 220,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });

      setQrImageUrl(dataUrl);
      setOtpCode(response.data?.data?.otp ?? null);
      setLastGeneratedAt(new Date().toISOString());
      toast.success("Attendance QR generated successfully.");
    } catch (error: any) {
      console.error("QR generation failed", error);
      toast.error(error.response?.data?.message || "Unable to generate your attendance QR right now.");
    } finally {
      setGenerating(false);
    }
  };

  // Phase J (D14): report an issue straight to the supervisor after the
  // session list is submitted — accepted until the end of the day.
  const handleRaiseComplaint = async () => {
    if (!studentState?.sessionId) {
      toast.error("No clinical session to report an issue for.");
      return;
    }
    const reason = complaintText.trim();
    if (!reason) {
      toast.error("Please describe the issue with your attendance.");
      return;
    }
    try {
      setComplaintSubmitting(true);
      await api.post("/clinical-attendance/complaint", {
        sessionId: studentState.sessionId,
        reason,
      });
      toast.success("Your complaint was sent to the supervisor.");
      setComplaintText("");
      await loadAttendanceData(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to submit your complaint right now.");
    } finally {
      setComplaintSubmitting(false);
    }
  };
  const activeAttendance = activeSession?.attendees?.find((attendee) => {
    const studentId = getAttendanceStudentId(attendee);
    return String(studentId ?? "") === String(user?._id ?? "");
  });
  const attendanceFinalized = Boolean(activeAttendance && activeAttendance.status !== "pending");

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case "approved_absent":
        return <Badge className="bg-blue-100 text-blue-800">Approved absent</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      case "late":
        return <Badge className="bg-amber-100 text-amber-800">Late</Badge>;
      case "on-leave":
        return <Badge className="bg-blue-100 text-blue-800">On leave</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clinical Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your attendance status for the current posting and generate a QR code for supervisor approval.
        </p>
        {activePhase?.phaseName ? (
          <p className="mt-1 text-sm font-medium">Active class phase: {activePhase.phaseName}</p>
        ) : null}
      </div>

      {loadError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void loadAttendanceData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your current attendance</CardTitle>
            <CardDescription>Attendance for your current posting and team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading your attendance status…</div>
            ) : studentState ? (
                <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{studentState.sessionTitle ?? "Clinical activity"}</p>
                    <p className="text-sm text-muted-foreground">
                      {studentState.checkedAt ? format(new Date(studentState.checkedAt), "PPP p") : "Awaiting supervisor update"}
                    </p>
                  </div>
                  {getStatusBadge(studentState.status)}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Supervisor</p>
                    <p className="font-medium">{studentState.supervisorName ?? "Pending"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Group</p>
                    <p className="font-medium">{studentState.groupLabel ?? "Current group"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Notes</p>
                    <p className="font-medium">{studentState.notes ?? "No notes yet"}</p>
                  </div>
                </div>
                {studentState.status === "absent" ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    {studentState.complaintStatus === "open" ? (
                      <p className="text-sm text-amber-800">Your complaint was sent to the supervisor and is awaiting review.</p>
                    ) : studentState.complaintStatus === "resolved" || studentState.complaintStatus === "dismissed" ? (
                      <p className="text-sm text-amber-800">Complaint closed: {studentState.complaintResolution || "resolved by the supervisor"}.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-amber-800">Marked absent? Tell your supervisor what happened.</p>
                        <textarea
                          className="min-h-[70px] w-full rounded-md border border-amber-300 bg-white p-2 text-sm"
                          placeholder="Describe the issue with your attendance..."
                          value={complaintText}
                          onChange={(event) => setComplaintText(event.target.value)}
                        />
                        <Button size="sm" onClick={handleRaiseComplaint} disabled={complaintSubmitting}>
                          {complaintSubmitting ? "Sending..." : "Send to supervisor"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No attendance approval has been recorded for you yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate attendance QR</CardTitle>
              <CardDescription>Available only during your team’s active clinical session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                {assignment ? `${assignment.postingName} · ${assignment.groupLabel}` : "Current posting"}
              </div>
              {activeSession ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-semibold">{activeSession.title}</p>
                  <p className="text-muted-foreground">{format(new Date(activeSession.date), "PPP")}</p>
                  <p className="text-muted-foreground">{activeSession.unit?.name ?? activeSession.department ?? assignment?.unitName ?? assignment?.departmentName ?? "Unit pending"}</p>
                  <p className="text-muted-foreground">Supervisor: {activeSession.supervisorName || assignment?.supervisorName || "Pending"}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No active session available.</p>
              )}
            </div>

            <div className="flex items-center justify-center rounded-lg border border-dashed bg-background p-6">
              {qrImageUrl ? (
                <div className="space-y-2 text-center">
                  <img src={qrImageUrl} alt="Attendance QR code" className="mx-auto h-44 w-44 rounded-md border bg-white p-2" />
                  <p className="text-xs text-muted-foreground">Generated {lastGeneratedAt ? format(new Date(lastGeneratedAt), "p") : "just now"}</p>
                  {otpCode ? (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <div className="rounded-md bg-gray-100 px-3 py-2 text-sm font-mono tracking-wider">{otpCode}</div>
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(otpCode); toast.success("Copied OTP"); }}>
                        Copy
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <QrCode className="mx-auto mb-3 h-12 w-12" />
                  No QR generated yet.
                </div>
              )}
            </div>

            <Button onClick={handleGenerateQr} disabled={generating || !activeSession || attendanceFinalized} className="w-full">
              {generating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              {generating ? "Generating QR..." : attendanceFinalized ? "Attendance already recorded" : "Generate attendance QR"}
            </Button>
            {attendanceFinalized ? (
              <p className="text-center text-xs text-muted-foreground">Your attendance for this session has been finalized.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Clinical attendance history</CardTitle>
          </div>
          <CardDescription>{assignment ? `${assignment.postingName} · ${assignment.groupLabel}` : "No active posting assignment"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clinical posting days are available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map(({ key, date, period, session }) => {
              const attendeeRecord = session?.attendees?.find((attendee: any) => {
                const studentId = getAttendanceStudentId(attendee);
                return studentId && String(studentId) === String(user?._id);
              });
              const status = attendeeRecord?.status === "excused" ? "approved_absent" : ["present", "absent", "late", "on-leave"].includes(attendeeRecord?.status ?? "") ? attendeeRecord?.status : "pending";
              return (
                <TableRow key={key}>
                  <TableCell>{period}</TableCell>
                  <TableCell>{format(date, "PPP")}</TableCell>
                  <TableCell>{session?.title ?? "No session created"}</TableCell>
                  <TableCell>{session?.supervisor?.firstName && session?.supervisor?.lastName ? `${session.supervisor.firstName} ${session.supervisor.lastName}` : session?.supervisor?.firstName || session?.supervisorName || assignment?.supervisorName || "Pending"}</TableCell>
                  <TableCell>{session ? getStatusBadge(status) : <Badge variant="outline">No session</Badge>}</TableCell>
                </TableRow>
              );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happens next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
            <span>Your supervisor scans the QR to mark you present, absent, or approved absent for the active clinical activity.</span>
          </div>
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <span>Your supervisor may queue an approval while offline. The QR/OTP can expire before sync; if that happens, ask your supervisor to scan a newly generated code.</span>
          </div>
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 text-blue-600" />
            <span>Your recorded status will refresh once the supervisor’s submission is received.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
