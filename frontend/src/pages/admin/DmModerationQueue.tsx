import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

// PR M2 — Admin DM moderation queue (design points 4-7, 10):
// case list (never contains message text), detail view (logged/TINASHA
// audited every access), resolution with the penalty ladder + deviation
// reasons, and the admin transparency feed.

interface AdminCase {
  _id: string;
  kind: string;
  rules: string[];
  status: string;
  chatFrozen: boolean;
  penalty?: { level?: number; label?: string; suspensionUntil?: string | null; referral?: boolean } | null;
  appeal?: { text?: string; submittedAt?: string } | null;
  user?: { _id: string; name: string; email: string; role: string } | null;
  createdAt: string;
  strikeCountAtCreation?: number;
}

interface CaseDetail extends AdminCase {
  message?: string | null;
  contextWindow?: { text: string; at: string }[];
  resolution?: {
    penaltyLevel?: number;
    suspensionUntil?: string | null;
    deviationReason?: string | null;
    note?: string | null;
    resolvedAt?: string;
  } | null;
  accessedByCount?: number;
}

interface TransparencyAction {
  _id: string;
  admin: string;
  action: string;
  details?: string | null;
  at: string;
}

const fmt = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const PENALTY_LEVELS: { level: number; label: string }[] = [
  { level: 1, label: "L1 — Written warning" },
  { level: 2, label: "L2 — Chat suspension (48h default)" },
  { level: 3, label: "L3 — Chat suspension (7d default)" },
  { level: 4, label: "L4 — Semester ban + disciplinary referral" },
];

