import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, BookOpen, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface LogbookStats {
  totalEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  rejectedEntries: number;
  totalHours: number;
}

interface LogbookEntry {
  _id: string;
  date: string;
  activity: string;
  duration: number; // in hours
  description?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function StudentLogbookDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<LogbookStats | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogbookData();
  }, [user?._id]);

  const fetchLogbookData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?._id) {
        setError("User not authenticated");
        return;
      }

      const entriesRes = await api.get(`/activity-entries?studentId=${user._id}&limit=100`);
      const rawEntries = Array.isArray(entriesRes.data?.entries) ? entriesRes.data.entries : [];

      const mappedEntries: LogbookEntry[] = rawEntries.map((entry: any) => {
        const statusMapping: Record<string, LogbookEntry["status"]> = {
          pending: "submitted",
          approved: "approved",
          rejected: "rejected",
        };

        return {
          _id: entry._id,
          date: entry.entryDate,
          activity: entry.unit?.name || entry.umbrellaCategory || "Clinical activity",
          duration: 8,
          description: entry.notes || "",
          status: statusMapping[entry.approvalStatus] || "draft",
          approvedBy: entry.approvedBy?.name,
          rejectionReason: entry.rejectionReason || "",
          createdAt: entry.createdAt,
        };
      });

      const approvedEntries = mappedEntries.filter((e) => e.status === "approved").length;
      const pendingEntries = mappedEntries.filter((e) => e.status === "submitted").length;
      const rejectedEntries = mappedEntries.filter((e) => e.status === "rejected").length;
      const totalHours = mappedEntries.length * 8;

      setStats({
        totalEntries: mappedEntries.length,
        approvedEntries,
        pendingEntries,
        rejectedEntries,
        totalHours,
      });

      setEntries(mappedEntries.filter((e) => e.status !== "draft"));
      setPendingApprovals(mappedEntries.filter((e) => e.status === "submitted"));
    } catch (err: any) {
      console.error("Failed to fetch logbook data:", err);
      setError(err.response?.data?.message || "Failed to load logbook data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Clinical Logbook</h1>
          <p className="text-muted-foreground mt-1">Track and manage your clinical learning activities</p>
        </div>
        <Button onClick={() => navigate("/clinical-activities")} className="gap-2">
          <Plus className="h-4 w-4" />
          Submit Activity
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">{stats.totalHours}</span>
                <span className="text-xs text-muted-foreground mb-1">hours</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">{stats.totalEntries}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-green-600">{stats.approvedEntries}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-yellow-600">{stats.pendingEntries}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-red-600">{stats.rejectedEntries}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Approval ({pendingApprovals.length})
            </CardTitle>
            <CardDescription>Entries awaiting reviewer approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((entry) => (
                <div key={entry._id} className="flex items-start justify-between p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{entry.activity}</p>
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                        Pending
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(entry.date).toLocaleDateString()} • {entry.duration} hours
                    </p>
                    {entry.description && <p className="text-sm mt-2">{entry.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recent Entries ({entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {entries.map((entry) => {
                const statusConfig = {
                  approved: { color: "bg-green-50 dark:bg-green-950/20", badge: "success", icon: CheckCircle },
                  rejected: { color: "bg-red-50 dark:bg-red-950/20", badge: "destructive", icon: AlertCircle },
                  draft: { color: "bg-gray-50 dark:bg-gray-950/20", badge: "secondary", icon: null },
                };

                const config = statusConfig[entry.status as keyof typeof statusConfig];

                return (
                  <div key={entry._id} className={`flex items-start justify-between p-3 border rounded-lg ${config.color}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{entry.activity}</p>
                        <Badge variant="outline" className={config.badge === "success" ? "text-green-700 border-green-300" : ""}>
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(entry.date).toLocaleDateString()} • {entry.duration} hours
                      </p>
                      {entry.description && <p className="text-sm mt-2">{entry.description}</p>}
                      {entry.rejectionReason && (
                        <p className="text-sm text-destructive mt-2">
                          <strong>Reason:</strong> {entry.rejectionReason}
                        </p>
                      )}
                      {entry.approvedBy && (
                        <p className="text-xs text-muted-foreground mt-2">Approved by: {entry.approvedBy}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {entries.length === 0 && pendingApprovals.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Entries Yet</CardTitle>
            <CardDescription>Submit your first clinical activity using the Clinical Activities page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/clinical-activities")} className="gap-2">
              <Plus className="h-4 w-4" />
              Submit Activity
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
