import { format } from "date-fns";
import { MoreHorizontal, Loader2, Trash2, Pencil } from "lucide-react";

import type { academicYear } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CustomPagination from "@/components/global/CustomPagination";

interface Props {
  data: academicYear[];
  loading: boolean;
  onEdit: (year: academicYear) => void;
  onDelete: (id: string) => void;
  pageNum: number;
  setPageNum: (page: number) => void;
  totalPages: number;
}
const AcademicYearTable = ({
  data,
  loading,
  onEdit,
  onDelete,
  pageNum,
  setPageNum,
  totalPages,
}: Props) => {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Year Name</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                No academic years found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((year) => (
              <TableRow key={year._id}>
                <TableCell className="font-medium">{year.name}</TableCell>
                <TableCell>{format(new Date(year.fromYear), "PPP")}</TableCell>
                <TableCell>{format(new Date(year.toYear), "PPP")}</TableCell>
                <TableCell>
                  {year.isCurrent ? (
                    <Badge className="bg-green-600 hover:bg-green-700">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(year)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-400 dark:hover:text-red-600 hover:text-red-600"
                        onClick={() => onDelete(year._id)}
                      >
                        <Trash2 className="mr-2 size-4 text-red-400 dark:hover:text-red-600 hover:text-red-600" />{" "}
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {/* pagination => seen when we have more than the limit*/}
      {data.length > 10 && (
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

export default AcademicYearTable;
