import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, FileText } from "lucide-react";

interface ApprovedActivity {
  _id: string;
  entryDate: string;
  unit: { name: string; department: string };
  umbrellaCategory: string;
  clinicsAttended: boolean;
  wardRoundsAttended: string;
  callDutyCompleted: boolean;
  approvedBy: { name: string; designation: string };
  approvedAt: string;
  surgicalMetrics?: {
    theatreDaysCount: number;
    casesObserved: string[];
    casesAssisted: string[];
  };
  medicalMetrics?: {
    proceduresWitnessedOrDone: string[];
  };
}

interface StudentLogbookProps {
  rotationId?: string;
  onActivityCountChange?: (count: number) => void;
}

export default function StudentLogbook({
  rotationId,
  onActivityCountChange,
}: StudentLogbookProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ApprovedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotations, setRotations] = useState<any[]>([]);
  const [selectedRotation, setSelectedRotation] = useState<string>(rotationId || "");
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    byCategory: { MEDICINE: 0, SURGERY: 0 },
  });

  const fetchRotations = async () => {
    try {
      const { data } = await api.get(`/clinical-rotations/active?studentId=${user?._id}`);
      setRotations(data.rotations || []);
      if (data.rotations?.length > 0 && !selectedRotation) {
        setSelectedRotation(data.rotations[0]._id);
      }
    } catch (error) {
      console.error("Failed to load rotations:", error);
    }
  };

  const fetchLogbook = async () => {
    if (!selectedRotation) return;

    try {
      setLoading(true);
      const { data } = await api.get(`/activity-entries/logbook/${user?._id}/${selectedRotation}`);
      const approvedActivities = data.entries || [];
      setActivities(approvedActivities);
      onActivityCountChange?.(approvedActivities.length);

      // Calculate stats
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonth = approvedActivities.filter((a) => {
        const actDate = new Date(a.entryDate);
        return actDate.getMonth() === currentMonth && actDate.getFullYear() === currentYear;
      }).length;

      const byCategory = {
        MEDICINE: approvedActivities.filter((a) => a.umbrellaCategory === "MEDICINE").length,
        SURGERY: approvedActivities.filter((a) => a.umbrellaCategory === "SURGERY").length,
      };

      setStats({
        total: approvedActivities.length,
        thisMonth,
        byCategory,
      });
    } catch (error) {
      console.error("Failed to load logbook:", error);
      toast.error("Failed to load logbook entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRotations();
  }, [user]);

  useEffect(() => {
    fetchLogbook();
  }, [selectedRotation, user]);

  return (
    <div className="space-y-6">
      {/* Header with Rotation Selector */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Your Clinical Logbook</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your approved clinical activities and progress
          </p>
        </div>

        <Select value={selectedRotation} onValueChange={setSelectedRotation}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select rotation" />
          </SelectTrigger>
          <SelectContent>
            {rotations.map((rotation) => (
              <SelectItem key={rotation._id} value={rotation._id}>
                {rotation.rotationType} - {rotation.class}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Activities</p>
            <p className="text-3xl font-bold mt-2">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-3xl font-bold mt-2">{stats.thisMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Medicine</p>
            <p className="text-3xl font-bold mt-2">{stats.byCategory.MEDICINE}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Surgery</p>
            <p className="text-3xl font-bold mt-2">{stats.byCategory.SURGERY}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No approved activities yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submit activities and wait for staff approval
                </p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity._id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{activity.unit.name}</h3>
                        <Badge variant="outline">{activity.umbrellaCategory}</Badge>
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.unit.department} • {format(new Date(activity.entryDate), "dd MMM yyyy")}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Approved by {activity.approvedBy.name}
                      <br />
                      {format(new Date(activity.approvedAt), "dd MMM HH:mm")}
                    </p>
                  </div>

                  {/* Clinical Attendance */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Clinic</p>
                      <p className={activity.clinicsAttended ? "text-green-700" : "text-gray-500"}>
                        {activity.clinicsAttended ? "✓ Attended" : "Not attended"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Ward Rounds</p>
                      <p className="truncate">{activity.wardRoundsAttended}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Call Duty</p>
                      <p className={activity.callDutyCompleted ? "text-green-700" : "text-gray-500"}>
                        {activity.callDutyCompleted ? "✓ Done" : "Not done"}
                      </p>
                    </div>
                  </div>

                  {/* Category-Specific Details */}
                  {activity.umbrellaCategory === "SURGERY" && activity.surgicalMetrics && (
                    <div className="border-t pt-3 text-sm space-y-1">
                      <p className="font-medium text-xs text-muted-foreground">SURGERY METRICS</p>
                      <p>Theatre days: {activity.surgicalMetrics.theatreDaysCount}</p>
                      {activity.surgicalMetrics.casesObserved.length > 0 && (
                        <details className="cursor-pointer">
                          <summary className="text-xs font-medium">
                            Cases Observed ({activity.surgicalMetrics.casesObserved.length})
                          </summary>
                          <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                            {activity.surgicalMetrics.casesObserved.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {activity.surgicalMetrics.casesAssisted.length > 0 && (
                        <details className="cursor-pointer">
                          <summary className="text-xs font-medium">
                            Cases Assisted ({activity.surgicalMetrics.casesAssisted.length})
                          </summary>
                          <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                            {activity.surgicalMetrics.casesAssisted.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}

                  {activity.umbrellaCategory === "MEDICINE" && activity.medicalMetrics && (
                    <div className="border-t pt-3 text-sm space-y-1">
                      <p className="font-medium text-xs text-muted-foreground">MEDICINE METRICS</p>
                      {activity.medicalMetrics.proceduresWitnessedOrDone.length > 0 && (
                        <details className="cursor-pointer">
                          <summary className="text-xs font-medium">
                            Procedures ({activity.medicalMetrics.proceduresWitnessedOrDone.length})
                          </summary>
                          <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                            {activity.medicalMetrics.proceduresWitnessedOrDone.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
