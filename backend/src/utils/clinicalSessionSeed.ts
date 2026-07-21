import HospitalUnitModel from "../models/hospitalUnit.ts";

export interface ClinicalSessionSeedInput {
  classId?: string;
  academicYearId?: string;
  unitIds?: string[];
  unitNames?: string[];
}

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

  if (unitNames.length > 0) {
    const units = await HospitalUnitModel.find({ name: { $in: unitNames }, isActive: true }).select("_id name").lean();
    return {
      academicYearId,
      unitIds: units.map((unit: any) => String(unit._id)),
    };
  }

  return {
    academicYearId,
    unitIds: [],
  };
}
