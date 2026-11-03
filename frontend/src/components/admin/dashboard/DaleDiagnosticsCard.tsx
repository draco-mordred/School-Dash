"use client";

import { useState } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

interface LiveTest { provider: string; keyIndex: number; ok: boolean; error?: string; errorName?: string; sample?: string; ms?: number }
interface Health {
  status: string; resolvedProvider: string; mistralKeyCount: number; googleKeyCount: number;
  configured: Record<string, Record<string, boolean>>; modelVersions: Record<string, string>;
  liveTests: LiveTest[]; diagnosis: string; totalMs?: number;
}

export const DaleDiagnosticsCard = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true); setError(null); setResult(null);
    try {
      const { data } = await api.get<Health>("/mordred/admin/provider-health", { timeout: 90000 });
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Diagnostics request failed");
    } finally { setRunning(false); }
  };

  const okCount = result?.liveTests?.filter(t => t.ok).length ?? 0;
  const statusColor = !result ? "" : result.status === "healthy" ? "text-emerald-600" : "text-destructive";

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">DALE AI Diagnostics</h3>
        </div>
        <button onClick={run} disabled={running} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {running ? "Testing keys…" : "Run diagnostics"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Live-tests every configured Mistral/Google key with a one-token call and shows the real errors.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="space-y-3 text-sm">
          <p><span className="font-medium">Status:</span> <span className={statusColor}>{result.status}</span>
            {" "}· provider: {result.resolvedProvider} · keys: {result.mistralKeyCount} Mistral / {result.googleKeyCount} Google · {okCount}/{result.liveTests?.length ?? 0} live tests passed</p>
          <p className="text-xs text-muted-foreground">{result.diagnosis}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(result.configured).map(([prov, vars]) => (
              <div key={prov} className="rounded border border-border p-2">
                <p className="font-medium capitalize mb-1">{prov} env vars</p>
                {Object.entries(vars).map(([k, v]) => (
                  <p key={k} className={v ? "text-emerald-600" : "text-muted-foreground"}>{v ? "✓" : "✗"} {k}</p>
                ))}
              </div>
            ))}
          </div>
          {result.liveTests.length > 0 && (
            <div className="space-y-1 text-xs">
              {result.liveTests.map((t, i) => (
                <div key={i} className={`rounded border p-2 ${t.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
                  <p className="font-medium">{t.provider} key #{t.keyIndex} — {t.ok ? `OK (${t.ms}ms)` : `${t.errorName}: ${t.error}`}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DaleDiagnosticsCard;
