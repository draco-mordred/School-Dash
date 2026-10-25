import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, MapPin } from "lucide-react";

type ActiveSession = {
  _id: string;
  subjectLabel: string;
  venue: string;
  venueRadiusMeters: number;
  window: {
    lectureStart: string | null;
    lectureEnd: string | null;
    closesAt: string | null;
  };
  myStatus: string;
  myAbsenceReason: string | null;
  alreadyTapped: boolean;
};

// Phase C2: "Active attendance" card. Shows open in-window auto-generated
// lecture sessions for the signed-in student with a countdown to window
// close, Present/Absent buttons (absent requires a reason) and browser
// geolocation capture at tap time.
const ActiveAttendanceCard = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [absentFor, setAbsentFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const mountedRef = useRef(true);

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await api.get("/attendance/active-sessions");
      if (mountedRef.current) {
        setSessions(Array.isArray(data?.data?.sessions) ? data.data.sessions : []);
      }
    } catch {
      // Silent: the card simply hides when the endpoint is unavailable.
    } finally {
      if (mountedRef.current) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadSessions();
    const poll = window.setInterval(() => void loadSessions(), 30000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [loadSessions]);

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
          toast("Location unavailable — your attendance will need lecturer verification");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  const submit = async (sessionId: string, choice: "present" | "absent") => {
    if (choice === "absent" && absentFor !== sessionId) {
      setAbsentFor(sessionId);
      setReason("");
      return;
    }
    if (choice === "absent" && !reason.trim()) {
      toast.error("Please enter a reason for your absence");
      return;
    }
    try {
      setSubmittingId(sessionId);
      const coords = await getCoords();
      const { data } = await api.post("/attendance/check-in", {
        session: sessionId,
        choice,
        absenceReason: choice === "absent" ? reason.trim() : undefined,
        coords,
        clientTimestamp: new Date().toISOString(),
      });
      if (data?.alreadyCheckedIn) {
        toast("You have already checked in for this session");
      } else {
        toast.success(choice === "present" ? "Marked present" : "Absence recorded");
      }
      setAbsentFor(null);
      setReason("");
      await loadSessions();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to submit attendance");
    } finally {
      setSubmittingId(null);
    }
  };

  if (!loaded || sessions.length === 0) return null;

  const fmtTime = (value: string | null) =>
    value
      ? new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : "";

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Active attendance check-in
        </CardTitle>
        <CardDescription>
          Lectures with an open window right now. Tap Present or Absent before the window closes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((session) => {
          const closesMs = session.window.closesAt
            ? new Date(session.window.closesAt).getTime() - now
            : 0;
          const minutes = Math.max(0, Math.floor(closesMs / 60000));
          const seconds = Math.max(0, Math.floor((closesMs % 60000) / 1000));
          const countdown =
            minutes > 0
              ? minutes + "m " + String(seconds).padStart(2, "0") + "s"
              : seconds + "s";
          const statusLabel =
            session.myStatus === "unverified" ? "pending verification" : session.myStatus;
          return (
            <div
              key={session._id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-4"
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
                  {session.window.lectureStart ? (
                    <p className="text-xs text-muted-foreground">
                      Lecture {fmtTime(session.window.lectureStart)} – {fmtTime(session.window.lectureEnd)}
                    </p>
                  ) : null}
                </div>
                <Badge variant={closesMs > 5 * 60000 ? "default" : "destructive"}>
                  Closes in {countdown}
                </Badge>
              </div>

              {session.alreadyTapped ? (
                <p className="text-sm text-muted-foreground">
                  You tapped <span className="font-medium capitalize">{statusLabel}</span>
                  {session.myAbsenceReason ? " — " + session.myAbsenceReason : ""}. Your record is
                  pending GPS verification.
                </p>
              ) : absentFor === session._id ? (
                <div className="space-y-2">
                  <textarea
                    className="min-h-[70px] w-full rounded-md border border-border bg-background p-2 text-sm"
                    placeholder="Reason for absence (required)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void submit(session._id, "absent")}
                      disabled={submittingId === session._id}
                    >
                      Submit absence
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAbsentFor(null);
                        setReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void submit(session._id, "present")}
                    disabled={submittingId === session._id}
                  >
                    Present
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void submit(session._id, "absent")}
                    disabled={submittingId === session._id}
                  >
                    Absent
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ActiveAttendanceCard;
