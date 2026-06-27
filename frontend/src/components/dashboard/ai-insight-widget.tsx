import React, { useEffect, useState } from "react";

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
    fetch("/api/mordred/admin/diagnostics")
      .then((res) => {
        if (!res.ok) throw new Error("Could not pull network audit logs.");
        return res.json();
      })
      .then((data) => {
        // Hydrate state directly from the backend calculation query array
        setInsights(data.insights || []);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 border border-slate-200 rounded-xl bg-white text-sm text-slate-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
        MORDRED Engine is auditing database log matrices...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-rose-200 rounded-xl bg-rose-50 text-xs text-rose-700 font-medium">
        ⚠️ MORDRED Dashboard Sync Interruption: {error}
      </div>
    );
  }

  return (
    <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm font-sans">
      <div className="flex items-center justify-between mb-4 border-b pb-3">
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
        {insights.map((item) => (
          <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 items-start text-xs transition hover:bg-slate-100/50">
            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider border ${
              item.type === "CRITICAL" 
                ? "bg-rose-50 text-rose-700 border-rose-200" 
                : item.type === "WARNING"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {item.type}
            </span>
            <div className="flex-1">
              <p className="text-slate-800 font-medium leading-relaxed">{item.message}</p>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium">
                <span>Scope: <span className="text-slate-500 font-semibold">{item.targetUser}</span></span>
                <span>{item.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
