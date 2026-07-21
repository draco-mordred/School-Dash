export interface ClinicalAttendanceQueryInput {
  unit?: string | string[];
  supervisor?: string | string[];
  status?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
  academicYear?: string | string[];
}

export function buildClinicalAttendanceFilter(query: ClinicalAttendanceQueryInput = {}) {
  const filter: Record<string, any> = {};

  if (query.unit) {
    filter.unit = query.unit;
  }

  if (query.supervisor) {
    filter.supervisor = query.supervisor;
  }

  if (query.status) {
    const rawStatus = Array.isArray(query.status)
      ? query.status.join(",")
      : String(query.status);

    const statuses = rawStatus
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (statuses.length > 1) {
      filter.status = { $in: statuses };
    } else if (statuses.length === 1) {
      filter.status = statuses[0];
    }
  }

  if (query.academicYear) {
    filter.academicYear = query.academicYear;
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(String(query.startDate));
    if (query.endDate) filter.date.$lte = new Date(String(query.endDate));
  }

  return filter;
}
