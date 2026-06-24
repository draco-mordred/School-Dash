import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Search as SearchIcon, PlusCircle, RefreshCw, Wand2, Pencil } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Class, courses, user } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Modal from "@/components/global/Modal";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";
import { CustomSelect } from "@/components/global/CustomSelect";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

interface Course {
  _id: string;
  name: string;
  code: string;
  subjects: Subject[];
  // Add other relevant course properties
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  // Add other relevant subject properties
}

type LoadingState = "idle" | "loading" | "error";

// Schema for assigning courses to a class
const addCoursesSchema = z.object({
  courseIds: z.array(z.string()).min(1, "Select at least one course"),
});
type AddCoursesFormValues = z.infer<typeof addCoursesSchema>;

// Schema for creating a new course subject
const createCourseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  code: z.string().min(1, "Course code is required"),
  courseID: z.string().min(1, "Course ID (group) is required"),
  department: z.string().min(1, "Department is required"),
  unit: z.string().min(1, "Unit is required"),
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

export default function Courses() {
  const { user } = useAuth();
  const isAdminOrTeacher = user?.role === "admin" || user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");

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
  const [teachers, setTeachers] = useState<{ _id: string; name: string; email?: string }[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [departments, setDepartments] = useState<{ _id: string; name: string; departmentID: string }[]>([]);
  const [units, setUnits] = useState<{ _id: string; name: string; unitID: string; department: string | { _id?: string } }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ _id: string; name: string }[]>([]);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectCourse, setSubjectCourse] = useState<{ id: string; name: string } | null>(null);

  const form = useForm<AddCoursesFormValues>({
    resolver: zodResolver(addCoursesSchema),
    defaultValues: { courseIds: [] },
  });

  const createForm = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      name: "",
      code: "",
      courseID: "",
      department: "",
      unit: "",
      academicYearId: "",
      lecturer: "",
      isActive: true,
      assignToClass: true,
    },
  });

  const subjectForm = useForm<CreateSubjectFormValues>({
    resolver: zodResolver(createSubjectSchema),
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

  const fetchTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const { data } = await api.get("/users?page=1&limit=500");
      const allUsers: user[] = data.users ?? [];
      setTeachers(allUsers.filter((u) => u.role === "teacher" || u.role === "admin").map((u) => ({ _id: u._id, name: u.name, email: u.email })));
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
        department?: { _id: string };
        unit?: { _id: string };
        academicYear?: { _id: string };
      };
      createForm.reset({
        name: course.name ?? "",
        code: course.code ?? "",
        courseID: course.courseID ?? "",
        department: resolveReferenceId(courseWithRefs.department),
        unit: resolveReferenceId(courseWithRefs.unit),
        academicYearId: resolveReferenceId(courseWithRefs.academicYear),
        lecturer: lecturerId,
        isActive: course.isActive ?? true,
        assignToClass: Boolean(selectedClass),
      });
      void fetchTeachers();
      void fetchCourseMeta();
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
        unit: values.unit,
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

  const handleOpenSubjectModal = (open: boolean, course?: { id: string; name: string }) => {
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
        subjectID: "",
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
          {isAdminOrTeacher && (
            <Button variant="default" size="sm" onClick={() => handleOpenCreateCourse(true)}>
              <PlusCircle className="mr-1 h-4 w-4" />
              New Course
            </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAddCourse(true)}
                >
                  <PlusCircle className="mr-1 h-4 w-4" />
                  Add
                </Button>
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

                return (
                  <div key={c._id} className="border rounded-md p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{c.name}</div>
                      <div className="flex items-center gap-1">
                        {(user?.role === "admin" || user?.role === "teacher") && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditCourse(true, c)}
                            className="text-muted-foreground hover:text-primary p-1 rounded shrink-0"
                            title="Edit course"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(user?.role === "admin" || user?.role === "teacher") && (
                          <button
                            type="button"
                            onClick={() => handleOpenSubjectModal(true, { id: c._id ?? "", name: c.name ?? "Course" })}
                            className="text-muted-foreground hover:text-primary p-1 rounded shrink-0"
                            title="Add subject to course"
                          >
                            +
                          </button>
                        )}
                        {(user?.role === "admin" || user?.role === "teacher") && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                // No dedicated backend endpoint exists for deleting a single course from a class.
                                // Remove it by updating the class's `courses` array.
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
                            {/* using simple text icon to avoid importing more icons */}
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{c.code}</div>
                    {displayLecturers && (
                      <div className="text-xs text-muted-foreground mt-1">👤 {displayLecturers}</div>
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
                  placeholder="Select courses..."
                  options={allCourses.map((c) => ({ label: c.name, value: c._id }))}
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
              placeholder="e.g., PED-401"
            />
            {createForm.formState.errors.code && (
              <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.code.message)}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>Course Group ID *</FieldLabel>
            <Input
              {...createForm.register("courseID")}
              placeholder="e.g., PED (grouping for Pediatrics)"
            />
            {createForm.formState.errors.courseID && (
              <p className="text-xs text-red-500 mt-1">{String(createForm.formState.errors.courseID.message)}</p>
            )}
          </Field>

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
            label="Unit"
            placeholder="Select unit"
            options={units.map((u) => ({ label: u.name, value: u._id }))}
            loading={units.length === 0}
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
            label="Lecturer / Teacher"
            placeholder="Select a teacher (optional)"
            options={teachers.map((t) => ({ label: t.name, value: t._id }))}
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

          <Field>
            <FieldLabel>Subject ID *</FieldLabel>
            <Input
              {...subjectForm.register("subjectID")}
              placeholder="e.g., CARD001"
            />
            {subjectForm.formState.errors.subjectID && (
              <p className="text-xs text-red-500 mt-1">{String(subjectForm.formState.errors.subjectID.message)}</p>
            )}
          </Field>

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
            label="Lecturer / Teacher"
            placeholder="Select a teacher (optional)"
            options={teachers.map((t) => ({ label: t.name, value: t._id }))}
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

