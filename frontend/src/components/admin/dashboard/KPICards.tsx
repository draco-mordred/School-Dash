"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Briefcase } from "lucide-react";
import { Loader2 } from "lucide-react";

interface KPICardsProps {
  loading?: boolean;
  stats?: {
    totalStudents: number;
    totalParents: number;
    totalStaff: number;
    activeSession: string;
  };
}

/**
 * KPI Cards Component
 * 
 * Displays key performance indicators at the top of the dashboard:
 * - Total Students
 * - Total Parents
 * - Total Staff
 * - Active Academic Session
 */
export const KPICards = ({ loading = false, stats }: KPICardsProps) => {
  const kpis = [
    {
      title: "Total Students",
      value: stats?.totalStudents ?? 0,
      icon: GraduationCap,
      color: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-300",
    },
    {
      title: "Total Parents",
      value: stats?.totalParents ?? 0,
      icon: Users,
      color: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-300",
    },
    {
      title: "Total Staff",
      value: stats?.totalStaff ?? 0,
      icon: Briefcase,
      color: "bg-green-100 dark:bg-green-900",
      iconColor: "text-green-600 dark:text-green-300",
    },
    {
      title: "Active Session",
      value: stats?.activeSession ?? "N/A",
      icon: BookOpen,
      color: "bg-amber-100 dark:bg-amber-900",
      iconColor: "text-amber-600 dark:text-amber-300",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${kpi.color}`}>
                  <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <div className="text-2xl font-bold">{kpi.value}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
