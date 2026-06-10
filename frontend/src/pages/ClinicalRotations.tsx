import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { MoreHorizontal, Plus, Pencil, Trash2, X, ClipboardList, Stethoscope, CalendarDays, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Search from "@/components/global/Search";
import CustomPagination from "@/components/global/CustomPagination";

type RotationStatus = "upcoming" | "active" | "completed";
type RotationType = "medicine" | "surgery" | "paediatrics" | "obstetrics" | "psychiatry" | "community" | "elective";

interface Tutorial {
  _id?: string;
  topic: string;
  date?: string;
  notes?: string;
}

interface PatientClerked {
  _id?: string;
  patientName: string;
  diagnosis: string;
  clerkedAt?: string;
  notes?: string;
}

interface Rotation {
  _id: string;
  rotationName: string;
  rotationDescription: string;
  rotationType: RotationType;
  rotationStartDate: string;
  rotationEndDate: string;
  rotationUnit: string;
  rotationSupervisor: { _id: string; name: string; email?: string };
  rotationStatus: RotationStatus;
  rotationNotes: string;
  rotationActivities: {
    numberOfWeeks: number;
    numberOfConsultantWardRound: number;
    numberOfClinics: number;
    numberOfResidentWardRound: number;
    numberOfCallDuty: number;
    numberOfTheatreDays: number;
  };
  rotationTutorials: Tutorial[];
  rotationTutorialPersonal: string;
  patientsClerked: PatientClerked[];
  student: { _id: string; name: string; idNumber?: string };
  students?: { _id: string; name: string }[];
  academicYear: { _id: string; name: string };
  createdAt: string;
}

const ROTATION_TYPES: RotationType[] = ["medicine", "surgery", "paediatrics", "obstetrics", "psychiatry", "community", "elective"];
const STATUS_COLORS: Record<RotationStatus, string> = {
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function ClinicalRotations() {
  const { user } = useAuth();
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RotationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<RotationType | "all">("all");

  const [showForm, setShowForm] = useState(false);
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);
  const [selectedRotation, setSelectedRotation] = useState<Rotation | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  const limit = 15;

  const fetchRotations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== "all" && { rotationStatus: statusFilter }),
        ...(typeFilter !== "all" && { rotationType: typeFilter }),
      });

      // If user is a parent, fetch their profile to get children's IDs
      let endpoint = `/clinical-rotations?${params}`;
      if (user?.role === "parent") {
        const { data: profileData } = await api.get("/users/profile");
        const parentUser = profileData.user;
        const childIds = (parentUser?.parentStudents ?? []).map((child: any) =>
          typeof child === "string" ? child : child._id
        );
        if (childIds.length > 0) {
          params.set("studentIds", childIds.join(","));
          endpoint = `/clinical-rotations?${params}`;
        }
      }

      const { data } = await api.get(endpoint);
      setRotations(data.rotations ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(Math.ceil((data.total ?? 0) / limit));
    } catch (error) {
      console.error("Failed to load rotations", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, user]);

  useEffect(() => { fetchRotations(); }, [fetchRotations]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this clinical rotation?")) return;
    try {
      await api.delete(`/clinical-rotations/${id}`);
      setRotations((prev) => prev.filter((r) => r._id !== id));
    } catch (error) {
      console.error("Failed to delete rotation", error);
    }
  };

  const openForm = (rotation?: Rotation) => {
    setEditingRotation(rotation ?? null);
    setShowForm(true);
  };

  const handleFormSubmit = async (payload: Record<string, any>) => {
    try {
      if (editingRotation) {
        const { data } = await api.put(`/clinical-rotations/${editingRotation._id}`, payload);
        setRotations((prev) => prev.map((r) => (r._id === editingRotation._id ? data : r)));
      } else {
        const { data } = await api.post("/clinical-rotations", payload);
        setRotations((prev) => [data, ...prev]);
      }
      setShowForm(false);
    } catch (error) {
      console.error("Failed to save rotation", error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedRotation || !noteText.trim()) return;
    try {
      const { data } = await api.post(`/clinical-rotations/${selectedRotation._id}/notes`, { note: noteText });
      setSelectedRotation(data);
      setRotations((prev) => prev.map((r) => (r._id === selectedRotation._id ? data : r)));
      setNoteText("");
      setShowNotesModal(false);
    } catch (error) {
      console.error("Failed to add note", error);
    }
  };

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isConsultant = user?.role === "unit_consultant";
  const isResident = user?.role === "unit_resident";
  const canCreate = isAdmin || isTeacher || isConsultant || isResident;

  const [showAvailableDialog, setShowAvailableDialog] = useState(false);
  const [availableRotations, setAvailableRotations] = useState<Rotation[]>([]);
  const [availableSearch, setAvailableSearch] = useState("");
  const [availableLoading, setAvailableLoading] = useState(false);

  const fetchAvailable = async (q = "") => {
    try {
      setAvailableLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (q) params.q = q;
      const { data } = await api.get("/clinical-rotations/available", { params });
      setAvailableRotations(data.rotations ?? []);
    } catch (e) {
      console.error("Failed to fetch available rotations", e);
      toast.error("Failed to fetch available postings");
    } finally {
      setAvailableLoading(false);
    }
  };

  const handleSignup = async (rotationId: string) => {
    try {
      const { data } = await api.post(`/clinical-rotations/${rotationId}/signup`);
      toast.success("Rotation signed up successfully");
      // Update local lists
      setAvailableRotations((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      setRotations((prev) => [data, ...prev]);
    } catch (e: any) {
      console.error("Signup failed", e);
      toast.error(e.response?.data?.message || "Failed to sign up for rotation");
    }
  };

  return (
    <div className="space-y-6" style={{ marginLeft: "30px", marginTop: "40px" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clinical Rotations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student clinical rotation schedules and records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "student" && (
            <Button variant="ghost" onClick={() => setShowAvailableDialog(true)} className="ml-0">
              Browse Available Postings
            </Button>
          )}
          <Button variant="outline" onClick={() => fetchRotations()} disabled={loading} className="ml-0">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          {canCreate && (
            <Button onClick={() => openForm()} className="gap-2 ml-2">
              <Plus className="h-4 w-4" />
              New Rotation
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Search
                value={search}
                onChange={setSearch}
                placeholder="Search rotations..."
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RotationStatus | "all")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as RotationType | "all")}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ROTATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Available Postings Dialog (students) */}
      <Dialog open={showAvailableDialog} onOpenChange={(v) => { if (v) fetchAvailable(); else setAvailableRotations([]); setShowAvailableDialog(v); }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Available Clinical Postings</DialogTitle>
            <DialogDescription>Search and sign up for active clinical postings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input className="w-full" placeholder="Search postings..." value={availableSearch} onChange={(e) => setAvailableSearch(e.target.value)} />
              <Button className="w-full sm:w-auto" onClick={() => fetchAvailable(availableSearch)}>Search</Button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {availableLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : availableRotations.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">No active postings found.</div>
              ) : (
                <>
                  {/* Table for medium+ screens */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rotation</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Supervisor</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                                      <TableBody>
                                        {availableRotations.map((r) => (
                          <TableRow key={r._id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm truncate">{r.rotationName}</p>
                                <p className="text-xs text-muted-foreground truncate">{r.rotationDescription}</p>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{r.rotationUnit}</TableCell>
                            <TableCell className="whitespace-nowrap"><Badge className="text-xs capitalize">{r.rotationType}</Badge></TableCell>
                            <TableCell className="whitespace-nowrap">{r.rotationSupervisor?.name ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              {((r.students && r.students.some((s) => s._id === user?._id)) || r.student?._id === user?._id) ? (
                                <Button size="sm" variant="outline" disabled>Signed</Button>
                              ) : (
                                <Button size="sm" onClick={() => handleSignup(r._id)}>Sign up</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Stacked cards for small screens */}
                  <div className="space-y-3 md:hidden">
                          {availableRotations.map((r) => (
                      <Card key={r._id}>
                        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex-1">
                            <p className="font-medium">{r.rotationName}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.rotationDescription}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <Badge className="text-xs">{r.rotationUnit}</Badge>
                              <Badge className="text-xs capitalize">{r.rotationType}</Badge>
                            </div>
                          </div>
                            <div className="flex items-center gap-2">
                              {((r.students && r.students.some((s) => s._id === user?._id)) || r.student?._id === user?._id) ? (
                                <Button size="sm" variant="outline" disabled>Signed</Button>
                              ) : (
                                <Button size="sm" onClick={() => handleSignup(r._id)}>Sign up</Button>
                              )}
                            </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvailableDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : rotations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Stethoscope className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No rotations found</p>
              <p className="text-xs mt-1">Create a new rotation to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rotation</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activities</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rotations.map((rot) => (
                    <TableRow key={rot._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{rot.rotationName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(rot.rotationStartDate), "MMM d, yyyy")} –{" "}
                            {format(new Date(rot.rotationEndDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{rot.rotationUnit}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{rot.rotationType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{rot.rotationSupervisor?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{rot.student?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[rot.rotationStatus]}`}>
                          {rot.rotationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                          {rot.rotationActivities?.numberOfConsultantWardRound > 0 && (
                            <span className="flex items-center gap-0.5">
                              <ClipboardList className="h-3 w-3" /> {rot.rotationActivities.numberOfConsultantWardRound}
                            </span>
                          )}
                          {rot.rotationActivities?.numberOfClinics > 0 && (
                            <span className="flex items-center gap-0.5">
                              <CalendarDays className="h-3 w-3" /> {rot.rotationActivities.numberOfClinics}
                            </span>
                          )}
                          {rot.rotationActivities?.numberOfWeeks > 0 && (
                            <span>{rot.rotationActivities.numberOfWeeks}wk</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedRotation(rot); setShowNotesModal(true); }}>
                              View Notes
                            </DropdownMenuItem>
                            {(isAdmin || isTeacher || isConsultant || user?._id === rot.student?._id) && (
                              <>
                                <DropdownMenuItem onClick={() => openForm(rot)}>
                                  <Pencil className="h-3 w-3 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(rot._id)} className="text-red-600">
                                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="border-t px-4 py-3">
            <CustomPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* Notes Modal */}
      <Dialog open={showNotesModal} onOpenChange={(v) => !v && setShowNotesModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notes — {selectedRotation?.rotationName}</DialogTitle>
            <DialogDescription>View and add notes for this clinical rotation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedRotation?.rotationNotes || "No notes yet."}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a new note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              />
              <Button onClick={handleAddNote}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRotation ? "Edit Rotation" : "New Clinical Rotation"}</DialogTitle>
            <DialogDescription>{editingRotation ? "Update the details of this clinical rotation." : "Fill in the details to create a new clinical rotation."}</DialogDescription>
          </DialogHeader>
          <RotationForm
            rotation={editingRotation}
            onSubmit={handleFormSubmit}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Rotation Form ─────────────────────────────────────────────────────────────

interface RotationFormProps {
  rotation: Rotation | null;
  onSubmit: (payload: Record<string, any>) => void;
  onClose: () => void;
}

function RotationForm({ rotation, onSubmit, onClose }: RotationFormProps) {
  const { year: currentYear } = useAuth();
  const [form, setForm] = useState({
    rotationName: rotation?.rotationName ?? "",
    rotationDescription: rotation?.rotationDescription ?? "",
    rotationType: rotation?.rotationType ?? "medicine",
    rotationStartDate: rotation?.rotationStartDate?.split("T")[0] ?? "",
    rotationEndDate: rotation?.rotationEndDate?.split("T")[0] ?? "",
    rotationUnit: rotation?.rotationUnit ?? "",
    rotationSupervisor: rotation?.rotationSupervisor?._id ?? "",
    rotationStatus: rotation?.rotationStatus ?? "upcoming",
    rotationNotes: rotation?.rotationNotes ?? "",
    rotationTutorialPersonal: rotation?.rotationTutorialPersonal ?? "",
    academicYear: rotation?.academicYear?._id ?? currentYear?._id ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [supervisors, setSupervisors] = useState<Array<{ _id: string; name: string }>>([]);
  const [academicYears, setAcademicYears] = useState<Array<{ _id: string; name: string }>>([]);

  useEffect(() => {
    api.get("/users?role=teacher&limit=100").then(({ data }) => {
      setSupervisors(data.users ?? []);
    });
    api.get("/academic-years").then(({ data }) => {
      const years = Array.isArray(data) ? data : (data?.years ?? []);
      setAcademicYears(years);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      ...form,
      rotationStartDate: new Date(form.rotationStartDate).toISOString(),
      rotationEndDate: new Date(form.rotationEndDate).toISOString(),
      academicYear: form.academicYear,
    });
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Rotation Name</label>
          <Input required placeholder="e.g., Internal Medicine Posting" value={form.rotationName} onChange={(e) => setForm({ ...form, rotationName: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Description</label>
          <Input placeholder="Brief description..." value={form.rotationDescription} onChange={(e) => setForm({ ...form, rotationDescription: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Type</label>
          <Select value={form.rotationType} onValueChange={(v) => setForm({ ...form, rotationType: v as RotationType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROTATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Unit</label>
          <Input required placeholder="e.g., Medicine" value={form.rotationUnit} onChange={(e) => setForm({ ...form, rotationUnit: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Start Date</label>
          <Input type="date" required value={form.rotationStartDate} onChange={(e) => setForm({ ...form, rotationStartDate: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">End Date</label>
          <Input type="date" required value={form.rotationEndDate} onChange={(e) => setForm({ ...form, rotationEndDate: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Supervisor / Consultant</label>
          <Select value={form.rotationSupervisor} onValueChange={(v) => setForm({ ...form, rotationSupervisor: v })}>
            <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
            <SelectContent>
              {supervisors.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Status</label>
          <Select value={form.rotationStatus} onValueChange={(v) => setForm({ ...form, rotationStatus: v as RotationStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Academic Year</label>
          <Select value={form.academicYear} onValueChange={(v) => setForm({ ...form, academicYear: v })}>
            <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => (
                <SelectItem key={y._id} value={y._id}>{y.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Personal Tutorial Note</label>
          <Input placeholder="Personal tutorial note..." value={form.rotationTutorialPersonal} onChange={(e) => setForm({ ...form, rotationTutorialPersonal: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : rotation ? "Update" : "Create"}</Button>
      </DialogFooter>
    </form>
  );
}
