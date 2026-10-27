import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LecturerSessionCardComponent from "@/components/attendance/LecturerSessionCard";
import TeacherClassPerformanceCard from "@/components/attendance/TeacherClassPerformanceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Teacher attendance overview (/attendance/overview): today’s lectures
// with GPS check-in, the student complaint queue with resolve actions,
// and per-class attendance performance.
export default function AttendanceOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role !== "teacher") {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          The attendance overview is only available to teachers.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Attendance Overview</h1>
          <p className="text-sm text-muted-foreground">
            Your lectures today, GPS check-in, incoming student complaints, and class performance — all in one place.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => navigate("/attendance")}
        >
          Back to attendance
        </Button>
      </div>

      <LecturerSessionCardComponent />

      <TeacherClassPerformanceCard />
    </div>
  );
}
