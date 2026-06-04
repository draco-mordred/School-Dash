import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router";

// UI Imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileText, CheckCircle2 } from "lucide-react";

// Custom Components
import { AiInsightWidget } from "@/components/dashboard/ai-insight-widget";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>({});

  // 1. Fetch Data Logic
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // THE REAL CALL
        const { data } = await api.get("/dashboard/stats");
        setStatsData(data);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user]);

  // 2. Loading State
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-100" />
          <Skeleton className="col-span-3 h-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}! Here is your daily academic overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Role specific actions */}
          {user?.role === "admin" && (
            <Button onClick={() => navigate("/users/students")}>
              Manage Students
            </Button>
          )}
          {user?.role === "teacher" && (
            <Button onClick={() => navigate("/lms/quizzes")}>
              Create Quiz
            </Button>
          )}
        </div>
      </div>

      {/* --- TOP ROW: STATS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats role={user?.role || "student"} data={statsData} />
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* LEFT COLUMN (Content) */}
        <div className="col-span-4 space-y-4">
          {/* AI WIDGET */}
          <AiInsightWidget role={user?.role} />

          {/* RECENT ACTIVITY CARD */}
          {user?.role === "admin" && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates from the school system.
                  </CardDescription>
                </div>
                <Link to="/"></Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statsData.recentActivity?.map(
                    (activity: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start pb-4 last:mb-0 last:pb-0 border-b last:border-0"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500 mt-1" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {activity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Just now
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN (Schedule/Quick Links) */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate("/timetable")}
              >
                <Calendar className="mr-2 h-4 w-4" /> View Timetable
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate("/lms/materials")}
              >
                <FileText className="mr-2 h-4 w-4" /> Study Materials
              </Button>
              {user?.role === "admin" && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => navigate("/settings/academic-years")}
                >
                  <Calendar className="mr-2 h-4 w-4" /> Academic Settings
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
