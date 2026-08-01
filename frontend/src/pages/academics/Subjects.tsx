import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Plus, Sparkles, ArrowDownAZ, ArrowUpZA, Loader2, Search } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import SubjectBulkUploadDialog from "@/components/subjects/SubjectBulkUploadDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

export const Subjects = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [hoveredSubjectId, setHoveredSubjectId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupSortSettings, setGroupSortSettings] = useState<Record<string, { sortBy: "name" | "date"; order: "asc" | "desc" }>>({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const isStudent = user?.role === "student";

  const isParent = user?.role === "parent";
  
    // <div className="flex items-center justify-between gap-2">
    //                             <span>Lecturer</span>
    //                             <span>{item.teacher?.length ? item.teacher.map((teacher) => teacher.name).join(", ") : "TBD"}</span>
    //                           </div>

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSearchOpen &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen]);


  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "100");
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (isStudent && studentClassId) {
        params.append("class", studentClassId);
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
  }, [debouncedSearch, pageNum, isStudent, studentClassId]);

  useEffect(() => {
    const loadSubjects = async () => {
      await fetchSubjects();
    };
    void loadSubjects();
  }, [fetchSubjects]);

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
        items: [...items],
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

  const isSubjectSelected = (id: string) => selectedSubjects.includes(id);

  const toggleSelectSubject = (id: string, checked: boolean) => {
    setSelectedSubjects((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, id]));
      }
      return prev.filter((entry) => entry !== id);
    });
  };

  const toggleSelectAllGroup = (items: SubjectItem[]) => {
    const itemIds = items.map((item) => item._id);
    const allSelected = itemIds.every((id) => selectedSubjects.includes(id));
    if (allSelected) {
      setSelectedSubjects((prev) => prev.filter((id) => !itemIds.includes(id)));
      return;
    }
    setSelectedSubjects((prev) => Array.from(new Set([...prev, ...itemIds])));
  };

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const confirmBulkDelete = async () => {
    const subjectsToDelete = selectedSubjects
      .map((subjectId) => subjects.find((item) => item._id === subjectId))
      .filter(Boolean) as SubjectItem[];

    if (subjectsToDelete.length === 0) {
      setIsBulkDeleteOpen(false);
      return;
    }

    const subjectsByCourse = subjectsToDelete.reduce((groups, subject) => {
      const courseId = subject.course?._id ?? "";
      if (!courseId) return groups;
      if (!groups[courseId]) groups[courseId] = [];
      groups[courseId].push(subject._id);
      return groups;
    }, {} as Record<string, string[]>);

    try {
      const results = await Promise.all(
        Object.entries(subjectsByCourse).map(([courseId, subjectIds]) =>
          api.delete(`/courses/${courseId}/subjects/bulk-delete`, {
            data: { subjectIds },
          }).then((response) => ({
            courseId,
            deleted: response.data?.deleted ?? 0,
            courseName: response.data?.courseName ?? courseId,
          })),
        ),
      );

      const totalDeleted = results.reduce((sum, result) => sum + result.deleted, 0);
      const courseCount = results.length;
      const courseMessage = courseCount > 1 ? ` across ${courseCount} courses` : "";

      toast.success(`Deleted ${totalDeleted} subject${totalDeleted === 1 ? "" : "s"}${courseMessage}`);
      setSelectedSubjects([]);
      await fetchSubjects();
    } catch {
      toast.error("Failed to delete selected subjects");
    } finally {
      setIsBulkDeleteOpen(false);
    }
  };

  return (
    <div id="page-subjects" className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">Subjects, grouped under each course.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc") }>
            <SelectTrigger className="h-10 w-[130px] border border-border bg-card text-sm shadow-sm focus:ring-0">
              <SelectValue placeholder="Courses" />
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
          {selectedSubjects.length > 0 && !isStudent && !isParent ? (
            <Button variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
              Delete {selectedSubjects.length} selected
            </Button>
          ) : null}
          {!isStudent && !isParent && (
            <>
              <Button variant="secondary" onClick={() => setIsBulkOpen(true)}>
                Import Roster
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </>
          )}
          <div className="relative" ref={searchContainerRef}>
            <button
              type="button"
              aria-label="Open search"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-slate-400 hover:text-foreground"
              onClick={() => setIsSearchOpen((open) => !open)}
              ref={searchButtonRef}
            >
              <Search className="h-4 w-4" />
            </button>
            {isSearchOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-[260px] rounded-2xl border border-border glassBg p-2 shadow-lg">
                <Input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search subjects..."
                  className="w-full"
                />
              </div>
            ) : null}
          </div>
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
              <p className="mt-1 text-sm text-muted-foreground">Sort course collection by course name.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs">Use the header controls to search and sort courses.</span>
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
              {groupedSubjects.map((group) => {
                const groupKey = `${group.courseName}-${group.courseCode}`;
                const groupSort = groupSortSettings[groupKey] ?? { sortBy: "name", order: "asc" };
                const sortedItems = [...group.items].sort((a, b) => {
                  if (groupSort.sortBy === "date") {
                    const aDate = String(a.date ?? "");
                    const bDate = String(b.date ?? "");
                    return groupSort.order === "asc"
                      ? aDate.localeCompare(bDate, undefined, { sensitivity: "base" })
                      : bDate.localeCompare(aDate, undefined, { sensitivity: "base" });
                  }
                  return groupSort.order === "asc"
                    ? String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" })
                    : String(b.name ?? "").localeCompare(String(a.name ?? ""), undefined, { sensitivity: "base" });
                });

                return (
                  <div key={`${group.courseName}-${group.courseCode}`} className="rounded-2xl border bg-background/70 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-3">
                        {!isStudent && !isParent && (
                          <Checkbox
                            checked={group.items.every((item) => selectedSubjects.includes(item._id))}
                            onCheckedChange={() => toggleSelectAllGroup(group.items)}
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold">{group.courseName}</h3>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{group.courseCode || "No course code"} • {group.items.length} subject{group.items.length === 1 ? "" : "s"}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={`${groupSort.sortBy}-${groupSort.order}`}
                          onValueChange={(value) => {
                            const [sortBy, order] = value.split("-") as ["name" | "date", "asc" | "desc"];
                            setGroupSortSettings((prev) => ({
                              ...prev,
                              [groupKey]: { sortBy, order },
                            }));
                          }}
                        >
                          <SelectTrigger className="w-[190px] border border-border bg-background/80 text-sm shadow-sm focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name-asc">Name ↑</SelectItem>
                            <SelectItem value="name-desc">Name ↓</SelectItem>
                            <SelectItem value="date-asc">Date ↑</SelectItem>
                            <SelectItem value="date-desc">Date ↓</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant="outline">{group.courseCode || "Course"}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {sortedItems.map((item) => (
                        <div
                          key={item._id}
                          onMouseEnter={() => setHoveredSubjectId(item._id)}
                          onMouseLeave={() => setHoveredSubjectId(null)}
                          className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-primary/5 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className={"absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-sky-500 to-violet-500 opacity-80 transition duration-300 " + (hoveredSubjectId === item._id ? "animate-pulse" : "")} />
                          {!isStudent && !isParent && (
                            <div className="absolute right-3 top-3 z-10">
                              <Checkbox
                                checked={isSubjectSelected(item._id)}
                                onCheckedChange={(value) => toggleSelectSubject(item._id, Boolean(value))}
                              />
                            </div>
                          )}
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
                                <span>Lecturer</span>
                                <span>{item.teacher?.length ? item.teacher.map((teacher) => teacher.name).join(", ") : "TBD"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span>Status</span>
                                <span>{item.isActive ? "Visible in schedules" : "Hidden"}</span>
                              </div>
                            </div>

                            {!isStudent && !isParent && (
                              <div className={"flex items-center justify-end gap-2 transition duration-300 " + (hoveredSubjectId === item._id ? "opacity-100" : "opacity-0")}>
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

      <SubjectForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingSubject}
        onSuccess={fetchSubjects}
      />
      <SubjectBulkUploadDialog
        open={isBulkOpen}
        setOpen={setIsBulkOpen}
        onSuccess={fetchSubjects}
      />
      <CustomAlert
        handleDelete={confirmDelete}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? This action cannot be undone."
      />
      <CustomAlert
        handleDelete={confirmBulkDelete}
        isOpen={isBulkDeleteOpen}
        setIsOpen={setIsBulkDeleteOpen}
        title="Delete selected subjects"
        description={`Are you sure you want to delete ${selectedSubjects.length} subject${selectedSubjects.length === 1 ? "" : "s"}? This action cannot be undone.`}
      />
    </div>
  );
};
