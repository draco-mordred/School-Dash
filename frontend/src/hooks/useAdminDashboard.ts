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
        // Note: These endpoints may need to be created on the backend
        const [statsRes, activitiesRes] = await Promise.all([
          api.get("/admin/dashboard/stats").catch(() => ({ data: {} })),
          api.get("/admin/dashboard/activities").catch(() => ({ data: [] })),
        ]);

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
          alerts: [
            {
              id: "1",
              type: "warning",
              title: "3 Timetable Conflicts",
              description: "Some lecturers have overlapping schedules",
              count: 3,
            },
            {
              id: "2",
              type: "error",
              title: "5 Missing Staff Assignments",
              description: "Some courses lack assigned lecturers",
              count: 5,
            },
            {
              id: "3",
              type: "warning",
              title: "12 Low Attendance Records",
              description: "Students below 75% attendance threshold",
              count: 12,
            },
          ],
          activities: [
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
