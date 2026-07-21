"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface SnapshotItem {
  label: string;
  value: ReactNode;
  path: string;
}

interface SnapshotProps {
  title: string;
  items: SnapshotItem[];
  loading?: boolean;
}

/**
 * Snapshot Component
 * 
 * Displays a snapshot of key metrics in a category
 * Used for Academic and Clinical overviews
 */
export const Snapshot = ({ title, items, loading = false }: SnapshotProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
                onClick={() => navigate(item.path)}
              >
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="mt-1">{typeof item.value === "number" ? <p className="text-lg font-semibold">{item.value}</p> : item.value}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Academic Snapshot Component
 */
export const AcademicSnapshot = ({ loading = false, data }: { loading?: boolean; data?: any }) => {
  const classSummaries = data?.details?.classes ?? [];

  const academicItems: SnapshotItem[] = [
    {
      label: "Active Sessions",
      value: (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{data?.details?.activeAcademicYear ?? data?.sessions ?? 0}</p>
          <p className="text-xs text-muted-foreground">Current academic year</p>
        </div>
      ),
      path: "/academics/sessions",
    },
    {
      label: "Semesters",
      value: (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{data?.details?.currentSemester ?? `${data?.semesters ?? 0} active semesters`}</p>
          <p className="text-xs text-muted-foreground">Current session structure</p>
        </div>
      ),
      path: "/academics/semesters",
    },
    {
      label: "Classes",
      value: (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{data?.classes ?? 0} classes</p>
          <div className="flex flex-wrap gap-1">
            {classSummaries.slice(0, 3).map((item: any, index: number) => (
              <span key={`${item.name}-${index}`} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {item.name}
              </span>
            ))}
          </div>
        </div>
      ),
      path: "/academics/classes",
    },
    {
      label: "Courses",
      value: (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{data?.courses ?? 0} total</p>
          <p className="text-xs text-muted-foreground">Across the active classes</p>
        </div>
      ),
      path: "/academics/courses",
    },
    {
      label: "Assessments",
      value: (
        <div className="space-y-1">
          {classSummaries.length > 0 ? classSummaries.slice(0, 3).map((item: any, index: number) => (
            <div key={`${item.name}-assessment-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1 text-xs">
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium text-foreground">{item.assessmentCount} assessments</span>
            </div>
          )) : <p className="text-sm font-semibold text-foreground">{data?.assessments ?? 0} assessments</p>}
        </div>
      ),
      path: "/assessments/dashboard",
    },
  ];

  return <Snapshot title="🎓 Academic Overview" items={academicItems} loading={loading} />;
};

/**
 * Clinical Snapshot Component
 */
export const ClinicalSnapshot = ({ loading = false, data }: { loading?: boolean; data?: any }) => {
  const clinicalItems: SnapshotItem[] = [
    {
      label: "Active Postings",
      value: (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{data?.postings ?? 0} active postings</p>
          {(data?.details?.postings ?? []).slice(0, 3).map((item: any, index: number) => (
            <div key={`${item.className}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1 text-xs">
              <span className="text-muted-foreground">{item.className}</span>
              <span className={`font-medium ${item.hasSchedule ? "text-foreground" : "text-amber-600"}`}>
                {item.hasSchedule ? "Schedule ready" : "No schedule"}
              </span>
            </div>
          ))}
        </div>
      ),
      path: "/clinicals/postings",
    },
    {
      label: "Departments",
      value: (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{data?.departments ?? 0} departments</p>
          <p className="text-xs text-muted-foreground">Institution-wide</p>
        </div>
      ),
      path: "/departments",
    },
    {
      label: "Units",
      value: (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{data?.units ?? 0} units</p>
          <p className="text-xs text-muted-foreground">Across the institution</p>
        </div>
      ),
      path: "/units",
    },
    {
      label: "Rotation Teams",
      value: (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{data?.teams ?? 0} teams</p>
          {(data?.details?.rotationTeams ?? []).slice(0, 3).map((item: any, index: number) => (
            <div key={`${item.className}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1 text-xs">
              <span className="text-muted-foreground">{item.className}</span>
              <span className="font-medium text-foreground">{item.teamCount} teams</span>
            </div>
          ))}
        </div>
      ),
      path: "/rotation-teams",
    },
    {
      label: "Active Rotations",
      value: (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{data?.rotations ?? 0} active rotations</p>
          {(data?.details?.rotations ?? []).slice(0, 3).map((item: any, index: number) => (
            <div key={`${item.className}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1 text-xs">
              <span className="text-muted-foreground">{item.className}</span>
              <span className="font-medium text-foreground">{item.duration}</span>
            </div>
          ))}
        </div>
      ),
      path: "/rotation-schedules",
    },
  ];

  return <Snapshot title="🏥 Clinical Overview" items={clinicalItems} loading={loading} />;
};

export const Snapshots = {
  Academic: AcademicSnapshot,
  Clinical: ClinicalSnapshot,
};
