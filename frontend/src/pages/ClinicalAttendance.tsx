import { useEffect, useState, type ReactNode } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Clock, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface AttendanceRecord {
  student: { firstName?: string; lastName?: string; _id?: string } | null;
  status: "present" | "absent" | "late" | "excused";
  checkInTime?: Date;
  checkOutTime?: Date;
  duration?: number;
}

interface ClinicalSession {
  _id: string;
  activityType: string;
  title: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  unit?: { _id?: string; name?: string } | null;
  supervisor?: { firstName?: string; lastName?: string } | null;
  status: "planned" | "ongoing" | "completed" | "cancelled";
  attendees: AttendanceRecord[];
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

export const ClinicalAttendanceDashboard = () => {
  const [sessions, setSessions] = useState<ClinicalSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ClinicalSession[]>([]);
  const [units, setUnits] = useState<Array<{ _id: string; name?: string; department?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState<ClinicalSession | null>(
    null
  );

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get("/clinical-attendance/sessions");
      setSessions(response.data.data || []);
      setFilteredSessions(response.data.data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to fetch clinical sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get("/hospital-data/units?limit=200");
      const unitsData = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data?.units)
        ? response.data.units
        : Array.isArray(response.data)
        ? response.data
        : [];
      setUnits(unitsData);
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  useEffect(() => {
    void fetchSessions();
    void fetchUnits();
  }, []);

  useEffect(() => {
    let filtered = sessions;

    if (filterStatus !== "all") {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }

    if (filterUnit !== "all") {
      filtered = filtered.filter((s) => String(s.unit?._id || s.unit || "") === filterUnit);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.activityType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  }, [filterStatus, filterUnit, searchTerm, sessions]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      planned: "bg-blue-100 text-blue-800",
      ongoing: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, ReactNode> = {
      ward_round: <Clock className="w-4 h-4" />,
      clinic: <CheckCircle2 className="w-4 h-4" />,
      theatre: <AlertCircle className="w-4 h-4" />,
      call_duty: <Clock className="w-4 h-4" />,
      procedure: <CheckCircle2 className="w-4 h-4" />,
      simulation: <AlertCircle className="w-4 h-4" />,
    };
    return icons[type] || <Clock className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clinical Attendance</h1>
          <p className="text-gray-600 mt-1">
            Track and manage clinical activity attendance
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Clinical Attendance Session</DialogTitle>
              <DialogDescription>
                Create a new clinical attendance tracking session for rounds,
                clinics, or other activities
              </DialogDescription>
            </DialogHeader>
            <CreateSessionForm onSuccess={fetchSessions} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search by title or activity type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterUnit} onValueChange={setFilterUnit}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit._id} value={unit._id}>
                  {unit.name} {unit.department ? `(${unit.department})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchSessions}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Sessions</CardTitle>
          <CardDescription>
            Total: {filteredSessions.length} sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No clinical sessions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActivityIcon(session.activityType)}
                          <div>
                            <p className="font-medium">{session.title}</p>
                            <p className="text-sm text-gray-500 capitalize">
                              {session.activityType.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>
                            {format(new Date(session.date), "MMM dd, yyyy")}
                          </p>
                          <p className="text-gray-500">
                            {format(new Date(session.startTime), "HH:mm")}
                            {session.endTime &&
                              ` - ${format(new Date(session.endTime), "HH:mm")}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{session.unit?.name || "N/A"}</TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {session.supervisor?.firstName}{" "}
                          {session.supervisor?.lastName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-green-50">
                            Present: {session.presentCount}
                          </Badge>
                          <Badge variant="outline" className="bg-red-50">
                            Absent: {session.absentCount}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(session.status)}>
                          {session.status.charAt(0).toUpperCase() +
                            session.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSession(session)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      {selectedSession && (
        <SessionDetailsDialog
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onUpdate={fetchSessions}
        />
      )}
    </div>
  );
};

const CreateSessionForm = ({
  onSuccess,
}: {
  onSuccess: () => void;
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Array<{ _id: string; name?: string; displayName?: string }>>([]);
  const [schedulePostings, setSchedulePostings] = useState<Array<{ _id: string; name: string }>>([]);
  const [hospitalUnits, setHospitalUnits] = useState<Array<{ _id: string; name?: string; department?: string; departmentName?: string; departmentId?: string; departmentID?: string; departmentCode?: string }>>([]);
  const [scheduleUnits, setScheduleUnits] = useState<Array<{ _id: string; name?: string; department?: string }>>([]);
  const [scheduleDepartments, setScheduleDepartments] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; label: string; code?: string }>>([]);
  const [groupSelectionMessage, setGroupSelectionMessage] = useState<string>("");
  const [units, setUnits] = useState<Array<{ _id: string; name?: string; department?: string }>>([]);
  const [timelineMissing, setTimelineMissing] = useState(false);
  const [formData, setFormData] = useState({
    activityType: "ward_round",
    title: "",
    description: "",
    date: "",
    startTime: "",
    unit: "",
    department: "",
    location: "",
    supervisor: "",
    academicYear: "",
    classId: "",
    clinicalRotation: "",
    groupId: "",
  });

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [unitsResponse, classesResponse] = await Promise.all([
          api.get("/hospital-data/units?limit=200"),
          api.get("/classes?limit=200"),
        ]);

        const unitsData = Array.isArray(unitsResponse.data?.data)
          ? unitsResponse.data.data
          : Array.isArray(unitsResponse.data?.units)
          ? unitsResponse.data.units
          : Array.isArray(unitsResponse.data)
          ? unitsResponse.data
          : [];

        const classData = Array.isArray(classesResponse.data)
          ? classesResponse.data
          : Array.isArray(classesResponse.data?.classes)
          ? classesResponse.data.classes
          : Array.isArray(classesResponse.data?.data)
          ? classesResponse.data.data
          : [];

        setHospitalUnits(unitsData);
        setClasses(classData);

        setUnits(unitsData);
        if (!formData.unit && unitsData.length > 0) {
          setFormData((current) => ({ ...current, unit: unitsData[0]._id }));
        }
        if (!formData.classId && classData.length > 0) {
          setFormData((current) => ({ ...current, classId: classData[0]._id }));
        }
      } catch (error) {
        console.error("Error fetching units or classes for attendance form:", error);
      }
    };

    void loadMetadata();
  }, []);

  useEffect(() => {
    const loadScheduleMetadata = async () => {
      if (!formData.classId) {
        setSchedulePostings([]);
        setScheduleUnits([]);
        setScheduleDepartments([]);
        return;
      }

      try {
        const response = await api.get("/rotation-schedules", {
          params: { classId: formData.classId, page: 1, limit: 100 },
        });

        const scheduleList = Array.isArray(response.data?.schedules)
          ? response.data.schedules
          : Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        const nextPostings: Array<{ _id: string; name: string }> = [];
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

        scheduleList.forEach((schedule: Record<string, unknown>) => {
          const scheduleId = String(schedule?._id ?? "");
          const postings = Array.isArray(schedule?.postings) && schedule.postings.length > 0 ? schedule.postings : [{ _id: scheduleId, name: schedule?.name }];
          postings.forEach((posting: Record<string, unknown>) => {
            const postingId = String(posting?._id ?? scheduleId);
            const postingName = posting?.name || schedule?.name || "Posting schedule";
            if (!nextPostings.some((item) => item._id === postingId)) {
              nextPostings.push({
                _id: postingId,
                name: typeof postingName === "string" ? postingName : String(postingName ?? "Posting schedule"),
              });
            }
          });
        });

        // Resolve active schedule: formData.clinicalRotation may be a schedule _id or a posting _id
        let activeSchedule: Record<string, unknown> | null = null;
        let activePosting: Record<string, unknown> | null = null;
        if (formData.clinicalRotation) {
          // find schedule where posting._id matches
          for (const schedule of scheduleList) {
            const postings = Array.isArray(schedule?.postings) ? schedule.postings : [];
            const found = postings.find((p: Record<string, unknown>) => String(p?._id) === String(formData.clinicalRotation));
            if (found) {
              activeSchedule = schedule;
              activePosting = found;
              break;
            }
          }
          // fallback: maybe clinicalRotation is the schedule id itself
          if (!activeSchedule) {
            activeSchedule = scheduleList.find((s: Record<string, unknown>) => String(s?._id) === String(formData.clinicalRotation)) || null;
          }
        }
        activeSchedule = activeSchedule || scheduleList[0] || null;

        const unitNames = new Set<string>();
        const departmentNames = new Set<string>();

        if (activeSchedule) {
          const meta = (activeSchedule as Record<string, unknown>).meta as Record<string, unknown> | undefined;
          const postings = Array.isArray((activeSchedule as Record<string, unknown>).postings)
            ? ((activeSchedule as Record<string, unknown>).postings as Array<Record<string, unknown>>)
            : [];
          const firstPostingMeta = postings[0]?.meta as Record<string, unknown> | undefined;
          const timeline = Array.isArray(meta?.timeline)
            ? (meta?.timeline as Array<Record<string, unknown>>)
            : Array.isArray(firstPostingMeta?.timeline)
            ? (firstPostingMeta.timeline as Array<Record<string, unknown>>)
            : Array.isArray(meta?.windows)
            ? (meta.windows as Array<Record<string, unknown>>)
            : [];

          if (timeline.length === 0) {
            console.warn("No timeline found on rotation schedule:", (activeSchedule as Record<string, unknown>).name ?? (activeSchedule as Record<string, unknown>)._id);
          }

          setTimelineMissing(timeline.length === 0);

          timeline.forEach((window: Record<string, unknown>) => {
            addNormalizedVariants(window?.unitName, unitNames);
            addNormalizedVariants(window?.unitId, unitNames);
            addNormalizedVariants(window?.department, departmentNames);
            addNormalizedVariants(window?.departmentName, departmentNames);
            addNormalizedVariants(window?.departmentId, departmentNames);
            addNormalizedVariants(window?.departmentCode, departmentNames);
          });

          // Inspect groups from the selected posting if available, otherwise inspect all postings on the schedule
          const postingsToInspect = activePosting ? [activePosting] : (Array.isArray(activeSchedule?.postings) ? activeSchedule.postings : []);
          postingsToInspect.forEach((posting: Record<string, unknown>) => {
            const groups = Array.isArray(posting?.groups) ? posting.groups : [];
            const postingMeta = (posting as Record<string, unknown>).meta as Record<string, unknown> | undefined;
            const postingDepartments = Array.isArray(postingMeta?.departments)
              ? (postingMeta?.departments as Array<Record<string, unknown>>)
              : [];
            postingDepartments.forEach((dept: Record<string, unknown>) => {
              addNormalizedVariants(dept?.departmentName, departmentNames);
              addNormalizedVariants(dept?.department, departmentNames);
              addNormalizedVariants(dept?.departmentCode, departmentNames);
              addNormalizedVariants(dept?.departmentId, departmentNames);
            });
            groups.forEach((group: Record<string, unknown>) => {
              const groupData = (group as Record<string, unknown>)?.group || group || {};
              const groupRecord = groupData as Record<string, unknown>;
              const unitName =
                groupRecord.unitName ||
                (groupRecord.unit && typeof groupRecord.unit === "object"
                  ? (groupRecord.unit as Record<string, unknown>).name
                  : groupRecord.unit) ||
                groupRecord.name;

              addNormalizedVariants(unitName, unitNames);
              addNormalizedVariants(groupRecord.department, departmentNames);
              addNormalizedVariants(groupRecord.departmentName, departmentNames);
              addNormalizedVariants(groupRecord.departmentId, departmentNames);
              addNormalizedVariants(groupRecord.departmentCode, departmentNames);
            });
          });
        }

        const institutionDepartments = new Set<string>();
        hospitalUnits.forEach((unit: Record<string, unknown>) => {
          [unit.department, unit.departmentName, unit.departmentId, unit.departmentID, unit.departmentCode].forEach((value) => {
            addNormalizedVariants(value, institutionDepartments);
          });
        });

        const matchedUnits = hospitalUnits.filter((unit: Record<string, unknown>) => {
          if (typeof unit.name !== "string" || !unit.name.trim()) return false;
          const name = normalizeText(unit.name);
          if (name && Array.from(unitNames).some((candidate) => isLabelMatch(candidate, name))) return true;

          const candidates = [
            ...buildLabelVariants(unit.department),
            ...buildLabelVariants(unit.departmentName),
            ...buildLabelVariants(unit.departmentId),
            ...buildLabelVariants(unit.departmentID),
            ...buildLabelVariants(unit.departmentCode),
          ];

          return candidates.some((candidate) => {
            return Array.from(departmentNames).some((dept) => isLabelMatch(candidate, dept));
          });
        });

        const matchedDepartmentUnits = hospitalUnits.filter((unit: Record<string, unknown>) => {
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

        setSchedulePostings(nextPostings);
        setScheduleUnits(matchedUnits);
        setScheduleDepartments(departmentFallbackOptions);

        if (nextPostings.length > 0) {
          const postingId = formData.clinicalRotation || nextPostings[0]._id;
          const supervisedGroupsResponse = await api.get(`/clinical-attendance/groups/available`, {
            params: {
              classId: formData.classId,
              postingId,
              userId: user?._id,
            },
          });

          const groups = Array.isArray(supervisedGroupsResponse.data?.groups) ? supervisedGroupsResponse.data.groups : [];
          setAvailableGroups(groups);
          setGroupSelectionMessage(supervisedGroupsResponse.data?.message || "");

          if (groups.length > 0) {
            const currentSelection = groups.find((group) => group.id === formData.groupId);
            const fallbackGroup = currentSelection || groups[0];
            setFormData((current) => ({
              ...current,
              groupId: current.groupId || fallbackGroup.id,
              department: current.department || fallbackGroup.label || fallbackGroup.code || "",
              unit: "",
            }));
          } else {
            setFormData((current) => ({ ...current, groupId: "", department: "", unit: "" }));
          }
        } else {
          setAvailableGroups([]);
          setGroupSelectionMessage("");
          setFormData((current) => ({ ...current, groupId: "", department: "", unit: "" }));
        }

        if (matchedUnits.length > 0) {
          setUnits(matchedUnits);
          if (!formData.unit || !matchedUnits.some((unit) => String(unit._id) === String(formData.unit))) {
            setFormData((current) => ({ ...current, unit: matchedUnits[0]._id }));
          }
        } else if (departmentFallbackOptions.length > 0 && matchedDepartmentUnits.length > 0) {
          setUnits(matchedDepartmentUnits);
          if (!formData.unit || !matchedDepartmentUnits.some((unit) => String(unit._id) === String(formData.unit))) {
            setFormData((current) => ({ ...current, unit: matchedDepartmentUnits[0]._id }));
          }
        } else {
          setUnits(hospitalUnits);
          if (!formData.unit && hospitalUnits.length > 0) {
            setFormData((current) => ({ ...current, unit: hospitalUnits[0]._id }));
          }
        }

        if (!formData.clinicalRotation && nextPostings.length > 0) {
          setFormData((current) => ({ ...current, clinicalRotation: nextPostings[0]._id }));
        }
      } catch (error) {
        console.error("Error fetching class posting schedules for attendance form:", error);
        setSchedulePostings([]);
        setScheduleUnits([]);
        setScheduleDepartments([]);
        if (hospitalUnits.length > 0) {
          setUnits(hospitalUnits);
        }
      }
    };

    void loadScheduleMetadata();
  }, [formData.classId, formData.clinicalRotation, hospitalUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/clinical-attendance/session/create", formData);
      toast.success("Clinical session created successfully");
      onSuccess();
      setFormData({
        activityType: "ward_round",
        title: "",
        description: "",
        date: "",
        startTime: "",
        unit: "",
        department: "",
        location: "",
        supervisor: "",
        academicYear: "",
        classId: formData.classId,
        clinicalRotation: formData.clinicalRotation,
        groupId: "",
      });
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create clinical session");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground">Please sign in to create a clinical session.</p>;
  }

  const isSupervisor = Boolean((user as { isSupervisor?: boolean; role?: string } | null)?.isSupervisor || (user as { role?: string } | null)?.role === "admin");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Activity Type
          </label>
          <Select
            value={formData.activityType}
            onValueChange={(value) =>
              setFormData({ ...formData, activityType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ward_round">Ward Round</SelectItem>
              <SelectItem value="clinic">Clinic</SelectItem>
              <SelectItem value="theatre">Theatre</SelectItem>
              <SelectItem value="call_duty">Call Duty</SelectItem>
              <SelectItem value="procedure">Procedure</SelectItem>
              <SelectItem value="simulation">Simulation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Session title"
            required
          />
        </div>
      </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <Select
              value={formData.classId}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  classId: value,
                  clinicalRotation: "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name || cls.displayName || "Untitled class"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Posting schedule</label>
            <Select
              value={formData.clinicalRotation}
              onValueChange={(value) =>
                setFormData({ ...formData, clinicalRotation: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select posting schedule" />
              </SelectTrigger>
              <SelectContent>
                {schedulePostings.length > 0 ? (
                  schedulePostings.map((posting) => (
                    <SelectItem key={posting._id} value={posting._id}>
                      {posting.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="">
                    No posting schedules found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Department / Unit Group</label>
          {!isSupervisor ? (
            <p className="text-sm text-muted-foreground">Only supervisors can create clinical attendance sessions.</p>
          ) : availableGroups.length > 0 ? (
            <Select
              value={formData.groupId}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  groupId: value,
                  department: availableGroups.find((group) => group.id === value)?.label || current.department,
                  unit: "",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a supervised group" />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.label} {group.code && group.code !== group.label ? `(${group.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">
              {groupSelectionMessage || "No supervised department or unit groups are available for the selected posting yet."}
            </p>
          )}
          {availableGroups.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              These are the department or unit groups available for your current posting and supervisor role.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <Input
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="Ward/Clinic location"
          />
        </div>
      </div>

      {timelineMissing ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          This posting has no schedule timeline, so the unit selection may fall back to hospital units.
        </div>
      ) : null}

      <Button type="submit" disabled={loading || !isSupervisor || !formData.groupId} className="w-full">
        {loading ? "Creating..." : "Create Session"}
      </Button>
    </form>
  );
};

const SessionDetailsDialog = ({
  session,
  onClose,
}: {
  session: ClinicalSession;
  onClose: () => void;
  onUpdate: () => void;
}) => {
  return (
    <Dialog open={!!session} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{session.title}</DialogTitle>
          <DialogDescription>
            {format(new Date(session.date), "MMMM dd, yyyy")} at{" "}
            {format(new Date(session.startTime), "HH:mm")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Overview */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Unit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{session.unit?.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Supervisor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {session.supervisor?.firstName} {session.supervisor?.lastName}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600">
                  Present
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.presentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.absentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-600">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.lateCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-600">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {session.attendees.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Attendees List */}
          <div>
            <h3 className="font-semibold mb-3">Attendees</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {session.attendees.length === 0 ? (
                <p className="text-gray-500 text-sm">No attendees recorded</p>
              ) : (
                session.attendees.map((attendee, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {attendee.student?.firstName}{" "}
                        {attendee.student?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {attendee.checkInTime &&
                          `Checked in: ${format(
                            new Date(attendee.checkInTime),
                            "HH:mm"
                          )}`}
                      </p>
                    </div>
                    <Badge className={`capitalize ${getStatusClass(attendee.status)}`}>
                      {attendee.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    present: "bg-green-100 text-green-800",
    absent: "bg-red-100 text-red-800",
    late: "bg-yellow-100 text-yellow-800",
    excused: "bg-blue-100 text-blue-800",
  };
  return classes[status] || "bg-gray-100 text-gray-800";
};

export default ClinicalAttendanceDashboard;
