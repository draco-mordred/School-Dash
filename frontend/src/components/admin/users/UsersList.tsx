"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Download, Eye, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CustomAlert from "@/components/global/CustomAlert";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "suspended";
  joinDate?: string;
  department?: string;
  studentsCount?: number;
  role?: string;
  roles?: string[];
  profileImage?: string;
  [key: string]: unknown;
}

interface UsersListProps {
  title: string;
  users: User[];
  columns: Array<{
    key: string;
    label: string;
    render?: (user: User, value: unknown) => ReactNode;
  }>;
  loading?: boolean;
  onSelectUser?: (userId: string) => void;
  onViewUser?: (userId: string) => void;
  onEditUser?: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onBulkDeleteUsers?: (userIds: string[]) => Promise<void> | void;
  navigationPath?: string;
}

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "department", label: "Department" },
];

export function UsersList({
  title,
  users,
  columns,
  loading = false,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onBulkDeleteUsers,
  navigationPath,
}: UsersListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(users.map((user) => user.department || "General"))).sort(),
    [users]
  );
  const statuses = useMemo(
    () => Array.from(new Set(users.map((user) => user.status))).sort(),
    [users]
  );

  const userDepartment = (user: User) => user.department || "General";

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const matchesSearch =
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === "all" || user.status === selectedStatus;
        const matchesDepartment =
          selectedDepartment === "all" || (user.department || "General") === selectedDepartment;
        return matchesSearch && matchesStatus && matchesDepartment;
      })
      .sort((a, b) => {
        const first = sortBy === "department" ? userDepartment(a) : a.name;
        const second = sortBy === "department" ? userDepartment(b) : b.name;
        if (first < second) return sortDirection === "asc" ? -1 : 1;
        if (first > second) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [users, searchTerm, selectedStatus, selectedDepartment, sortBy, sortDirection]);

  const groupedUsers = useMemo(() => {
    return filteredUsers.reduce<Record<string, User[]>>((acc, user) => {
      const dept = userDepartment(user);
      acc[dept] = acc[dept] || [];
      acc[dept].push(user);
      return acc;
    }, {});
  }, [filteredUsers]);

  const handleExport = () => {
    const rows = filteredUsers.map((user) => ({
      Name: user.name,
      Email: user.email,
      Department: user.department || "General",
      Status: user.status,
    }));
    if (rows.length === 0) return;
    const csv = [Object.keys(rows[0]).join(","), ...rows.map((row) => Object.values(row).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleUserSelection = (userId: string, checked: boolean) => {
    setSelectedUserIds((current) => (checked ? [...current, userId] : current.filter((id) => id !== userId)));
  };

  const toggleSelectAll = (checked: boolean) => {
    const ids = checked ? filteredUsers.map((user) => user.id || user._id || "") : [];
    setSelectedUserIds(ids.filter(Boolean));
  };

  const handleBulkDelete = async () => {
    if (!selectedUserIds.length || !onBulkDeleteUsers) return;
    await onBulkDeleteUsers(selectedUserIds);
    setSelectedUserIds([]);
    setIsBulkDeleteOpen(false);
  };

  const getStatusClass = (status: string) => {
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
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage users by department with quick actions and hover details.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedUserIds.length > 0 && onBulkDeleteUsers && (
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                  Delete {selectedUserIds.length}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
                <Download className="h-4 w-4" /> Export
              </Button>
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

          <div className="grid gap-3 md:grid-cols-5">
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Checkbox
                checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                onCheckedChange={(checked) => toggleSelectAll(checked === true)}
              />
              Select all visible
            </label>
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full">
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="rounded-3xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            Loading users...
          </div>
        ) : Object.keys(groupedUsers).length === 0 ? (
          <div className="rounded-3xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            No users match the current filters.
          </div>
        ) : (
          Object.entries(groupedUsers).map(([department, departmentUsers]) => (
            <div key={department} className="space-y-4">
              <div className="flex items-center justify-between rounded-3xl border border-border bg-surface p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{department}</p>
                  <p className="text-xs text-muted-foreground">{departmentUsers.length} users</p>
                </div>
                <span className="text-xs text-muted-foreground">Department</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {departmentUsers.map((user) => {
                  const isFocused = focusedUserId === (user.id || user._id);
                  const isHovered = hoveredUserId === (user.id || user._id);
                  const userId = user.id || user._id || "";
                  
                  return (
                    <div
                      key={userId}
                      onClick={() => setFocusedUserId(isFocused ? null : userId)}
                      onMouseEnter={() => setHoveredUserId(userId)}
                      onMouseLeave={() => setHoveredUserId(null)}
                      onBlur={() => setFocusedUserId(null)}
                      role="button"
                      tabIndex={0}
                      className={`user-card group relative rounded-3xl border border-border bg-card p-4 shadow-sm cursor-pointer transition-all duration-300 ease-out ${
                        isFocused
                          ? "overflow-visible shadow-lg z-20"
                          : "overflow-hidden hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                      style={{
                        transform: isFocused
                          ? "scale(1.03) translateY(-4px)"
                          : "scale(1) translateY(0)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className="flex-shrink-0 rounded-full object-cover transition-all duration-300 ease-out overflow-hidden"
                            style={{
                              width: isFocused ? "62px" : "40px",
                              height: isFocused ? "62px" : "40px",
                              transform: isFocused ? "scale(1.12)" : isHovered ? "scale(1.05)" : "scale(1)",
                              position: "relative",
                              top: "auto",
                              right: "auto",
                              zIndex: isFocused ? 20 : 1,
                            }}
                          >
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {isFocused ? (
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-muted-foreground">{user.department || "General"}</p>
                              <p className="text-lg font-semibold text-foreground truncate">{user.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-muted-foreground">{user.department || "General"}</p>
                              <p className="text-lg font-semibold text-foreground truncate">{user.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            </div>
                          )}
                        </div>
                        {!isFocused && (
                          <div className="flex flex-col items-end gap-2">
                            <Checkbox
                              checked={selectedUserIds.includes(userId)}
                              onCheckedChange={(checked) => toggleUserSelection(userId, checked === true)}
                            />
                            <Badge className={getStatusClass(user.status)}>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {!isFocused && (
                        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                          {columns.map((column) => (
                            <div key={column.key} className="space-y-1">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{column.label}</p>
                              <div className="text-foreground">
                                {column.render ? column.render(user, user[column.key]) : String(user[column.key] ?? "—")}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!isFocused && (
                        <div className="user-card-action-row mt-4 flex flex-wrap gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUser?.(userId);
                            }}
                          >
                            <Eye className="h-4 w-4" /> View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditUser?.(userId);
                            }}
                          >
                            <Edit className="h-4 w-4" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteUser) {
                                onDeleteUser(userId);
                                return;
                              }
                              if (navigationPath) navigate(`${navigationPath}/${userId}`);
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </div>
                      )}

                      {isFocused && (
                        <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                          <div className="space-y-2 text-sm">
                            {columns.map((column) => (
                              <div key={column.key} className="rounded-2xl bg-background p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{column.label}</p>
                                <div className="text-foreground">
                                  {column.render ? column.render(user, user[column.key]) : String(user[column.key] ?? "—")}
                                </div>
                              </div>
                            ))}
                            <div className="rounded-2xl bg-background p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                              <Badge className={getStatusClass(user.status)}>
                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewUser?.(userId);
                              }}
                            >
                              <Eye className="h-4 w-4" /> View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditUser?.(userId);
                              }}
                            >
                              <Edit className="h-4 w-4" /> Edit
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} {title.toLowerCase()}.
        </div>
      </CardContent>

      <CustomAlert
        isOpen={isBulkDeleteOpen}
        setIsOpen={setIsBulkDeleteOpen}
        handleDelete={handleBulkDelete}
        title={`Delete ${selectedUserIds.length} users?`}
        description="This will permanently delete the selected users from the system."
      />
    </Card>
  );
}

