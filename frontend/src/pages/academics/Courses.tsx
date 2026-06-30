import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Search as SearchIcon, PlusCircle, RefreshCw, Wand2, Pencil } from "lucide-react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Class, courses, user } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Modal from "@/components/global/Modal";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";
import { CustomSelect } from "@/components/global/CustomSelect";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";


type LoadingState = "idle" | "loading" | "error";

// Schema for assigning courses to a class
const addCoursesSchema = z.object({
  courseIds: z.array(z.string()).min(1, "Select at least one course"),
});
type AddCoursesFormValues = z.infer<typeof addCoursesSchema>;

// Schema for creating a new course subject
const createCourseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  code: z
    .string()
    .min(1, "Course code is required")
    .regex(/^[A-Z]{3} \d{3}$/, "Course code must be in the format PAE 501"),
  courseID: z.string().min(1, "Course Group ID is required"),
  department: z.string().min(1, "Department is required"),
  unit: z.string().optional(),
  semester: z.enum(["First", "Second"]),
  academicYearId: z.string().min(1, "Academic year is required"),
  lecturer: z.string().optional(),
  isActive: z.boolean().default(true),
  assignToClass: z.boolean().default(true),
});
type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

const createSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  subjectID: z.string().min(1, "Subject ID is required"),
  unit: z.string().optional(),
  lecturer: z.string().optional(),
  isActive: z.boolean().default(true),
});
type CreateSubjectFormValues = z.infer<typeof createSubjectSchema>;

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  return fallback;
};

const resolveReferenceId = (value: unknown) => {
  if (typeof value === "object" && value !== null && "_id" in value) {
    const id = (value as { _id?: unknown })._id;
    return typeof id === "string" ? id : "";
  }
  return "";
};

type Teacher = {
  _id: string;
  name: string;
  email?: string;
  department?: string | { _id?: string; name?: string; code?: string; departmentID?: string };
};

type SubjectCourse = {
  id: string;
  name: string;
  departmentId?: string;
  departmentCode?: string;
  departmentID?: string;
  departmentName?: string;
};

const getTeacherDepartmentValue = (department: unknown) => {
  if (!department) return "";
  if (typeof department === "string") return department.trim().toLowerCase();
  if (typeof department === "object" && department !== null) {
    const deptObj = department as { _id?: string; name?: string; code?: string; departmentID?: string };
    return (
      String(deptObj._id ?? deptObj.code ?? deptObj.departmentID ?? deptObj.name ?? "").trim().toLowerCase()
    );
  }
  return "";
};

const teacherBelongsToDepartment = (
  teacher: Teacher,
  department: { _id: string; name: string; code: string; departmentID: string } | null
) => {
  if (!department) return false;
  const teacherDepartment = getTeacherDepartmentValue(teacher.department);
  const normalizedDepartmentValues = new Set([
    String(department._id).trim().toLowerCase(),
    String(department.code).trim().toLowerCase(),
    String(department.departmentID).trim().toLowerCase(),
    String(department.name).trim().toLowerCase(),
  ]);
  return normalizedDepartmentValues.has(teacherDepartment);
};

