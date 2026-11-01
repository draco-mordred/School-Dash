import Institution from "../models/institution";

// JUTH institution config file (PR B).
// The JUTH-specific campus GPS is synchronized into the EXISTING JUTH
// institution record in the DB at server start — only when the record
// matches JUTH and campusLocation is still unset, so admin edits on the
// institution profile always win over the seed.
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

export const isInstitutionJuth = (name?: string, shortName?: string) => {
  const norm = (value?: string) => String(value ?? "").trim().toLowerCase();
  return JUTH_INSTITUTION_CONFIG.matchNames.some(
    (match) => norm(name).includes(match) || norm(shortName).includes(match),
  );
};

export const syncJuthInstitutionConfig = async () => {
  const institution: any = await Institution.findOne();
  if (!institution || !isInstitutionJuth(institution.name, institution.shortName)) {
    return { synced: false, reason: "not-juth" };
  }
  const campus = institution.campusLocation;
  if (campus && campus.lat != null && campus.lng != null) {
    return { synced: false, reason: "already-set" };
  }
  institution.campusLocation = JUTH_INSTITUTION_CONFIG.campusLocation;
  await institution.save();
  console.log(
    "📍 JUTH institution config synced (campus GPS seeded from " +
      JUTH_INSTITUTION_CONFIG.campusName + ")",
  );
  return { synced: true };
};
