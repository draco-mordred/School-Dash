import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState<ClinicalSession | null>(
    null
  );

  useEffect(() => {
    fetchSessions();
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

  useEffect(() => {
    let filtered = sessions;

    if (filterStatus !== "all") {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }

    if (filterUnit !== "all") {
      filtered = filtered.filter((s) => s.unit._id === filterUnit);
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
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
  const [formData, setFormData] = useState({
    activityType: "ward_round",
    title: "",
    description: "",
    date: "",
    startTime: "",
    unit: "",
    location: "",
    supervisor: "",
    academicYear: "",
  });

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
        location: "",
        supervisor: "",
        academicYear: "",
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

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Input
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Session description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <Input
            type="time"
            value={formData.startTime}
            onChange={(e) =>
              setFormData({ ...formData, startTime: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
