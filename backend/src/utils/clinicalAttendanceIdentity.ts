export interface ClinicalAttendanceIdentitySource {
  inn?: string | null;
  idNumber?: string | null;
  email?: string | null;
}

export function getInstitutionIdentityReference(source: ClinicalAttendanceIdentitySource) {
  const inn = source.inn?.toString().trim();
  if (inn) {
    return inn;
  }

  const idNumber = source.idNumber?.toString().trim();
  if (idNumber) {
    return idNumber;
  }

  return source.email?.toString().trim() || "unknown";
}
