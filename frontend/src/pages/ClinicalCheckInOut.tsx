import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, LogOut, Clock } from "lucide-react";
import { format } from "date-fns";

interface SessionBasic {
  _id: string;
  title: string;
  activityType: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  status: string;
  unit: any;
}

interface AttendeeRecord {
  student: string;
  status: string;
  checkInTime?: Date;
  checkOutTime?: Date;
}

export const ClinicalCheckInOut = () => {
  const [activeSessions, setActiveSessions] = useState<SessionBasic[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [studentEmail, setStudentEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedInStudents, setCheckedInStudents] = useState<AttendeeRecord[]>([]);
  const [checkingInOut, setCheckingInOut] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const response = await api.get("/clinical-attendance/sessions?status=ongoing,planned");
      setActiveSessions(response.data.data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to fetch active sessions");
    }
  };

  useEffect(() => {
    if (selectedSession) {
      fetchSessionDetails(selectedSession);
    }
  }, [selectedSession]);

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const response = await api.get(`/clinical-attendance/sessions?sessionId=${sessionId}`);
      if (response.data.data && response.data.data[0]) {
        setCheckedInStudents(response.data.data[0].attendees || []);
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedSession || !studentEmail) {
      toast.error("Please select a session and enter student email");
      return;
    }

    try {
      setCheckingInOut("checkin");
      setLoading(true);

      // Get student ID from email
      const userResponse = await api.get(`/users?email=${studentEmail}`);
      const studentId = userResponse.data.data[0]?._id;

      if (!studentId) {
        toast.error("Student not found");
        return;
      }

      await api.post("/clinical-attendance/check-in", {
        sessionId: selectedSession,
        studentId,
        notes,
      });

      toast.success("Check-in successful!");
      setStudentEmail("");
      setNotes("");
      fetchSessionDetails(selectedSession);
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error(error.response?.data?.message || "Check-in failed");
    } finally {
      setLoading(false);
      setCheckingInOut(null);
    }
  };

  const handleCheckOut = async (studentId: string) => {
    if (!selectedSession) {
      toast.error("Please select a session");
      return;
    }

    try {
      setCheckingInOut(studentId);
      setLoading(true);

      await api.post("/clinical-attendance/check-out", {
        sessionId: selectedSession,
        studentId,
      });

      toast.success("Check-out successful!");
      fetchSessionDetails(selectedSession);
    } catch (error: any) {
      console.error("Check-out error:", error);
      toast.error(error.response?.data?.message || "Check-out failed");
    } finally {
      setLoading(false);
      setCheckingInOut(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      present: "bg-green-100 text-green-800",
      absent: "bg-red-100 text-red-800",
      late: "bg-yellow-100 text-yellow-800",
      excused: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clinical Check-In/Check-Out</h1>
        <p className="text-gray-600 mt-1">Manage attendance for ongoing clinical sessions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-In Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Check In / Check Out</CardTitle>
              <CardDescription>Record student attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Session Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Clinical Session
                </label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSessions.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No active sessions available
                      </div>
                    ) : (
                      activeSessions.map((session) => (
                        <SelectItem key={session._id} value={session._id}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{session.title}</span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {session.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedSession && (
                <div>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      {activeSessions.find((s) => s._id === selectedSession) && (
                        <div className="space-y-1 text-sm">
                          <p>
                            <strong>Unit:</strong>{" "}
                            {activeSessions.find((s) => s._id === selectedSession)?.unit?.name}
                          </p>
                          <p>
                            <strong>Date:</strong>{" "}
                            {format(
                              new Date(
                                activeSessions.find((s) => s._id === selectedSession)?.date || new Date()
                              ),
                              "MMM dd, yyyy"
                            )}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Student Email Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Student Email
                </label>
                <Input
                  type="email"
                  placeholder="student@example.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  disabled={!selectedSession || loading}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes (optional)
                </label>
                <Input
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!selectedSession || loading}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCheckIn}
                  disabled={!selectedSession || !studentEmail || loading || checkingInOut !== null}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {checkingInOut === "checkin" ? "Checking In..." : "Check In"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSession ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Total Checked In</p>
                    <p className="text-2xl font-bold text-green-600">
                      {checkedInStudents.filter((s) => s.checkInTime).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Not Checked In</p>
                    <p className="text-2xl font-bold text-red-600">
                      {checkedInStudents.filter((s) => !s.checkInTime).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Attendees</p>
                    <p className="text-2xl font-bold">
                      {checkedInStudents.length}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Select a session to view summary
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checked-In Students List */}
      {selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle>Session Attendees</CardTitle>
            <CardDescription>
              {checkedInStudents.length} students registered for this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {checkedInStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-6">No attendees yet</p>
              ) : (
                checkedInStudents.map((attendee, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {attendee.student}
                      </p>
                      <p className="text-xs text-gray-500">
                        {attendee.checkInTime
                          ? `Checked in: ${format(new Date(attendee.checkInTime), "HH:mm")}`
                          : "Not checked in"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(attendee.status)}>
                        {attendee.status}
                      </Badge>
                      {attendee.checkInTime && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(typeof attendee.student === "string" ? attendee.student : attendee.student._id)}
                          disabled={loading || checkingInOut !== null}
                        >
                          <LogOut className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicalCheckInOut;
