import { MoreHorizontal, Loader2, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Class } from "@/types";
import CustomPagination from "@/components/global/CustomPagination";

interface Props {
  data: Class[];
  loading: boolean;
  onEdit: (cls: Class) => void;
  onDelete: (id: string) => void;
  onViewStudents?: (cls: Class) => void;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
}
const ClassTable = ({
  data,
  loading,
  onEdit,
  onDelete,
  onViewStudents,
  page,
  setPage,
  totalPages,
}: Props) => {
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, any[]>>({});
  const [loadingByClass, setLoadingByClass] = useState<Record<string, boolean>>({});

  const fetchStudentsForClass = async (cls: Class) => {
    const id = cls._id;
    if (studentsByClass[id]) return; // already fetched
    setLoadingByClass((s) => ({ ...s, [id]: true }));
    try {
      // If populated on the class object
      if (Array.isArray(cls.students) && cls.students.length > 0 && typeof cls.students[0] === 'object') {
        setStudentsByClass((s) => ({ ...s, [id]: cls.students as any[] }));
        return;
      }

      // Try class-specific endpoint
      try {
        const { data } = await api.get(`/classes/${id}/students`);
        const students = data?.students ?? data;
        if (Array.isArray(students)) {
          setStudentsByClass((s) => ({ ...s, [id]: students }));
          return;
        }
      } catch (err) {
        // ignore and fallback
      }

      // Fallback to users endpoint, then filter client-side by matching studentClass/_id
      const usersRes = await api.get(`/users?limit=1000`);
      const users = usersRes.data?.users ?? usersRes.data ?? [];
      const filtered = Array.isArray(users)
        ? users.filter((u: any) => {
            // match studentClass._id or studentClasses (string or object)
            if (u.studentClass && (u.studentClass._id === id || u.studentClass === id)) return true;
            if (u.studentClasses) {
              if (Array.isArray(u.studentClasses)) {
                return u.studentClasses.some((sc: any) => sc._id === id || sc === id);
              }
              if (typeof u.studentClasses === 'string') return u.studentClasses === id;
              if (u.studentClasses._id) return u.studentClasses._id === id;
            }
            // older datasets might store class id on `class` or `classId`
            if (u.class === id || u.classId === id) return true;
            return false;
          })
        : [];
      setStudentsByClass((s) => ({ ...s, [id]: filtered }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load students for this class");
      setStudentsByClass((s) => ({ ...s, [id]: [] }));
    } finally {
      setLoadingByClass((s) => ({ ...s, [id]: false }));
    }
  };
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Academic Year</TableHead>
            <TableHead>Class Teacher</TableHead>
            <TableHead>Students</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                No classes found. Add one to get started.
              </TableCell>
            </TableRow>
          ) : (
            data.map((cls) => (
              <TableRow key={cls._id} className="hover:bg-accent/40 cursor-pointer" onClick={() => onViewStudents?.(cls)}>
                <TableCell className="font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="text-left w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenClassId((cur) => (cur === cls._id ? null : cls._id));
                          // fetch students when opening
                          if (!studentsByClass[cls._id]) void fetchStudentsForClass(cls);
                        }}
                      >
                        {cls.name}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onInteractOutside={() => setOpenClassId(null)} align="start" className="w-64">
                      <DropdownMenuLabel>Students</DropdownMenuLabel>
                      {loadingByClass[cls._id] ? (
                        <div className="p-3 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      ) : (studentsByClass[cls._id] ?? []).length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No students found</div>
                      ) : (
                        (studentsByClass[cls._id] ?? []).map((s: any) => (
                          <DropdownMenuItem key={s._id ?? s.id} className="flex flex-col">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-xs text-muted-foreground">{s.idNumber ?? s.email ?? ''}</span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>{cls.academicYear?.name || "N/A"}</TableCell>
                <TableCell>
                  {cls.classTeacher ? (
                    <span className="flex items-center gap-2">
                      {cls.classTeacher.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Unassigned
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {cls.students?.length || 0} / {cls.capacity}
                  </div>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(cls)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400 dark:hover:text-red-600 hover:text-red-600"
                        onClick={() => onDelete(cls._id)}
                      >
                        <Trash2 className="mr-2 size-4 text-red-400 dark:hover:text-red-600 hover:text-red-600" />{" "}
                        Delete Class
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data.length > 10 && (
        <CustomPagination
          loading={loading}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default ClassTable;
