"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AlertItem {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  description: string;
  count?: number;
  action?: {
    label: string;
    path: string;
  };
}

interface OperationalAlertsProps {
  alerts?: AlertItem[];
  loading?: boolean;
}

/**
 * Operational Alerts Component
 * 
 * Displays critical alerts and issues that need admin attention:
 * - Timetable conflicts
 * - Missing staff assignments
 * - Attendance issues
 * - Pending approvals
 */
export const OperationalAlerts = ({ alerts = [], loading = false }: OperationalAlertsProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case "error":
        return "border-destructive/50 bg-destructive/5";
      case "warning":
        return "border-amber-500/50 bg-amber-500/5";
      default:
        return "border-green-500/50 bg-green-500/5";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Operational Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <Alert className="border-green-500/50 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              All systems operational. No alerts at this time.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} className={getAlertStyle(alert.type)}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(alert.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{alert.title}</p>
                      {alert.count !== undefined && alert.count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {alert.count}
                        </Badge>
                      )}
                    </div>
                    <AlertDescription className="text-xs">
                      {alert.description}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