export default function DmModerationQueue() {
  const [filter, setFilter] = useState<"" | "open" | "resolved">("");
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [selected, setSelected] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [transparency, setTransparency] = useState<TransparencyAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Resolve form
  const [penaltyLevel, setPenaltyLevel] = useState<number>(1);
  const [suspensionHours, setSuspensionHours] = useState<string>("");
  const [deviationReason, setDeviationReason] = useState("");
  const [note, setNote] = useState("");
  const [unfreeze, setUnfreeze] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolveMsg, setResolveMsg] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    try {
      const res = await api.get("/dm/admin/cases", { params: filter ? { status: filter } : {} });
      setCases(res.data?.cases ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load the moderation queue.");
    }
  }, [filter]);

  const loadTransparency = useCallback(async () => {
    try {
      const res = await api.get("/dm/admin/transparency");
      setTransparency(res.data?.actions ?? []);
    } catch {
      /* feed is optional on this page */
    }
  }, []);

  useEffect(() => {
    loadCases();
    loadTransparency();
  }, [loadCases, loadTransparency]);

  // Opening a case detail is AUDITED server-side (case.accessedBy + ActivitiesLog).
  const openCase = async (caseId: string) => {
    setDetailLoading(true);
    setSelected(null);
    setResolveMsg(null);
    try {
      const res = await api.get(`/dm/admin/cases/${caseId}`);
      const detail: CaseDetail = res.data;
      setSelected(detail);
      setPenaltyLevel(detail.penalty?.level ?? 1);
      setDeviationReason("");
      setNote("");
      setUnfreeze(!detail.chatFrozen);
      setSuspensionHours("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load the case.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selected || resolving) return;
    const suggested = selected.penalty?.level ?? 1;
    if (penaltyLevel !== suggested && !deviationReason.trim()) {
      setResolveMsg("A deviation reason is required when changing the suggested penalty.");
      return;
    }
    setResolving(true);
    try {
      await api.post(`/dm/admin/cases/${selected._id}/resolve`, {
        penaltyLevel,
        suspensionHours: suspensionHours.trim() ? Number(suspensionHours) : undefined,
        deviationReason: deviationReason.trim() || undefined,
        note: note.trim() || undefined,
        unfreeze,
      });
      setResolveMsg("Case resolved. The user has been notified.");
      loadCases();
      loadTransparency();
      openCase(selected._id);
    } catch (err: any) {
      setResolveMsg(err?.response?.data?.message || "Unable to resolve the case.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold">DM Moderation Queue</h1>
        <p className="text-sm text-muted-foreground">
          Flagged direct messages, penalty resolution, and admin transparency. Opening a case
          detail is logged (audited) every time. DMs are private by default — only flagged
          messages plus a small context window are ever visible here.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm">{error}</div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: "", label: "All" },
          { key: "open", label: "Open" },
          { key: "resolved", label: "Resolved" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as "" | "open" | "resolved")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case list */}
        <div className="space-y-2">
          {cases.length === 0 && (
            <p className="text-sm text-muted-foreground">No moderation cases.</p>
          )}
          {cases.map((c) => (
            <button
              key={c._id}
              onClick={() => openCase(c._id)}
              className={`w-full text-left rounded-xl border border-border p-3 hover:bg-muted/40 transition ${
                selected?._id === c._id ? "ring-1 ring-primary" : ""
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    c.kind === "hard_block"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-amber-500/15 text-amber-600"
                  }`}
                >
                  {c.kind === "hard_block" ? "Hard block" : "Soft flag"}
                </span>
                <span className="text-[10px] text-muted-foreground">{fmt(c.createdAt)}</span>
              </div>
              <p className="text-sm font-semibold mt-1 truncate">
                {c.user?.name ?? "Unknown user"}{" "}
                <span className="text-xs text-muted-foreground font-normal">({c.user?.email ?? "—"})</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Suggested: {c.penalty?.label ?? "—"}
                {c.chatFrozen ? " · 🔒 chat frozen" : ""}
                {c.appeal ? " · ✋ appealed" : ""}
                {c.status === "resolved" ? " · resolved" : ""}
              </p>
            </button>
          ))}
        </div>

        {/* Case detail + resolve form */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          {detailLoading && <p className="text-sm text-muted-foreground animate-pulse">Loading case…</p>}
          {!detailLoading && !selected && (
            <p className="text-sm text-muted-foreground">
              Select a case to view its escalation report and resolve it.
            </p>
          )}
          {selected && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="font-bold">Case detail</h2>
                <span className="text-[10px] text-muted-foreground">
                  viewed {selected.accessedByCount ?? 0}× (audited)
                </span>
              </div>
              <div className="text-xs space-y-1">
                <p>
                  <span className="font-semibold">User:</span> {selected.user?.name} (
                  {selected.user?.email}, {selected.user?.role})
                </p>
                <p>
                  <span className="font-semibold">Rules tripped:</span>{" "}
                  {(selected.rules ?? []).join(", ") || "—"}
                </p>
                <p>
                  <span className="font-semibold">Suggested penalty:</span>{" "}
                  {selected.penalty?.label ?? "—"}
                </p>
                {selected.strikeCountAtCreation !== undefined && (
                  <p>
                    <span className="font-semibold">Prior soft flags:</span>{" "}
                    {selected.strikeCountAtCreation}
                  </p>
                )}
              </div>
              {selected.appeal?.text && (
                <div className="rounded-lg bg-primary/10 p-2 text-xs">
                  <span className="font-bold">Appeal:</span> {selected.appeal.text}
                </div>
              )}
              <div className="rounded-lg bg-muted/60 p-2 text-xs">
                <span className="font-bold">Flagged message:</span>{" "}
                {selected.message ?? "(message expired)"}
              </div>
              {(selected.contextWindow ?? []).length > 0 && (
                <div className="text-xs space-y-1">
                  <span className="font-bold">Context window:</span>
                  {(selected.contextWindow ?? []).map((m, i) => (
                    <p key={i} className="text-muted-foreground border-l-2 border-border pl-2">
                      {m.text} <span className="text-[10px]">({fmt(m.at)})</span>
                    </p>
                  ))}
                </div>
              )}
              {selected.status === "resolved" ? (
                <div className="rounded-lg bg-emerald-500/10 p-2 text-xs space-y-1">
                  <span className="font-bold">Resolved</span>
                  <p>Penalty level: {selected.resolution?.penaltyLevel ?? "—"}</p>
                  <p>Suspended until: {fmt(selected.resolution?.suspensionUntil)}</p>
                  {selected.resolution?.deviationReason && (
                    <p>Deviation: {selected.resolution.deviationReason}</p>
                  )}
                  {selected.resolution?.note && <p>Note: {selected.resolution.note}</p>}
                </div>
              ) : (
                <div className="space-y-2 border-t border-border pt-3">
                  <h3 className="font-bold text-sm">Resolve this case</h3>
                  <select
                    value={penaltyLevel}
                    onChange={(e) => setPenaltyLevel(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-md border border-border text-xs bg-background"
                  >
                    {PENALTY_LEVELS.map((p) => (
                      <option key={p.level} value={p.level}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {(penaltyLevel === 2 || penaltyLevel === 3) && (
                    <input
                      value={suspensionHours}
                      onChange={(e) => setSuspensionHours(e.target.value)}
                      placeholder="Suspension hours (optional override)"
                      className="w-full px-2 py-1.5 rounded-md border border-border text-xs bg-background"
                    />
                  )}
                  <input
                    value={deviationReason}
                    onChange={(e) => setDeviationReason(e.target.value)}
                    placeholder={
                      penaltyLevel === (selected.penalty?.level ?? 1)
                        ? "Deviation reason (not required)"
                        : "Deviation reason (REQUIRED — penalty changed)"
                    }
                    className="w-full px-2 py-1.5 rounded-md border border-border text-xs bg-background"
                  />
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Note to the user (optional)"
                    className="w-full px-2 py-1.5 rounded-md border border-border text-xs bg-background"
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={unfreeze}
                      onChange={(e) => setUnfreeze(e.target.checked)}
                      className="accent-primary"
                    />
                    Unfreeze the user's chat on resolve
                  </label>
                  <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    {resolving ? "Resolving…" : "Resolve case"}
                  </button>
                  {resolveMsg && <p className="text-xs text-muted-foreground">{resolveMsg}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Admin transparency feed (design point 7) */}
      <div className="rounded-xl border border-border p-4 space-y-2">
        <h2 className="font-bold">Admin transparency feed</h2>
        <p className="text-xs text-muted-foreground">
          System-level actions of administrators who enabled their chat (mutual oversight).
        </p>
        {transparency.length === 0 && (
          <p className="text-sm text-muted-foreground">No transparent admin actions yet.</p>
        )}
        {transparency.map((a) => (
          <div key={a._id} className="text-xs border-l-2 border-border pl-2">
            <span className="font-semibold">{a.admin}</span> — {a.action}
            {a.details ? <span className="text-muted-foreground"> · {a.details}</span> : null}
            <span className="text-[10px] text-muted-foreground"> ({fmt(a.at)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
