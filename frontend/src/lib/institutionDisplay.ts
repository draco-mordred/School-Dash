type InstitutionLike = {
  name?: string | null;
  shortName?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

export const getInstitutionDisplayName = (institution?: InstitutionLike | null) => {
  const name = institution?.name?.trim();
  if (name) return name;

  const shortName = institution?.shortName?.trim();
  if (shortName) return shortName;

  return "Institution";
};

export const getInstitutionSubtitle = (institution?: InstitutionLike | null, yearLabel?: string | null) => {
  const locationParts = [institution?.city?.trim(), institution?.state?.trim(), institution?.country?.trim()].filter(Boolean);
  const location = locationParts.join(", ");
  const year = yearLabel?.trim();

  if (location && year) return `${location} · ${year}`;
  if (location) return location;
  if (year) return year;
  return "Institution profile";
};
