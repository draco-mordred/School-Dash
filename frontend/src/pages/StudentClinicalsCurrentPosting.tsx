import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Building2, Users, Phone, MapPin, CheckCircle, AlertCircle } from "lucide-react";

interface Supervisor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  rank?: string;
}

interface Unit {
  _id: string;
  name: string;
  department?: string;
  location?: string;
}

interface CurrentPosting {
  _id: string;
  rotation: {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
    description?: string;
  };
  unit: Unit;
  supervisor?: Supervisor;
  status: "active" | "completed" | "pending" | "withdrawn";
  duties?: string[];
  learningOutcomes?: string[];
  reportingTime?: string;
  reportingVenue?: string;
}

export default function StudentClinicalsCurrentPosting() {
  const { user } = useAuth();
  const [posting, setPosting] = useState<CurrentPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentPosting = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user?._id) {
          setError("User not authenticated");
          return;
        }

        // Fetch current clinical rotation posting
        const { data } = await api.get(`/clinical-rotations/student/current-posting`);
        if (data?.posting) {
          setPosting(data.posting);
        } else {
          setError("No active clinical posting found");
        }
      } catch (err: any) {
        console.error("Failed to fetch current posting:", err);
        setError(err.response?.data?.message || "Failed to load your current posting");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPosting();
  }, [user?._id]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact your clinical coordinator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!posting) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Active Posting</CardTitle>
            <CardDescription>You don't have an active clinical posting at the moment.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Check back soon or contact your clinical coordinator for your next assignment.
            </p>
            <Button variant="outline">Browse Available Rotations</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = {
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    withdrawn: "bg-red-100 text-red-800",
  };

  const startDate = new Date(posting.rotation.startDate);
  const endDate = new Date(posting.rotation.endDate);
  const today = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{posting.rotation.name}</h1>
        <p className="text-muted-foreground mt-1">Current Clinical Rotation Assignment</p>
      </div>

      {/* Status & Duration */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[posting.status]}>
              <CheckCircle className="h-3 w-3 mr-1" />
              {posting.status.charAt(0).toUpperCase() + posting.status.slice(1)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-lg font-semibold ${daysRemaining > 0 ? "text-green-600" : "text-red-600"}`}>
              {daysRemaining > 0 ? `${daysRemaining} days` : "Completed"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Unit Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Unit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Unit Name</p>
              <p className="text-base font-medium">{posting.unit.name}</p>
            </div>
            {posting.unit.department && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Department</p>
                <p className="text-sm">{posting.unit.department}</p>
              </div>
            )}
            {posting.unit.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Location</p>
                  <p className="text-sm">{posting.unit.location}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supervisor Information */}
        {posting.supervisor && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Supervisor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Name</p>
                <p className="text-base font-medium">{posting.supervisor.name}</p>
              </div>
              {posting.supervisor.rank && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Rank/Title</p>
                  <p className="text-sm">{posting.supervisor.rank}</p>
                </div>
              )}
              <div className="space-y-2 pt-2 border-t">
                {posting.supervisor.email && (
                  <a
                    href={`mailto:${posting.supervisor.email}`}
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <span>📧</span> {posting.supervisor.email}
                  </a>
                )}
                {posting.supervisor.phone && (
                  <a
                    href={`tel:${posting.supervisor.phone}`}
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" /> {posting.supervisor.phone}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reporting Details */}
      {(posting.reportingTime || posting.reportingVenue) && (
        <Card>
          <CardHeader>
            <CardTitle>Reporting Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {posting.reportingTime && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Reporting Time:</span>
                <span className="text-sm">{posting.reportingTime}</span>
              </div>
            )}
            {posting.reportingVenue && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Reporting Venue:</span>
                <span className="text-sm">{posting.reportingVenue}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {posting.rotation.description && (
        <Card>
          <CardHeader>
            <CardTitle>About This Rotation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{posting.rotation.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Learning Outcomes */}
      {posting.learningOutcomes && posting.learningOutcomes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Outcomes</CardTitle>
            <CardDescription>What you will learn during this rotation</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {posting.learningOutcomes.map((outcome, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Duties */}
      {posting.duties && posting.duties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expected Duties</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {posting.duties.map((duty, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary">•</span>
                  <span>{duty}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
