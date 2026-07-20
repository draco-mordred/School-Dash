import { DEPARTMENT_UNITS, DEPARTMENTS_METADATA } from "../../../backend/src/constants/departments";

export interface PostingPhaseOption {
  id: string;
  label: string;
  subPostings: string[];
}

export interface InstitutionDepartmentLike {
  _id?: string;
  id?: string;
  name?: string | null;
  code?: string | null;
  departmentID?: string | null;
}

export interface PostingGenerationClockLike {
  phaseConfig?: Record<string, { name?: string; duration?: number; postingType?: string | null; postingId?: string | null; subPostings?: string[] | null } | null> | null;
}

export interface PostingDepartmentOption {
  id: string;
  postingName: string;
  department: InstitutionDepartmentLike;
  canonicalName: string;
  canonicalCode?: string;
  canonicalDepartmentID?: string;
  units: Array<{ id: string; name: string }>;
  departmentDurationWeeks: number;
  unitDurationWeeks: number;
  rotationDurationWeeks?: number;
}

const normalizeText = (value?: string | null) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getCanonicalDepartmentAliases = (value?: string | null): string[] => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  const aliases = new Set<string>([normalized]);
  const withoutDepartmentPrefix = normalized.replace(/^department of\s+/, "");

  if (withoutDepartmentPrefix !== normalized) {
    aliases.add(withoutDepartmentPrefix);
  }

  const aliasMap: Record<string, string[]> = {
    "obstetrics and gynecology": ["obgyn", "obg", "o g", "og", "obstetrics", "gynecology", "gyn"],
    pediatrics: ["pediatrics", "paediatrics", "peds", "paeds", "paediatric"],
    medicine: ["medicine", "internal medicine", "med", "internal med"],
    surgery: ["surgery", "general surgery", "surg"],
    radiology: ["radiology", "rad"],
    psychiatry: ["psychiatry", "psych"],
  };

  Object.entries(aliasMap).forEach(([canonical, aliasValues]) => {
    const hasAliasMatch = aliasValues.some((aliasValue) => aliasValue === normalized || aliasValue === withoutDepartmentPrefix);
    if (hasAliasMatch) {
      aliases.add(canonical);
      aliasValues.forEach((aliasValue) => aliases.add(aliasValue));
    }
  });

  return Array.from(aliases);
};

const matchesDepartmentToPosting = (postingValue?: string | null, department?: InstitutionDepartmentLike | null) => {
  const postingAliases = getCanonicalDepartmentAliases(postingValue);
  const departmentAliases = [
    ...getCanonicalDepartmentAliases(department?.name),
    ...getCanonicalDepartmentAliases(department?.code),
    ...getCanonicalDepartmentAliases(department?.departmentID),
  ];

  if (postingAliases.length === 0 || departmentAliases.length === 0) {
    return false;
  }

  return postingAliases.some((postingAlias) =>
    departmentAliases.some((departmentAlias) => postingAlias === departmentAlias),
  );
};

const getDepartmentMetadataMatch = (value?: string | null) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const matchingEntries = Object.entries(DEPARTMENTS_METADATA).filter(([, metadata]) => {
    const metadataAliases = [
      ...getCanonicalDepartmentAliases(metadata.name),
      ...getCanonicalDepartmentAliases(metadata.code),
      ...getCanonicalDepartmentAliases(metadata.departmentID),
    ];

    return metadataAliases.some((metadataAlias) => {
      const postingAliases = getCanonicalDepartmentAliases(value);
      return postingAliases.some((postingAlias) => postingAlias === metadataAlias);
    });
  });

  if (matchingEntries.length === 0) {
    return null;
  }

  return matchingEntries[0]?.[1] ?? null;
};

