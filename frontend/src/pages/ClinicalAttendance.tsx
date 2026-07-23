import { FormEvent, useEffect, useState } from "react";
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
import { Clock, Plus, CheckCircle2, UserX, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface AttendanceRecord {
  student: any;
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
  unit: any;
  supervisor: any;
  status: "planned" | "ongoing" | "completed" | "cancelled";
  attendees: AttendanceRecord[];
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

export const ClinicalAttendanceDashboard = () => {
  const [sessions, setSessions] = useState<ClinicalSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ClinicalSession[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState<ClinicalSession | null>(
    null
  );

  useEffect(() => {
    fetchSessions();
    fetchUnits();
  }, []);

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
    const icons: Record<string, JSX.Element> = {
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
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [schedulePostings, setSchedulePostings] = useState<any[]>([]);
  const [hospitalUnits, setHospitalUnits] = useState<any[]>([]);
  const [scheduleUnits, setScheduleUnits] = useState<any[]>([]);
  const [scheduleDepartments, setScheduleDepartments] = useState<string[]>([]);
  const [units, setUnits] = useState<any[]>([]);
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

        const nextPostings: any[] = [];
        const normalizeDepartmentValue = (value: unknown, set: Set<string>) => {
          if (typeof value !== "string" || !value.trim()) {
            return;
          }

          const normalized = value.trim().toLowerCase();
          set.add(normalized);

          const stripped = normalized.replace(/^department of\s+/, "").trim();
          if (stripped && stripped !== normalized) {
            set.add(stripped);
          }
        };

        const buildDepartmentCandidates = (value: unknown) => {
          if (typeof value !== "string" || !value.trim()) {
            return [] as string[];
          }

          const normalized = value.trim().toLowerCase();
          const stripped = normalized.replace(/^department of\s+/, "").trim();
          return stripped && stripped !== normalized ? [normalized, stripped] : [normalized];
        };

        scheduleList.forEach((schedule: any) => {
          const scheduleId = String(schedule?._id ?? "");
          const postings = Array.isArray(schedule?.postings) && schedule.postings.length > 0 ? schedule.postings : [{ _id: scheduleId, name: schedule?.name }];
          postings.forEach((posting: any) => {
            const postingId = String(posting?._id ?? scheduleId);
            const postingName = posting?.name || schedule?.name || "Posting schedule";
            if (!nextPostings.some((item) => item._id === postingId)) {
              nextPostings.push({
                _id: postingId,
                name: postingName,
                scheduleId,
              });
            }
          });
        });

        // Resolve active schedule: formData.clinicalRotation may be a schedule _id or a posting _id
        let activeSchedule: any = null;
        let activePosting: any = null;
        if (formData.clinicalRotation) {
          // find schedule where posting._id matches
          for (const schedule of scheduleList) {
            const postings = Array.isArray(schedule?.postings) ? schedule.postings : [];
            const found = postings.find((p: any) => String(p?._id) === String(formData.clinicalRotation));
            if (found) {
              activeSchedule = schedule;
              activePosting = found;
              break;
            }
          }
          // fallback: maybe clinicalRotation is the schedule id itself
          if (!activeSchedule) {
            activeSchedule = scheduleList.find((s: any) => String(s?._id) === String(formData.clinicalRotation)) || null;
          }
        }
        activeSchedule = activeSchedule || scheduleList[0] || null;

        const unitNames = new Set<string>();
        const departmentNames = new Set<string>();

        if (activeSchedule) {
          const timeline = Array.isArray(activeSchedule?.meta?.timeline)
            ? activeSchedule.meta.timeline
            : Array.isArray(activeSchedule?.postings?.[0]?.meta?.timeline)
            ? activeSchedule.postings[0].meta.timeline
            : Array.isArray(activeSchedule?.meta?.windows)
            ? activeSchedule.meta.windows
            : [];

          if (timeline.length === 0) {
            console.warn("No timeline found on rotation schedule:", activeSchedule._id || activeSchedule.name);
          }

          setTimelineMissing(timeline.length === 0);

          timeline.forEach((window: any) => {
            if (typeof window?.unitName === "string" && window.unitName.trim()) {
              unitNames.add(window.unitName.trim().toLowerCase());
            }
            normalizeDepartmentValue(typeof window?.department === 'string' ? window.department.trim().toLowerCase() : window?.department, departmentNames);
            normalizeDepartmentValue(typeof window?.departmentName === 'string' ? window.departmentName.trim().toLowerCase() : window?.departmentName, departmentNames);
            normalizeDepartmentValue(typeof window?.departmentId === 'string' ? window.departmentId.trim().toLowerCase() : window?.departmentId, departmentNames);
            normalizeDepartmentValue(typeof window?.departmentCode === 'string' ? window.departmentCode.trim().toLowerCase() : window?.departmentCode, departmentNames);
          });

          // Inspect groups from the selected posting if available, otherwise inspect all postings on the schedule
          const postingsToInspect = activePosting ? [activePosting] : (Array.isArray(activeSchedule?.postings) ? activeSchedule.postings : []);
          postingsToInspect.forEach((posting: any) => {
            const groups = Array.isArray(posting?.groups) ? posting.groups : [];
            groups.forEach((group: any) => {
              const groupData = group?.group || group || {};
              const unitName =
                groupData.unitName ||
                (groupData.unit && typeof groupData.unit === "object"
                  ? groupData.unit.name
                  : groupData.unit) ||
                groupData.name;

              if (typeof unitName === "string" && unitName.trim()) {
                unitNames.add(unitName.trim());
              }

              normalizeDepartmentValue(groupData.department, departmentNames);
              normalizeDepartmentValue(groupData.departmentName, departmentNames);
              normalizeDepartmentValue(groupData.departmentId, departmentNames);
              normalizeDepartmentValue(groupData.departmentCode, departmentNames);
            });
          });
        }

        const derivedUnits = hospitalUnits.filter((unit: any) => {
          if (typeof unit.name !== "string" || !unit.name.trim()) return false;
          const name = unit.name.trim().toLowerCase();
          for (const candidate of Array.from(unitNames)) {
            const c = String(candidate).toLowerCase();
            if (name === c || name.includes(c) || c.includes(name)) return true;
          }
          return false;
        });

        const derivedDepartmentUnits = hospitalUnits.filter((unit: any) => {
          const candidates = [
            ...buildDepartmentCandidates(unit.department),
            ...buildDepartmentCandidates(unit.departmentName),
            ...buildDepartmentCandidates(unit.departmentId),
            ...buildDepartmentCandidates(unit.departmentID),
            ...buildDepartmentCandidates(unit.departmentCode),
          ];

          return candidates.some((candidate) => {
            if (departmentNames.has(candidate)) return true;
            for (const d of Array.from(departmentNames)) {
              const dn = String(d).toLowerCase();
              if (dn === candidate || dn.includes(candidate) || candidate.includes(dn)) return true;
            }
            return false;
          });
        });

        setSchedulePostings(nextPostings);
        setScheduleUnits(derivedUnits);
        setScheduleDepartments(Array.from(departmentNames));

        if (derivedUnits.length > 0) {
          setUnits(derivedUnits);
          if (!formData.unit || !derivedUnits.some((unit) => String(unit._id) === String(formData.unit))) {
            setFormData((current) => ({ ...current, unit: derivedUnits[0]._id }));
          }
        } else if (derivedDepartmentUnits.length > 0) {
          setUnits(derivedDepartmentUnits);
          if (!formData.unit || !derivedDepartmentUnits.some((unit) => String(unit._id) === String(formData.unit))) {
            setFormData((current) => ({ ...current, unit: derivedDepartmentUnits[0]._id }));
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
      });
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create clinical session");
    } finally {
      setLoading(false);
    }
  };

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
          <label className="block text-sm font-medium mb-1">
            {scheduleUnits.length > 0
              ? "Unit"
              : scheduleDepartments.length > 0
              ? "Unit / Department"
              : "Unit"}
          </label>
          {units.length > 0 ? (
            <>
              {scheduleUnits.length === 0 && scheduleDepartments.length > 0 ? (
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">Department</label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value, unit: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleDepartments.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">Selecting a department will create a department-level session.</p>
                </div>
              ) : null}
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={scheduleUnits.length > 0 ? "Select a unit" : "Select a department unit"} />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit._id} value={unit._id}>
                      {unit.name} {unit.department ? `(${unit.department})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scheduleUnits.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing units available from the selected class posting schedule.
                </p>
              )}
              {scheduleUnits.length === 0 && scheduleDepartments.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Units are not enabled for the selected posting schedule. Showing hospital units for scheduled departments: {scheduleDepartments.join(", ")}.
                </p>
              )}
              {scheduleUnits.length === 0 && scheduleDepartments.length === 0 && formData.classId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No matched schedule units or departments found; using all hospital units.
                </p>
              )}
            </>
          ) : (
            <Input
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value })
              }
              placeholder="Enter unit ID"
            />
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

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Session"}
      </Button>
    </form>
  );
};

const SessionDetailsDialog = ({
  session,
  onClose,
  onUpdate,
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
            {timelineMissing ? (
              <div className="col-span-2 mb-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
                This posting has no schedule timeline; units derived from the posting may be unavailable. You can pick a Department or select a hospital Unit.
              </div>
            ) : null}
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
