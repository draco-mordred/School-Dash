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
import jsQR from "jsqr";
import { BrowserQRCodeReader } from "@zxing/library";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { resolveActiveAcademicClockPhase } from "@/lib/academicClock";
import { loadSupervisorAttendanceSupportOptions } from "@/lib/supervisorAttendanceSupportOptions";

interface ClinicalSessionSummary {
  _id: string;
  title: string;
  activityType: string;
  date: string | Date;
  startTime: string | Date;
  endTime?: string | Date;
  status: string;
  unit?: { name?: string };
  supervisor?: { firstName?: string; lastName?: string; name?: string; email?: string };
  supervisorName?: string;
  supervisorGroupLabel?: string;
  supervisorGroupCode?: string;
  supervisorGroupType?: string;
  attendees?: Array<{
    student?: { _id?: string; firstName?: string; lastName?: string } | string;
    status?: string;
    notes?: string;
  }>;
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
  department?: string;
  departmentName?: string;
  departmentId?: string;
  departmentID?: string;
  departmentCode?: string;
}

interface AvailableSupervisorGroup {
  id: string;
  label: string;
  code?: string;
  type?: string;
}

interface PostingOption {
  _id: string;
  name?: string;
  scheduleName?: string;
}

interface RotationPostingLike {
  _id?: string;
  name?: string;
  groups?: Array<Record<string, unknown>>;
  meta?: {
    departments?: Array<Record<string, unknown>>;
    timeline?: Array<Record<string, unknown>>;
    windows?: Array<Record<string, unknown>>;
  };
}

interface RotationScheduleLike {
  _id?: string;
  name?: string;
  phaseId?: string;
  phaseName?: string;
  postingPhase?: string;
  meta?: {
    phaseId?: string;
    timeline?: Array<Record<string, unknown>>;
    windows?: Array<Record<string, unknown>>;
  };
  postings?: RotationPostingLike[];
}

interface ClassOption {
  _id: string;
  name: string;
  academicYearId?: string;
}

interface AcademicClockSummary {
  _id?: string;
  classId?: string;
  academicYear?: string;
  clockPhase?: string | null;
  phaseConfig?: Record<string, { name?: string; postingType?: string | null }>;
}

const allowedRoles = ["admin", "teacher", "unitconsultant", "unitresident"];
const APPROVAL_QUEUE_STORAGE_KEY = "clinical-attendance-queue-v1";
const LAST_SYNC_STORAGE_KEY = "clinical-attendance-last-update";

