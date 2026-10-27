import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  UserRound,
  Users,
} from "lucide-react";

type TeamMember = {
  _id: string;
  name: string;
  idNumber?: string;
  email?: string;
  role?: string;
};

type TeamSession = {
  _id: string;
  title: string;
  activityType: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  unitLabel: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  myStatus: string | null;
  checkInTime?: string | null;
  complaint?: string | null;
};

type TeamData = {
  team: {
    postingName: string | null;
    groupName: string | null;
    window: { startDate: string | null; endDate: string | null };
    daysElapsed: number | null;
    daysTotal: number | null;
    daysRemaining: number | null;
    supervisor:
      | {
          _id?: string;
          name?: string;
          email?: string;
          role?: string;
          department?: string;
          specialization?: string;
        }
      | null;
    members: TeamMember[];
  } | null;
  weekActivities: TeamSession[];
  myPerformance: {
    tally: Record<string, number>;
    resolvedTotal: number;
    attendanceRate: number;
    sessions: TeamSession[];
  } | null;
};

const fmtDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "—";

const fmtTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const typeLabel = (value: string) => value.replace(/_/g, " ");

const myStatusColor = (status: string | null) =>
  status === "present"
    ? "bg-green-500/15 text-green-600"
    : status === "late"
      ? "bg-yellow-500/15 text-yellow-600"
      : status === "absent"
        ? "bg-red-500/15 text-red-600"
        : status === "excused"
          ? "bg-blue-500/15 text-blue-600"
          : status === "on-leave"
            ? "bg-muted text-muted-foreground"
            : "bg-amber-500/15 text-amber-600";

const StatusChip = ({ status }: { status: string | null }) => (
  <span
    className={
      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
      myStatusColor(status)
    }
  >
    {status ?? "pending"}
  </span>
);

export default function StudentClinicalTeamPage() {
  const { user } = useAuth();
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: payload } = await api.get("/clinical-attendance/my-team");
        if (mounted) setData(payload?.data ?? null);
      } catch {
        toast.error("Failed to load your clinical team");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My clinical team</CardTitle>
          <CardDescription>
            You are not currently assigned to a clinical team. Once your
            rotation plan places you in an active posting group, your team,
            supervisor, and performance will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const team = data.team;
  const perf = data.myPerformance;
  const progressPct =
    team.daysTotal && team.daysElapsed
      ? Math.min(100, Math.round((team.daysElapsed / team.daysTotal) * 100))
      : null;
  const rateColor =
    (perf?.attendanceRate ?? 0) >= 75
      ? "bg-green-500"
      : (perf?.attendanceRate ?? 0) >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My clinical team</h1>
        <p className="text-sm text-muted-foreground">
          Your active posting team, supervisor, weekly activities, and your own
          performance — so you can assess how you are doing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Active posting
            </CardTitle>
            <CardDescription>
              Where you are right now in your clinical rotation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">
                {team.postingName ?? "Current posting"}
              </span>
              {team.groupName ? (
                <Badge variant="secondary">Team {team.groupName}</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {fmtDate(team.window.startDate)} – {fmtDate(team.window.endDate)}
            </p>
            {team.daysElapsed != null ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Day {team.daysElapsed}
                    {team.daysTotal ? " of " + team.daysTotal : ""} ·{" "}
                    {team.daysRemaining != null
                      ? team.daysRemaining +
                        " day" +
                        (team.daysRemaining === 1 ? "" : "s") +
                        " remaining"
                      : ""}
                  </span>
                  {progressPct != null ? (
                    <span className="tabular-nums">{progressPct}%</span>
                  ) : null}
                </div>
                {progressPct != null ? (
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: progressPct + "%" }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" />
              Supervisor
            </CardTitle>
            <CardDescription>
              Who is overseeing your team during this posting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {team.supervisor ? (
              <div className="space-y-1">
                <p className="font-medium">
                  {team.supervisor.name ?? "Supervisor"}
                </p>
                {team.supervisor.role ? (
                  <p className="text-sm capitalize text-muted-foreground">
                    {String(team.supervisor.role).replace(/-/g, " ")}
                  </p>
                ) : null}
                {team.supervisor.department ? (
                  <p className="text-sm text-muted-foreground">
                    {team.supervisor.department}
                  </p>
                ) : null}
                {team.supervisor.specialization ? (
                  <p className="text-sm text-muted-foreground">
                    {team.supervisor.specialization}
                  </p>
                ) : null}
                {team.supervisor.email ? (
                  <p className="text-sm text-muted-foreground">
                    {team.supervisor.email}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No supervisor is currently assigned to this team.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Team members
          </CardTitle>
          <CardDescription>
            The students in your posting group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {team.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team members found.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {team.members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name}</p>
                    {member.idNumber ? (
                      <p className="text-xs text-muted-foreground">
                        {member.idNumber}
                      </p>
                    ) : null}
                  </div>
                  {String(member._id) === String(user?._id ?? "") ? (
                    <Badge variant="secondary">You</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            This week&rsquo;s activities
          </CardTitle>
          <CardDescription>
            Clinical sessions your team has this week (Monday to Sunday).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.weekActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team activities recorded for this week yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.weekActivities.map((activity) => (
                <div
                  key={activity._id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
                >
                  <span className="w-28 shrink-0 text-xs text-muted-foreground">
                    {fmtDate(activity.date)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{activity.title}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {typeLabel(activity.activityType)}
                      {activity.unitLabel ? " · " + activity.unitLabel : ""}
                      {activity.startTime
                        ? " · " +
                          fmtTime(activity.startTime) +
                          (activity.endTime
                            ? "–" + fmtTime(activity.endTime)
                            : "")
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {activity.presentCount} present
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {activity.status}
                    </Badge>
                    <StatusChip status={activity.myStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            My performance in this posting
          </CardTitle>
          <CardDescription>
            Your own attendance record in the current team and posting — assess
            yourself and stay on track.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!perf ? (
            <p className="text-sm text-muted-foreground">
              No performance data yet.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">
                  {perf.sessions.length} sessions
                </Badge>
                <Badge variant="outline" className="text-green-600">
                  {perf.tally.present ?? 0} present
                </Badge>
                <Badge variant="outline" className="text-yellow-600">
                  {perf.tally.late ?? 0} late
                </Badge>
                <Badge variant="outline" className="text-red-600">
                  {perf.tally.absent ?? 0} absent
                </Badge>
                <Badge variant="outline" className="text-blue-600">
                  {perf.tally.excused ?? 0} excused
                </Badge>
                {(perf.tally.pending ?? 0) > 0 ? (
                  <Badge variant="secondary">
                    {perf.tally.pending} pending
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Overall attendance rate
                  </span>
                  <span className="tabular-nums font-semibold">
                    {perf.attendanceRate}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={"h-full rounded-full " + rateColor}
                    style={{ width: perf.attendanceRate + "%" }}
                  />
                </div>
              </div>
              {perf.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have not been marked in any team sessions yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {perf.sessions.map((session) => (
                    <div
                      key={session._id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
                    >
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">
                        {fmtDate(session.date)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{session.title}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {typeLabel(session.activityType)}
                          {session.complaint === "open"
                            ? " · complaint open"
                            : ""}
                        </p>
                      </div>
                      <StatusChip status={session.myStatus} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
