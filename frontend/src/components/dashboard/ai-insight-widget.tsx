import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface InsightItem {
  id: string;
  type: "CRITICAL" | "WARNING" | "INFO";
  targetUser: string;
  message: string;
  timestamp: string;
}

export function AIInsightWidget() {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/mordred/insights")
      .then((response) => {
        setInsights(response.data.insights || []);
      })
      .catch((err) => {
        console.error(err);
        setError(err?.response?.data?.error ?? err.message ?? "Unable to load AI insights.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 border border-border rounded-xl bg-card text-sm text-muted-foreground flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
        MORDRED Engine is auditing database log matrices...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-destructive/20 rounded-xl bg-destructive/10 text-xs text-destructive-foreground font-medium">
        ⚠️ MORDRED Dashboard Sync Interruption: {error}
      </div>
    );
  }

  return (
    <div className="p-6 border border-border rounded-xl bg-card shadow-sm font-sans text-slate-900">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <h3 className="font-bold text-slate-900 text-sm tracking-wide">🧠 MORDRED Automation Insights</h3>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Live System Audit
        </span>
      </div>

      <div className="space-y-3">
        {insights.length === 0 ? (
          <div className="rounded-3xl border border-border bg-background p-4 text-sm text-muted-foreground">
            No AI insights available right now. Check back after more timetable and attendance activity.
          </div>
        ) : (
          insights.map((item) => (
            <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-surface border border-border items-start text-xs transition hover:bg-muted">
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider border ${
                item.type === "CRITICAL"
                  ? "bg-destructive/10 text-destructive-foreground border-destructive/20"
                  : item.type === "WARNING"
                  ? "bg-warning/10 text-warning-foreground border-warning/20"
                  : "bg-primary/10 text-primary-foreground border-primary/20"
              }`}>
                {item.type}
              </span>
              <div className="flex-1">
                <p className="text-foreground font-medium leading-relaxed">{item.message}</p>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-medium">
                  <span>Scope: <span className="text-foreground font-semibold">{item.targetUser}</span></span>
                  <span>{item.timestamp}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
