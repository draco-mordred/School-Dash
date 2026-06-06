import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { pagination, user, UserRole } from "@/types";
import CustomAlert from "@/components/global/CustomAlert";
import Search from "@/components/global/Search";
import { useAuth } from "@/hooks/useAuth";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import UserTable from "@/components/users/UserTable";
import UserDialog from "@/components/users/UserDialog";

interface Props {
  role: UserRole;
  title: string;
  description: string;
}
export default function UserManagementPage({
  role,
  title,
  description,
}: Props) {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<user[]>([]);
  const [currentParent, setCurrentParent] = useState<user | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [studentIdEntry, setStudentIdEntry] = useState("");
  const [isParentActionLoading, setIsParentActionLoading] = useState(false);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<user | null>(null);

  // Delete States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Handle Debounce (Wait 500ms after typing stops)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      if (authUser?.role === "parent" && role === "parent") {
        const { data } = await api.get("/users/profile");
        const parentUser = data.user as user;
        setCurrentParent(parentUser);
        setUsers(parentUser ? [parentUser] : []);
        setTotalPages(1);
        return;
      }

      // Construct Query
      const searchParam = debouncedSearch ? `&search=${debouncedSearch}` : "";
      const roleParam = `&role=${role}`;
      const { data } = (await api.get(
         `/users?page=${page}&limit=50${roleParam}${searchParam}`
      )) as { data: { users: user[]; pagination: pagination } };
      // Handle response based on your new controller structure
      if (data.users) {
        setUsers(data.users);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        setUsers([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.log(error);
      toast.error(`Failed to load ${role}s`);
    } finally {
      setLoading(false);
    }
  }, [role, page, debouncedSearch, authUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const parentChildren = currentParent?.parentStudents ?? [];

  const handleAddStudent = async () => {
    if (!currentParent) {
      toast.error("Unable to resolve parent profile.");
      return;
    }

    const idNumber = studentIdEntry.trim();
    if (!idNumber) {
      toast.error("Enter a student ID number.");
      return;
    }

    try {
      setIsParentActionLoading(true);
      const { data } = await api.get(`/users?role=student&search=${idNumber}`);
      const student = (data.users as user[]).find((item) => item.idNumber === idNumber);
      if (!student) {
        toast.error("Student with that ID number was not found.");
        return;
      }

      const existingIds = parentChildren.map((child) =>
        typeof child === "string" ? child : child._id
      );
      if (existingIds.includes(student._id)) {
        toast.error("This student is already added to your children list.");
        return;
      }

      await api.patch(`/users/update/${currentParent._id}`, {
        parentStudents: [...existingIds, student._id],
      });
      toast.success("Student added successfully.");
      setStudentIdEntry("");
      fetchUsers();
    } catch (error) {
      console.log(error);
      toast.error("Failed to add student by ID number.");
    } finally {
      setIsParentActionLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/users/delete/${deleteId}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
      console.log(error);
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Search search={search} setSearch={setSearch} title={`${role}s`} />
          {authUser?.role !== "parent" && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add{" "}
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Button>
          )}
        </div>
      </div>

      {authUser?.role === "parent" && role === "parent" && (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Student to Your Children</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use a valid student ID number to add a child to your parent profile.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Student ID Number
                </label>
                <Input
                  value={studentIdEntry}
                  placeholder="UJ0000ST0001"
                  onChange={(event) => setStudentIdEntry(event.target.value)}
                />
              </div>
              <Button
                onClick={handleAddStudent}
                disabled={isParentActionLoading}
                className="w-full"
              >
                {isParentActionLoading ? "Adding…" : "Add Student"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">My Students</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {parentChildren.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No students added yet. Use the student ID form to connect a child.
                </p>
              ) : (
                <div className="space-y-3">
                  {parentChildren.map((child) => {
                    const childUser = typeof child === "string" ? null : child;
                    return (
                      <div key={childUser?._id ?? child} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="font-medium">{childUser?.name ?? "Student"}</p>
                        <p className="text-sm text-muted-foreground">{childUser?.email}</p>
                        <p className="text-sm text-muted-foreground">ID: {childUser?.idNumber ?? "N/A"}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* table */}
      <UserTable
        role={role}
        loading={loading}
        setDeleteId={setDeleteId}
        setIsDeleteOpen={setIsDeleteOpen}
        setEditingUser={setEditingUser}
        setIsFormOpen={setIsFormOpen}
        users={users}
        setPageNum={setPage}
        pageNum={page}
        totalPages={totalPages}
        showDeleteAction={!(authUser?.role === "parent" && role === "parent")}
      />
      {/* create/update */}
      <UserDialog
        editingUser={editingUser}
        role={role}
        open={isFormOpen}
        setOpen={setIsFormOpen}
        onSuccess={fetchUsers}
      />

      {/* alert */}
      <CustomAlert
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        handleDelete={handleDelete}
        title="Delete User?"
        description="This will permanently delete this user from the system."
      />
    </div>
  );
}
