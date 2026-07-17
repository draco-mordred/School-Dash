"use client";

import { useMemo, useState } from "react";
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
import { ArrowUpDown, Download, Eye, Pencil, Trash2 } from "lucide-react";
import CustomAlert from "@/components/global/CustomAlert";

export interface Student {
  id: string;
  name: string;
  matricNumber: string;
  class: string;
  currentPosting?: string;
  attendancePercentage: number;
  status: "active" | "inactive" | "graduated";
  email: string;
  profileImage?: string;
  theme?: string;
}

interface StudentsListProps {
  students: Student[];
  loading?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSelectStudent?: (studentId: string) => void;
  onViewStudent?: (studentId: string) => void;
  onEditStudent?: (studentId: string) => void;
  onDeleteStudent?: (studentId: string) => void;
  onBulkDeleteStudents?: (studentIds: string[]) => Promise<void> | void;
  onBulkUpload?: () => void;
}

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "class", label: "Class" },
];

const profileThemes = {
  sky: {
    avatar: "from-sky-500 to-cyan-500",
    border: "border-sky-400/40",
    ring: "ring-sky-400/30",
    accent: "bg-sky-500/15 text-sky-300",
  },
  violet: {
    avatar: "from-violet-500 to-fuchsia-500",
    border: "border-violet-400/40",
    ring: "ring-violet-400/30",
    accent: "bg-violet-500/15 text-violet-300",
  },
  emerald: {
    avatar: "from-emerald-500 to-teal-500",
    border: "border-emerald-400/40",
    ring: "ring-emerald-400/30",
    accent: "bg-emerald-500/15 text-emerald-300",
  },
  amber: {
    avatar: "from-amber-500 to-orange-500",
    border: "border-amber-400/40",
    ring: "ring-amber-400/30",
    accent: "bg-amber-500/15 text-amber-300",
  },
  rose: {
    avatar: "from-rose-500 to-pink-500",
    border: "border-rose-400/40",
    ring: "ring-rose-400/30",
    accent: "bg-rose-500/15 text-rose-300",
  },
  indigo: {
    avatar: "from-indigo-500 to-blue-500",
    border: "border-indigo-400/40",
    ring: "ring-indigo-400/30",
    accent: "bg-indigo-500/15 text-indigo-300",
  },
} as const;

const getProfileTheme = (value?: string) => {
  const key = (value || "").toLowerCase();
  if (key.includes("violet") || key.includes("purple")) return profileThemes.violet;
  if (key.includes("emerald") || key.includes("green")) return profileThemes.emerald;
  if (key.includes("amber") || key.includes("gold") || key.includes("orange")) return profileThemes.amber;
  if (key.includes("rose") || key.includes("pink")) return profileThemes.rose;
  if (key.includes("indigo") || key.includes("blue")) return profileThemes.indigo;
  return profileThemes.sky;
};

