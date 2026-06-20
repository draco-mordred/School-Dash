import { useState } from "react";
import ActivityApprovalPanel from "@/components/clinical-activities/ActivityApprovalPanel";
import { useAuth } from "@/hooks/useAuth";

export default function StaffApprovals() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleApprovalChange = () => {
    // Trigger refresh
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve clinical activities submitted by students
        </p>
      </div>

      {/* Approval Panel */}
      <div key={refreshKey}>
        <ActivityApprovalPanel onApprovalChange={handleApprovalChange} />
      </div>
    </div>
  );
}
