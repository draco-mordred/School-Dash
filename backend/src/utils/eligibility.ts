// PR G2 — pure exam-eligibility / result-release-gate math. No DB imports.

export interface EligibilityPolicy {
  // Minimum cumulative CA average (percent) required for a clean release
  caThresholdPercent: number;
  // Minimum overall attendance (percent) required for a clean release
  attendanceCutoffPercent: number;
  requireSchoolFees: boolean;
  requireDepartmentalClearance: boolean;
}

export const DEFAULT_ELIGIBILITY_POLICY: EligibilityPolicy = {
  caThresholdPercent: 40,
  attendanceCutoffPercent: 75,
  requireSchoolFees: true,
  requireDepartmentalClearance: true,
};

export interface EligibilityInputs {
  policy?: Partial<EligibilityPolicy> | null;
  // From CourseGrade (G1): hasCa=false means no CA test was taken at all
  hasCa?: boolean;
  caAveragePercent?: number | null;
  // attendancePercent=null means attendance is not tracked for this student
  attendancePercent?: number | null;
  feesPaid?: boolean;
  clearancePaid?: boolean;
}

const effectivePolicy = (policy?: Partial<EligibilityPolicy> | null): EligibilityPolicy => ({
  ...DEFAULT_ELIGIBILITY_POLICY,
  ...(policy ?? {}),
});

// G2 RULE: a student with outstanding issues may still SIT the exam — the
// issues WITHHOLD the RESULT from release until cleared (or admin override).
// Returns the list of outstanding issue reasons (empty = clean release).
export const computeEligibilityIssues = (inputs: EligibilityInputs): string[] => {
  const policy = effectivePolicy(inputs.policy);
  const issues: string[] = [];

  if (inputs.hasCa) {
    const ca = Number(inputs.caAveragePercent ?? 0);
    if (ca < policy.caThresholdPercent) {
      issues.push(
        "CA average " + ca + "% is below the required " + policy.caThresholdPercent + "%"
      );
    }
  } else {
    issues.push("No CA test record on file");
  }

  if (inputs.attendancePercent == null) {
    // Attendance not tracked — G2 does not block on untracked attendance.
  } else if (Number(inputs.attendancePercent) < policy.attendanceCutoffPercent) {
    issues.push(
      "Attendance " + inputs.attendancePercent + "% is below the cutoff " + policy.attendanceCutoffPercent + "%"
    );
  }

  if (policy.requireSchoolFees && !inputs.feesPaid) {
    issues.push("School fees not recorded as paid");
  }
  if (policy.requireDepartmentalClearance && !inputs.clearancePaid) {
    issues.push("Departmental clearance not recorded as paid/complete");
  }

  return issues;
};

// Pure attendance percent from raw counts. Attended statuses count toward the
// numerator; the denominator is every FINAL (non-pending) record. Returns null
// when nothing is tracked.
export const attendancePercentFromCounts = (
  attended: number,
  total: number
): number | null => {
  const a = Number(attended) || 0;
  const t = Number(total) || 0;
  if (t <= 0) return null;
  return Math.round((a / t) * 10000) / 100;
};