export function StudentsList({
  students,
  loading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSelectStudent,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
  onBulkDeleteStudents,
  onBulkUpload,
}: StudentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);

  const uniqueClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.class))).sort(),
    [students]
  );
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(students.map((s) => s.status))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        const matchesSearch =
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.matricNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesClass = selectedClass === "all" || student.class === selectedClass;
        const matchesStatus = selectedStatus === "all" || student.status === selectedStatus;

        return matchesSearch && matchesClass && matchesStatus;
      })
      .sort((a, b) => {
        const first = sortBy === "class" ? a.class : a.name;
        const second = sortBy === "class" ? b.class : b.name;
        if (first < second) return sortDirection === "asc" ? -1 : 1;
        if (first > second) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [students, searchTerm, selectedClass, selectedStatus, sortBy, sortDirection]);

  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce<Record<string, Student[]>>((acc, student) => {
      const bucket = student.class || "Unassigned";
      acc[bucket] = acc[bucket] || [];
      acc[bucket].push(student);
      return acc;
    }, {});
  }, [filteredStudents]);

  const handleSelectAll = () => {
    if (selectedRows.size === filteredStudents.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleSelectRow = (studentId: string) => {
    const next = new Set(selectedRows);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    setSelectedRows(next);
    onSelectStudent?.(studentId);
  };

  const handleBulkDelete = async () => {
    if (!selectedRows.size || !onBulkDeleteStudents) return;
    await onBulkDeleteStudents(Array.from(selectedRows));
    setSelectedRows(new Set());
    setIsBulkDeleteOpen(false);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800";
      case "inactive":
        return "bg-slate-100 text-slate-700";
      case "graduated":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleExport = () => {
    const rows = filteredStudents.map((student) => ({
      Name: student.name,
      Email: student.email,
      Class: student.class,
      MatricNumber: student.matricNumber,
      Status: student.status,
      Attendance: `${student.attendancePercentage}%`,
    }));
    if (!rows.length) return;
    const csv = [Object.keys(rows[0]).join(","), ...rows.map((row) => Object.values(row).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `students-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Students</CardTitle>
              <p className="text-sm text-muted-foreground">
                Organized by class, with quick actions and student detail cards.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedRows.size > 0 && onBulkDeleteStudents && (
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                  Delete {selectedRows.size}
                </Button>
              )}
              {onBulkUpload && (
                <Button variant="outline" size="sm" className="gap-2" onClick={onBulkUpload}>
                  <Download className="h-4 w-4" /> Bulk Upload
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
                checked={filteredStudents.length > 0 && selectedRows.size === filteredStudents.length}
                onCheckedChange={() => handleSelectAll()}
              />
              Select all visible
            </label>
            <Input
              placeholder="Search by name, matric #, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
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
                {uniqueStatuses.map((status) => (
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
        {Object.keys(groupedStudents).length === 0 ? (
          <div className="rounded-3xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            No students match the current filters.
          </div>
        ) : (
          Object.entries(groupedStudents).map(([className, studentsInClass]) => (
            <div key={className} className="space-y-4">
              <div className="flex items-center justify-between rounded-3xl border border-border bg-surface p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{className}</p>
                  <p className="text-xs text-muted-foreground">{studentsInClass.length} students</p>
                </div>
                <div className="text-xs text-muted-foreground">Class</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {studentsInClass.map((student) => {
                  const isFocused = focusedStudentId === student.id;
                  const theme = getProfileTheme(student.theme || student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => setFocusedStudentId(isFocused ? null : student.id)}
                      onBlur={() => setFocusedStudentId(null)}
                      role="button"
                      tabIndex={0}
                      className={`user-card group relative isolate rounded-3xl border border-border bg-card p-4 shadow-sm cursor-pointer transition-all duration-300 ease-out ${theme.border} ${
                        isFocused
                          ? `overflow-visible shadow-xl z-30 ring-1 ${theme.ring}`
                          : "overflow-hidden hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-1.5 rounded-t-3xl bg-gradient-to-r ${theme.avatar}`} />
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className="flex-shrink-0 rounded-full object-cover transition-all duration-300 ease-out overflow-hidden"
                            style={{
                              width: "40px",
                              height: "40px",
                              position: "relative",
                              top: "auto",
                              right: "auto",
                              zIndex: isFocused ? 20 : 1,
                            }}
                          >
                            {student.profileImage ? (
                              <img
                                src={student.profileImage}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${theme.avatar} flex items-center justify-center text-white font-semibold text-sm`}>
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {isFocused ? (
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-muted-foreground">{student.class}</p>
                              <p className="text-xl font-semibold text-foreground truncate">
                                {student.name}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-muted-foreground">{student.class}</p>
                              <p className="text-xl font-semibold text-foreground truncate">
                                {student.name}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                            </div>
                          )}
                        </div>
                        {!isFocused && (
                          <div className="flex flex-col items-end gap-2">
                            <Checkbox
                              checked={selectedRows.has(student.id)}
                              onCheckedChange={() => handleSelectRow(student.id)}
                            />
                            <div className="space-y-2 text-right">
                              <Badge className={getStatusClass(student.status)}>
                                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                              </Badge>
                              <p className="text-xs text-muted-foreground">{student.matricNumber}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {!isFocused && (
                        <>
                          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                            <div className="rounded-2xl bg-background p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Current Posting
                              </p>
                              <p className="text-sm text-foreground">
                                {student.currentPosting || "Not assigned"}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-background p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Attendance
                              </p>
                              <p
                                className={
                                  student.attendancePercentage >= 80
                                    ? "text-emerald-600"
                                    : student.attendancePercentage >= 70
                                    ? "text-amber-600"
                                    : "text-rose-600"
                                }
                              >
                                {student.attendancePercentage}%
                              </p>
                            </div>
                          </div>

                          <div className="user-card-action-row mt-4 flex flex-wrap gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewStudent?.(student.id);
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
                                onEditStudent?.(student.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            {onDeleteStudent && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteStudent(student.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </Button>
                            )}
                          </div>
                        </>
                      )}

                      {isFocused && (
                        <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                          <div className="grid gap-2 text-sm">
                            <div className="rounded-2xl bg-background p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                ID Number
                              </p>
                              <p className="text-sm text-foreground">{student.matricNumber}</p>
                            </div>
                            <div className="rounded-2xl bg-background p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Status
                              </p>
                              <Badge className={getStatusClass(student.status)}>
                                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="rounded-2xl bg-background p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Attendance
                              </p>
                              <p
                                className={
                                  student.attendancePercentage >= 80
                                    ? "text-emerald-600 font-semibold"
                                    : student.attendancePercentage >= 70
                                    ? "text-amber-600 font-semibold"
                                    : "text-rose-600 font-semibold"
                                }
                              >
                                {student.attendancePercentage}%
                              </p>
                            </div>
                          </div>

                          <div className="user-card-action-row flex flex-wrap gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewStudent?.(student.id);
                                setFocusedStudentId(null);
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
                                onEditStudent?.(student.id);
                                setFocusedStudentId(null);
                              }}
                            >
                              <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            {onDeleteStudent && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1 flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteStudent(student.id);
                                  setFocusedStudentId(null);
                                }}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </Button>
                            )}
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

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CustomAlert
        isOpen={isBulkDeleteOpen}
        setIsOpen={setIsBulkDeleteOpen}
        handleDelete={handleBulkDelete}
        title={`Delete ${selectedRows.size} students?`}
        description="This will permanently delete the selected students from the system."
      />
    </Card>
  );
}
