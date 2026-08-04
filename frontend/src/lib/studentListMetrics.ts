import { api } from "@/lib/api";

export interface AttendanceStatLike {
  _id?: string;
  count?: number;
}

export interface AttendanceRecordLike {
  status?: string;
  count?: number;
}

export interface StudentPostingSummaryLike {
  postingName?: string;
  window?: {
    departmentName?: string;
    departmentGroupIndex?: number;
    unitName?: string;
  };
}

export type StudentMetricsRequest = (url: string, config?: { timeout?: number }) => Promise<{ data?: any }>;

const DEFAULT_STUDENT_METRICS_TIMEOUT = 4000;
const studentMetricsCache: Record<string, { attendancePercentage: number; currentPosting?: string }> = {};

export const buildStudentAttendancePercentage = (
  stats: Array<AttendanceStatLike | AttendanceRecordLike> = [],
  fallbackRecords: AttendanceRecordLike[] = []
) => {
  const resolvedStats = Array.isArray(stats) ? stats : [];
  const resolvedFallbackRecords = Array.isArray(fallbackRecords) ? fallbackRecords : [];

  const total = resolvedStats.reduce((sum, stat) => sum + Number(stat?.count || 0), 0);
  const fallbackTotal = resolvedFallbackRecords.reduce((sum, stat) => sum + Number(stat?.count || 0 || (stat?.status ? 1 : 0)), 0);
  const normalizedTotal = total || fallbackTotal || resolvedFallbackRecords.length;

  if (!normalizedTotal) return 0;

  const presentCount = resolvedStats.reduce((sum, stat) => {
    const status = String((stat as any)?._id ?? (stat as any)?.status ?? "").toLowerCase();
    if (status === "present") {
      return sum + Number(stat?.count || 0);
    }
    if (status === "late") {
      return sum + Number(stat?.count || 0) * 0.5;
    }
    return sum;
  }, 0);

  const fallbackPresentCount = resolvedFallbackRecords.reduce((sum, stat) => {
    const status = String(stat?.status ?? "").toLowerCase();
    const weight = Number(stat?.count || 0) || 1;
    if (status === "present") {
      return sum + weight;
    }
    if (status === "late") {
      return sum + weight * 0.5;
    }
    return sum;
  }, 0);

  const attendanceCount = presentCount || fallbackPresentCount;
  return Math.round((attendanceCount / normalizedTotal) * 100);
};

export const formatStudentCurrentPosting = (posting?: StudentPostingSummaryLike | null) => {
  if (!posting) return "Not assigned";

  const departmentName = posting.window?.departmentName?.trim();
  const departmentGroupLabel = posting.window?.departmentGroupIndex !== undefined
    ? `Department Group ${Number(posting.window.departmentGroupIndex) + 1}`
    : "Department Group";
  const postingName = posting.postingName?.trim();
  const unitName = posting.window?.unitName?.trim();

  const parts = [departmentGroupLabel];
  if (departmentName) parts.push(departmentName);
  if (postingName) parts.push(postingName);
  if (unitName) parts.push(unitName);

  return parts.length > 0 ? parts.join(" • ") : "Not assigned";
};

export const loadStudentMetrics = async (
  studentIds: string[],
  requestFn: StudentMetricsRequest = (url, config) => api.get(url, { timeout: DEFAULT_STUDENT_METRICS_TIMEOUT, ...(config ?? {}) })
) => {
  const nextMetrics: Record<string, { attendancePercentage: number; currentPosting?: string }> = {};

  const uniqueStudentIds = Array.from(new Set((studentIds || []).filter(Boolean) as string[]));

  if (!uniqueStudentIds.length) {
    return nextMetrics;
  }

  uniqueStudentIds.forEach((studentId) => {
    if (studentMetricsCache[studentId]) {
      nextMetrics[studentId] = studentMetricsCache[studentId];
    }
  });

  const missingStudentIds = uniqueStudentIds.filter((studentId) => !studentMetricsCache[studentId]);

  if (!missingStudentIds.length) {
    return nextMetrics;
  }

  const concurrency = Math.min(2, Math.max(1, missingStudentIds.length));
  let index = 0;

  const worker = async () => {
    while (index < missingStudentIds.length) {
      const currentIndex = index++;
      const studentId = missingStudentIds[currentIndex];
      if (!studentId) continue;

      try {
        const [attendanceResponse, postingResponse] = await Promise.all([
          requestFn(`/attendance/student/${studentId}/summary`, { timeout: DEFAULT_STUDENT_METRICS_TIMEOUT }).catch(() => ({ data: { stats: [] } })),
          requestFn(`/rotation-schedules/student/${studentId}/current`, { timeout: DEFAULT_STUDENT_METRICS_TIMEOUT }).catch(() => ({ data: { current: [] } })),
        ]);

        const stats = Array.isArray(attendanceResponse?.data?.stats) ? attendanceResponse.data.stats : [];
        const fallbackRecords = Array.isArray(attendanceResponse?.data?.records)
          ? attendanceResponse.data.records
          : [];
        const current = Array.isArray(postingResponse?.data?.current) ? postingResponse.data.current[0] : null;

        const metrics = {
          attendancePercentage: buildStudentAttendancePercentage(stats, fallbackRecords),
          currentPosting: formatStudentCurrentPosting(current),
        };

        studentMetricsCache[studentId] = metrics;
        nextMetrics[studentId] = metrics;
      } catch {
        const fallbackMetrics = {
          attendancePercentage: 0,
          currentPosting: "Not assigned",
        };
        studentMetricsCache[studentId] = fallbackMetrics;
        nextMetrics[studentId] = fallbackMetrics;
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  return nextMetrics;
};
