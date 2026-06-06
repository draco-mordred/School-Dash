import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CalendarCheck, Users, AlertCircle } from "lucide-react";

interface ClassStatus {
  classId: string;
  className: string;
  academicYear: string;
  timetableStatus: "active" | "not set";
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export default function Notifications() {
  const [classes, setClasses] = useState<ClassStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const totalClasses = classes.length;
  const activeTimetables = classes.filter((cls) => cls.timetableStatus === "active").length;
  const missingTimetables = totalClasses - activeTimetables;
  const classesWithAttendanceAlerts = classes.filter((cls) => cls.absent > 0 || cls.late > 0 || cls.excused > 0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get("/attendance/status");
        setClasses(data.classes ?? []);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    void fetchStatus();
  }, []);

  return (
    <div className="flex w-full flex-col gap-4 px-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Class Status Overview
        </h2>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalClasses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Timetables</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeTimetables}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Attendance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{classesWithAttendanceAlerts.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>No class data available.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <Card key={cls.classId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{cls.className}</CardTitle>
                  <div className="text-xs text-muted-foreground">{cls.academicYear}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Timetable status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                      <span>Timetable</span>
                    </div>
                    <Badge
                      variant={cls.timetableStatus === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {cls.timetableStatus === "active" ? "Active" : "Not Set"}
                    </Badge>
                  </div>

                  {/* Attendance summary */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Attendance</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between border rounded px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs">Present</span>
                      </div>
                      <span className="text-xs font-semibold">{cls.present}</span>
                    </div>
                    <div className="flex items-center justify-between border rounded px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-xs">Absent</span>
                      </div>
                      <span className="text-xs font-semibold">{cls.absent}</span>
                    </div>
                    <div className="flex items-center justify-between border rounded px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span className="text-xs">Late</span>
                      </div>
                      <span className="text-xs font-semibold">{cls.late}</span>
                    </div>
                    <div className="flex items-center justify-between border rounded px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-xs">Excused</span>
                      </div>
                      <span className="text-xs font-semibold">{cls.excused}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Other Important Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {classesWithAttendanceAlerts.length === 0 && missingTimetables === 0 ? (
                <p className="text-sm text-muted-foreground">No urgent notifications. All classes are up to date.</p>
              ) : (
                <div className="space-y-3">
                  {missingTimetables > 0 && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-3 text-sm">
                      <p className="font-medium">{missingTimetables} classes need timetable generation</p>
                      <p className="text-muted-foreground">Please generate timetables to avoid attendance and schedule gaps.</p>
                    </div>
                  )}
                  {classesWithAttendanceAlerts.map((cls) => (
                    <div key={cls.classId} className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3 text-sm">
                      <p className="font-medium">{cls.className} has attendance alerts</p>
                      <p className="text-muted-foreground">
                        {cls.absent > 0 ? `${cls.absent} absent, ` : ""}
                        {cls.late > 0 ? `${cls.late} late, ` : ""}
                        {cls.excused > 0 ? `${cls.excused} excused` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}