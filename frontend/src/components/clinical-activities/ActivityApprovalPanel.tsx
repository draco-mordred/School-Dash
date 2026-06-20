import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ChevronDown } from "lucide-react";

interface ActivityEntry {
  _id: string;
  student: { name: string; email: string };
  rotation: { rotationType: string };
  unit: { name: string; department: string };
  entryDate: string;
  umbrellaCategory: string;
  clinicsAttended: boolean;
  wardRoundsAttended: string;
  approvalStatus: "pending" | "approved" | "rejected";
  surgicalMetrics?: {
    theatreDaysCount: number;
    casesObserved: string[];
    casesAssisted: string[];
  };
  medicalMetrics?: {
    proceduresWitnessedOrDone: string[];
  };
}

interface ActivityApprovalPanelProps {
  onApprovalChange?: () => void;
}

export default function ActivityApprovalPanel({ onApprovalChange }: ActivityApprovalPanelProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityEntry | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPendingActivities = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/activity-entries/pending?page=${page}&limit=10`);
      setActivities(data.entries || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load pending activities:", error);
      toast.error("Failed to load pending activities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "unit_consultant" || user?.role === "unit_resident") {
      fetchPendingActivities();
    }
  }, [user, page]);

  const handleApprove = async (activityId: string) => {
    try {
      setProcessing(true);
      await api.post(`/activity-entries/${activityId}/approve`);
      toast.success("Activity approved");
      setSelectedActivity(null);
      fetchPendingActivities();
      onApprovalChange?.();
    } catch (error: any) {
      console.error("Failed to approve activity:", error);
      toast.error(error.response?.data?.message || "Failed to approve activity");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (activityId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/activity-entries/${activityId}/reject`, {
        rejectionReason,
      });
      toast.success("Activity rejected");
      setSelectedActivity(null);
      setRejectionReason("");
      fetchPendingActivities();
      onApprovalChange?.();
    } catch (error: any) {
      console.error("Failed to reject activity:", error);
      toast.error(error.response?.data?.message || "Failed to reject activity");
    } finally {
      setProcessing(false);
    }
  };

  if (user?.role !== "unit_consultant" && user?.role !== "unit_resident") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Only clinical staff can access activity approvals.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Activity Approvals</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {total} pending activities awaiting your review
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </>
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending activities to review
              </p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity._id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{activity.student.name}</h3>
                        <Badge variant="outline">{activity.umbrellaCategory}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.unit.name} • {activity.rotation.rotationType}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.entryDate), "dd MMM yyyy")}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {total > 10 && (
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 10)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 10 >= total}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Detail Dialog */}
      {selectedActivity && (
        <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Activity Review</DialogTitle>
              <DialogDescription>
                {selectedActivity.student.name} - {format(new Date(selectedActivity.entryDate), "dd MMM yyyy")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Activity Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Student</p>
                  <p className="text-sm font-medium">{selectedActivity.student.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedActivity.student.email}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Unit</p>
                  <p className="text-sm font-medium">{selectedActivity.unit.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedActivity.unit.department}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Rotation</p>
                  <p className="text-sm font-medium">{selectedActivity.rotation.rotationType}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Category</p>
                  <Badge>{selectedActivity.umbrellaCategory}</Badge>
                </div>
              </div>

              {/* Clinical Attendance */}
              <div className="border-t pt-4 space-y-2">
                <p className="font-semibold text-sm">Clinical Attendance</p>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    {selectedActivity.clinicsAttended ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                    <span>Clinic attended</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ward rounds: {selectedActivity.wardRoundsAttended}
                  </p>
                </div>
              </div>

              {/* Category-Specific Metrics */}
              {selectedActivity.umbrellaCategory === "SURGERY" && selectedActivity.surgicalMetrics && (
                <div className="border-t pt-4 space-y-2">
                  <p className="font-semibold text-sm">Surgery Metrics</p>
                  <div className="text-sm space-y-1">
                    <p>Theatre days: {selectedActivity.surgicalMetrics.theatreDaysCount}</p>
                    {selectedActivity.surgicalMetrics.casesObserved.length > 0 && (
                      <div>
                        <p className="text-xs font-medium">Cases Observed:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {selectedActivity.surgicalMetrics.casesObserved.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedActivity.surgicalMetrics.casesAssisted.length > 0 && (
                      <div>
                        <p className="text-xs font-medium">Cases Assisted:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {selectedActivity.surgicalMetrics.casesAssisted.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedActivity.umbrellaCategory === "MEDICINE" && selectedActivity.medicalMetrics && (
                <div className="border-t pt-4 space-y-2">
                  <p className="font-semibold text-sm">Medicine Metrics</p>
                  <div className="text-sm space-y-1">
                    {selectedActivity.medicalMetrics.proceduresWitnessedOrDone.length > 0 && (
                      <div>
                        <p className="text-xs font-medium">Procedures:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {selectedActivity.medicalMetrics.proceduresWitnessedOrDone.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Reason (if rejecting) */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium">Rejection Reason (if applicable)</label>
                <Textarea
                  placeholder="Provide feedback for the student..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedActivity._id)}
                  disabled={processing}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedActivity._id)}
                  disabled={processing}
                >
                  {processing ? "Processing..." : "Approve"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
