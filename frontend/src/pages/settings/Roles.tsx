import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Search from "@/components/global/Search";
import UserDialog from "@/components/users/UserDialog";
import type { user, UserRole } from "@/types";
import { Pencil } from "lucide-react";

const roleOrder: UserRole[] = ["admin", "teacher", "student", "parent"];

function canEditUser(currentUser: user | null, targetUser: user) {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  if (currentUser.role === "teacher") return targetUser.role !== "admin";
  if (currentUser.role === "parent") {
    if (targetUser._id === currentUser._id) return true;
    const children = Array.isArray(currentUser.parentStudents)
      ? currentUser.parentStudents.map((child) => (typeof child === "string" ? child : child._id))
      : [];
    return children.includes(targetUser._id);
  }
  if (currentUser.role === "student") {
    return targetUser._id === currentUser._id;
  }
  return false;
}

export default function RolesPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<user[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<user | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users?page=1&limit=1000");
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to load roles and users", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const term = search.trim().toLowerCase();
    return users.filter((person) =>
      person.name.toLowerCase().includes(term) ||
      person.email.toLowerCase().includes(term) ||
      (person.idNumber ?? "").toLowerCase().includes(term)
    );
  }, [search, users]);

  const groupedByRole = useMemo(
    () =>
      roleOrder.map((role) => ({
        role,
        users: filteredUsers.filter((person) => person.role === role),
      })),
    [filteredUsers]
  );

  const handleEdit = (userToEdit: user) => {
    setSelectedUser(userToEdit);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            View all roles and manage users by permitted access levels.
          </p>
        </div>
        <Search search={search} setSearch={setSearch} title="Search users..." />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {groupedByRole.map((group) => (
          <Card key={group.role}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base capitalize">{group.role}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{group.users.length}</p>
              <p className="text-sm text-muted-foreground">
                {group.users.length === 1 ? "user" : "users"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByRole.map((group) => (
            <Card key={group.role}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base capitalize">{group.role}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {group.users.length} {group.users.length === 1 ? "user" : "users"}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {group.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users in this role.</p>
                ) : (
                  <div className="space-y-3">
                    {group.users.map((person) => (
                      <div
                        key={person._id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-muted-foreground">{person.email}</p>
                          <p className="text-sm text-muted-foreground">ID: {person.idNumber ?? "N/A"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canEditUser(authUser, person) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(person)}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Button>
                          ) : (
                            <Badge variant="secondary">Read only</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserDialog
        editingUser={selectedUser}
        role={selectedUser?.role ?? "student"}
        open={isDialogOpen}
        setOpen={setIsDialogOpen}
        onSuccess={() => {
          setIsDialogOpen(false);
          fetchUsers();
        }}
      />
    </div>
  );
}
