import { useState } from "react";
import ActivitySubmissionForm from "@/components/clinical-activities/ActivitySubmissionForm";
import StudentLogbook from "@/components/clinical-activities/StudentLogbook";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

export default function ClinicalActivities() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleActivitySubmitted = () => {
    // Trigger refresh of logbook
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clinical Activities</h1>
        <p className="text-muted-foreground">
          Submit and track your clinical activities for approval
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="submit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submit">Submit Activity</TabsTrigger>
          <TabsTrigger value="logbook">My Logbook</TabsTrigger>
        </TabsList>

        {/* Submit Activity Tab */}
        <TabsContent value="submit" className="space-y-4">
          <ActivitySubmissionForm onSuccess={handleActivitySubmitted} />
        </TabsContent>

        {/* Logbook Tab */}
        <TabsContent value="logbook" className="space-y-4" key={refreshKey}>
          <StudentLogbook />
        </TabsContent>
      </Tabs>
    </div>
  );
}
