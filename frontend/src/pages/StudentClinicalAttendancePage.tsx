import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Clock3, CalendarDays, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";

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
  attendees?: Array<{
    student?: { _id?: string; firstName?: string; lastName?: string } | string;
    status?: string;
    checkInTime?: string;
    notes?: string;
  }>;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
}

interface StudentAttendanceState {
  status: "present" | "absent" | "approved_absent" | "pending" | "unknown";
  sessionTitle?: string;
  sessionId?: string;
  checkedAt?: string;
  supervisorName?: string;
  notes?: string;
}

export default function StudentClinicalAttendancePage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ClinicalAttendanceSummary[]>([]);
  const [studentState, setStudentState] = useState<StudentAttendanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  const loadAttendanceData = async () => {
    if (!user?._id) {
      return;
    }

    try {
      setLoading(true);
      const [sessionsRes, stateRes] = await Promise.all([
        api.get("/clinical-attendance/sessions?status=ongoing,planned"),
        api.get(`/clinical-attendance/student-record?studentId=${user._id}`),
      ]);

      const sessionList = Array.isArray(sessionsRes.data?.data) ? sessionsRes.data.data : [];
      setSessions(sessionList);

      const sessionPayload = Array.isArray(stateRes.data?.data?.sessions)
        ? stateRes.data.data.sessions
        : [];

      const latestSession = sessionPayload.find((session: any) => session?._id) ?? sessionPayload[0] ?? null;
      const attendeeRecord = latestSession?.attendees?.find((attendee: any) => {
        const studentId = attendee?.student?._id ?? attendee?.student;
        return studentId && String(studentId) === String(user._id);
      });

      const normalizedStatus = attendeeRecord?.status === "excused"
        ? "approved_absent"
        : attendeeRecord?.status === "present"
          ? "present"
          : attendeeRecord?.status === "absent"
            ? "absent"
            : "pending";

      setStudentState(
        attendeeRecord
          ? {
              status: normalizedStatus as StudentAttendanceState["status"],
              sessionTitle: latestSession?.title ?? "Clinical activity",
              sessionId: latestSession?._id,
              checkedAt: attendeeRecord.checkInTime ?? latestSession?.date,
              supervisorName: latestSession?.supervisor?.firstName && latestSession?.supervisor?.lastName
                ? `${latestSession.supervisor.firstName} ${latestSession.supervisor.lastName}`
                : latestSession?.supervisor?.firstName ?? "Pending",
              notes: attendeeRecord.notes ?? "No notes yet",
            }
          : null
      );
    } catch (error) {
      console.error("Unable to load student clinical attendance", error);
      toast.error("Unable to load your clinical attendance details right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      void loadAttendanceData();
    }
  }, [user?._id]);

  useEffect(() => {
    const refreshAttendance = () => {
      void loadAttendanceData();
    };

    window.addEventListener("clinical-attendance-updated", refreshAttendance);
    window.addEventListener("storage", (event) => {
      if (event.key === "clinical-attendance-last-update") {
        refreshAttendance();
      }
    });

    return () => {
      window.removeEventListener("clinical-attendance-updated", refreshAttendance);
    };
  }, [user?._id]);

  const activeSession = useMemo(() => sessions[0] ?? null, [sessions]);

  const handleGenerateQr = async () => {
    if (!activeSession || !user?._id) {
      toast.error("No active clinical session is available yet.");
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post("/clinical-attendance/qr/generate", {
        studentId: user._id,
        studentIdNumber: user.idNumber,
        sessionId: activeSession._id,
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

      setQrPayload(payload);
      setQrImageUrl(dataUrl);
      setLastGeneratedAt(new Date().toISOString());
      toast.success("Attendance QR generated successfully.");
    } catch (error: any) {
      console.error("QR generation failed", error);
      toast.error(error.response?.data?.message || "Unable to generate your attendance QR right now.");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case "approved_absent":
        return <Badge className="bg-blue-100 text-blue-800">Approved absent</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your current attendance</CardTitle>
            <CardDescription>Latest approval status from your supervisor.</CardDescription>
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
                    <p className="text-xs uppercase text-muted-foreground">Notes</p>
                    <p className="font-medium">{studentState.notes ?? "No notes yet"}</p>
                  </div>
                </div>
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
            <CardDescription>Show this to your supervisor to confirm your presence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                Active clinical session
              </div>
              {activeSession ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-semibold">{activeSession.title}</p>
                  <p className="text-muted-foreground">{format(new Date(activeSession.date), "PPP")}</p>
                  <p className="text-muted-foreground">{activeSession.unit?.name ?? "Unit pending"}</p>
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
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <QrCode className="mx-auto mb-3 h-12 w-12" />
                  No QR generated yet.
                </div>
              )}
            </div>

            <Button onClick={handleGenerateQr} disabled={generating || !activeSession} className="w-full">
              {generating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              {generating ? "Generating QR..." : "Generate attendance QR"}
            </Button>
          </CardContent>
        </Card>
      </div>

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
            <span>If the network is unstable, the approval is queued locally and synced later when the connection is stronger.</span>
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
