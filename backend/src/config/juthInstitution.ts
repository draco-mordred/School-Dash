import Institution from "../models/institution";
import AssessmentSettings from "../models/assessmentSettings";
import { DEFAULT_GRADING_POLICY, type GradingPolicy } from "../utils/grading";

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
  await settings.save();
  console.log("JUTH grading policy seeded (CA 40% / exam 60%, CA tests /25, 5.0 GPA)");
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
