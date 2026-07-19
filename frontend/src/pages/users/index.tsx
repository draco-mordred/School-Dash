import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { pagination, user, UserRole } from "@/types";
import CustomAlert from "@/components/global/CustomAlert";
import Search from "@/components/global/Search";
import { useAuth } from "@/hooks/useAuth";
import { StudentsList, type Student } from "@/components/admin/users/StudentsList";
import { UsersList } from "@/components/admin/users/UsersList";
import { UserOverviewCards } from "@/components/admin/users/UserOverviewCards";
import { useUserManagement } from "@/hooks/useUserManagement";
import UniversalUserForm from "@/components/auth/UniversalUserForm";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Upload, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import UserTable from "@/components/users/UserTable";
import UserDialog from "@/components/users/UserDialog";
import UserDetailsDialog from "@/components/users/UserDetailsDialog";
import BulkUploadDialog from "@/components/users/BulkUploadDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { data: adminData, loading: adminLoading, error: adminError } = useUserManagement();
  const adminUsers = adminData;

  // Admin user management
  const [activeTab, setActiveTab] = useState("students");
  
  // Regular user management
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
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [isCreatePanelVisible, setIsCreatePanelVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<user | null>(null);
  const [viewingUser, setViewingUser] = useState<user | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Delete States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Bulk Upload States
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

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

  useEffect(() => {
    if (isCreatePanelOpen) {
      setIsCreatePanelVisible(true);
      return;
    }

    const timer = window.setTimeout(() => setIsCreatePanelVisible(false), 180);
    return () => window.clearTimeout(timer);
  }, [isCreatePanelOpen]);

  const roleLabelMap: Record<string, string> = {
    student: "Student",
    parent: "Parent",
    teacher: "Teacher",
    admin: "Admin",
    unitconsultant: "Unit Consultant",
    unitresident: "Unit Resident",
    user: "User",
  };

  const getRoleLabel = (value: string) => roleLabelMap[value] ?? value.charAt(0).toUpperCase() + value.slice(1);

  const handleBulkDelete = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await Promise.all(ids.map((id) => api.delete(`/users/delete/${id}`)));
      toast.success(`Deleted ${ids.length} users`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete selected users");
    }
  };

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

      const parentId = currentParent?._id ?? currentParent?.id ?? undefined;
      await api.patch(`/users/update/${parentId}`, {
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
    setIsFormOpen(false);
    setIsCreatePanelOpen((open) => !open);
  };

  const handleCreateSuccess = () => {
    setIsCreatePanelOpen(false);
    void fetchUsers();
  };

  const resolveUserMatch = (userId: string) => {
    const normalizedId = userId?.trim();
    const sourceUsers = [
      ...users,
      ...(adminUsers?.students ?? []),
      ...(adminUsers?.parents ?? []),
      ...(adminUsers?.staff ?? []),
      ...(adminUsers?.administrators ?? []),
    ];

    return (
      sourceUsers.find((entry) => (entry._id ?? entry.id) === normalizedId) ||
      null
    );
  };

  const handleViewUser = (userId: string) => {
    const match = resolveUserMatch(userId);
    if (!match) return;
    setViewingUser(match);
    setIsDetailsOpen(true);
  };

  const handleEditUser = (userId: string) => {
    const match = resolveUserMatch(userId);
    if (!match) return;
    setEditingUser(match);
    setIsCreatePanelOpen(false);
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

  const mappedStudents = users.reduce<Student[]>((acc, user, index) => {
    const userId = (user as user & { _id?: string; id?: string })._id ?? (user as user & { _id?: string; id?: string }).id ?? "";
    const rowKey = userId || `${user.name}-${user.idNumber ?? "no-id"}-${user.email ?? "no-email"}-${index}`;

    if (acc.some((entry) => entry.id === userId || entry.rowKey === rowKey)) {
      return acc;
    }

    acc.push({
      id: userId,
      rowKey,
      name: user.name,
      matricNumber: user.idNumber ?? "—",
      class: typeof user.studentClasses === "object" && user.studentClasses !== null
        ? user.studentClasses.name
        : "Unassigned",
      currentPosting: undefined,
      attendancePercentage: 0,
      status: user?.role === "student" && user?.email ? "active" : "inactive",
      email: user.email,
      profileImage: user.profileImage,
    });

    return acc;
  }, []);

  return (
    <div id={`page-users-${role}`} className="p-6 space-y-6">
      {authUser?.role === "admin" && role === "student" && title === "Students" && (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground mt-2">
              Manage all students, their classes, and academic records.
            </p>
          </div>

          <StudentsList
            students={mappedStudents}
            loading={loading}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onBulkUpload={() => setIsBulkUploadOpen(true)}
            onCreateStudent={handleCreate}
            onViewStudent={handleViewUser}
            onEditStudent={handleEditUser}
            onDeleteStudent={(studentId) => {
              setDeleteId(studentId);
              setIsDeleteOpen(true);
            }}
            onBulkDeleteStudents={handleBulkDelete}
          />

          <BulkUploadDialog
            open={isBulkUploadOpen}
            setOpen={setIsBulkUploadOpen}
            role="student"
            onSuccess={fetchUsers}
          />

          <UserDialog
            editingUser={editingUser}
            role={role}
            open={isFormOpen}
            setOpen={setIsFormOpen}
            onSuccess={fetchUsers}
          />

          <UserDetailsDialog
            open={isDetailsOpen}
            setOpen={(open) => {
              setIsDetailsOpen(open);
              if (!open) setViewingUser(null);
            }}
            user={viewingUser}
          />

          <CustomAlert
            isOpen={isDeleteOpen}
            setIsOpen={setIsDeleteOpen}
            handleDelete={handleDelete}
            title="Delete User?"
            description="This will permanently delete this user from the system."
          />
        </>
      )}

      {/* ADMIN USER MANAGEMENT VIEW */}
      {authUser?.role === "admin" && role === "student" && title !== "Students" && (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage all users including students, parents, staff, and administrators
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add User
              </Button>
              {(isCreatePanelOpen || isCreatePanelVisible) && (
                <div className={`absolute right-0 top-full z-30 mt-3 w-[min(30rem,calc(100vw-2rem))] origin-top-right transition-all duration-200 ease-out ${isCreatePanelOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0"}`}>
                  <div className="absolute inset-0 -left-4 -right-4 -top-4 -bottom-4 rounded-[2rem] bg-background/25 backdrop-blur-xl" />
                  <div className="relative overflow-hidden rounded-[1.35rem] border border-border/70 bg-background/95 p-4 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl">
                    <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 border-l border-t border-border/70 bg-background/95" />
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Create User</p>
                        <p className="text-xs text-muted-foreground">Add a new account and assign role details.</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreatePanelOpen(false)}>
                        Close
                      </Button>
                    </div>
                    <UniversalUserForm type="create" onSuccess={handleCreateSuccess} singleColumn />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {adminError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{adminError}</AlertDescription>
            </Alert>
          )}

          {/* Overview Cards */}
          <UserOverviewCards stats={adminUsers.stats} loading={adminLoading} />

          {/* Users Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="students" className="relative">
                Students
                <Badge variant="secondary" className="ml-2">
                  {adminUsers.stats.students}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="parents" className="relative">
                Parents
                <Badge variant="secondary" className="ml-2">
                  {adminUsers.stats.parents}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="staff" className="relative">
                Staff
                <Badge variant="secondary" className="ml-2">
                  {adminUsers.stats.staff}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="admins" className="relative">
                Admins
                <Badge variant="secondary" className="ml-2">
                  {adminUsers.stats.administrators}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-4">
              <StudentsList
                students={adminUsers.students}
                loading={adminLoading}
                onViewStudent={handleViewUser}
                onEditStudent={handleEditUser}
                onDeleteStudent={(studentId) => {
                  setDeleteId(studentId);
                  setIsDeleteOpen(true);
                }}
                onBulkDeleteStudents={handleBulkDelete}
              />
            </TabsContent>

            {/* Parents Tab */}
            <TabsContent value="parents" className="space-y-4">
              <UsersList
                title="Parents Directory"
                users={adminUsers.parents}
                columns={[
                  {
                    key: "studentsCount",
                    label: "Students",
                    render: (user, value) => <span>{value}</span>,
                  },
                ]}
                loading={adminLoading}
                navigationPath="/users/parents"
                onViewUser={handleViewUser}
                onEditUser={handleEditUser}
                onDeleteUser={(userId) => {
                  setDeleteId(userId);
                  setIsDeleteOpen(true);
                }}
                onBulkDeleteUsers={handleBulkDelete}
              />
            </TabsContent>

            {/* Staff Tab */}
            <TabsContent value="staff" className="space-y-4">
              <UsersList
                title="Staff Directory"
                users={adminUsers.staff}
                columns={[
                  {
                    key: "department",
                    label: "Department",
                    render: (user, value) => <span>{value}</span>,
                  },
                  {
                    key: "roles",
                    label: "Roles",
                    render: (user, value) => (
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(value) && value.length > 0 ? (
                          value.map((role: string) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role.replace(/_/g, " ")}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No roles assigned</span>
                        )}
                      </div>
                    ),
                  },
                ]}
                loading={adminLoading}
                navigationPath="/users/staff"
                onViewUser={handleViewUser}
                onEditUser={handleEditUser}
                onDeleteUser={(userId) => {
                  setDeleteId(userId);
                  setIsDeleteOpen(true);
                }}
                onBulkDeleteUsers={handleBulkDelete}
              />
            </TabsContent>

            {/* Administrators Tab */}
            <TabsContent value="admins" className="space-y-4">
              <UsersList
                title="Administrators Directory"
                users={adminUsers.administrators}
                columns={[
                  {
                    key: "role",
                    label: "Role",
                    render: (user, value) => <Badge variant="secondary">{value}</Badge>,
                  },
                ]}
                loading={adminLoading}
                navigationPath="/users/admins"
                onViewUser={handleViewUser}
                onEditUser={handleEditUser}
                onDeleteUser={(userId) => {
                  setDeleteId(userId);
                  setIsDeleteOpen(true);
                }}
                onBulkDeleteUsers={handleBulkDelete}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* REGULAR USER MANAGEMENT VIEW */}
      {!(authUser?.role === "admin" && role === "student") && (
        <>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight capitalize">
                {title}
              </h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              <Search search={search} setSearch={setSearch} title={`${role}s`} />
              {authUser?.role === "admin" && (
                <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                </Button>
              )}
              {authUser?.role !== "parent" && (
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Add {getRoleLabel(role)}
                </Button>
              )}
              {(isCreatePanelOpen || isCreatePanelVisible) && (
                <div className={`absolute right-0 top-full z-30 mt-3 w-[min(30rem,calc(100vw-2rem))] origin-top-right transition-all duration-200 ease-out ${isCreatePanelOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0"}`}>
                  <div className="absolute inset-0 -left-4 -right-4 -top-4 -bottom-4 rounded-[2rem] bg-background/25 backdrop-blur-xl" />
                  <div className="relative overflow-hidden rounded-[1.35rem] border border-border/70 bg-background/95 p-4 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl">
                    <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 border-l border-t border-border/70 bg-background/95" />
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Create {getRoleLabel(role)}</p>
                        <p className="text-xs text-muted-foreground">Add a new account and assign role details.</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreatePanelOpen(false)}>
                        Close
                      </Button>
                    </div>
                    <UniversalUserForm type="create" role={role === "student" && title === "User Management" ? undefined : role} onSuccess={handleCreateSuccess} singleColumn />
                  </div>
                </div>
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
        onBulkDelete={handleBulkDelete}
        setPageNum={setPage}
        pageNum={page}
        totalPages={totalPages}
        showDeleteAction={!(authUser?.role === "parent" && role === "parent")}
        onViewUser={handleViewUser}
        onEditUser={handleEditUser}
      />
      {/* create/update */}
      <UserDialog
        editingUser={editingUser}
        role={role}
        open={isFormOpen}
        setOpen={setIsFormOpen}
        onSuccess={fetchUsers}
      />

      <UserDetailsDialog
        open={isDetailsOpen}
        setOpen={(open) => {
          setIsDetailsOpen(open);
          if (!open) setViewingUser(null);
        }}
        user={viewingUser}
      />

      {/* alert */}
      <CustomAlert
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        handleDelete={handleDelete}
        title="Delete User?"
        description="This will permanently delete this user from the system."
      />

      {/* bulk upload */}
      <BulkUploadDialog
        open={isBulkUploadOpen}
        setOpen={setIsBulkUploadOpen}
        role={role}
        onSuccess={fetchUsers}
      />
        </>
      )}
    </div>
  );
}
