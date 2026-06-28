import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Search from "@/components/global/Search";
import CustomAlert from "@/components/global/CustomAlert";
import type { pagination, courses } from "@/types";
import { SubjectTable } from "@/components/subjects/SubjectTable";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Subjects = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<courses[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Search & Pagination State ---
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- Dialog States ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<courses | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 1. Handle Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNum(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // 2. Fetch Subjects
  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);

      // Construct Query Params
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "10");
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (isStudent && studentClassId) {
        params.append("class", studentClassId);
      }

      const { data } = (await api.get(`/courses?${params.toString()}`)) as {
        data: { courses: courses[]; pagination: pagination };
      };

      // Handle response structure { courses: [], pagination: {} }
      if (data?.courses) {
        setSubjects(data.courses);
        setTotalPages(data.pagination.pages);
      } else {
        setSubjects([]);
      }
    } catch {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, [pageNum, debouncedSearch]);

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

  // Trigger fetch when Page or Search changes
  useEffect(() => {
    const loadSubjects = async () => {
      await fetchSubjects();
    };

    void loadSubjects();
  }, [fetchSubjects]);

  const handleCreate = () => {
    setEditingSubject(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: courses) => {
    setEditingSubject(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/courses/delete/${deleteId}`);
      toast.success("Subject deleted successfully"); 
      fetchSubjects();
    } catch {
      toast.error("Failed to delete subject");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };
  return (
    <div id="page-subjects" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage curriculum subjects and codes.
          </p>
        </div>
        <div className="flex gap-3">
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
      {/* table */}
      <SubjectTable
        data={subjects}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        showActions={!isStudent}
        page={pageNum}
        setPage={setPageNum}
        totalPages={totalPages}
      />
      {/* form */}
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
