import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Search from "@/components/global/Search";
import UserDialog from "@/components/users/UserDialog";
import type { user, UserRole } from "@/types";
import { Pencil, Plus, ChevronDown, ChevronRight, Users } from "lucide-react";

const roleOrder: UserRole[] = ["admin", "teacher", "student", "parent", "unit_consultant", "unit_resident"];

const roleDisplayName: Record<UserRole, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  unit_consultant: "Unit Consultant",
  unit_resident: "Unit Resident",
};

const roleIcon: Record<UserRole, string> = {
  admin: "👑",
  teacher: "👨‍🏫",
  student: "👨‍🎓",
  parent: "👨‍👩‍👧",
  unit_consultant: "🏥",
  unit_resident: "🏥",
};

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

interface RoleSectionProps {
  role: UserRole;
  users: user[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (user: user) => void;
  onCreate: (role: UserRole) => void;
  canCreate: boolean;
  authUser: user | null;
}

function RoleSection({ role, users, isExpanded, onToggle, onEdit, onCreate, canCreate, authUser }: RoleSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card text-card-foreground overflow-hidden">
      {/* Header — always visible, clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent transition-colors duration-150 text-left"
      >
        {/* Role icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
          {roleIcon[role]}
        </div>

        {/* Title & subtitle */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{roleDisplayName[role]}</p>
          <p className="text-xs text-muted-foreground">
            {users.length} {users.length === 1 ? "user" : "users"}
          </p>
        </div>

        {/* Right side: badge + add button (admin) + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {roleDisplayName[role]}
          </Badge>
          {canCreate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onCreate(role);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <div className="transition-transform duration-200">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border">
          {users.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              No users in this role.
              {canCreate && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-primary underline-offset-4"
                  onClick={() => onCreate(role)}
                >
                  Add one now
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((person) => (
                <div
                  key={person._id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-accent transition-colors duration-100"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {person.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {person.idNumber ?? "—"}
                  </div>

                  {/* Edit button */}
                  <div className="flex-shrink-0">
                    {canEditUser(authUser, person) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(person)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Read only</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<user[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<user | null>(null);
  const [creatingRole, setCreatingRole] = useState<UserRole | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<UserRole>>(new Set());

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
    return users.filter(
      (person) =>
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

  const toggleRole = (role: UserRole) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const handleEdit = (userToEdit: user) => {
    setSelectedUser(userToEdit);
    setCreatingRole(null);
    setIsDialogOpen(true);
  };

  const handleCreate = (role: UserRole) => {
    setSelectedUser(null);
    setCreatingRole(role);
    setIsDialogOpen(true);
  };

  const isAdmin = authUser?.role === "admin";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Manage users by their access levels.
          </p>
        </div>
        <Search search={search} setSearch={setSearch} title="Search users..." />
      </div>

      {/* Win11 Settings-style expandable sections */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card text-card-foreground px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {groupedByRole.map((group) => (
            <RoleSection
              key={group.role}
              role={group.role}
              users={group.users}
              isExpanded={expandedRoles.has(group.role)}
              onToggle={() => toggleRole(group.role)}
              onEdit={handleEdit}
              onCreate={handleCreate}
              canCreate={isAdmin}
              authUser={authUser}
            />
          ))}
        </div>
      )}

      <UserDialog
        editingUser={selectedUser}
        role={creatingRole ?? selectedUser?.role ?? "student"}
        open={isDialogOpen}
        setOpen={(open) => {
          setIsDialogOpen(open);
          if (!open) setCreatingRole(null);
        }}
        onSuccess={() => {
          setIsDialogOpen(false);
          setCreatingRole(null);
          fetchUsers();
        }}
      />
    </div>
  );
}
