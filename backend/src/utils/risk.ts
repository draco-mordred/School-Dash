import type { Document } from "mongoose";

// PR H — pure predictive risk math. No DB imports: fully unit-testable.
// Trend risk tiers: LOW / MEDIUM / HIGH from attendance, CA-score trend,
// missed assessments. "AI insights" are deterministic, template-generated
// narrative lines derived from the risk factors (surfaced to the Mordred AI
// layer and dashboards) — no external AI call required for the tier itself.

export type RiskTier = "low" | "medium" | "high";

export interface RiskPolicy {
  // Attendance percentages (null = untracked -> never a risk factor).
  attendanceRiskPercent: number;
  attendanceWatchPercent: number;
  // Latest CA score percentages.
  caRiskPercent: number;
  caWatchPercent: number;
  // Points drop across the CA series that flags a downward trend.
  caTrendDropPoints: number;
  // Missed (past-due, unsubmitted) assessments.
  missedRiskCount: number;
  missedWatchCount: number;
}

export const DEFAULT_RISK_POLICY: RiskPolicy = {
  attendanceRiskPercent: 75,
  attendanceWatchPercent: 80,
  caRiskPercent: 40,
  caWatchPercent: 50,
  caTrendDropPoints: 15,
  missedRiskCount: 2,
  missedWatchCount: 1,
};

export interface RiskFactor {
  code: string;
  severity: "watch" | "risk";
  detail: string;
}

export interface RiskEvaluation {
  tier: RiskTier;
  riskScore: number;
  factors: RiskFactor[];
}

export interface RiskInput {
  attendancePercent?: number | null;
  latestCaPercent?: number | null;
  caSeries?: Array<number | null>;
  missedAssessments?: number | null;
}

// Least-squares slope of the CA series (percent per assessment). Only numeric
// points count; fewer than 2 points -> null (no trend).
export const caTrendSlope = (series?: Array<number | null> | null): number | null => {
  const pts = (series ?? []).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (pts.length < 2) return null;
  const n = pts.length;
  const meanX = (n - 1) / 2;
  const meanY = pts.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  pts.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) * (x - meanX);
  });
  return den === 0 ? null : Math.round((num / den) * 100) / 100;
};

// Headline drop across the CA series (first -> last). Positive value = drop.
export const caSeriesDrop = (series?: Array<number | null> | null): number | null => {
  const pts = (series ?? []).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (pts.length < 2) return null;
  return Math.round((pts[0] - pts[pts.length - 1]) * 100) / 100;
};

export const classifyStudentRisk = (
  input?: RiskInput | null,
  policy?: Partial<RiskPolicy> | null
): RiskEvaluation => {
  const p: RiskPolicy = { ...DEFAULT_RISK_POLICY, ...(policy ?? {}) };
  const factors: RiskFactor[] = [];

  const att = input?.attendancePercent;
  if (typeof att === "number" && Number.isFinite(att)) {
    if (att < p.attendanceRiskPercent) {
      factors.push({
        code: "attendance-below-cutoff",
        severity: "risk",
        detail: `Attendance at ${att}% is below the ${p.attendanceRiskPercent}% cutoff`,
      });
    } else if (att < p.attendanceWatchPercent) {
      factors.push({
        code: "attendance-watch",
        severity: "watch",
        detail: `Attendance at ${att}% is approaching the ${p.attendanceRiskPercent}% cutoff`,
      });
    }
  }

  const ca = input?.latestCaPercent;
  if (typeof ca === "number" && Number.isFinite(ca)) {
    if (ca < p.caRiskPercent) {
      factors.push({
        code: "ca-below-threshold",
        severity: "risk",
        detail: `Latest CA score at ${ca}% is below the ${p.caRiskPercent}% threshold`,
      });
    } else if (ca < p.caWatchPercent) {
      factors.push({
        code: "ca-watch",
        severity: "watch",
        detail: `Latest CA score at ${ca}% is below the ${p.caWatchPercent}% watch line`,
      });
    }
  }

  const drop = caSeriesDrop(input?.caSeries);
  const slope = caTrendSlope(input?.caSeries);
  if (drop != null && drop >= p.caTrendDropPoints && slope != null && slope < 0) {
    factors.push({
      code: "ca-trend-dropping",
      severity: "watch",
      detail: `CA scores dropped ${drop} points across the last assessments (trend ${slope}/assessment)`,
    });
  }

  const missed = input?.missedAssessments;
  if (typeof missed === "number" && Number.isFinite(missed)) {
    if (missed >= p.missedRiskCount) {
      factors.push({
        code: "missed-assessments",
        severity: "risk",
        detail: `${missed} assessments were missed (past due, never submitted)`,
      });
    } else if (missed >= p.missedWatchCount) {
      factors.push({
        code: "missed-assessment-watch",
        severity: "watch",
        detail: `${missed} assessment was missed (past due, never submitted)`,
      });
    }
  }

  const hasRisk = factors.some((f) => f.severity === "risk");
  const tier: RiskTier = hasRisk ? "high" : factors.length > 0 ? "medium" : "low";
  // Score 0-100: each watch factor 15, each risk factor 40, trend cap.
  const riskScore = Math.min(
    100,
    factors.reduce((s, f) => s + (f.severity === "risk" ? 40 : 15), 0)
  );

  return { tier, riskScore, factors };
};

// Deterministic "AI insight" narrative lines from a risk evaluation. These are
// plain template strings (stable + testable) that the Mordred AI layer and the
// dashboards surface to staff/students.
export const generateRiskInsights = (studentName: string, evaluation: RiskEvaluation): string[] => {
  const lines: string[] = [];
  if (evaluation.tier === "low") {
    lines.push(`${studentName} is on track: attendance, CA scores and submissions all look healthy.`);
    return lines;
  }
  for (const factor of evaluation.factors) {
    switch (factor.code) {
      case "attendance-below-cutoff":
        lines.push(`${studentName}'s ${factor.detail.toLowerCase()} — exam eligibility is at risk (PR G2 gate).`);
        break;
      case "attendance-watch":
        lines.push(`${studentName}'s ${factor.detail.toLowerCase()} — keep an eye on it before it becomes a gate issue.`);
        break;
      case "ca-below-threshold":
        lines.push(`${studentName}'s ${factor.detail.toLowerCase()} — targeted revision before the next CA test is advised.`);
        break;
      case "ca-watch":
        lines.push(`${studentName}'s ${factor.detail.toLowerCase()} — trend should be monitored over the next assessment.`);
        break;
      case "ca-trend-dropping":
        lines.push(`${studentName}'s ${factor.detail.toLowerCase()} — a falling CA trend is the strongest early predictor of exam failure.`);
        break;
      case "missed-assessments":
        lines.push(`${studentName} has ${factor.detail.toLowerCase()} — follow up: missed CA tests pull the course average down (PR G1).`);
        break;
      case "missed-assessment-watch":
        lines.push(`${studentName} has ${factor.detail.toLowerCase()} — a reminder to submit on time may be enough.`);
        break;
      default:
        lines.push(factor.detail);
    }
  }
  if (evaluation.tier === "high") {
    lines.push(`${studentName} is in the HIGH risk tier — an early staff intervention is recommended.`);
  }
  return lines;
};
