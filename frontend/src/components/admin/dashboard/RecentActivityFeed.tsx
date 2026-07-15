"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export interface ActivityItem {
  id: string;
  user: string;
  userInitials: string;
  action: string;
  module: string;
  timestamp: Date;
  description?: string;
}

interface RecentActivityFeedProps {
  activities?: ActivityItem[];
  loading?: boolean;
}

/**
 * Recent Activity Feed Component
 *
 * Displays a timeline of recent admin actions. If `activities` prop is not
 * provided or empty, the component will fetch the top recent activities from
 * the API (limit 4). Ensures entries are deduplicated and limited to 4 items.
 */
export const RecentActivityFeed = ({ activities = [], loading = false }: RecentActivityFeedProps) => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    // If parent provided activities, dedupe and trim to 4
    if (activities && activities.length > 0) {
      const seen = new Set<string>();
      const unique: ActivityItem[] = [];
      for (const a of activities) {
        const key = a.id ?? `${a.user}|${a.action}|${a.timestamp?.toString()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(a);
        if (unique.length >= 4) break;
      }
      setItems(unique);
      return;
    }

    // Otherwise fetch top recent activities (limit higher to allow dedupe)
    let mounted = true;
    (async () => {
      setFetching(true);
      try {
        const { data } = await api.get("/activities?page=1&limit=8");
        // Backend may return { logs, total, ... } or an array; normalize
        const raw = Array.isArray(data) ? data : data.logs ?? data.recentActivities ?? [];
        const mapped: ActivityItem[] = (raw || []).map((log: any, idx: number) => ({
          id: log._id || log.id || String(idx),
          user: log.user?.name ?? log.user ?? "System",
          userInitials: (log.user?.name ? log.user.name.split(" ").map((s: string) => s[0]).join("") : (typeof log.user === "string" ? log.user.substring(0,2) : "S")).toUpperCase(),
          action: log.action ?? log.title ?? "Updated",
          module: log.module ?? log.source ?? "System",
          timestamp: log.createdAt ? new Date(log.createdAt) : log.timestamp ? new Date(log.timestamp) : new Date(),
          description: log.details ?? log.description ?? undefined,
        }));

        const seen = new Set<string>();
        const unique: ActivityItem[] = [];
        for (const a of mapped) {
          const key = a.id ?? `${a.user}|${a.action}|${a.timestamp.toISOString()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(a);
          if (unique.length >= 4) break;
        }

        if (mounted) setItems(unique);
      } catch (err) {
        // ignore fetch errors — keep items empty
      } finally {
        if (mounted) setFetching(false);
      }
    })();

    return () => { mounted = false; };
  }, [activities]);

  const busy = loading || fetching;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {busy ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((activity, index) => (
              <div key={activity.id} className="flex gap-4">
                {/* Timeline line */}
                {index !== items.length - 1 && (
                  <div className="relative flex flex-col items-center">
                    <Avatar className="h-8 w-8 ring-2 ring-background">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {activity.userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="w-0.5 h-12 bg-border mt-2" />
                  </div>
                )}
                {/* Last item */}
                {index === items.length - 1 && (
                  <div className="flex flex-col items-center">
                    <Avatar className="h-8 w-8 ring-2 ring-background">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {activity.userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Activity details */}
                <div className="flex-1 pt-1">
                  <div className="flex items-baseline gap-2">
                    <p className="font-medium text-sm">{activity.user}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.module}
                    {activity.description && ` • ${activity.description}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
