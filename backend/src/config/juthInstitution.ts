import Institution from "../models/institution";
import AssessmentSettings from "../models/assessmentSettings";
import { DEFAULT_GRADING_POLICY, type GradingPolicy } from "../utils/grading";
import { DEFAULT_ELIGIBILITY_POLICY, type EligibilityPolicy } from "../utils/eligibility";
import { DEFAULT_PROGRESSION_POLICY, type ProgressionPolicy } from "../utils/progression";

// JUTH institution config file (PR B + PR G1).
// The JUTH-specific campus GPS and grading policy are synchronized into the
// EXISTING JUTH institution record / its AssessmentSettings in the DB at
// server start — only when the values are still unset, so admin edits always
// win over the seed (NOV 2026 ADDITIONS a/b/c: nothing hardcoded at read time).
export const JUTH_INSTITUTION_CONFIG = {
  matchNames: ["jos university teaching hospital", "juth"],
  campusName: "JUTH Lamingo Campus",
  // JUTH Lamingo campus seed coordinates
  campusLocation: {
    lat: 9.87589,
    lng: 8.8834,
    radiusMeters: 1000,
  },
};

// JUTH grading policy seed (PR G1): CA 40% / major exam 60%, CA tests out of
// 25, Nigerian 5.0 GPA scale. Seeded once into AssessmentSettings.gradingPolicy
// so it stays institution-configurable; admins can change it afterwards.
export const JUTH_GRADING_POLICY: GradingPolicy = DEFAULT_GRADING_POLICY;

// JUTH eligibility policy seed (PR G2): CA threshold, attendance cutoff, and
// required fees/clearance. Seeded once; admins can change it afterwards.
export const JUTH_ELIGIBILITY_POLICY: EligibilityPolicy = DEFAULT_ELIGIBILITY_POLICY;

// JUTH exam-cycle progression ladder seed (PR G3): 100 → 200 → 300 → 400A →
// 500A/500B → 600A/600B → graduate, with 400B ≈ 500A / 500B ≈ 600A clock-phase
// equivalences and the 3rd-MBBS-fail → repeat-400-from-scratch rule. Seeded
// once into AssessmentSettings.progressionPolicy; admins can change it after.
export const JUTH_PROGRESSION_POLICY: ProgressionPolicy = DEFAULT_PROGRESSION_POLICY;

export const isInstitutionJuth = (name?: string, shortName?: string) => {
  const norm = (value?: string) => String(value ?? "").trim().toLowerCase();
  return JUTH_INSTITUTION_CONFIG.matchNames.some(
    (match) => norm(name).includes(match) || norm(shortName).includes(match),
  );
};

const seedJuthGradingPolicy = async (institution: any) => {
  const settingsId = institution.assessmentSettings;
  if (!settingsId) return { seeded: false, reason: "no-assessment-settings" };
  const settings: any = await AssessmentSettings.findById(settingsId);
  if (!settings) return { seeded: false, reason: "settings-not-found" };
  if (
    settings.gradingPolicy &&
    Array.isArray(settings.gradingPolicy?.gradeBands) &&
    settings.gradingPolicy.gradeBands.length > 0
  ) {
    return { seeded: false, reason: "already-set" };
  }
  settings.gradingPolicy = JUTH_GRADING_POLICY;
  if (
    !settings.eligibilityPolicy ||
    settings.eligibilityPolicy?.caThresholdPercent == null
  ) {
    settings.eligibilityPolicy = JUTH_ELIGIBILITY_POLICY;
  }
  if (
    !settings.progressionPolicy ||
    !Array.isArray(settings.progressionPolicy?.ladder) ||
    settings.progressionPolicy.ladder.length === 0
  ) {
    settings.progressionPolicy = JUTH_PROGRESSION_POLICY;
  }
  await settings.save();
  console.log("JUTH grading + eligibility + progression policies seeded (CA 40% / exam 60%, CA /25, 5.0 GPA; CA threshold 40%, attendance cutoff 75%; MBBS ladder 100→600B)");
  return { seeded: true };
};

export const syncJuthInstitutionConfig = async () => {
  const institution: any = await Institution.findOne();
  if (!institution || !isInstitutionJuth(institution.name, institution.shortName)) {
    return { synced: false, reason: "not-juth" };
  }
  const outcomes: any = { campus: null, gradingPolicy: null };
  const campus = institution.campusLocation;
  if (!campus || campus.lat == null || campus.lng == null) {
    institution.campusLocation = JUTH_INSTITUTION_CONFIG.campusLocation;
    await institution.save();
    console.log(
      "JUTH institution config synced (campus GPS seeded from " +
        JUTH_INSTITUTION_CONFIG.campusName + ")",
    );
    outcomes.campus = { synced: true };
  } else {
    outcomes.campus = { synced: false, reason: "already-set" };
  }
  try {
    outcomes.gradingPolicy = await seedJuthGradingPolicy(institution);
  } catch (err) {
    console.warn("JUTH grading policy seed skipped:", (err as Error).message);
    outcomes.gradingPolicy = { seeded: false, reason: "error" };
  }
  return { synced: true, ...outcomes };
};
