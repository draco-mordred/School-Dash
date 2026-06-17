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
  code: z.string().min(1, "Course code is required"),
  courseID: z.string().min(1, "Course ID (group) is required"),
  lecturer: z.string().optional(),
  isActive: z.boolean().default(true),
});
type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

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

  const form = useForm<AddCoursesFormValues>({
    resolver: zodResolver(addCoursesSchema),
    defaultValues: { courseIds: [] },
  });

  const createForm = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: { name: "", code: "", courseID: "", isActive: true },
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
      const { data } = await api.get("/courses?page=1&limit=500");
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
    createForm.reset({ name: "", code: "", courseID: "", lecturer: "", isActive: true });
    void fetchTeachers();
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
      createForm.reset({
        name: course.name ?? "",
        code: course.code ?? "",
        courseID: course.courseID ?? "",
        lecturer: lecturerId,
        isActive: course.isActive ?? true,
      });
      void fetchTeachers();
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
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to update course");
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
        lecturer: values.lecturer ? [values.lecturer] : [],
        isActive: values.isActive,
      };
      await api.post("/courses/create", payload);
      toast.success(`Course "${values.name}" created successfully`);
      setCreateCourseOpen(false);
      void fetchAllCourses();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to create course");
    } finally {
      setCreatingCourse(false);
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
                      const lecturerArr: unknown[] = Array.isArray(c.lecturer) ? c.lecturer : [];
                      const teacherNames = lecturerArr
                        .map((t: any) => (typeof t === "object" && t !== null ? (t as { name?: string }).name : undefined))
                        .filter(Boolean) as string[];
                      const displayLecturers = teacherNames.length > 0
                        ? teacherNames.join(", ")
                        : lecturerArr.length > 0
                        ? `${lecturerArr.length} lecturer${lecturerArr.length !== 1 ? "s" : ""}`
                        : undefined;
                      return (
                        <div key={c._id} className="border rounded-md p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium">{c.name}</div>
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
            render={({ field }) => (
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
            name="lecturer"
            label="Lecturer / Teacher"
            placeholder="Select a teacher (optional)"
            options={teachers.map((t) => ({ label: t.name, value: t._id }))}
            loading={loadingTeachers}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              {...createForm.register("isActive")}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isActive" className="text-sm font-normal">Active (visible to students)</Label>
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
    </div>
  );
}
