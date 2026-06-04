import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import type { Class, pagination } from "@/types";
import Search from "@/components/global/Search";
import CustomAlert from "@/components/global/CustomAlert";
import ClassTable from "@/components/classes/ClassTable";
import ClassForm from "@/components/classes/ClassForm";

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
  const fetchClasses = async () => {
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
        setClasses(data.classes);
        setTotalPages(data.pagination.pages);
      } else {
        setClasses([]);
      }
    } catch (error) {
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when Page or Search changes
  useEffect(() => {
    fetchClasses();
  }, [pageNum, debouncedSearch]);

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

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/classes/delete/${deleteId}`);
      toast.success("Class deleted successfully");
      fetchClasses(); // to refresh the list
    } catch (error: any) {
      toast.error("Failed to delete class");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
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
        </div>
      </div>
      {/* table */}
      <ClassTable
        data={classes}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
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
    </div>
  );
};

export default Classes;
