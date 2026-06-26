"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SnapshotItem {
  label: string;
  value: number;
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
                  <p className="text-lg font-semibold">{item.value}</p>
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
  const academicItems: SnapshotItem[] = [
    { label: "Active Sessions", value: data?.sessions ?? 0, path: "/admin/academics/sessions" },
    { label: "Semesters", value: data?.semesters ?? 0, path: "/admin/academics/semesters" },
    { label: "Classes", value: data?.classes ?? 0, path: "/admin/academics/classes" },
    { label: "Courses", value: data?.courses ?? 0, path: "/admin/academics/courses" },
    { label: "Assessments", value: data?.assessments ?? 0, path: "/admin/assessments/dashboard" },
  ];

  return <Snapshot title="🎓 Academic Overview" items={academicItems} loading={loading} />;
};

/**
 * Clinical Snapshot Component
 */
export const ClinicalSnapshot = ({ loading = false, data }: { loading?: boolean; data?: any }) => {
  const clinicalItems: SnapshotItem[] = [
    { label: "Active Postings", value: data?.postings ?? 0, path: "/admin/clinicals/postings" },
    { label: "Departments", value: data?.departments ?? 0, path: "/admin/clinicals/departments" },
    { label: "Units", value: data?.units ?? 0, path: "/admin/clinicals/units" },
    { label: "Rotation Teams", value: data?.teams ?? 0, path: "/admin/clinicals/rotation-teams" },
    { label: "Active Rotations", value: data?.rotations ?? 0, path: "/admin/clinicals/rotation-matrix" },
  ];

  return <Snapshot title="🏥 Clinical Overview" items={clinicalItems} loading={loading} />;
};

export const Snapshots = {
  Academic: AcademicSnapshot,
  Clinical: ClinicalSnapshot,
};
