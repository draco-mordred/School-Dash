"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

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
 * Displays a timeline of recent admin actions:
 * - User creation
 * - Posting updates
 * - Timetable changes
 * - Attendance actions
 * - Assessment updates
 */
export const RecentActivityFeed = ({ activities = [], loading = false }: RecentActivityFeedProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex gap-4">
                {/* Timeline line */}
                {index !== activities.length - 1 && (
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
                {index === activities.length - 1 && (
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
