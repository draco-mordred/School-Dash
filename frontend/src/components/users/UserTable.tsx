import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Download, Pencil, Trash2 } from "lucide-react";
import type { user } from "@/types";
import CustomPagination from "@/components/global/CustomPagination";
import CustomAlert from "@/components/global/CustomAlert";

interface Props {
  role: string;
  loading: boolean;
  setDeleteId: (id: string) => void;
  setIsDeleteOpen: (open: boolean) => void;
  setEditingUser: (user: user | null) => void;
  setIsFormOpen: (open: boolean) => void;
  users: user[];
  pageNum: number;
  setPageNum: (page: number) => void;
  totalPages: number;
  showDeleteAction?: boolean;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "group", label: "Class / Department" },
];

const UserTable = ({
  role,
  loading,
  setDeleteId,
  setIsDeleteOpen,
  setEditingUser,
  setIsFormOpen,
  pageNum,
  setPageNum,
  users,
  totalPages,
  showDeleteAction,
  onBulkDelete,
}: Props) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const groupLabel = role === "student" ? "Class" : "Department";

  const getGroupValue = (user: user) => {
    if (role === "student") {
      const cls = user.studentClasses as { name?: string } | undefined;
      return cls?.name || "Unassigned";
    }
    return (user.department as string) || "General";
  };

  const statusOptions = useMemo(
    () => Array.from(new Set(users.map((user) => user.status || "unknown"))),
    [users]
  );

  const groupOptions = useMemo(
    () => Array.from(new Set(users.map(getGroupValue))).sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const matchesGroup = groupFilter === "all" || getGroupValue(user) === groupFilter;
        const matchesStatus = statusFilter === "all" || user.status === statusFilter;
        return matchesGroup && matchesStatus;
      })
      .sort((a, b) => {
        const primary = sortBy === "group" ? getGroupValue(a) : a.name;
        const secondary = sortBy === "group" ? getGroupValue(b) : b.name;
        if (primary < secondary) return sortDirection === "asc" ? -1 : 1;
        if (primary > secondary) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [users, groupFilter, statusFilter, sortBy, sortDirection]);

  const groupedUsers = useMemo(() => {
    return filteredUsers.reduce<Record<string, user[]>>((acc, user) => {
      const groupValue = getGroupValue(user);
      acc[groupValue] = acc[groupValue] || [];
      acc[groupValue].push(user);
      return acc;
    }, {});
  }, [filteredUsers]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelected(filteredUsers.map((u) => u._id));
    else setSelected([]);
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelected((prev) => [...prev, id]);
    else setSelected((prev) => prev.filter((x) => x !== id));
  };

  const handleExport = () => {
    if (filteredUsers.length === 0) return;
    const rows = filteredUsers.map((user) => ({
      Name: user.name,
      Email: user.email,
      Status: user.status,
      Group: getGroupValue(user),
      Role: user.role || "",
    }));
    const csv = [Object.keys(rows[0]).join(","), ...rows.map((row) => Object.values(row).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-${role}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const confirmBulkDelete = async () => {
    try {
      if (onBulkDelete) await onBulkDelete(selected);
      setSelected([]);
      setIsBulkDeleteOpen(false);
    } catch (err) {
      console.error(err);
      alert("Bulk delete failed");
    }
  };

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800";
      case "inactive":
        return "bg-slate-100 text-slate-700";
      case "suspended":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">{role.charAt(0).toUpperCase() + role.slice(1)} Directory</CardTitle>
              <p className="text-sm text-muted-foreground">
                Browse users by {groupLabel.toLowerCase()}, filter by status, and manage profiles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
              {selected.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                  Delete {selected.length}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder={`All ${groupLabel}s`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {groupLabel}s</SelectItem>
                {groupOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"))}
            >
              <ArrowUpDown className="h-4 w-4" /> {sortDirection === "asc" ? "A-Z" : "Z-A"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {Object.entries(groupedUsers).length === 0 ? (
          <div className="rounded-3xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            No users match this filter.
          </div>
        ) : (
          Object.entries(groupedUsers).map(([groupName, groupUsers]) => (
            <div key={groupName} className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-surface p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{groupName}</p>
                  <p className="text-xs text-muted-foreground">{groupUsers.length} user(s)</p>
                </div>
                <span className="text-xs text-muted-foreground">{role === "student" ? "Class" : "Department"}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groupUsers.map((user) => (
                  <div key={user._id} className="user-card overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{groupLabel}</p>
                        <p className="text-lg font-semibold text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="space-y-2 text-right">
                        <Badge className={getStatusClass(user.status)}>
                          {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{getGroupValue(user)}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                      {role === "student" && (
                        <div>
                          <p className="font-medium text-foreground">Matric No.</p>
                          <p>{user.idNumber || "N/A"}</p>
                        </div>
                      )}
                      {role !== "student" && (user.department || user.role) && (
                        <div>
                          <p className="font-medium text-foreground">Details</p>
                          <p>{user.department || user.role}</p>
                        </div>
                      )}
                    </div>

                    <div className="user-card-action-row mt-4 flex flex-wrap gap-2 opacity-0 transition-opacity duration-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setEditingUser(user);
                          setIsFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      {showDeleteAction !== false && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setDeleteId(user._id);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {users.length > 10 && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} users
            </p>
            <CustomPagination loading={loading} page={pageNum} setPage={setPageNum} totalPages={totalPages} />
          </div>
        )}
      </CardContent>

      <CustomAlert
        isOpen={isBulkDeleteOpen}
        setIsOpen={setIsBulkDeleteOpen}
        handleDelete={confirmBulkDelete}
        title={`Delete ${selected.length} users?`}
        description="This will permanently delete the selected users from the system."
      />
    </Card>
  );
};

export default UserTable;
