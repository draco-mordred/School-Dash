import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { user } from "@/types";
import CustomPagination from "@/components/global/CustomPagination";
import CustomAlert from "@/components/global/CustomAlert";
import { api } from "@/lib/api";

// ?page=${pageNum}&limit=10
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

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelected(users.map((u) => u._id));
    else setSelected([]);
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelected((s) => [...s, id]);
    else setSelected((s) => s.filter((x) => x !== id));
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return;
    // open confirmation dialog
    setIsBulkDeleteOpen(true);
  };
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const confirmBulkDelete = async () => {
    try {
      if (onBulkDelete) await onBulkDelete(selected);
      else await Promise.all(selected.map((id) => (api.delete as any)(`/users/delete/${id}`)));
      setSelected([]);
      setIsBulkDeleteOpen(false);
    } catch (err) {
      console.error(err);
      alert("Bulk delete failed");
    }
  };
  const handleEdit = (user: user) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };
  return (
    <div className="border rounded-md">
      {selected.length > 0 && (
        <div className="flex items-center justify-between p-3 border-b bg-muted rounded-t-md">
          <div className="text-sm">{selected.length} selected</div>
          <div>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete Selected
            </Button>
          </div>
        </div>
      )}
      <CustomAlert
        isOpen={isBulkDeleteOpen}
        setIsOpen={setIsBulkDeleteOpen}
        handleDelete={confirmBulkDelete}
        title={`Delete ${selected.length} users?`}
        description="This will permanently delete the selected users from the system."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selected.length > 0 && selected.length === users.length}
                onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            {role === "teacher" && <TableHead>Subjects</TableHead>}
            {/* Show Class only for students */}
            {role === "student" && <TableHead>Class</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No {role}s found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(user._id)}
                    onCheckedChange={(v) => toggleSelectOne(user._id, Boolean(v))}
                  />
                </TableCell>
                <TableCell className="font-medium flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  {user.name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                {role === "teacher" && (
                  <TableCell>
                    {user.teacherSubjects?.length ? (
                      <div className="flex gap-1">
                        {user.teacherSubjects.map((subject) => (
                          <Badge variant="outline" key={subject._id}>
                            {subject.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                )}
                {role === "student" && (
                  <TableCell>
                    {(() => {
                      const studentClass = user.studentClasses as
                        | { _id?: string; name?: string }
                        | undefined;

                      return studentClass && studentClass._id ? (
                        <Badge variant="outline">{studentClass.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">
                          Unassigned
                        </span>
                      );
                    })()}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      {showDeleteAction !== false && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setDeleteId(user._id);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {users.length > 10 && (
        <CustomPagination
          loading={loading}
          page={pageNum}
          setPage={setPageNum}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default UserTable;
