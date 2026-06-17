import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react"; 

import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import type { Class, pagination } from "@/types";
import Search from "@/components/global/Search";
import CustomAlert from "@/components/global/CustomAlert";
import Modal from "@/components/global/Modal";
import ClassTable from "@/components/classes/ClassTable";
import ClassForm from "@/components/classes/ClassForm";
import { SidebarTrigger } from "@/components/ui/sidebar";

const Classes = () => {
  // it's the same as users/academics-year components
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  // Delete Alert States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNum(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);
 
  // 2. Fetch Classes
  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);

      // Construct Query Params
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "10");
      if (debouncedSearch) params.append("search", debouncedSearch);

      const { data } = (await api.get(`/classes?${params.toString()}`)) as {
        data: { classes: Class[]; pagination: pagination };
      };

      // Handle response structure { classes: [], pagination: {} }
      if (data.classes) {
        // Backend populates `courses` (populated Course docs), while ClassForm expects `subjects`.
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

  // Trigger fetch when Page or Search changes 
  useEffect(() => {
    const loadClasses = async () => {
      await fetchClasses();
    };

    void loadClasses();
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

  // Students modal
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  const handleViewStudents = async (cls: Class) => {
    // If students are already populated as objects, use them
    if (Array.isArray(cls.students) && cls.students.length > 0 && typeof cls.students[0] === 'object') {
      setStudentsList(cls.students as any[]);
      setStudentsModalOpen(true);
      return;
    }

    setStudentsLoading(true);
    setStudentsList([]);
    setStudentsModalOpen(true);
    try {
      // Try class-specific endpoint first
      try {
        const { data } = await api.get(`/classes/${cls._id}/students`);
        const students = data?.students ?? data;
        if (Array.isArray(students)) {
          setStudentsList(students);
          return;
        }
      } catch (err) {
        // ignore and try users lookup
      }

      // Fallback to users endpoint filtered by class id
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
      fetchClasses(); // to refresh the list
    } catch {
      toast.error("Failed to delete class"); 
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div id="page-classes" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Manage grades, sections, and teacher assignments.
          </p>
        </div>
        <div className="flex gap-2">
          <Search search={search} setSearch={setSearch} title="Classes" />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Class
          </Button>
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
        </div>
      </div>
      {/* table */}
      <ClassTable
        data={classes}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onViewStudents={handleViewStudents}
        page={pageNum}
        setPage={setPageNum}
        totalPages={totalPages}
      />
      {/* form */}
      <ClassForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingClass}
        onSuccess={fetchClasses}
      />
      {/* alert */}
      <CustomAlert
        handleDelete={confirmDelete}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Class"
        description="Are you sure you want to delete this class? This action cannot be undone."
      />
      {/* Students Modal */}
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
                <div key={s._id ?? s.id ?? Math.random()} className="border rounded-md p-3">
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
