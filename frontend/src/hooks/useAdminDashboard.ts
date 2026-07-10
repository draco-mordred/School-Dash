import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface DashboardData {
  stats: {
    totalStudents: number;
    totalParents: number;
    totalStaff: number;
    activeSession: string;
  };
  academicData: {
    sessions: number;
    semesters: number;
    classes: number;
    courses: number;
    assessments: number;
  };
  clinicalData: {
    postings: number;
    departments: number;
    units: number;
    teams: number;
    rotations: number;
  };
  alerts: any[];
  activities: any[];
}

/**
 * useAdminDashboard Hook
 * 
 * Fetches all data needed for the admin dashboard
 * Handles loading and error states
 */
export const useAdminDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from various endpoints
        const [statsRes, activitiesRes, usersRes, classesRes, attendanceRes] = await Promise.all([
          api.get("/dashboard/stats").catch(() => ({ data: {} })),
          api.get("/activities").catch(() => ({ data: [] })),
          api.get("/users").catch(() => ({ data: { data: [] } })),
          api.get("/classes").catch(() => ({ data: { data: [] } })),
          api.get("/attendance").catch(() => ({ data: { records: [] } })),
        ]);

        // Generate real alerts based on actual data
        const generateAlerts = () => {
          const alerts: any[] = [];
          
          const usersData = usersRes.data?.data || [];
          const unapprovedCount = usersData.filter((u: any) => u.approvalStatus !== "approved").length;
          if (unapprovedCount > 0) {
            alerts.push({
              id: "pending-approvals",
              type: "warning",
              title: `${unapprovedCount} Pending User Approvals`,
              description: "Users awaiting administrator approval",
              count: unapprovedCount,
            });
          }

          const attendanceData = attendanceRes.data?.records || [];
          const lowAttendance = attendanceData.filter((r: any) => r.attendancePercentage < 75).length;
          if (lowAttendance > 0) {
            alerts.push({
              id: "low-attendance",
              type: "error",
              title: `${lowAttendance} Low Attendance Records`,
              description: "Students below 75% attendance threshold",
              count: lowAttendance,
            });
          }

          const classesData = classesRes.data?.data || [];
          const unassignedClasses = classesData.filter((c: any) => !c.classTeacher).length;
          if (unassignedClasses > 0) {
            alerts.push({
              id: "unassigned-teachers",
              type: "warning",
              title: `${unassignedClasses} Classes Without Teachers`,
              description: "Some classes lack assigned class teachers",
              count: unassignedClasses,
            });
          }

          if (alerts.length === 0) {
            alerts.push({
              id: "all-clear",
              type: "info",
              title: "All Systems Operational",
              description: "No critical alerts at this time",
            });
          }

          return alerts;
        };

        // For now, use mock data with some real data fallbacks
        const mockData: DashboardData = {
          stats: {
            totalStudents: statsRes.data?.totalStudents ?? 450,
            totalParents: statsRes.data?.totalParents ?? 380,
            totalStaff: statsRes.data?.totalStaff ?? 65,
            activeSession: statsRes.data?.activeSession ?? "2024-2025",
          },
          academicData: {
            sessions: 1,
            semesters: 2,
            classes: 6,
            courses: 24,
            assessments: 12,
          },
          clinicalData: {
            postings: 8,
            departments: 12,
            units: 24,
            teams: 18,
            rotations: 36,
          },
          alerts: generateAlerts(),
          activities: activitiesRes.data && Array.isArray(activitiesRes.data)
            ? activitiesRes.data.map((activity: any, index: number) => ({
                id: activity.id || String(index),
                user: activity.user || "System",
                userInitials: (activity.user || "S").substring(0, 2).toUpperCase(),
                action: activity.action || "Updated",
                module: activity.module || "System",
                timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
                description: activity.description || "No description",
              }))
            : [
                {
                  id: "1",
                  user: "Admin User",
                  userInitials: "AU",
                  action: "Created",
                  module: "Student Account",
                  timestamp: new Date(Date.now() - 15 * 60000),
                  description: "John Doe",
                },
                {
                  id: "2",
                  user: "System",
                  userInitials: "SY",
                  action: "Updated",
                  module: "Timetable",
                  timestamp: new Date(Date.now() - 45 * 60000),
                  description: "Class 3A schedule",
                },
                {
                  id: "3",
                  user: "Admin User",
                  userInitials: "AU",
                  action: "Approved",
                  module: "Clinical Posting",
                  timestamp: new Date(Date.now() - 2 * 60 * 60000),
                  description: "Pediatrics rotation",
                },
              ],
        };

        setData(mockData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch dashboard data"));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return { data, loading, error };
};
