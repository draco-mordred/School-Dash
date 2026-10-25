import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, ClipboardList, Clock, MapPin, XCircle } from "lucide-react";

type MySession = {
  _id: string;
  subjectLabel: string;
  venue: string;
  window: {
    lectureStart: string | null;
    lectureEnd: string | null;
    closesAt: string | null;
  };
  status: string;
  checkIn: { at: string | null; verified: boolean };
  counts: { present: number; absent: number; unverified: number };
  openComplaints: number;
};

type Complaint = {
  _id: string;
  message: string;
  createdAt: string;
  student?: { name?: string; idNumber?: string } | null;
  record?: { status?: string; absenceReason?: string | null } | null;
};

// Phase D1b + E — lecturer card on the staff Attendance page: today's
// auto-generated sessions with GPS check-in, record counts, and the
// complaint queue (resolve = set the record's final status).
const LecturerSessionCard = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [sessions, setSessions] = useState<MySession[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!isTeacher) return;
    try {
      const [sessionsRes, complaintsRes] = await Promise.all([
        api.get("/attendance/my-sessions"),
        api.get("/attendance/complaints"),
      ]);
      if (mountedRef.current) {
        setSessions(
          Array.isArray(sessionsRes.data?.data?.sessions)
            ? sessionsRes.data.data.sessions
            : [],
        );
        setComplaints(
          Array.isArray(complaintsRes.data?.data?.complaints)
            ? complaintsRes.data.data.complaints
            : [],
        );
      }
    } catch {
      // Silent: card hides when the endpoint is unavailable.
    } finally {
      if (mountedRef.current) setLoaded(true);
    }
  }, [isTeacher]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    const poll = window.setInterval(() => void load(), 30000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [load]);

  const getCoords = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported on this device");
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => {
          toast.error("Location unavailable — check-in needs your GPS position");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  const checkIn = async (sessionId: string) => {
    try {
      setCheckingIn(sessionId);
      const coords = await getCoords();
      if (!coords) return;
      const { data } = await api.post("/attendance/lecturer-check-in", {
        session: sessionId,
        coords,
      });
      if (data?.data?.verified) {
        toast.success("Checked in — within the venue radius");
      } else {
        toast.warning("Checked in, but outside the venue radius");
      }
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to check in");
    } finally {
      setCheckingIn(null);
    }
  };

  const resolve = async (complaintId: string, finalStatus: "present" | "absent") => {
    try {
      setResolvingId(complaintId);
      await api.post("/attendance/complaints/" + complaintId + "/resolve", {
        finalStatus,
        note: notes[complaintId]?.trim() || undefined,
      });
      toast.success("Complaint resolved — record marked " + finalStatus);
      setNotes((prev) => ({ ...prev, [complaintId]: "" }));
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to resolve complaint");
    } finally {
      setResolvingId(null);
    }
  };

  if (!isTeacher || !loaded) return null;
  if (sessions.length === 0 && complaints.length === 0) return null;

  const fmtTime = (value: string | null) =>
    value
      ? new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : "";

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          My lectures today
        </CardTitle>
        <CardDescription>
          Auto-generated sessions for your classes — check in with your GPS and
          resolve disputed records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((session) => {
          const startMs = session.window.lectureStart
            ? new Date(session.window.lectureStart).getTime()
            : 0;
          const closesMs = session.window.closesAt
            ? new Date(session.window.closesAt).getTime()
            : 0;
          const eligible =
            now >= startMs - 15 * 60000 && now <= closesMs + 30 * 60000;
          return (
            <div
              key={session._id}
              className="space-y-2 rounded-lg border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{session.subjectLabel}</p>
                  {session.venue ? (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {session.venue}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {fmtTime(session.window.lectureStart)} – {fmtTime(session.window.lectureEnd)} ·{" "}
                    <span className="capitalize">{session.status}</span>
                  </p>
                </div>
                {session.checkIn.at ? (
                  session.checkIn.verified ? (
                    <Badge className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> GPS verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Outside venue
                    </Badge>
                  )
                ) : eligible ? (
                  <Button
                    size="sm"
                    onClick={() => void checkIn(session._id)}
                    disabled={checkingIn === session._id}
                  >
                    <MapPin className="mr-1 h-3 w-3" /> Check in with my location
                  </Button>
                ) : (
                  <Badge variant="outline">Check-in opens 15 min before start</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{session.counts.present} present</Badge>
                <Badge variant="outline">{session.counts.absent} absent</Badge>
                <Badge variant="outline">{session.counts.unverified} pending</Badge>
                {session.openComplaints > 0 ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ClipboardList className="h-3 w-3" /> {session.openComplaints} complaint
                    {session.openComplaints === 1 ? "" : "s"}
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        })}

        {complaints.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ClipboardList className="h-4 w-4 text-primary" /> Complaint queue
            </p>
            {complaints.map((complaint) => (
              <div
                key={complaint._id}
                className="space-y-2 rounded-lg border border-border/70 bg-background/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {complaint.student?.name ?? "Student"}
                      {complaint.student?.idNumber
                        ? " (" + complaint.student.idNumber + ")"
                        : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">{complaint.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Current record:{" "}
                      <span className="capitalize">
                        {complaint.record?.status === "unverified"
                          ? "pending verification"
                          : complaint.record?.status ?? "unknown"}
                      </span>
                      {complaint.record?.absenceReason
                        ? " — " + complaint.record.absenceReason
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <input
                      className="w-52 rounded-md border border-border bg-background p-2 text-sm"
                      placeholder="Note (optional)"
                      value={notes[complaint._id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [complaint._id]: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void resolve(complaint._id, "present")}
                        disabled={resolvingId === complaint._id}
                      >
                        Mark present
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void resolve(complaint._id, "absent")}
                        disabled={resolvingId === complaint._id}
                      >
                        Mark absent
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default LecturerSessionCard;