interface FeedbackState {
  type: "success" | "info" | "error";
  message: string;
}

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
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [mirrorPreview, setMirrorPreview] = useState(false);
  const [, setScanFeedback] = useState<FeedbackState | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [, setSelectedClock] = useState<AcademicClockSummary | null>(null);
  const [, setUnits] = useState<ClinicalUnitOption[]>([]);
  const [shouldUseDepartmentFallback, setShouldUseDepartmentFallback] = useState(false);
  const [, setDepartmentsForPosting] = useState<string[]>([]);
  const [timelineMissing, setTimelineMissing] = useState(false);
  const [selectedPostingDepartment, setSelectedPostingDepartment] = useState<string>("");
  const [postings, setPostings] = useState<PostingOption[]>([]);
  const [availableSupervisorGroups, setAvailableSupervisorGroups] = useState<AvailableSupervisorGroup[]>([]);
  const [selectedSupervisorGroupId, setSelectedSupervisorGroupId] = useState<string>("");
  const [groupSelectionMessage, setGroupSelectionMessage] = useState("");
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState("");
  const [approvalSort, setApprovalSort] = useState<"asc" | "desc">("desc");
  const [newSessionForm, setNewSessionForm] = useState({
    activityType: "ward_round",
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "08:00",
    location: "",
    classId: "",
    unit: "",
    department: "",
    clinicalRotation: "",
  });
  const feedbackTimeoutRef = useRef<number | null>(null);

  const canAccess = allowedRoles.includes(user?.role ?? "");

  const showFeedback = (feedback: FeedbackState) => {
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    setScanFeedback(feedback);
    feedbackTimeoutRef.current = window.setTimeout(() => setScanFeedback(null), 1800);
  };

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
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

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

    const loadClassesAndAcademicYear = async () => {
      try {
        const { classes: nextClasses, currentAcademicYearId: nextAcademicYearId } =
          await loadSupervisorAttendanceSupportOptions();

        setClasses(nextClasses);
        setCurrentAcademicYearId(nextAcademicYearId);

        if (!selectedClassId && nextClasses.length > 0) {
          setSelectedClassId(nextClasses[0]._id);
          setNewSessionForm((current) => ({ ...current, classId: nextClasses[0]._id }));
        }
      } catch (error) {
        console.error("Failed to load class and academic-year support options", error);
      }
    };

    if (user) {
      void fetchSessions();
      void loadClassesAndAcademicYear();
      const queueItems = readQueue();
      setPendingApprovals(queueItems);
      void syncPendingQueue();
    }
  }, [user]);

  useEffect(() => {
    const loadClassPostingUnits = async () => {
      if (!selectedClassId) {
        setUnits([]);
        setPostings([]);
        setSelectedClock(null);
        return;
      }

      try {
        const [unitsResponse, clockResponse, schedulesResponse] = await Promise.all([
          api.get("/hospital-data/units"),
          api.get(`/academic-clocks?academicYearId=${currentAcademicYearId}&classId=${selectedClassId}`),
          api.get("/rotation-schedules", {
            params: {
              classId: selectedClassId,
              page: 1,
              limit: 100,
            },
          }),
        ]);

        const nextUnits = Array.isArray(unitsResponse.data?.data)
          ? unitsResponse.data.data
          : Array.isArray(unitsResponse.data?.units)
            ? unitsResponse.data.units
            : [];

        const clockList = Array.isArray(clockResponse.data)
          ? clockResponse.data
          : Array.isArray(clockResponse.data?.data)
            ? clockResponse.data.data
            : Array.isArray(clockResponse.data?.academicClocks)
              ? clockResponse.data.academicClocks
              : [];
        const nextClock = clockList[0] ?? null;

        const scheduleList = Array.isArray(schedulesResponse.data?.schedules)
          ? schedulesResponse.data.schedules
          : Array.isArray(schedulesResponse.data)
            ? schedulesResponse.data
            : [];

        const phaseAwareSchedules = scheduleList.filter((schedule: RotationScheduleLike) => {
          if (!nextClock) return true;
          const activePhase = resolveActiveAcademicClockPhase(nextClock, schedule?.name ?? "", new Date());
          const phaseId = activePhase?.phaseId;
          const schedulePhase = schedule?.phaseId || schedule?.phaseName || schedule?.postingPhase || schedule?.meta?.phaseId;
          return !phaseId || !schedulePhase || phaseId === schedulePhase;
        });

        const nextPostingOptions: PostingOption[] = [];
        const normalizeText = (value: unknown) => {
          if (typeof value !== "string") return "";
          return value.trim().toLowerCase();
        };

        const addNormalizedVariants = (value: unknown, set: Set<string>) => {
          const text = normalizeText(value);
          if (!text) return;
          set.add(text);

          const stripped = text.replace(/^department of\s+/, "").trim();
          if (stripped && stripped !== text) {
            set.add(stripped);
          }
        };

        const buildLabelVariants = (value: unknown) => {
          const text = normalizeText(value);
          if (!text) return [] as string[];
          const stripped = text.replace(/^department of\s+/, "").trim();
          return stripped && stripped !== text ? [text, stripped] : [text];
        };

        const isLabelMatch = (candidate: string, target: string) => {
          const left = normalizeText(candidate);
          const right = normalizeText(target);
          if (!left || !right) return false;
          return left === right || left.includes(right) || right.includes(left);
        };

        const unitNames = new Set<string>();
        const departmentNames = new Set<string>();
        const postingDepartments = new Set<string>();
        const seenPostingKeys = new Set<string>();

        phaseAwareSchedules.forEach((schedule: RotationScheduleLike) => {
          const scheduleId = String(schedule?._id ?? "");
          const postings = Array.isArray(schedule?.postings) && schedule.postings.length > 0 ? schedule.postings : [{ _id: scheduleId, name: schedule?.name }];
          postings.forEach((posting: RotationPostingLike) => {
            const postingId = String(posting?._id ?? scheduleId);
            const postingName = posting?.name || schedule?.name || "Unnamed posting";
            const postingKey = `${scheduleId}-${postingId}`;
            if (!seenPostingKeys.has(postingKey)) {
              seenPostingKeys.add(postingKey);
              nextPostingOptions.push({
                _id: postingId,
                name: postingName,
                scheduleName: schedule?.name ?? "",
              });
            }
          });
        });

        let activeSchedule: RotationScheduleLike | null = null;
        let activePosting: RotationPostingLike | null = null;
        if (newSessionForm.clinicalRotation) {
          for (const schedule of phaseAwareSchedules) {
            const scheduleId = String(schedule?._id ?? "");
            const postings = Array.isArray(schedule?.postings) ? schedule.postings : [];
            const found = postings.find((p: RotationPostingLike) => String(p?._id) === String(newSessionForm.clinicalRotation));
            if (found) {
              activeSchedule = schedule;
              activePosting = found;
              break;
            }
            if (scheduleId === String(newSessionForm.clinicalRotation)) {
              activeSchedule = schedule;
              break;
            }
          }
        }
        activeSchedule = activeSchedule || phaseAwareSchedules[0] || null;

        if (activeSchedule) {
          const timeline = Array.isArray(activeSchedule?.meta?.timeline)
            ? activeSchedule.meta.timeline
            : Array.isArray(activeSchedule?.postings?.[0]?.meta?.timeline)
            ? activeSchedule.postings[0].meta.timeline
            : Array.isArray(activeSchedule?.meta?.windows)
            ? activeSchedule.meta.windows
            : [];

          if (timeline.length === 0) {
            console.warn("No timeline found on active schedule:", activeSchedule._id || activeSchedule.name);
          }

          setTimelineMissing(timeline.length === 0);

          timeline.forEach((window: Record<string, unknown>) => {
            addNormalizedVariants(window?.unitName, unitNames);
            addNormalizedVariants(window?.unitId, unitNames);
            addNormalizedVariants(window?.department, departmentNames);
            addNormalizedVariants(window?.departmentName, departmentNames);
            addNormalizedVariants(window?.departmentId, departmentNames);
            addNormalizedVariants(window?.departmentCode, departmentNames);
            if (typeof window?.department === 'string' && window.department.trim()) postingDepartments.add(window.department.trim());
            if (typeof window?.departmentName === 'string' && window.departmentName.trim()) postingDepartments.add(window.departmentName.trim());
          });

          const postingsToInspect = activePosting ? [activePosting] : (Array.isArray(activeSchedule?.postings) ? activeSchedule.postings : []);
          postingsToInspect.forEach((posting: RotationPostingLike) => {
            const groups = Array.isArray(posting?.groups) ? posting.groups : [];
            const scheduleDepartments = Array.isArray(posting?.meta?.departments) ? posting.meta.departments : [];
            scheduleDepartments.forEach((dept: Record<string, unknown>) => {
              addNormalizedVariants(dept?.departmentName, departmentNames);
              addNormalizedVariants(dept?.department, departmentNames);
              addNormalizedVariants(dept?.departmentCode, departmentNames);
              addNormalizedVariants(dept?.departmentId, departmentNames);
              if (typeof dept?.departmentName === 'string' && dept.departmentName.trim()) postingDepartments.add(dept.departmentName.trim());
            });

            groups.forEach((group: Record<string, unknown>) => {
              const groupData = (group?.group ?? group ?? {}) as Record<string, unknown>;
              const unitName =
                (typeof groupData.unitName === "string" ? groupData.unitName : "") ||
                (typeof groupData.name === "string" ? groupData.name : "") ||
                (typeof groupData.department === "string" ? groupData.department : "");

              addNormalizedVariants(unitName, unitNames);
              addNormalizedVariants(typeof groupData.department === "string" ? groupData.department : undefined, departmentNames);
              addNormalizedVariants(typeof groupData.departmentName === "string" ? groupData.departmentName : undefined, departmentNames);
              addNormalizedVariants(typeof groupData.departmentId === "string" ? groupData.departmentId : undefined, departmentNames);
              addNormalizedVariants(typeof groupData.departmentCode === "string" ? groupData.departmentCode : undefined, departmentNames);
              if (typeof groupData.department === "string" && groupData.department.trim()) postingDepartments.add(groupData.department.trim());
              if (typeof groupData.departmentName === "string" && groupData.departmentName.trim()) postingDepartments.add(groupData.departmentName.trim());
            });
          });
        }

        const institutionDepartments = new Set<string>();
        nextUnits.forEach((unit: ClinicalUnitOption) => {
          [unit.department, unit.departmentName, unit.departmentId, unit.departmentID, unit.departmentCode].forEach((value) => {
            addNormalizedVariants(value, institutionDepartments);
          });
        });

        const matchedUnits = nextUnits.filter((unit: ClinicalUnitOption) => {
          const unitName = typeof unit.name === "string" ? unit.name : "";
          const normalizedUnitName = normalizeText(unitName);
          if (normalizedUnitName && Array.from(unitNames).some((candidate) => isLabelMatch(candidate, unitName))) {
            return true;
          }

          const unitDepartmentCandidates = [
            ...buildLabelVariants(unit.department),
            ...buildLabelVariants(unit.departmentName),
            ...buildLabelVariants(unit.departmentId),
            ...buildLabelVariants(unit.departmentID),
            ...buildLabelVariants(unit.departmentCode),
          ];

          return unitDepartmentCandidates.some((candidate) => {
            return Array.from(departmentNames).some((dept) => isLabelMatch(candidate, dept));
          });
        });

        const matchedDepartmentUnits = nextUnits.filter((unit: ClinicalUnitOption) => {
          const candidates = [
            ...buildLabelVariants(unit.department),
            ...buildLabelVariants(unit.departmentName),
            ...buildLabelVariants(unit.departmentId),
            ...buildLabelVariants(unit.departmentID),
            ...buildLabelVariants(unit.departmentCode),
          ];

          return candidates.some((candidate) => {
            return Array.from(institutionDepartments).some((department) => isLabelMatch(candidate, department));
          });
        });

        const departmentFallbackOptions = Array.from(institutionDepartments).filter((department) => {
          return Array.from(departmentNames).some((candidate) => isLabelMatch(candidate, department));
        });

        const shouldUseDepartmentFallback = matchedUnits.length === 0 && departmentFallbackOptions.length > 0;

        setPostings(nextPostingOptions);
        setSelectedClock(nextClock);
        if (!newSessionForm.classId && selectedClassId) {
          setNewSessionForm((current) => ({ ...current, classId: selectedClassId }));
        }

        if (matchedUnits.length > 0) {
          setUnits(matchedUnits);
          setShouldUseDepartmentFallback(false);
          if (!newSessionForm.unit || !matchedUnits.some((unit: ClinicalUnitOption) => String(unit._id) === String(newSessionForm.unit))) {
            setNewSessionForm((current) => ({ ...current, unit: matchedUnits[0]._id }));
          }
        } else if (shouldUseDepartmentFallback && matchedDepartmentUnits.length > 0) {
          setUnits(matchedDepartmentUnits);
          setShouldUseDepartmentFallback(true);
          if (!newSessionForm.unit || !matchedDepartmentUnits.some((unit: ClinicalUnitOption) => String(unit._id) === String(newSessionForm.unit))) {
            setNewSessionForm((current) => ({ ...current, unit: matchedDepartmentUnits[0]._id }));
          }
        } else {
          setUnits(nextUnits);
          setShouldUseDepartmentFallback(false);
          if (!newSessionForm.unit && nextUnits.length > 0) {
            setNewSessionForm((current) => ({ ...current, unit: nextUnits[0]._id }));
          }
        }

        // expose posting-level departments for optional department select UI
        setDepartmentsForPosting(departmentFallbackOptions);

        if (nextPostingOptions.length > 0) {
          const postingId = newSessionForm.clinicalRotation || nextPostingOptions[0]._id;
          if (postingId && user?._id) {
            try {
              const groupsResponse = await api.get("/clinical-attendance/groups/available", {
                params: {
                  classId: selectedClassId,
                  postingId,
                  userId: user._id,
                  userName: user.name || "",
                  userEmail: user.email || "",
                },
              });

              const groups = Array.isArray(groupsResponse.data?.groups) ? groupsResponse.data.groups : [];
              setAvailableSupervisorGroups(groups);
              setGroupSelectionMessage(groupsResponse.data?.message || "");

              if (groups.length > 0) {
                const currentSelection = groups.find((group: AvailableSupervisorGroup) => group.id === selectedSupervisorGroupId);
                const nextGroupId = currentSelection?.id || groups[0].id;
                setSelectedSupervisorGroupId(nextGroupId);
                setNewSessionForm((current) => ({
                  ...current,
                  department: groups.find((group: AvailableSupervisorGroup) => group.id === nextGroupId)?.label || current.department,
                  unit: "",
                }));
              } else {
                setSelectedSupervisorGroupId("");
                setNewSessionForm((current) => ({ ...current, department: "", unit: "" }));
              }
            } catch (error) {
              console.error("Failed to load supervisor-specific posting groups", error);
              setAvailableSupervisorGroups([]);
              setGroupSelectionMessage("Unable to load supervisor groups for this posting.");
              setSelectedSupervisorGroupId("");
            }
          } else {
            setAvailableSupervisorGroups([]);
            setGroupSelectionMessage("");
            setSelectedSupervisorGroupId("");
          }
        } else {
          setAvailableSupervisorGroups([]);
          setGroupSelectionMessage("");
          setSelectedSupervisorGroupId("");
        }

        if (nextPostingOptions.length > 0 && !newSessionForm.clinicalRotation) {
          setNewSessionForm((current) => ({ ...current, clinicalRotation: nextPostingOptions[0]._id }));
        } else if (nextPostingOptions.length === 0) {
          setNewSessionForm((current) => ({ ...current, clinicalRotation: "" }));
        }
      } catch (error) {
        console.error("Failed to resolve units from the selected class posting schedule", error);
        setUnits([]);
        setPostings([]);
        setSelectedClock(null);
      }
    };

    if (selectedClassId && currentAcademicYearId) {
      void loadClassPostingUnits();
    }
  }, [selectedClassId, currentAcademicYearId, newSessionForm.clinicalRotation]);

  useEffect(() => {
    return () => {
      if (scannerActive) {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scannerActive]);

  useEffect(() => {
    // reset selected posting department when posting or fallback state changes
    setSelectedPostingDepartment("");
    setNewSessionForm((current) => ({ ...current, department: "" }));
  }, [newSessionForm.clinicalRotation, shouldUseDepartmentFallback]);

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

  const approvalGroups = useMemo(() => {
    const groups = new Map<string, Array<{ session: ClinicalSessionSummary; attendee: { student?: { _id?: string; firstName?: string; lastName?: string } | string; status?: string; notes?: string }; status: string }>>();

    sessions.forEach((session) => {
      const groupKey = session.supervisorGroupLabel || "Unassigned group";
      const groupEntries = Array.isArray(session.attendees) ? session.attendees : [];
      const groupedAttendees = groupEntries
        .filter((attendee) => attendee?.status && attendee.status !== "pending")
        .map((attendee) => ({ session, attendee, status: attendee.status ?? "present" }));

      if (groupedAttendees.length > 0) {
        const existing = groups.get(groupKey) ?? [];
        groups.set(groupKey, [...existing, ...groupedAttendees]);
      }
    });

    return Array.from(groups.entries()).map(([label, entries]) => ({
      label,
      entries: entries.sort((left, right) => {
        const leftDate = new Date(left.session.date).getTime();
        const rightDate = new Date(right.session.date).getTime();
        return approvalSort === "asc" ? leftDate - rightDate : rightDate - leftDate;
      }),
    }));
  }, [sessions, approvalSort]);

  const awaitingApprovalGroups = useMemo(() => {
    const groups = new Map<string, Array<{ session: ClinicalSessionSummary; attendee: { student?: { _id?: string; firstName?: string; lastName?: string } | string; status?: string; notes?: string }; status: string }>>();

    sessions.forEach((session) => {
      const groupKey = session.supervisorGroupLabel || "Unassigned group";
      const groupEntries = Array.isArray(session.attendees) ? session.attendees : [];
      const groupedAttendees = groupEntries
        .filter((attendee) => attendee?.status === "pending")
        .map((attendee) => ({ session, attendee, status: attendee.status ?? "pending" }));

      if (groupedAttendees.length > 0) {
        const existing = groups.get(groupKey) ?? [];
        groups.set(groupKey, [...existing, ...groupedAttendees]);
      }
    });

    return Array.from(groups.entries()).map(([label, entries]) => ({
      label,
      entries: entries.sort((left, right) => {
        const leftDate = new Date(left.session.date).getTime();
        const rightDate = new Date(right.session.date).getTime();
        return approvalSort === "asc" ? leftDate - rightDate : rightDate - leftDate;
      }),
    }));
  }, [sessions, approvalSort]);

  const stopScanner = () => {
    scannerActiveRef.current = false;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
    setScannerError("");
    setShowCameraModal(false);
  };

  const refreshSessions = async () => {
    try {
      const response = await api.get("/clinical-attendance/sessions?status=ongoing,planned");
      const sessionList = response.data?.data ?? [];
      setSessions(sessionList);
      if (sessionList.length > 0 && !sessionList.some((session: ClinicalSessionSummary) => session._id === selectedSessionId)) {
        setSelectedSessionId(sessionList[0]._id);
      }
    } catch (error) {
      console.error("Failed to refresh clinical sessions", error);
    }
  };

  const handleRetryPendingApprovals = async () => {
    if (!isOnline) {
      toast.error("The network is still unavailable. Please retry once connectivity improves.");
      return;
    }

    await syncPendingQueue();
    const queuedItems = readQueue();
    setPendingApprovals(queuedItems);
    toast.success("Queued approvals were retried.");
  };

  const handleCreateSession = async (event: FormEvent) => {
    event.preventDefault();

    if (!user?._id) {
      toast.error("You need to be signed in as a supervisor to create a session.");
      return;
    }

    const effectiveDepartment = newSessionForm.department || selectedPostingDepartment || "";

    if (!newSessionForm.classId || !newSessionForm.title || !newSessionForm.date || !newSessionForm.startTime || (!newSessionForm.unit && !effectiveDepartment) || !newSessionForm.clinicalRotation || !currentAcademicYearId) {
      toast.error("Please select a class, a posting, complete the title, date, time, and a unit or department, and ensure the active academic year is available.");
      return;
    }

    try {
      setCreatingSession(true);
      const selectedGroup = availableSupervisorGroups.find((group) => group.id === selectedSupervisorGroupId);
      const payload = {
        ...newSessionForm,
        department: effectiveDepartment || newSessionForm.department,
        groupId: selectedSupervisorGroupId || undefined,
        supervisorGroupId: selectedSupervisorGroupId || undefined,
        supervisorGroupLabel: selectedGroup?.label || "",
        supervisorGroupCode: selectedGroup?.code || "",
        supervisorGroupType: selectedGroup?.type || "",
        supervisor: user._id,
        academicYear: currentAcademicYearId,
        classId: newSessionForm.classId || selectedClassId,
        startTime: new Date(`${newSessionForm.date}T${newSessionForm.startTime}`).toISOString(),
      } as any;

      // If department-only session, ensure unit is not sent as empty string
      if (!payload.unit) delete payload.unit;

      const response = await api.post("/clinical-attendance/session/create", payload);

      const createdSessionId = response.data?.data?._id;
      toast.success("Clinical session created successfully.");
      setNewSessionForm((current) => ({
        ...current,
        title: "",
        description: "",
        location: "",
      }));
      setSelectedSupervisorGroupId("");
      setAvailableSupervisorGroups([]);
      setGroupSelectionMessage("");
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

    setScannerError("");
    showFeedback({ type: "info", message: "Position the QR code in the center of the frame." });
    setShowCameraModal(true);
  };

  useEffect(() => {
    let detector: { detect?: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>; reset?: () => void } | null = null;
    let active = false;

    const openCameraAndScan = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        // Wait for video element to mount
        if (!videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          setScannerError("Camera preview is not ready yet. Please try again.");
          setShowCameraModal(false);
          return;
        }

        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch { /* ignore autoplay errors */ }

        const barcodeDetectorSupported = typeof window !== "undefined" && "BarcodeDetector" in window;
        scannerActiveRef.current = true;
        setScannerActive(true);

        if (barcodeDetectorSupported) {
          const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>; reset?: () => void } }).BarcodeDetector;
          if (BarcodeDetectorCtor) {
            detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
            active = true;

            const scanFrame = async () => {
              if (!active || !scannerActiveRef.current || !videoRef.current) return;
              try {
                const barcodes = await detector.detect?.(videoRef.current);
                const detectedCode = barcodes[0]?.rawValue;
                if (detectedCode) {
                  setQrInput(detectedCode);
                  showFeedback({ type: "success", message: "QR detected successfully." });
                  setShowCameraModal(false);
                  stopScanner();
                  return;
                }
              } catch {
                // ignore
              }
              window.setTimeout(scanFrame, 400);
            };

            void scanFrame();
            return;
          }
        }

        // Native BarcodeDetector not available — try ZXing, then jsQR as a last resort
        try {
          const codeReader = new BrowserQRCodeReader();
          // decode continuously from the video element
          codeReader.decodeFromVideoElementContinuously(videoRef.current as HTMLVideoElement, (result: unknown, _error: unknown) => {
            if (result) {
              const text = typeof result === "string" ? result : (result && typeof result === "object" && "getText" in result && typeof (result as { getText?: () => string }).getText === "function" ? (result as { getText: () => string }).getText() : "");
              if (text) {
                setQrInput(text);
                showFeedback({ type: "success", message: "QR detected successfully." });
                setShowCameraModal(false);
                stopScanner();
                try { codeReader.reset(); } catch {}
              }
            }
          });
          detector = codeReader;
          active = true;
          return;
        } catch {
          // continue to jsQR fallback
        }

        // jsQR fallback: sample frames via canvas
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setScannerError("Camera preview opened, but QR decoding is not available in this browser. Please paste the QR payload manually.");
            return;
          }

          active = true;

          const scanFallback = () => {
            if (!active || !scannerActiveRef.current || !videoRef.current) return;
            const vw = videoRef.current.videoWidth || videoRef.current.clientWidth;
            const vh = videoRef.current.videoHeight || videoRef.current.clientHeight;
            if (!vw || !vh) {
              window.setTimeout(scanFallback, 300);
              return;
            }
            canvas.width = vw;
            canvas.height = vh;
            try {
              ctx.drawImage(videoRef.current, 0, 0, vw, vh);
              const imageData = ctx.getImageData(0, 0, vw, vh);
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code?.data) {
                setQrInput(code.data);
                showFeedback({ type: "success", message: "QR detected successfully." });
                setShowCameraModal(false);
                stopScanner();
                return;
              }
            } catch {
              // ignore drawing/read errors
            }
            window.setTimeout(scanFallback, 300);
          };

          void scanFallback();
        } catch {
          setScannerError("Camera preview opened, but QR decoding is not available in this browser. Please paste the QR payload manually.");
          return;
        }
      } catch (err: unknown) {
        console.error("Unable to open camera scanner", err);
        const message = err instanceof Error ? err.message : "Unable to open the camera for QR scanning.";
        setScannerError(message);
        setShowCameraModal(false);
      }
    };

    if (showCameraModal) {
      void openCameraAndScan();
    } else {
      // modal closed
      active = false;
      scannerActiveRef.current = false;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setScannerActive(false);
    }

    return () => {
      active = false;
      try {
        if (detector && typeof detector.reset === "function") {
          detector.reset();
        }
      } catch {}
      detector = null;
    };
  }, [showCameraModal]);

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

  const handleQrInputChange = (value: string) => {
    const normalized = value.replace(/\s/g, "");
    const otpOnly = normalized.replace(/\D/g, "").slice(0, 6);
    const nextValue = /^\d{6}$/.test(normalized) ? otpOnly : value;
    setQrInput(nextValue);

    if (/^\d{6}$/.test(nextValue.trim())) {
      showFeedback({ type: "success", message: "6-digit OTP detected." });
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
                    <label className="mb-1 block text-xs font-medium">Class</label>
                    <Select value={selectedClassId} onValueChange={(value) => {
                      setSelectedClassId(value);
                      setNewSessionForm((current) => ({ ...current, classId: value, unit: "", clinicalRotation: "" }));
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No classes available.</div>
                        ) : (
                          classes.map((cls) => (
                            <SelectItem key={cls._id} value={cls._id}>
                              {cls.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

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
                    <label className="mb-1 block text-xs font-medium">Posting</label>
                    <Select value={newSessionForm.clinicalRotation} onValueChange={(value) => setNewSessionForm((current) => ({ ...current, clinicalRotation: value }))}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={postings.length === 0 ? "No postings for selected class" : "Choose a posting"} />
                      </SelectTrigger>
                      <SelectContent>
                        {postings.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No postings were found for the selected class’s active academic clock.</div>
                        ) : (
                          postings.map((posting) => (
                            <SelectItem key={posting._id} value={posting._id}>
                              <div className="flex items-center justify-between">
                                {/* <div className="truncate">{posting.name ?? "Unnamed posting"}</div> */}
                                {/* <div className="ml-2 text-xs text-muted-foreground">{posting.scheduleName ?? ""}</div> */}
                                <div className="ml-2 text-sm text-muted-foreground">{posting.scheduleName ?? ""}</div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-muted-foreground">Posting SPIN prefixes are derived from the posting name; individual group SPINs are shown in Rotation Schedules.</p>
                  </div>

                  <div>
                    {timelineMissing ? (
                      <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
                        This posting has no schedule timeline, so the session will rely on the supervisor group selection below.
                      </div>
                    ) : null}

                    <label className="mb-1 block text-xs font-medium">Supervisor Group</label>
                    {availableSupervisorGroups.length > 0 ? (
                      <Select
                        value={selectedSupervisorGroupId}
                        onValueChange={(value) => {
                          const selectedGroup = availableSupervisorGroups.find((group) => group.id === value);
                          setSelectedSupervisorGroupId(value);
                          setNewSessionForm((current) => ({
                            ...current,
                            department: selectedGroup?.label || current.department,
                            unit: "",
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a supervisor group" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSupervisorGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.label} {group.code && group.code !== group.label ? `(${group.code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        {groupSelectionMessage || "No supervisor groups are available for the selected posting yet."}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      This uses the posting-dependent department or unit groups assigned to you for the selected posting.
                    </p>
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
                      {selectedSession.supervisorName || [selectedSession.supervisor?.firstName, selectedSession.supervisor?.lastName].filter(Boolean).join(" ") || selectedSession.supervisor?.name || "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Group</p>
                    <p className="font-medium">{selectedSession.supervisorGroupLabel || selectedSession.supervisorGroupCode || "Not assigned"}</p>
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
                  onChange={(event) => handleQrInputChange(event.target.value)}
                  placeholder='Paste the student QR payload here or scan it into the field'
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
                  <p className="mt-2 text-xs text-muted-foreground">Or enter the student's 6-digit OTP code shown with their QR (fallback when scanning fails).</p>
                  {/^\d{6}$/.test(qrInput.trim()) ? (
                    <p className="mt-1 text-xs text-green-700">Detected 6-digit OTP — using OTP fallback.</p>
                  ) : null}
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
                  <Button type="button" variant="outline" onClick={() => void startScanner()} disabled={showCameraModal || scannerActive}>
                    <Camera className="mr-2 h-4 w-4" />
                    {showCameraModal || scannerActive ? "Scanning..." : "Use camera"}
                  </Button>
                  {showCameraModal && (
                    <Button type="button" variant="ghost" onClick={() => { setShowCameraModal(false); stopScanner(); }}>
                      <CameraOff className="mr-2 h-4 w-4" />
                      Stop camera
                    </Button>
                  )}
                </div>
                {scannerError ? <p className="mt-2 text-sm text-red-600">{scannerError}</p> : null}
                {showCameraModal ? (
                  <Dialog open={showCameraModal} onOpenChange={(open) => { if (!open) setShowCameraModal(false); }}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Camera preview</DialogTitle>
                        <DialogDescription>Point the device camera at the student's QR code.</DialogDescription>
                      </DialogHeader>
                      <div className="relative mt-3 overflow-hidden rounded-md border bg-black">
                        <video
                          ref={videoRef}
                          className="h-52 w-full object-cover"
                          playsInline
                          muted
                          style={{ transform: mirrorPreview ? "scaleX(-1)" : undefined }}
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full border-2 border-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white shadow-lg backdrop-blur-sm">
                            Center the QR code here
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center gap-2">
                        <div>
                          <Button size="sm" variant="outline" onClick={() => setMirrorPreview((s) => !s)}>
                            {mirrorPreview ? "Unflip preview" : "Flip preview"}
                          </Button>
                        </div>
                        <div>
                          <Button type="button" variant="ghost" onClick={() => { setShowCameraModal(false); stopScanner(); }}>
                            Stop camera
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
              <div className="flex items-center justify-between">
                <Badge variant={isOnline ? "default" : "secondary"}>{isOnline ? "Network online" : "Network offline"}</Badge>
                <Button type="button" size="sm" variant="outline" onClick={() => void handleRetryPendingApprovals()} disabled={!isOnline || pendingApprovals.length === 0}>
                  Retry sync
                </Button>
              </div>
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Approved clinical sessions</CardTitle>
                <select value={approvalSort} onChange={(event) => setApprovalSort(event.target.value as "asc" | "desc")} className="rounded-md border border-input px-2 py-1 text-sm">
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>
              <CardDescription>Students approved for the groups you supervise.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {approvalGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved students yet.</p>
              ) : (
                approvalGroups.map((group) => (
                  <details key={group.label} className="rounded-lg border p-3" open>
                    <summary className="cursor-pointer font-medium">{group.label}</summary>
                    <div className="mt-3 space-y-2">
                      {group.entries.map(({ session, attendee }) => {
                        const student = attendee?.student && typeof attendee.student === "object" ? attendee.student : null;
                        const studentName = student?.firstName || student?.lastName ? [student?.firstName, student?.lastName].filter(Boolean).join(" ") : attendee?.student ? String(attendee.student) : "Student";
                        return (
                          <div key={`${session._id}-${studentName}`} className="rounded-md border bg-muted/20 p-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{studentName}</span>
                              <Badge variant="secondary">{attendee.status}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{session.title} • {format(new Date(session.date), "MMM dd, yyyy")}</p>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Awaiting approvals</CardTitle>
              <CardDescription>Students still awaiting supervisor review for each supervised group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {awaitingApprovalGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students are awaiting approval.</p>
              ) : (
                awaitingApprovalGroups.map((group) => (
                  <details key={group.label} className="rounded-lg border p-3" open>
                    <summary className="cursor-pointer font-medium">{group.label}</summary>
                    <div className="mt-3 space-y-2">
                      {group.entries.map(({ session, attendee }) => {
                        const student = attendee?.student && typeof attendee.student === "object" ? attendee.student : null;
                        const studentName = student?.firstName || student?.lastName ? [student?.firstName, student?.lastName].filter(Boolean).join(" ") : attendee?.student ? String(attendee.student) : "Student";
                        return (
                          <div key={`${session._id}-${studentName}`} className="rounded-md border border-dashed p-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{studentName}</span>
                              <Badge variant="outline">Pending</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{session.title} • {format(new Date(session.date), "MMM dd, yyyy")}</p>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
