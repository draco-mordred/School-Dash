import { api } from "@/lib/api";

export interface SupervisorAttendanceSupportOptions {
  classes: Array<{ _id: string; name: string; academicYearId?: string }>;
  currentAcademicYearId: string;
}

const extractClassOptions = (payload: unknown) => {
  const data = payload as Record<string, unknown> | undefined;
  const classList = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.classes)
      ? data.classes
      : Array.isArray(data?.results)
        ? data.results
        : [];

  return classList
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && "_id" in item))
    .map((item) => ({
      _id: String(item._id),
      name: String(item.name ?? "Untitled class"),
      academicYearId: typeof item.academicYear === "string"
        ? item.academicYear
        : (item.academicYear as Record<string, unknown> | undefined)?._id
          ? String((item.academicYear as Record<string, unknown>)._id)
          : undefined,
    }));
};

const extractAcademicYearId = (payload: unknown) => {
  const data = payload as Record<string, unknown> | undefined;
  return String(
    (data?.year as Record<string, unknown> | undefined)?._id
      ?? data?._id
      ?? (data?.data as Record<string, unknown> | undefined)?._id
      ?? ""
  );
};

export const loadSupervisorAttendanceSupportOptions = async (
  fetchClasses: typeof api.get = api.get,
  fetchCurrentAcademicYear: typeof api.get = api.get,
): Promise<SupervisorAttendanceSupportOptions> => {
  try {
    const [classesResponse, academicYearResponse] = await Promise.allSettled([
      fetchClasses("/classes?limit=200"),
      fetchCurrentAcademicYear("/academic-years/current"),
    ]);

    const classes = classesResponse.status === "fulfilled"
      ? extractClassOptions(classesResponse.value?.data)
      : [];

    const currentAcademicYearId = academicYearResponse.status === "fulfilled"
      ? extractAcademicYearId(academicYearResponse.value?.data)
      : "";

    return { classes, currentAcademicYearId };
  } catch {
    return { classes: [], currentAcademicYearId: "" };
  }
};
