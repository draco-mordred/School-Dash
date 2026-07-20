import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Edit3, Loader2, Plus, Trash2, Users } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Class, pagination } from "@/types";
import Search from "@/components/global/Search";
import CustomAlert from "@/components/global/CustomAlert";
import Modal from "@/components/global/Modal";
import CustomPagination from "@/components/global/CustomPagination";
import ClassForm from "@/components/classes/ClassForm";
import { SidebarTrigger } from "@/components/ui/sidebar";

const Classes = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNum(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "12");
      if (debouncedSearch) params.append("search", debouncedSearch);

      const { data } = (await api.get(`/classes?${params.toString()}`)) as {
        data: { classes: Class[]; pagination: pagination };
      };

      if (data.classes) {
        const normalized: Class[] = data.classes.map((cls) => {
          const typed = cls as Class & {
            subjects?: unknown;
            courses?: unknown;
          };

          const maybeSubjects = typed.subjects;
          const maybeCourses = typed.courses;
          const subjects =
            Array.isArray(maybeSubjects) && maybeSubjects.length > 0
              ? maybeSubjects
              : maybeCourses;

          return {
            ...cls,
            subjects: Array.isArray(subjects) ? (subjects as unknown[] as Class["subjects"]) : [],
          } as Class;
        });
        setClasses(normalized);
        setTotalPages(data.pagination.pages);
      } else {
        setClasses([]);
      }
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [pageNum, debouncedSearch]);

  useEffect(() => {
    void fetchClasses();
  }, [fetchClasses]);

  const handleCreate = () => {
    setEditingClass(null);
    setIsFormOpen(true);
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  const handleViewStudents = async (cls: Class) => {
    if (Array.isArray(cls.students) && cls.students.length > 0 && typeof cls.students[0] === "object") {
      setStudentsList(cls.students as any[]);
      setStudentsModalOpen(true);
      return;
    }

    setStudentsLoading(true);
    setStudentsList([]);
    setStudentsModalOpen(true);
    try {
      try {
        const { data } = await api.get(`/classes/${cls._id}/students`);
        const students = data?.students ?? data;
        if (Array.isArray(students)) {
          setStudentsList(students);
          return;
        }
      } catch {
        // ignore and try users lookup
      }

      const usersRes = await api.get(`/users?classId=${cls._id}&limit=500`);
      const users = usersRes.data?.users ?? [];
      setStudentsList(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load students for this class");
    } finally {
      setStudentsLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/classes/delete/${deleteId}`);
      toast.success("Class deleted successfully");
      await fetchClasses();
    } catch {
      toast.error("Failed to delete class");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div id="page-classes" className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">Manage grades, sections, and teacher assignments with a richer card-driven view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Search search={search} setSearch={setSearch} title="Classes" />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Class
          </Button>
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading classes...</span>
            </div>
          ) : classes.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
              No classes match your search yet.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {classes.map((cls) => {
                const studentCount = Array.isArray(cls.students) ? cls.students.length : 0;
                const subjectCount = Array.isArray(cls.subjects) ? cls.subjects.length : 0;
                return (
                  <div
                    key={cls._id}
                    onMouseEnter={() => setHoveredClassId(cls._id)}
                    onMouseLeave={() => setHoveredClassId(null)}
                    className="relative overflow-hidden rounded-2xl border bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-sky-500 to-violet-500 opacity-80 transition duration-300 group-hover:animate-pulse" />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <h3 className="truncate font-semibold">{cls.name}</h3>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{cls.academicYear?.name ?? "No academic year"}</p>
                        </div>
                        <Badge className="bg-primary/10 text-primary">Active</Badge>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border bg-background/70 p-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Teacher</div>
                          <div className="mt-1 font-medium">{cls.classTeacher?.name ?? "Not assigned"}</div>
                        </div>
                        <div className="rounded-lg border bg-background/70 p-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Capacity</div>
                          <div className="mt-1 font-medium">{cls.capacity ?? "—"}</div>
                        </div>
                        <div className="rounded-lg border bg-background/70 p-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Students</div>
                          <div className="mt-1 font-medium">{studentCount}</div>
                        </div>
                        <div className="rounded-lg border bg-background/70 p-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Subjects</div>
                          <div className="mt-1 font-medium">{subjectCount}</div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Badge variant="secondary">{studentCount} students</Badge>
                        <Badge variant="outline">{subjectCount} subjects</Badge>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        {/* <p className="text-xs text-muted-foreground">Hover to reveal details and actions.</p> */}
                        <div
                          className={
                            "flex gap-2 transition-all duration-300 " +
                            (hoveredClassId === cls._id ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")
                          }
                        >
                          <Button size="sm" variant="outline" onClick={() => handleViewStudents(cls)}>
                            <Users className="mr-1 h-4 w-4" /> Students
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(cls)}>
                            <Edit3 className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(cls._id)}>
                            <Trash2 className="mr-1 h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6">
              <CustomPagination loading={loading} page={pageNum} setPage={setPageNum} totalPages={totalPages} />
            </div>
          )}
        </CardContent>
      </Card>

      <ClassForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingClass}
        onSuccess={fetchClasses}
      />
      <CustomAlert
        handleDelete={confirmDelete}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Class"
        description="Are you sure you want to delete this class? This action cannot be undone."
      />
      <Modal
        open={studentsModalOpen}
        setOpen={setStudentsModalOpen}
        title="Class Students"
        description="List of students in this class"
      >
        <div className="space-y-2">
          {studentsLoading ? (
            <div className="h-24 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : studentsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found for this class.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {studentsList.map((s) => (
                <div key={s._id ?? s.id ?? Math.random()} className="rounded-md border p-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {s.idNumber ?? "N/A"}</div>
                  <div className="text-xs text-muted-foreground">{s.email ?? ""}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Classes;
