import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface DashboardAcademicClassSummary {
  name: string;
  courseCount: number;
  assessmentCount: number;
  phaseLabel?: string | null;
}

export interface DashboardClinicalPostingSummary {
  className: string;
  phaseLabel?: string | null;
  hasSchedule: boolean;
}

export interface DashboardClinicalRotationTeamSummary {
  className: string;
  teamCount: number;
}

export interface DashboardClinicalRotationSummary {
  className: string;
  name: string;
  dateRange: string;
  duration: string;
}

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
    details?: {
      activeAcademicYear?: string | null;
      currentSemester?: string | null;
      classes?: DashboardAcademicClassSummary[];
    };
  };
  clinicalData: {
    postings: number;
    departments: number;
    units: number;
    teams: number;
    rotations: number;
    details?: {
      postings?: DashboardClinicalPostingSummary[];
      rotationTeams?: DashboardClinicalRotationTeamSummary[];
      rotations?: DashboardClinicalRotationSummary[];
    };
  };
  alerts: any[];
  activities: any[];
}

export const buildAdminDashboardData = (
  statsData: any,
  overviewData: any,
  previousData: DashboardData | null = null,
): DashboardData => {
  const previousStats = previousData?.stats;
  const previousAcademicData = previousData?.academicData;
  const previousClinicalData = previousData?.clinicalData;
  const overview = overviewData && typeof overviewData === "object" ? overviewData : {};
  const academicOverview = overview.academic && typeof overview.academic === "object" ? overview.academic : {};
  const clinicalOverview = overview.clinical && typeof overview.clinical === "object" ? overview.clinical : {};

  return {
    stats: {
      totalStudents: statsData?.totalStudents ?? previousStats?.totalStudents ?? 450,
      totalParents: statsData?.totalParents ?? previousStats?.totalParents ?? 380,
      totalStaff: statsData?.totalStaff ?? previousStats?.totalStaff ?? 65,
      activeSession: statsData?.activeSession ?? previousStats?.activeSession ?? "2024-2025",
    },
    academicData: {
      sessions: academicOverview.sessions ?? previousAcademicData?.sessions ?? 0,
      semesters: academicOverview.semesters ?? previousAcademicData?.semesters ?? 0,
      classes: academicOverview.classes ?? previousAcademicData?.classes ?? 0,
      courses: academicOverview.courses ?? previousAcademicData?.courses ?? 0,
      assessments: academicOverview.assessments ?? previousAcademicData?.assessments ?? 0,
      details: {
        activeAcademicYear: academicOverview.details?.activeAcademicYear ?? previousAcademicData?.details?.activeAcademicYear ?? null,
        currentSemester: academicOverview.details?.currentSemester ?? previousAcademicData?.details?.currentSemester ?? null,
        classes: academicOverview.details?.classes ?? previousAcademicData?.details?.classes ?? [],
      },
    },
    clinicalData: {
      postings: clinicalOverview.postings ?? previousClinicalData?.postings ?? 0,
      departments: clinicalOverview.departments ?? previousClinicalData?.departments ?? 0,
      units: clinicalOverview.units ?? previousClinicalData?.units ?? 0,
      teams: clinicalOverview.teams ?? previousClinicalData?.teams ?? 0,
      rotations: clinicalOverview.rotations ?? previousClinicalData?.rotations ?? 0,
      details: {
        postings: clinicalOverview.details?.postings ?? previousClinicalData?.details?.postings ?? [],
        rotationTeams: clinicalOverview.details?.rotationTeams ?? previousClinicalData?.details?.rotationTeams ?? [],
        rotations: clinicalOverview.details?.rotations ?? previousClinicalData?.details?.rotations ?? [],
      },
    },
    alerts: previousData?.alerts ?? [],
    activities: previousData?.activities ?? [],
  };
};

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
    const fetchInitial = async () => {
      try {
        // Initial, lightweight fetch: stats + overview only
        const [statsRes, overviewRes] = await Promise.all([
          api.get("/dashboard/stats").catch(() => ({ data: {} })),
          api.get("/dashboard/overview").catch(() => ({ data: {} })),
        ]);

        const initial = buildAdminDashboardData(statsRes.data, overviewRes.data);

        setData(initial);
        setError(null);
        setLoading(false); // permit UI to render with primary data

        // Background: fetch non-critical data (activities, users, classes, attendance)
        try {
          const [activitiesRes, usersRes, classesRes, attendanceRes] = await Promise.all([
            api.get("/activities").catch(() => ({ data: [] })),
            api.get("/users").catch(() => ({ data: { data: [] } })),
            api.get("/classes").catch(() => ({ data: { data: [] } })),
            api.get("/attendance").catch(() => ({ data: { records: [] } })),
          ]);

          // Generate alerts as before
          const alerts: any[] = [];
          const usersData = usersRes.data?.data || [];
          const unapprovedCount = usersData.filter((u: any) => u.approvalStatus !== "approved").length;
          if (unapprovedCount > 0) {
            alerts.push({ id: "pending-approvals", type: "warning", title: `${unapprovedCount} Pending User Approvals`, description: "Users awaiting administrator approval", count: unapprovedCount });
          }

          const attendanceData = attendanceRes.data?.records || [];
          const lowAttendance = attendanceData.filter((r: any) => r.attendancePercentage < 75).length;
          if (lowAttendance > 0) {
            alerts.push({ id: "low-attendance", type: "error", title: `${lowAttendance} Low Attendance Records`, description: "Students below 75% attendance threshold", count: lowAttendance });
          }

          const classesData = classesRes.data?.data || [];
          const unassignedClasses = classesData.filter((c: any) => !c.classTeacher).length;
          if (unassignedClasses > 0) {
            alerts.push({ id: "unassigned-teachers", type: "warning", title: `${unassignedClasses} Classes Without Teachers`, description: "Some classes lack assigned class teachers", count: unassignedClasses });
          }

          if (alerts.length === 0) {
            alerts.push({ id: "all-clear", type: "info", title: "All Systems Operational", description: "No critical alerts at this time" });
          }

          const activities = activitiesRes.data && Array.isArray(activitiesRes.data)
            ? activitiesRes.data.map((activity: any, index: number) => ({
                id: activity.id || String(index),
                user: activity.user || "System",
                userInitials: (activity.user || "S").substring(0, 2).toUpperCase(),
                action: activity.action || "Updated",
                module: activity.module || "System",
                timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
                description: activity.description || "No description",
              }))
            : [];

          setData((prev) => {
            const next = buildAdminDashboardData(statsRes.data, overviewRes.data, prev);
            return { ...next, alerts, activities };
          });
        } catch (bgErr) {
          // background fetch failed — keep initial data but log
          console.warn("Background dashboard fetch failed", bgErr);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch dashboard data"));
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  return { data, loading, error };
};
