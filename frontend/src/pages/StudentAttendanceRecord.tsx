import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, differenceInMinutes } from "date-fns";
import { Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp } from "lucide-react";

interface SessionRecord {
  _id: string;
  title: string;
  activityType: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  unit: any;
  supervisor: any;
  attendees: any[];
  status: string;
}

interface Statistics {
  present: number;
  absent: number;
  late: number;
  excused: number;
  totalSessions: number;
  totalMinutesAttended: number;
}

export const StudentAttendanceRecord = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterActivityType, setFilterActivityType] = useState("all");
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    fetchStudentAttendance();
    fetchUnits();
  }, []);

  const fetchStudentAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/clinical-attendance/student-record?studentId=${user?._id}`);
      setSessions(response.data.data?.sessions || []);
      setStatistics(response.data.data?.statistics || null);
    } catch (error) {
      console.error("Error fetching student attendance:", error);
      toast.error("Failed to fetch attendance record");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get("/hospital-data/units");
      setUnits(response.data.data || []);
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  const getStudentRecord = (session: SessionRecord) => {
    return session.attendees.find((a) => a.student._id === user?._id);
  };

  const filteredSessions = sessions.filter((session) => {
    if (filterUnit !== "all" && session.unit?._id !== filterUnit) return false;
    if (filterActivityType !== "all" && session.activityType !== filterActivityType) return false;
    return true;
  });

  const chartData = [
    { name: "Present", value: statistics?.present || 0, fill: "#10b981" },
    { name: "Absent", value: statistics?.absent || 0, fill: "#ef4444" },
    { name: "Late", value: statistics?.late || 0, fill: "#f59e0b" },
    { name: "Excused", value: statistics?.excused || 0, fill: "#3b82f6" },
  ];

  const attendancePercentage = statistics
    ? Math.round(
        ((statistics.present + statistics.excused) /
          (statistics.totalSessions || 1)) *
          100
      )
    : 0;

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
      present: { bg: "bg-green-100", text: "text-green-800", icon: <CheckCircle2 className="w-4 h-4" /> },
      absent: { bg: "bg-red-100", text: "text-red-800", icon: <XCircle className="w-4 h-4" /> },
      late: { bg: "bg-yellow-100", text: "text-yellow-800", icon: <AlertCircle className="w-4 h-4" /> },
      excused: { bg: "bg-blue-100", text: "text-blue-800", icon: <Clock className="w-4 h-4" /> },
    };
    return colors[status] || { bg: "bg-gray-100", text: "text-gray-800", icon: <AlertCircle className="w-4 h-4" /> };
  };

  const activityTypes = Array.from(new Set(sessions.map((s) => s.activityType)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Clinical Attendance</h1>
        <p className="text-gray-600 mt-1">View your clinical activity attendance record</p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Present
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{statistics.present}</p>
              <p className="text-xs text-gray-500 mt-1">sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                Absent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{statistics.absent}</p>
              <p className="text-xs text-gray-500 mt-1">sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Late
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{statistics.late}</p>
              <p className="text-xs text-gray-500 mt-1">sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Excused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{statistics.excused}</p>
              <p className="text-xs text-gray-500 mt-1">absences</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Attendance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{attendancePercentage}%</p>
              <p className="text-xs text-gray-500 mt-1">overall</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statistics && statistics.totalSessions > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No attendance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Total Sessions Attended</span>
                <span className="text-2xl font-bold">{statistics?.totalSessions || 0}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Total Time Spent</span>
                <span className="text-2xl font-bold">
                  {Math.round((statistics?.totalMinutesAttended || 0) / 60)}h{" "}
                  {(statistics?.totalMinutesAttended || 0) % 60}m
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Your attendance rate is <strong>{attendancePercentage}%</strong>. Keep up
                the good work!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Unit</label>
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit._id} value={unit._id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Activity</label>
            <Select value={filterActivityType} onValueChange={setFilterActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {activityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace("_", " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Sessions</CardTitle>
          <CardDescription>
            {filteredSessions.length} sessions matching filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No sessions found</p>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => {
                    const record = getStudentRecord(session);
                    const statusInfo = getStatusColor(record?.status || "absent");

                    return (
                      <TableRow key={session._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{session.title}</p>
                            <p className="text-sm text-gray-500 capitalize">
                              {session.activityType.replace("_", " ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(session.date), "MMM dd, yyyy")}</p>
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
                          <Badge className={`${statusInfo.bg} ${statusInfo.text} flex w-fit items-center gap-1`}>
                            {statusInfo.icon}
                            {record?.status || "absent"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record?.duration
                            ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m`
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendanceRecord;
