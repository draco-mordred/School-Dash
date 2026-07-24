import HospitalUnitModel from "../models/hospitalUnit.ts";

export interface ClinicalSessionSeedInput {
  classId?: string;
  academicYearId?: string;
  unitIds?: string[];
  unitNames?: string[];
  departmentNames?: string[];
}

const normalizeToken = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/^department of\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const normalizeLabel = (value: unknown) => normalizeToken(value);

const addDistinct = (values: string[], value: string) => {
  const nextValue = normalizeLabel(value);
  if (nextValue && !values.includes(nextValue)) {
    values.push(nextValue);
  }
};

export const resolveMatchingUnitIds = (
  unitNames: string[],
  departmentNames: string[],
  hospitalUnits: Array<{ _id: string; name?: string; department?: string }>
) => {
  const normalizedUnitNames = unitNames.map((value) => normalizeLabel(value)).filter(Boolean);
  const normalizedDepartmentNames = departmentNames.map((value) => normalizeLabel(value)).filter(Boolean);
  const seenIds = new Set<string>();
  const matchedIds: string[] = [];

  const hospitalNameIndex = new Map<string, string[]>();
  const hospitalDepartmentIndex = new Map<string, string[]>();

  hospitalUnits.forEach((unit) => {
    const unitId = String(unit._id);
    const unitName = normalizeLabel(unit.name);
    const departmentName = normalizeLabel(unit.department);

    if (unitName) {
      const buckets = hospitalNameIndex.get(unitName) ?? [];
      buckets.push(unitId);
      hospitalNameIndex.set(unitName, buckets);
    }

    if (departmentName) {
      const buckets = hospitalDepartmentIndex.get(departmentName) ?? [];
      buckets.push(unitId);
      hospitalDepartmentIndex.set(departmentName, buckets);
    }
  });

  normalizedUnitNames.forEach((candidateLabel) => {
    for (const [unitLabel, unitIds] of hospitalNameIndex.entries()) {
      if (unitLabel === candidateLabel || unitLabel.includes(candidateLabel) || candidateLabel.includes(unitLabel)) {
        unitIds.forEach((unitId) => {
          if (!seenIds.has(unitId)) {
            seenIds.add(unitId);
            matchedIds.push(unitId);
          }
        });
      }
    }
  });

  normalizedDepartmentNames.forEach((candidateLabel) => {
    for (const [departmentLabel, unitIds] of hospitalDepartmentIndex.entries()) {
      if (departmentLabel === candidateLabel || departmentLabel.includes(candidateLabel) || candidateLabel.includes(departmentLabel)) {
        unitIds.forEach((unitId) => {
          if (!seenIds.has(unitId)) {
            seenIds.add(unitId);
            matchedIds.push(unitId);
          }
        });
      }
    }
  });

  return matchedIds;
};

export async function deriveClinicalSessionSeedFromClass(input: ClinicalSessionSeedInput) {
  const academicYearId = input.academicYearId?.trim() || "";

  const explicitUnitIds = Array.isArray(input.unitIds)
    ? input.unitIds.filter(Boolean).map((value) => String(value))
    : [];

  if (explicitUnitIds.length > 0) {
    return {
      academicYearId,
      unitIds: explicitUnitIds,
    };
  }

  const unitNames = Array.isArray(input.unitNames)
    ? input.unitNames.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  const departmentNames = Array.isArray(input.departmentNames)
    ? input.departmentNames.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  const candidates = [...unitNames, ...departmentNames];
  if (candidates.length === 0) {
    return {
      academicYearId,
      unitIds: [],
    };
  }

  const hospitalUnits = await HospitalUnitModel.find({ isActive: true }).select("_id name department").lean();
  const matchedUnits = resolveMatchingUnitIds(unitNames, departmentNames, hospitalUnits as any[]);

  return {
    academicYearId,
    unitIds: matchedUnits,
  };
}