export default function Courses() {
  const { user } = useAuth();
  const isAdminOrTeacher = user?.role === "admin" || user?.role === "teacher";
  const canManageCourses = ["admin", "teacher", "unitconsultant"].includes(user?.role ?? "");
  const isAdmin = user?.role === "admin";

  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<courses | null>(null);
  const [allCourses, setAllCourses] = useState<courses[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [updatingCourse, setUpdatingCourse] = useState(false);
  const [deduplicating, setDeduplicating] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [departments, setDepartments] = useState<{ _id: string; name: string; departmentID: string; code: string }[]>([]);
  const [units, setUnits] = useState<{ _id: string; name: string; unitID: string; department: string | { _id?: string } }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ _id: string; name: string }[]>([]);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectCourse, setSubjectCourse] = useState<SubjectCourse | null>(null);
  const [uploadingCourses, setUploadingCourses] = useState(false);
  const uploadCourseInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<AddCoursesFormValues>({
    resolver: zodResolver(addCoursesSchema),
    defaultValues: { courseIds: [] },
  });

  const createForm = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema) as Resolver<CreateCourseFormValues>,
    defaultValues: {
      name: "",
      code: "",
      courseID: "",
      department: "",
      unit: "",
      semester: "First",
      academicYearId: "",
      lecturer: "",
      isActive: true,
      assignToClass: true,
    },
  });

  const subjectForm = useForm<CreateSubjectFormValues>({
    resolver: zodResolver(createSubjectSchema) as Resolver<CreateSubjectFormValues>,
    defaultValues: {
      name: "",
      code: "",
      subjectID: "",
      unit: "",
      lecturer: "",
      isActive: true,
    },
  });

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => {
      const haystack = [c.name, c.academicYear?.name].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [classes, search]);

  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return classes.find((c) => c._id === selectedClassId) ?? null;
  }, [classes, selectedClassId]);

  const selectedCourses: courses[] = useMemo(() => {
    const courses = selectedClass?.courses;
    if (Array.isArray(courses)) return courses;
    const subjectsLegacy = (selectedClass as unknown as { subjects?: courses[] })?.subjects;
    if (Array.isArray(subjectsLegacy)) return subjectsLegacy;
    return [];
  }, [selectedClass]);

  // Filter units by selected department
  const selectedCourseDepartmentId = createForm.watch("department");

  const filteredUnits = useMemo(() => {
    const selectedDept = selectedCourseDepartmentId;
    if (!selectedDept) return units;
    return units.filter((u) => {
      const deptId = typeof u.department === "object" ? u.department._id : u.department;
      return String(deptId) === String(selectedDept);
    });
  }, [units, selectedCourseDepartmentId]);

  const selectedCourseDepartment = useMemo(
    () => departments.find((dept) => dept._id === selectedCourseDepartmentId) ?? null,
    [departments, selectedCourseDepartmentId]
  );

  const hodOptions = useMemo(() => {
    const filtered = selectedCourseDepartment
      ? teachers.filter((teacher) => teacherBelongsToDepartment(teacher, selectedCourseDepartment))
      : teachers;
    return filtered.map((t) => ({ label: t.name, value: t._id }));
  }, [teachers, selectedCourseDepartment]);

  const selectedSubjectDepartment = useMemo(
    () => departments.find((dept) => dept._id === subjectCourse?.departmentId) ?? null,
    [departments, subjectCourse]
  );

  const subjectTeacherOptions = useMemo(() => {
    const filtered = selectedSubjectDepartment
      ? teachers.filter((teacher) => teacherBelongsToDepartment(teacher, selectedSubjectDepartment))
      : teachers;
    return filtered.map((t) => ({ label: t.name, value: t._id }));
  }, [teachers, selectedSubjectDepartment]);

  const subjectIdOptions = useMemo(() => {
    if (selectedSubjectDepartment) {
      return [
        {
          label: selectedSubjectDepartment.departmentID,
          value: selectedSubjectDepartment.departmentID,
        },
      ];
    }
    return departments.map((dept) => ({ label: dept.departmentID, value: dept.departmentID }));
  }, [departments, selectedSubjectDepartment]);

  const availableCourses = useMemo(() => {
    const assignedIds = new Set(selectedCourses.map((c) => c._id).filter(Boolean));
    return allCourses.filter((course) => course._id && !assignedIds.has(course._id));
  }, [allCourses, selectedCourses]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoadingState("loading");
      const { data } = (await api.get(`/classes?page=1&limit=200`)) as {
        data: { classes: Class[] };
      };
      const loaded = data?.classes ?? [];
      setClasses(loaded);
      if (!selectedClassId && loaded.length > 0) {
        setSelectedClassId(loaded[0]._id);
      }
      setLoadingState("idle");
    } catch (e) {
      console.error(e);
      setLoadingState("error");
      toast.error("Failed to load classes");
    }
  }, [selectedClassId]);

  useEffect(() => {
    void fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllCourses = useCallback(async () => {
    try {
      setLoadingCourses(true);
      const { data } = await api.get("/courses?topLevel=true&page=1&limit=500");
      setAllCourses(data.courses ?? []);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const fetchTeachers = useCallback(async (departmentId?: string) => {
    try {
      setLoadingTeachers(true);
      const query = new URLSearchParams({ page: "1", limit: "500", role: "teacher" });
      if (departmentId) {
        query.set("department", departmentId);
      }
      const { data } = await api.get(`/users?${query.toString()}`);
      const allUsers = (data.users ?? []) as Array<user & { department?: string | { _id?: string; name?: string; code?: string; departmentID?: string } }>;
      setTeachers(
        allUsers.map((u) => ({ _id: u._id, name: u.name, email: u.email, department: u.department }))
      );
    } catch {
      toast.error("Failed to load teachers");
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  const fetchCourseMeta = useCallback(async () => {
    try {
      const [coursesData, yearsData] = await Promise.all([
        api.get("/courses/meta"),
        api.get("/academic-years"),
      ]);

      setDepartments(coursesData.data.departments ?? []);
      setUnits(coursesData.data.units ?? []);
      setAcademicYears(yearsData.data.years ?? yearsData.data ?? []);
    } catch {
      toast.error("Failed to load course metadata");
    }
  }, []);

  useEffect(() => {
    if (createCourseOpen) {
      void fetchTeachers(selectedCourseDepartmentId || undefined);
    }
  }, [createCourseOpen, fetchTeachers, selectedCourseDepartmentId]);

  const handleOpenAddCourse = (open: boolean) => {
    setAddCourseOpen(open);
    if (open) {
      void fetchAllCourses();
      form.reset({ courseIds: [] });
    }
  };

  const handleOpenCreateCourse = (open: boolean) => {
    setCreateCourseOpen(open);
    if (!open) {
      setEditingCourse(null);
      return;
    }
    createForm.reset({
      name: "",
      code: "",
      courseID: "",
      department: "",
      unit: "",
      semester: "First",
      academicYearId: selectedClass?.academicYear?._id ?? "",
      lecturer: "",
      isActive: true,
      assignToClass: Boolean(selectedClass),
    });
    void fetchTeachers();
    void fetchCourseMeta();
  };

  const handleOpenEditCourse = (open: boolean, course?: courses) => {
    if (!open) {
      setEditingCourse(null);
      setCreateCourseOpen(false);
      return;
    }
    if (course) {
      setEditingCourse(course);
      setCreateCourseOpen(true);
      const lecturerId = Array.isArray(course.lecturer) && course.lecturer.length > 0
        ? (typeof course.lecturer[0] === "object" ? (course.lecturer[0] as { _id?: string })._id ?? "" : String(course.lecturer[0]))
        : "";
      const courseWithRefs = course as courses & {
        courseID?: string;
        semester?: "First" | "Second";
        department?: { _id: string };
        unit?: { _id: string };
        academicYear?: { _id: string };
      };
      createForm.reset({
        name: course.name ?? "",
        code: course.code ?? "",
        courseID: courseWithRefs.courseID ?? "",
        department: resolveReferenceId(courseWithRefs.department),
        unit: resolveReferenceId(courseWithRefs.unit),
        semester: courseWithRefs.semester ?? "First",
        academicYearId: resolveReferenceId(courseWithRefs.academicYear),
        lecturer: lecturerId,
        isActive: course.isActive ?? true,
        assignToClass: Boolean(selectedClass),
      });
      void fetchTeachers();
      void fetchCourseMeta();
    }
  };

  const parseBulkUploadRows = (rows: Array<Record<string, unknown>>) =>
    rows.map((row) => ({
      name: String(row["Course Title"] || row["Subject"] || row["name"] || "").trim(),
      code: String(row["Course Code"] || row["code"] || "").trim().toUpperCase(),
      courseID: String(row["Course Group ID"] || row["courseID"] || row["Group ID"] || "").trim().toUpperCase(),
      department: String(row["Department"] || row["Department Name"] || row["department"] || "").trim(),
      unit: String(row["Unit"] || row["Unit Name"] || row["unit"] || "").trim(),
      semester: String(row["Semester"] || row["semester"] || "").trim(),
      year: String(row["Year"] || row["year"] || "").trim(),
      academicYearId: String(row["Academic Year ID"] || row["academicYearId"] || row["academicYear"] || "").trim(),
      lecturer: String(row["Lecturer"] || row["lecturer"] || "").trim(),
    }));

  const handleBulkUploadCourses = async (file: File) => {
    setUploadingCourses(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const workbookSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbookSheet, { defval: "" });
      const parsedRows = parseBulkUploadRows(rows);

      if (parsedRows.length === 0) {
        toast.error("No rows found in the uploaded file.");
        return;
      }

      const response = await api.post("/courses/bulk-upload", { courses: parsedRows });
      const result = response.data?.results;
      toast.success(`Bulk upload completed. Created ${result?.created ?? 0}, skipped ${result?.skipped ?? 0}.`);
      void fetchAllCourses();
      void fetchClasses();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload courses"));
    } finally {
      setUploadingCourses(false);
    }
  };

  const onUpdateCourseSubmit = async (values: CreateCourseFormValues) => {  
    if (!editingCourse?._id) return;
    try {
      setUpdatingCourse(true);
      const payload = {
        name: values.name,
        code: values.code,
        courseID: values.courseID,
        department: values.department,
        unit: values.unit || null,
        semester: values.semester,
        academicYearId: values.academicYearId,
        lecturer: values.lecturer ? [values.lecturer] : [],
        isActive: values.isActive,
      };
      await api.patch(`/courses/update/${editingCourse._id}`, payload);
      toast.success(`Course "${values.name}" updated successfully`);
      setCreateCourseOpen(false);
      setEditingCourse(null);
      void fetchAllCourses();
      void fetchClasses();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Failed to update course"));
    } finally {
      setUpdatingCourse(false);
    }
  };

  const onAddCoursesSubmit = async (values: AddCoursesFormValues) => {
    if (!selectedClassId) return;
    try {
      const existingIds = selectedCourses.map((c) => c._id).filter(Boolean) as string[];
      const allCourseIds = [...existingIds, ...values.courseIds];
      await api.patch(`/classes/update/${selectedClassId}`, { courses: allCourseIds });
      toast.success("Courses assigned successfully");
      setAddCourseOpen(false);
      void fetchClasses();
    } catch {
      toast.error("Failed to assign courses");
    }
  };

  const onCreateCourseSubmit = async (values: CreateCourseFormValues) => {
    try {
      setCreatingCourse(true);
      const payload = {
        name: values.name,
        code: values.code,
        courseID: values.courseID,
        department: values.department,
        unit: values.unit || null,
        semester: values.semester,
        academicYearId: values.academicYearId,
        lecturer: values.lecturer ? [values.lecturer] : [],
        isActive: values.isActive,
      };
      const { data } = await api.post("/courses", payload);
      if (values.assignToClass && selectedClassId) {
        try {
          const existingIds = selectedCourses.map((c) => c._id).filter(Boolean) as string[];
          await api.patch(`/classes/update/${selectedClassId}`, { courses: [...existingIds, data._id] });
        } catch {
          toast.error("Course created, but failed to assign it to the selected class.");
        }
      }
      toast.success(`Course "${values.name}" created successfully`);
      setCreateCourseOpen(false);
      void fetchAllCourses();
      void fetchClasses();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Failed to create course"));
    } finally {
      setCreatingCourse(false);
    }
  };

  const onCreateSubjectSubmit = async (values: CreateSubjectFormValues) => {
    if (!subjectCourse?.id) return;
    try {
      setUpdatingCourse(true);
      const payload = {
        subject: {
          name: values.name,
          code: values.code,
          subjectID: values.subjectID,
          unit: values.unit || null,
          lecturer: values.lecturer ? [values.lecturer] : [],
          isActive: values.isActive,
        },
      };
      await api.post(`/courses/${subjectCourse.id}/subjects`, payload);
      toast.success(`Subject "${values.name}" added to ${subjectCourse.name}`);
      setSubjectModalOpen(false);
      setSubjectCourse(null);
      subjectForm.reset({ name: "", code: "", subjectID: "", unit: "", lecturer: "", isActive: true });
      void fetchAllCourses();
      void fetchClasses();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Failed to add subject"));
    } finally {
      setUpdatingCourse(false);
    }
  };

  type CourseWithDepartment = {
    _id?: string;
    name?: string;
    department?: string | { _id?: string; name?: string; code?: string; departmentID?: string };
  };

  const handleOpenSubjectModal = (open: boolean, course?: SubjectCourse) => {
    setSubjectModalOpen(open);
    if (!open) {
      setSubjectCourse(null);
      return;
    }
    if (course) {
      setSubjectCourse(course);
      subjectForm.reset({
        name: "",
        code: "",
        subjectID: course.departmentID ?? "",
        unit: "",
        lecturer: "",
        isActive: true,
      });
      void fetchTeachers();
    }
  };

  const handleDeduplicate = async () => {
    try {
      setDeduplicating(true);
      const { data } = await api.post("/courses/deduplicate-classes");
      toast.success(data.message ?? "Deduplication complete");
    } catch {
      toast.error("Failed to deduplicate class courses");
    } finally {
      setDeduplicating(false);
    }
  };

  return (
    <div id="page-courses" className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">Available course subjects for each class.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative w-[260px] max-w-[60vw]">
            <SearchIcon className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes..."
              className="pl-9"
            />
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleDeduplicate()}
              disabled={deduplicating}
              title="Remove duplicate course entries from all classes"
            >
              <Wand2 className="mr-1 h-4 w-4" />
              {deduplicating ? "Cleaning..." : "Clean Duplicates"}
            </Button>
          )}
          {canManageCourses && (
            <>
              <input
                ref={uploadCourseInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                aria-label="Upload courses file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await handleBulkUploadCourses(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => uploadCourseInputRef.current?.click()}
                disabled={uploadingCourses}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                {uploadingCourses ? "Uploading..." : "Bulk Upload"}
              </Button>
              <Button variant="default" size="sm" onClick={() => handleOpenCreateCourse(true)}>
                <PlusCircle className="mr-1 h-4 w-4" />
                New Course
              </Button>
            </>
          )}
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6">
        {/* Class cards + course dropdown (animated) will be implemented here */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Classes</h2>
            <Badge variant="secondary">{filteredClasses.length}</Badge>
          </div>

          {loadingState === "loading" ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-muted-foreground">No classes found.</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {filteredClasses.map((cls) => {
                const isActive = cls._id === selectedClassId;
                return (
                  <button
                    key={cls._id}
                    type="button"
                    onClick={() => setSelectedClassId(cls._id)}
                    className={
                      "w-full text-left rounded-md border px-3 py-2 transition " +
                      (isActive
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/40")
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{cls.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {cls.academicYear?.name ?? "N/A"}
                        </div>
                      </div>
                      <ChevronRight className={"h-4 w-4 text-muted-foreground " + (isActive ? "opacity-100" : "opacity-60")} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void fetchClasses()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold">Subjects / Courses</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedCourses.length}</Badge>
              {selectedClass && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAddCourse(true)}
                  >
                    <PlusCircle className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                  {canManageCourses && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenCreateCourse(true)}
                    >
                      <PlusCircle className="mr-1 h-4 w-4" />
                      New Course
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {selectedClass ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Selected class</div>
                <div className="font-medium">{selectedClass.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedClass.academicYear?.name ?? "N/A"}
                </div>
              </div>

              {(() => {
                const seen = new Set<string>();
                const uniqueCourses = selectedCourses.filter((c) => {
                  if (!c._id || seen.has(c._id)) return false;
                  seen.add(c._id);
                  return true;
                });
                if (uniqueCourses.length === 0) {
                  return (
                    <div className="text-muted-foreground">
                      No course subjects are assigned to this class yet.
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uniqueCourses.map((c) => {
                const lecturerArr = Array.isArray(c.lecturer) ? c.lecturer : [];
                const teacherNames = lecturerArr
                  .map((t) => {
                    if (!t || typeof t !== "object") return undefined;
                    const maybeName = (t as { name?: string }).name;
                    return maybeName ?? undefined;
                  })
                  .filter((x): x is string => typeof x === "string" && x.length > 0);
                const displayLecturers = teacherNames.length > 0
                  ? teacherNames.join(", ")
                  : lecturerArr.length > 0
                  ? `${lecturerArr.length} lecturer${lecturerArr.length !== 1 ? "s" : ""}`
                  : undefined;

                const departmentName = typeof c.department === "string"
                  ? c.department
                  : c.department?.name ?? c.department?.code ?? c.department?.departmentID ?? "";
                const academicYearName = typeof c.academicYear === "string"
                  ? c.academicYear
                  : c.academicYear?.name ?? "";
                const isExpanded = c._id === expandedCourseId;

                return (
                  <div
                    key={c._id}
                    className={
                      "border rounded-md p-3 transition " +
                      (isExpanded
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "hover:border-muted-foreground/40 hover:shadow-sm")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedCourseId((prev) => (prev === c._id ? null : c._id))}
                        className="text-left flex-1 text-left cursor-pointer"
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${c.name}`}
                      >
                        <div className="font-medium text-left">{c.name}</div>
                        <div className="text-sm text-muted-foreground">{c.code}</div>
                      </button>
                      <div className="flex items-center gap-1">
                        {canManageCourses && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenEditCourse(true, c);
                            }}
                            className="text-muted-foreground hover:text-primary p-1 rounded shrink-0"
                            title="Edit course"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canManageCourses && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              const courseWithDept = c as CourseWithDepartment;
                              const department =
                                typeof courseWithDept.department === "object"
                                  ? courseWithDept.department
                                  : null;
                              const departmentId =
                                typeof courseWithDept.department === "string"
                                  ? courseWithDept.department
                                  : resolveReferenceId(courseWithDept.department);
                              handleOpenSubjectModal(true, {
                                id: c._id ?? "",
                                name: c.name ?? "Course",
                                departmentId,
                                departmentCode: department?.code ?? "",
                                departmentID: department?.departmentID ?? "",
                                departmentName: department?.name ?? "",
                              });
                            }}
                            className="text-muted-foreground hover:text-primary p-1 rounded shrink-0"
                            title="Add subject to course"
                          >
                            +
                          </button>
                        )}
                        {canManageCourses && (
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.stopPropagation();
                              try {
                                const remaining = (selectedCourses ?? [])
                                  .filter((x) => x._id !== c._id)
                                  .map((x) => x._id);

                                await api.patch(`/classes/update/${selectedClassId}`, { courses: remaining });

                                toast.success("Course removed from class");
                                void fetchClasses();
                              } catch {
                                toast.error("Failed to remove course from class");
                              }
                            }}
                            className="text-muted-foreground hover:text-red-600 p-1 rounded shrink-0"
                            title="Remove from class"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {displayLecturers && (
                      <div className="text-xs text-muted-foreground mt-1">👤 {displayLecturers}</div>
                    )}
                    {isExpanded && (
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium text-slate-700">Course Group:</span> {c.courseID ?? "N/A"}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Department:</span> {departmentName || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Semester:</span> {c.semester ?? "N/A"}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Academic Year:</span> {academicYearName || "N/A"}
                        </div>
                      </div>
                    )}
                    {!c.isActive ? (
                      <div className="mt-2">
                        <Badge variant="destructive">Inactive</Badge>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Badge variant="default">Active</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-muted-foreground">Select a class to view its available courses.</div>
          )}
        </Card>
      </div>

      {/* Assign Courses Modal */}
      <Modal
        open={addCourseOpen}
        setOpen={handleOpenAddCourse}
        title="Assign Courses"
        description={selectedClass ? `Add courses to ${selectedClass.name}` : "Add courses"}
      >
        <form onSubmit={form.handleSubmit(onAddCoursesSubmit)} className="space-y-4">
          <Controller
            name="courseIds"
            control={form.control}
            render={() => (
              <Field>
                <FieldLabel>Select Courses</FieldLabel>
                <CustomMultiSelect
                  control={form.control}
                  name="courseIds"
                  label="Select Courses"
                  placeholder="Select courses..."
                  options={availableCourses.map((c) => ({ label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(), value: c._id }))}
                  loading={loadingCourses}
                />
              </Field>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Assign Courses"}
          </Button>
        </form>
      </Modal>

      {/* Create / Edit Course Modal */}
      <Modal
        open={createCourseOpen}
        setOpen={handleOpenCreateCourse}
        title={editingCourse ? "Edit Course" : "Create New Course"}
        description={editingCourse
          ? `Update course "${editingCourse.name}".`
          : "Add a new course subject to the system. Admin and teachers can create courses."}
      >
        <form
          onSubmit={createForm.handleSubmit(editingCourse ? onUpdateCourseSubmit : onCreateCourseSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel>Course Name *</FieldLabel>
            <Input
              {...createForm.register("name")}
              placeholder="e.g., Pediatrics"
            />
            {createForm.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.name.message)}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>Course Code *</FieldLabel>
            <Input
              {...createForm.register("code")}
              placeholder="e.g., PAE 501"
            />
            {createForm.formState.errors.code && (
              <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.code.message)}</p>
            )}
          </Field>

          <CustomSelect
            control={createForm.control}
            name="courseID"
            label="Course Group ID"
            placeholder="Select department code"
            options={departments.map((dept) => ({ label: dept.departmentID ?? dept.code ?? dept.name, value: dept.code }))}
            loading={departments.length === 0}
          />
          {createForm.formState.errors.courseID && (
            <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.courseID.message)}</p>
          )}

          <CustomSelect
            control={createForm.control}
            name="semester"
            label="Semester"
            placeholder="Select semester"
            options={[
              { label: "First", value: "First" },
              { label: "Second", value: "Second" },
            ]}
          />
          {createForm.formState.errors.semester && (
            <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.semester.message)}</p>
          )}

          <CustomSelect
            control={createForm.control}
            name="department"
            label="Department"
            placeholder="Select department"
            options={departments.map((dept) => ({ label: dept.name, value: dept._id }))}
            loading={departments.length === 0}
          />
          {createForm.formState.errors.department && (
            <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.department.message)}</p>
          )}

          <CustomSelect
            control={createForm.control}
            name="unit"
            label="Unit (optional)"
            placeholder="Select unit"
            options={filteredUnits.map((u) => ({ label: u.name, value: u._id }))}
            loading={filteredUnits.length === 0 && createForm.getValues("department") !== ""}
          />
          {createForm.formState.errors.unit && (
            <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.unit.message)}</p>
          )}

          <CustomSelect
            control={createForm.control}
            name="academicYearId"
            label="Academic Year"
            placeholder="Select academic year"
            options={academicYears.map((year) => ({ label: year.name, value: year._id }))}
            loading={academicYears.length === 0}
          />
          {createForm.formState.errors.academicYearId && (
            <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.academicYearId.message)}</p>
          )}

          <CustomSelect
            control={createForm.control}
            name="lecturer"
            label="Course HOD"
            placeholder="Select HOD from selected department (optional)"
            options={hodOptions}
            loading={loadingTeachers}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                {...createForm.register("isActive")}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isActive" className="text-sm font-normal">Active (visible to students)</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="assignToClass"
                {...createForm.register("assignToClass")}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="assignToClass" className="text-sm font-normal">Assign to selected class after create</Label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={creatingCourse || updatingCourse}
          >
            {editingCourse
              ? updatingCourse
                ? "Updating..."
                : "Update Course"
              : creatingCourse
              ? "Creating..."
              : "Create Course"}
          </Button>
        </form>
      </Modal>

      {/* Create Subject Modal */}
      <Modal
        open={subjectModalOpen}
        setOpen={handleOpenSubjectModal}
        title={subjectCourse ? `Add Subject to ${subjectCourse.name}` : "Add Subject"}
        description="Add a new subject under the selected course."
      >
        <form onSubmit={subjectForm.handleSubmit(onCreateSubjectSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>Subject Name *</FieldLabel>
            <Input
              {...subjectForm.register("name")}
              placeholder="e.g., Cardiology Rotation"
            />
            {subjectForm.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1">{String(subjectForm.formState.errors.name.message)}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>Subject Code *</FieldLabel>
            <Input
              {...subjectForm.register("code")}
              placeholder="e.g., CARD-101"
            />
            {subjectForm.formState.errors.code && (
              <p className="text-xs text-red-500 mt-1">{String(subjectForm.formState.errors.code.message)}</p>
            )}
          </Field>

          <CustomSelect
            control={subjectForm.control}
            name="subjectID"
            label="Subject ID"
            placeholder="Select department subject ID"
            options={subjectIdOptions}
            loading={selectedSubjectDepartment === null && departments.length === 0}
          />
          {subjectForm.formState.errors.subjectID && (
            <p className="text-xs text-red-500 mt-1">{String(subjectForm.formState.errors.subjectID.message)}</p>
          )}

          <CustomSelect
            control={subjectForm.control}
            name="unit"
            label="Unit"
            placeholder="Select unit (optional)"
            options={units.map((u) => ({ label: u.name, value: u._id }))}
            loading={units.length === 0}
          />

          <CustomSelect
            control={subjectForm.control}
            name="lecturer"
            label="Subject Lecturer"
            placeholder="Select a teacher from course department (optional)"
            options={subjectTeacherOptions}
            loading={loadingTeachers}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="subjectIsActive"
              {...subjectForm.register("isActive")}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="subjectIsActive" className="text-sm font-normal">Active</Label>
          </div>

          <Button type="submit" className="w-full" disabled={updatingCourse}
          >
            {updatingCourse ? "Saving..." : "Create Subject"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

