import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Plus, Sparkles, ArrowDownAZ, ArrowUpZA, Loader2, Filter } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Search from "@/components/global/Search";
import CustomAlert from "@/components/global/CustomAlert";
import CustomPagination from "@/components/global/CustomPagination";
import type { pagination, courses } from "@/types";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface SubjectItem extends courses {
  teacher?: Array<{ _id: string; name: string; email?: string }>;
  course?: { _id: string; name: string; code?: string };
  department?: { _id: string; name: string; code?: string } | null;
}

interface ClassOption {
  _id: string;
  name: string;
  academicYear?: { name?: string } | null;
}

export const Subjects = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [hoveredSubjectId, setHoveredSubjectId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);

  const isStudent = user?.role === "student";

  const studentClassId = useMemo(() => {
    const currentClass = user?.studentClasses;
    if (!currentClass) return null;
    if (typeof currentClass === "string") return currentClass;
    if (Array.isArray(currentClass)) {
      const first = currentClass[0];
      return typeof first === "string" ? first : first?._id ?? null;
    }
    return typeof currentClass === "object" ? currentClass._id ?? null : null;
  }, [user?.studentClasses]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNum(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoadingClasses(true);
      const { data } = await api.get(`/classes?limit=200`);
      const classList = Array.isArray(data?.classes) ? data.classes : [];
      setClasses(classList);
      if (isStudent && studentClassId && selectedClassId === "all") {
        setSelectedClassId(studentClassId);
      }
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setLoadingClasses(false);
    }
  }, [isStudent, selectedClassId, studentClassId]);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "100");
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedClassId && selectedClassId !== "all") {
        params.append("class", selectedClassId);
      }

      const { data } = (await api.get(`/courses?${params.toString()}`)) as {
        data: { courses: SubjectItem[]; pagination: pagination };
      };

      setSubjects(Array.isArray(data?.courses) ? data.courses : []);
      setTotalPages(data?.pagination?.pages ?? 1);
    } catch {
      toast.error("Failed to load subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pageNum, selectedClassId]);

  useEffect(() => {
    void fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (isStudent && studentClassId && selectedClassId === "all") {
      setSelectedClassId(studentClassId);
    }
  }, [isStudent, studentClassId, selectedClassId]);

  const groupedSubjects = useMemo(() => {
    const grouped = new Map<string, SubjectItem[]>();
    subjects.forEach((subject) => {
      const courseKey = subject.course?.name ?? subject.department?.name ?? "Unassigned Course";
      const existing = grouped.get(courseKey) ?? [];
      existing.push(subject);
      grouped.set(courseKey, existing);
    });

    return Array.from(grouped.entries())
      .map(([courseName, items]) => ({
        courseName,
        courseCode: items[0]?.course?.code ?? items[0]?.department?.code ?? "",
        items: [...items].sort((a, b) => {
          const comparison = (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" });
          return sortOrder === "asc" ? comparison : -comparison;
        }),
      }))
      .sort((a, b) => {
        const comparison = a.courseName.localeCompare(b.courseName, undefined, { sensitivity: "base" });
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [sortOrder, subjects]);

  const handleCreate = () => {
    setEditingSubject(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: SubjectItem) => {
    setEditingSubject(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string, courseId?: string) => {
    setDeleteId(id);
    setDeleteCourseId(courseId ?? null);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteCourseId) return;
    try {
      await api.delete(`/courses/${deleteCourseId}/subjects/${deleteId}`);
      toast.success("Subject deleted successfully");
      await fetchSubjects();
    } catch {
      toast.error("Failed to delete subject");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
      setDeleteCourseId(null);
    }
  };

  return (
    <div id="page-subjects" className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">Browse subjects by class, grouped under each course with rich details.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Search search={search} setSearch={setSearch} title="Subject" />
          {!isStudent && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Create Subject
            </Button>
          )}
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-transparent to-transparent">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" /> Subject Explorer
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Filter by class and sort each course collection alphabetically.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-[190px] border-0 bg-transparent p-0 shadow-none focus:ring-0">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {!loadingClasses && classes.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
                  <SelectTrigger className="w-[150px] border-0 bg-transparent p-0 shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">
                      <span className="flex items-center gap-2"><ArrowDownAZ className="h-4 w-4" /> A - Z</span>
                    </SelectItem>
                    <SelectItem value="desc">
                      <span className="flex items-center gap-2"><ArrowUpZA className="h-4 w-4" /> Z - A</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading subjects...</span>
            </div>
          ) : groupedSubjects.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
              No subjects match this class and search yet.
            </div>
          ) : (
            <div className="space-y-5">
              {groupedSubjects.map((group) => (
                <div key={`${group.courseName}-${group.courseCode}`} className="rounded-2xl border bg-background/70 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{group.courseName}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{group.courseCode || "No course code"} • {group.items.length} subject{group.items.length === 1 ? "" : "s"}</p>
                    </div>
                    <Badge variant="outline">{group.courseCode || "Course"}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((item) => (
                      <div
                        key={item._id}
                        onMouseEnter={() => setHoveredSubjectId(item._id)}
                        onMouseLeave={() => setHoveredSubjectId(null)}
                        className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-primary/5 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                      >
                          <div className={"absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-sky-500 to-violet-500 opacity-80 transition duration-300 " + (hoveredSubjectId === item._id ? "animate-pulse" : "")} />
                        <div className="relative space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{item.name}</div>
                              <div className="mt-1 font-mono text-xs text-muted-foreground">{item.code || "No code"}</div>
                            </div>
                            <Badge className={item.isActive ? "bg-emerald-500/10 text-emerald-700" : "bg-slate-500/10 text-slate-700"}>
                              {item.isActive ? "Active" : "Archived"}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">Course: {item.course?.name || "—"}</Badge>
                            <Badge variant="outline">{item.department?.name || "Department"}</Badge>
                          </div>

                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-2">
                              <span>Teachers</span>
                              <span>{item.teacher?.length ? `${item.teacher.length}` : "0"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>Status</span>
                              <span>{item.isActive ? "Visible in schedules" : "Hidden"}</span>
                            </div>
                          </div>

                          {!isStudent && (
                            <div className={"flex items-center justify-end gap-2 transition duration-300 " + (hoveredSubjectId === item._id ? "opacity-100" : "opacity-0") }>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(item._id, item.course?._id)}>
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6">
              <CustomPagination loading={loading} page={pageNum} setPage={setPageNum} totalPages={totalPages} />
            </div>
          )}
        </CardContent>
      </Card>

      <SubjectForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingSubject}
        onSuccess={fetchSubjects}
      />
      <CustomAlert
        handleDelete={confirmDelete}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? This action cannot be undone."
      />
    </div>
  );
};