export const getPostingPhaseOptions = (
  clock?: PostingGenerationClockLike | null,
  fallbackPhases: Array<{ id: string; name: string }> = [],
): PostingPhaseOption[] => {
  const entries = Object.entries(clock?.phaseConfig ?? {}).filter(([, config]) => !!config?.name);

  if (entries.length > 0) {
    return entries.map(([id, config]) => ({
      id,
      label: config?.name ?? id,
      subPostings: Array.isArray(config?.subPostings) ? config.subPostings.filter(Boolean) : [],
    }));
  }

  return fallbackPhases.map((phase) => ({
    id: phase.id,
    label: phase.name,
    subPostings: [],
  }));
};

export const getEligibleDepartmentsForPhase = (
  clock?: PostingGenerationClockLike | null,
  institutionDepartments: InstitutionDepartmentLike[] = [],
  phaseId?: string | null,
): PostingDepartmentOption[] => {
  const config = phaseId ? clock?.phaseConfig?.[phaseId] : null;
  const subPostings = Array.isArray(config?.subPostings) ? config.subPostings.filter(Boolean) : [];

  if (subPostings.length === 0) {
    return [];
  }

  const normalizedSubPostings = subPostings
    .map((value) => normalizeText(value))
    .filter(Boolean);

  if (normalizedSubPostings.length === 0) {
    return [];
  }

  const resolvedDepartments: PostingDepartmentOption[] = [];

  subPostings.forEach((postingName, index) => {
    const metadataMatch = getDepartmentMetadataMatch(postingName);
    const institutionMatch = institutionDepartments.find((department) => matchesDepartmentToPosting(postingName, department));
    const fallbackDepartment = institutionMatch ?? (metadataMatch ? {
      name: metadataMatch.name,
      code: metadataMatch.code,
      departmentID: metadataMatch.departmentID,
    } : {
      name: postingName,
      code: undefined,
      departmentID: undefined,
    });

    const departmentName = metadataMatch?.name ?? fallbackDepartment.name ?? postingName;
    const departmentCode = metadataMatch?.code ?? fallbackDepartment.code ?? undefined;
    const departmentID = metadataMatch?.departmentID ?? fallbackDepartment.departmentID ?? undefined;

    const matchingDepartmentEntry = metadataMatch ? Object.entries(DEPARTMENTS_METADATA).find(([, departmentMeta]) => departmentMeta.departmentID === departmentID || departmentMeta.code === departmentCode || departmentMeta.name === departmentName) : null;
    const canonicalDepartmentName = matchingDepartmentEntry?.[1]?.name ?? departmentName;
    const canonicalCode = matchingDepartmentEntry?.[1]?.code ?? departmentCode;
    const canonicalDepartmentID = matchingDepartmentEntry?.[1]?.departmentID ?? departmentID;
    const departmentUnits = (matchingDepartmentEntry ? DEPARTMENT_UNITS[Object.keys(DEPARTMENTS_METADATA).find((entryKey) => entryKey === matchingDepartmentEntry[0]) as keyof typeof DEPARTMENTS_METADATA] : undefined)?.units?.active ?? [];

    const normalizedUnits = departmentUnits.map((unit) => {
      if (typeof unit === "string") {
        return { id: unit, name: unit };
      }

      return {
        id: unit.id,
        name: unit.name,
      };
    });

    const rotationDurationWeeks = matchingDepartmentEntry ? DEPARTMENT_UNITS[Object.keys(DEPARTMENTS_METADATA).find((entryKey) => entryKey === matchingDepartmentEntry[0]) as keyof typeof DEPARTMENTS_METADATA]?.rotationDurationWeeks : undefined;

    resolvedDepartments.push({
      id: fallbackDepartment._id ?? fallbackDepartment.id ?? canonicalDepartmentID ?? canonicalCode ?? departmentName ?? `posting-${index}`,
      postingName,
      department: fallbackDepartment,
      canonicalName: canonicalDepartmentName,
      canonicalCode,
      canonicalDepartmentID,
      units: normalizedUnits,
      departmentDurationWeeks: rotationDurationWeeks ?? 4,
      unitDurationWeeks: rotationDurationWeeks ?? 1,
      rotationDurationWeeks,
    });
  });

  return resolvedDepartments;
};
