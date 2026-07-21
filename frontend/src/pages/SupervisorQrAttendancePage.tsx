import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, CameraOff, Clock3, QrCode, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";

interface ClinicalSessionSummary {
  _id: string;
  title: string;
  activityType: string;
  date: string | Date;
  startTime: string | Date;
  endTime?: string | Date;
  status: string;
  unit?: { name?: string };
  supervisor?: { firstName?: string; lastName?: string };
  attendees?: Array<{ student?: { firstName?: string; lastName?: string } }>;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
}

interface PendingApproval {
  id: string;
  studentIdNumber: string;
  sessionId: string;
  sessionTitle: string;
  status: string;
  createdAt: string;
  notes?: string;
  qrPayload: string;
}

interface ClinicalUnitOption {
  _id: string;
  name?: string;
}

const allowedRoles = ["admin", "teacher", "unitconsultant", "unitresident"];
const APPROVAL_QUEUE_STORAGE_KEY = "clinical-attendance-queue-v1";
const LAST_SYNC_STORAGE_KEY = "clinical-attendance-last-update";

export default function SupervisorQrAttendancePage() {
  const { user, loading } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerActiveRef = useRef(false);
  const [sessions, setSessions] = useState<ClinicalSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [qrInput, setQrInput] = useState("");
  const [statusSelection, setStatusSelection] = useState("present");
  const [notes, setNotes] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [units, setUnits] = useState<ClinicalUnitOption[]>([]);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState("");
  const [newSessionForm, setNewSessionForm] = useState({
    activityType: "ward_round",
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "08:00",
    location: "",
    unit: "",
  });

  const canAccess = allowedRoles.includes(user?.role ?? "");

  const readQueue = () => {
    if (typeof window === "undefined") {
      return [] as PendingApproval[];
    }

    try {
      const raw = window.localStorage.getItem(APPROVAL_QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [] as PendingApproval[];
    }
  };

  const persistQueue = (items: PendingApproval[]) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(APPROVAL_QUEUE_STORAGE_KEY, JSON.stringify(items));
    setPendingApprovals(items);
  };

  const syncPendingQueue = async () => {
    if (!isOnline) {
      return;
    }

    const queuedItems = readQueue();
    if (queuedItems.length === 0) {
      return;
    }

    const remaining: PendingApproval[] = [];
    for (const item of queuedItems) {
      try {
        await api.post("/clinical-attendance/qr/approve", {
          qrPayload: item.qrPayload,
          status: item.status,
          notes: item.notes,
        });
        window.dispatchEvent(new Event("clinical-attendance-updated"));
      } catch (error) {
        remaining.push(item);
      }
    }

    persistQueue(remaining);
    if (remaining.length === 0) {
      window.localStorage.removeItem(APPROVAL_QUEUE_STORAGE_KEY);
      window.localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(Date.now()));
    }
  };

  useEffect(() => {
    const handleOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        void syncPendingQueue();
      }
    };

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, [isOnline]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await api.get("/clinical-attendance/sessions?status=ongoing,planned");
        const sessionList = response.data?.data ?? [];
        setSessions(sessionList);
        if (!selectedSessionId && sessionList.length > 0) {
          setSelectedSessionId(sessionList[0]._id);
        }
      } catch (error) {
        console.error("Failed to load clinical sessions", error);
        toast.error("Unable to load clinical sessions right now.");
      }
    };

    const loadUnitAndAcademicYearOptions = async () => {
      try {
        const [unitsResponse, academicYearResponse] = await Promise.all([
          api.get("/hospital-data/units"),
          api.get("/academic-years/current"),
        ]);

        const nextUnits = Array.isArray(unitsResponse.data?.data)
          ? unitsResponse.data.data
          : Array.isArray(unitsResponse.data?.units)
            ? unitsResponse.data.units
            : [];
        const nextAcademicYearId = academicYearResponse.data?.year?._id
          ?? academicYearResponse.data?._id
          ?? academicYearResponse.data?.data?._id
          ?? "";

        setUnits(nextUnits);
        setCurrentAcademicYearId(nextAcademicYearId);
        if (!newSessionForm.unit && nextUnits.length > 0) {
          setNewSessionForm((current) => ({ ...current, unit: nextUnits[0]._id }));
        }
      } catch (error) {
        console.error("Failed to load support options for clinical session creation", error);
      }
    };

    if (user) {
      void fetchSessions();
      void loadUnitAndAcademicYearOptions();
      const queueItems = readQueue();
      setPendingApprovals(queueItems);
      void syncPendingQueue();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (scannerActive) {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scannerActive]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session._id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  );

  const validityWindowMinutes = useMemo(() => {
    if (!selectedSession?.startTime || !selectedSession?.endTime) {
      return 30;
    }

    const start = new Date(selectedSession.startTime).getTime();
    const end = new Date(selectedSession.endTime).getTime();
    const durationMinutes = Math.max(30, Math.round((end - start) / 60000));
    return Math.min(120, Math.max(30, Math.round(durationMinutes / 2)));
  }, [selectedSession]);

  const stopScanner = () => {
    scannerActiveRef.current = false;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
    setScannerError("");
  };

  const refreshSessions = async () => {
    try {
      const response = await api.get("/clinical-attendance/sessions?status=ongoing,planned");
      const sessionList = response.data?.data ?? [];
      setSessions(sessionList);
      if (sessionList.length > 0 && !sessionList.some((session) => session._id === selectedSessionId)) {
        setSelectedSessionId(sessionList[0]._id);
      }
    } catch (error) {
      console.error("Failed to refresh clinical sessions", error);
    }
  };

  const handleCreateSession = async (event: FormEvent) => {
    event.preventDefault();

    if (!user?._id) {
      toast.error("You need to be signed in as a supervisor to create a session.");
      return;
    }

    if (!newSessionForm.title || !newSessionForm.date || !newSessionForm.startTime || !newSessionForm.unit || !currentAcademicYearId) {
      toast.error("Please complete the title, date, time, unit, and academic year fields.");
      return;
    }

    try {
      setCreatingSession(true);
      const response = await api.post("/clinical-attendance/session/create", {
        ...newSessionForm,
        supervisor: user._id,
        academicYear: currentAcademicYearId,
        startTime: new Date(`${newSessionForm.date}T${newSessionForm.startTime}`).toISOString(),
      });

      const createdSessionId = response.data?.data?._id;
      toast.success("Clinical session created successfully.");
      setNewSessionForm((current) => ({
        ...current,
        title: "",
        description: "",
        location: "",
      }));
      await refreshSessions();
      if (createdSessionId) {
        setSelectedSessionId(createdSessionId);
      }
    } catch (error: any) {
      console.error("Failed to create clinical session", error);
      toast.error(error.response?.data?.message || "Unable to create the clinical session right now.");
    } finally {
      setCreatingSession(false);
    }
  };

  const startScanner = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setScannerError("Camera access is not available in this browser.");
      return;
    }

    try {
      setScannerError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: { new (options?: { formats?: string[] }): { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } } }).BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        throw new Error("BarcodeDetector is not supported in this browser.");
      }

      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      scannerActiveRef.current = true;
      setScannerActive(true);

      const scanFrame = async () => {
        if (!scannerActiveRef.current || !videoRef.current) {
          return;
        }

        try {
          const barcodes = await detector.detect(videoRef.current);
          const detectedCode = barcodes[0]?.rawValue;
          if (detectedCode) {
            setQrInput(detectedCode);
            stopScanner();
            return;
          }
        } catch {
          // Ignore scan errors and keep running.
        }

        window.setTimeout(scanFrame, 400);
      };

      void scanFrame();
    } catch (error: any) {
      console.error("Unable to open camera scanner", error);
      setScannerError(error.message || "Unable to open the camera for QR scanning.");
    }
  };

  const submitApproval = async (payload: string, approvalStatus: string, approvalNotes: string) => {
    if (!selectedSession) {
      toast.error("Please select a clinical session first.");
      return;
    }

    const queueItem: PendingApproval = {
      id: `${Date.now()}`,
      studentIdNumber: "scanned-qr",
      sessionId: selectedSession._id,
      sessionTitle: selectedSession.title,
      status: approvalStatus,
      createdAt: new Date().toISOString(),
      notes: approvalNotes,
      qrPayload: payload,
    };

    if (!isOnline) {
      const nextQueue = [queueItem, ...readQueue()];
      persistQueue(nextQueue);
      window.localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(Date.now()));
      window.dispatchEvent(new Event("clinical-attendance-updated"));
      toast.success("Approval queued for sync. The student will update when the sync completes.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post("/clinical-attendance/qr/approve", {
        qrPayload: payload,
        status: approvalStatus,
        notes: approvalNotes,
      });

      const approved = response.data?.data;
      const completedItem: PendingApproval = {
        ...queueItem,
        id: approved?.studentId ?? queueItem.id,
        studentIdNumber: approved?.studentIdNumber ?? queueItem.studentIdNumber,
        status: approved?.status ?? approvalStatus,
      };

      const nextQueue = [completedItem, ...pendingApprovals.filter((item) => item.id !== completedItem.id)].slice(0, 8);
      persistQueue(nextQueue);
      window.localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(Date.now()));
      window.dispatchEvent(new Event("clinical-attendance-updated"));
      toast.success("Student attendance approved successfully.");
    } catch (error: any) {
      console.error("QR approval failed", error);
      const nextQueue = [queueItem, ...readQueue()];
      persistQueue(nextQueue);
      toast.error(error.response?.data?.message || "Unable to approve this student attendance. The approval has been queued for later sync.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAttendance = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedSession || !qrInput.trim()) {
      toast.error("Scan or paste the student QR payload before approving.");
      return;
    }

    await submitApproval(qrInput.trim(), statusSelection, notes);
    setQrInput("");
    setNotes("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading supervisor attendance screen…</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Access restricted</CardTitle>
          <CardDescription>
            This supervisor QR attendance screen is available to admins and clinical staff only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supervisor QR Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve clinical attendance for students even when the connection is unstable.
          </p>
        </div>
        <Badge variant={isOnline ? "default" : "secondary"} className="w-fit">
          {isOnline ? <Wifi className="mr-2 h-4 w-4" /> : <WifiOff className="mr-2 h-4 w-4" />}
          {isOnline ? "Online" : "Offline mode"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Approve attendance</CardTitle>
            <CardDescription>
              Select the active clinical session, scan or enter the student reference, and queue the approval for later sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Clinical session</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No active sessions found. Create one below.</div>
                  ) : (
                    sessions.map((session) => (
                      <SelectItem key={session._id} value={session._id}>
                        {session.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-dashed bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Create a new clinical session</p>
                  <p className="text-xs text-muted-foreground">Use this to populate the supervisor dropdown immediately.</p>
                </div>
              </div>

              <form onSubmit={handleCreateSession} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Activity type</label>
                    <Select value={newSessionForm.activityType} onValueChange={(value) => setNewSessionForm((current) => ({ ...current, activityType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ward_round">Ward round</SelectItem>
                        <SelectItem value="clinic">Clinic</SelectItem>
                        <SelectItem value="theatre">Theatre</SelectItem>
                        <SelectItem value="call_duty">Call duty</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="simulation">Simulation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium">Unit</label>
                    <Select value={newSessionForm.unit} onValueChange={(value) => setNewSessionForm((current) => ({ ...current, unit: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No units available.</div>
                        ) : (
                          units.map((unit) => (
                            <SelectItem key={unit._id} value={unit._id}>
                              {unit.name ?? "Unnamed unit"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Session title</label>
                  <Input
                    value={newSessionForm.title}
                    onChange={(event) => setNewSessionForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Morning ward round"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Description</label>
                  <Input
                    value={newSessionForm.description}
                    onChange={(event) => setNewSessionForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Optional details"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Date</label>
                    <Input
                      type="date"
                      value={newSessionForm.date}
                      onChange={(event) => setNewSessionForm((current) => ({ ...current, date: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Start time</label>
                    <Input
                      type="time"
                      value={newSessionForm.startTime}
                      onChange={(event) => setNewSessionForm((current) => ({ ...current, startTime: event.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Location</label>
                  <Input
                    value={newSessionForm.location}
                    onChange={(event) => setNewSessionForm((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Ward A"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={creatingSession}>
                  {creatingSession ? "Creating session..." : "Create session"}
                </Button>
              </form>
            </div>

            {selectedSession && (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span className="font-medium">{selectedSession.title}</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Unit</p>
                    <p className="font-medium">{selectedSession.unit?.name ?? "Not assigned"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Supervisor</p>
                    <p className="font-medium">
                      {selectedSession.supervisor?.firstName ?? ""} {selectedSession.supervisor?.lastName ?? ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(selectedSession.date), "MMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Validity window</p>
                    <p className="font-medium">{validityWindowMinutes} min</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleApproveAttendance} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Student QR payload</label>
                <textarea
                  value={qrInput}
                  onChange={(event) => setQrInput(event.target.value)}
                  placeholder='Paste the student QR payload here or scan it into the field'
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </div>

              <div className="rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <QrCode className="h-4 w-4" />
                  QR approval workflow
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  The student generates a QR payload from their attendance page. The supervisor pastes or scans it into this field to record the student as present, absent, or approved absent for the selected clinical activity.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => void startScanner()} disabled={scannerActive}>
                    {scannerActive ? <Camera className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                    {scannerActive ? "Scanning..." : "Use camera"}
                  </Button>
                  {scannerActive && (
                    <Button type="button" variant="ghost" onClick={stopScanner}>
                      <CameraOff className="mr-2 h-4 w-4" />
                      Stop camera
                    </Button>
                  )}
                </div>
                {scannerError ? <p className="mt-2 text-sm text-red-600">{scannerError}</p> : null}
                {scannerActive ? (
                  <div className="mt-3 overflow-hidden rounded-md border bg-black">
                    <video ref={videoRef} className="h-52 w-full object-cover" playsInline muted />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Attendance status</label>
                <Select value={statusSelection} onValueChange={setStatusSelection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="approved_absent">Approved absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional note for the student"
                />
              </div>

              <Button type="submit" disabled={submitting || !selectedSession || !qrInput.trim()} className="w-full">
                {submitting ? "Submitting approval..." : "Submit attendance review"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Present</span>
                <span className="font-semibold">{selectedSession?.presentCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Absent</span>
                <span className="font-semibold">{selectedSession?.absentCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Late</span>
                <span className="font-semibold">{selectedSession?.lateCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Attendees</span>
                <span className="font-semibold">{selectedSession?.attendees?.length ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending approvals</CardTitle>
              <CardDescription>Queued locally for sync when connectivity improves.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approvals queued yet.</p>
              ) : (
                pendingApprovals.map((approval) => (
                  <div key={approval.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{approval.studentIdNumber}</span>
                      <Badge variant="secondary">{approval.status}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{approval.sessionTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(approval.createdAt), "p, MMM dd")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
