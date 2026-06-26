"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { KPICards } from "@/components/admin/dashboard/KPICards";
import { AcademicSnapshot, ClinicalSnapshot } from "@/components/admin/dashboard/Snapshots";
import { OperationalAlerts } from "@/components/admin/dashboard/OperationalAlerts";
import { RecentActivityFeed } from "@/components/admin/dashboard/RecentActivityFeed";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { AnalyticsWidgets } from "@/components/admin/dashboard/AnalyticsWidgets";

/**
 * Admin Dashboard Page
 * 
 * Institutional Command Center displaying:
 * - KPI Cards (Total Students, Staff, Sessions)
 * - Academic & Clinical Snapshots
 * - Operational Alerts
 * - Recent Activity Feed
 * - Quick Action Buttons
 * - Analytics Widgets
 */
export const AdminDashboard = () => {
  const { user } = useAuth();
  const { data, loading, error } = useAdminDashboard();

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the Admin Portal, {user?.name}. Institutional Command Center.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">Error loading dashboard data. Please try refreshing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to the Admin Portal, {user?.name}. Institutional Command Center.
        </p>
      </div>

      {/* KPI Cards */}
      <section>
        <KPICards
          loading={loading}
          stats={{
            totalStudents: data?.stats.totalStudents ?? 0,
            totalParents: data?.stats.totalParents ?? 0,
            totalStaff: data?.stats.totalStaff ?? 0,
            activeSession: data?.stats.activeSession ?? "N/A",
          }}
        />
      </section>

      {/* Academic & Clinical Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AcademicSnapshot
          loading={loading}
          data={data?.academicData}
        />
        <ClinicalSnapshot
          loading={loading}
          data={data?.clinicalData}
        />
      </div>

      {/* Operational Alerts */}
      <section>
        <OperationalAlerts
          alerts={data?.alerts ?? []}
          loading={loading}
        />
      </section>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivityFeed
            activities={data?.activities ?? []}
            loading={loading}
          />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Analytics Widgets */}
      <section>
        <AnalyticsWidgets loading={loading} />
      </section>
    </div>
  );
};

export default AdminDashboard;
