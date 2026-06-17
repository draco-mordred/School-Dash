import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  MoreHorizontal, Plus, Pencil, Trash2, X,
  ClipboardList, Stethoscope, CalendarDays,
  BookOpen, User, Clock, FileText,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface DayEntry {
  _id?: string;
  time?: string;
  procedure?: string;
  diagnosis?: string;
  outcome?: string;
  caseType?: string;
  supervisor?: string;
  hours?: number;
  location?: string;
}

interface TutorialEntry {
  _id?: string;
  topic: string;
  date?: string;
  presenter?: string;
}

interface PersonalEntry {
  _id?: string;
  activity: string;
  date?: string;
  notes?: string;
}

interface LogbookEntry {
  _id: string;
  student: { _id: string; name: string; idNumber?: string; email?: string };
  rotation: { _id: string; rotationName: string; rotationType?: string; rotationUnit?: string };
  academicYear: { _id: string; name: string };
  date: string;
  callDuty: DayEntry[];
  clinicDays: DayEntry[];
  theatreDays: DayEntry[];
  cwrDays: DayEntry[];
  rwrDays: DayEntry[];
  other: DayEntry[];
  presentationTutorials: TutorialEntry[];
  personal: PersonalEntry[];
  notes: string;
  createdAt: string;
}

interface EntryFormData {
  rotation: string;
  academicYear: string;
  date: string;
  callDuty: DayEntry[];
  clinicDays: DayEntry[];
  theatreDays: DayEntry[];
  cwrDays: DayEntry[];
  rwrDays: DayEntry[];
  other: DayEntry[];
  presentationTutorials: TutorialEntry[];
  personal: PersonalEntry[];
  notes: string;
}

const DAY_SECTIONS: { key: keyof EntryFormData; label: string; icon: typeof CalendarDays }[] = [
  { key: "clinicDays", label: "Clinic Days", icon: CalendarDays },
  { key: "theatreDays", label: "Theatre Days", icon: Stethoscope },
  { key: "cwrDays", label: "Consultant Ward Round", icon: ClipboardList },
  { key: "rwrDays", label: "Resident Ward Round", icon: ClipboardList },
  { key: "callDuty", label: "Call Duty", icon: Clock },
  { key: "other", label: "Other Activities", icon: FileText },
];

export default function LogbookEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [rotationFilter, setRotationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null);
  const [viewEntry, setViewEntry] = useState<LogbookEntry | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const limit = 15;

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(rotationFilter !== "all" && { rotationId: rotationFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const { data } = await api.get(`/logbook-entries?${params}`);
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(Math.ceil((data.total ?? 0) / limit));
    } catch (error) {
      console.error("Failed to load logbook entries", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, rotationFilter, dateFrom, dateTo]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this logbook entry?")) return;
    try {
      await api.delete(`/logbook-entries/${id}`);
      setEntries((prev) => prev.filter((e) => e._id !== id));
    } catch (error) {
      console.error("Failed to delete entry", error);
    }
  };

  const openForm = (entry?: LogbookEntry) => {
    setEditingEntry(entry ?? null);
    setShowForm(true);
  };

  const handleFormSubmit = async (payload: Record<string, any>) => {
    try {
      if (editingEntry) {
        const { data } = await api.put(`/logbook-entries/${editingEntry._id}`, payload);
        setEntries((prev) => prev.map((e) => (e._id === editingEntry._id ? data : e)));
      } else {
        const { data } = await api.post("/logbook-entries", payload);
        setEntries((prev) => [data, ...prev]);
      }
      setShowForm(false);
    } catch (error) {
      console.error("Failed to save entry", error);
    }
  };

  const openView = (entry: LogbookEntry) => {
    setViewEntry(entry);
    setShowViewModal(true);
  };

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isConsultant = user?.role === "unit_consultant";
  const isResident = user?.role === "unit_resident";
  const canCreate = isAdmin || isTeacher || isStudent || isConsultant || isResident;

  const dayCount = (entry: LogbookEntry, key: keyof LogbookEntry) => {
    const arr = entry[key] as DayEntry[] | undefined;
    return arr?.length ?? 0;
  };

  return (
    <div id="page-logbook-entries" className="space-y-6" style={{ marginLeft: "30px", marginTop: "40px" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Logbook Entries</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage clinical logbook submissions.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => openForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Search
                value={search}
                onChange={setSearch}
                placeholder="Search by student or rotation..."
                className="w-full"
              />
            </div>
            <Input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-40"
            />
            <Input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-40"
            />
            <Select value={rotationFilter} onValueChange={setRotationFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Rotation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rotations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No logbook entries found</p>
              <p className="text-xs mt-1">Submit your first entry to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Rotation</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Theatre</TableHead>
                    <TableHead>CWR</TableHead>
                    <TableHead>RWR</TableHead>
                    <TableHead>Call</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry._id}>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{entry.student?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{entry.student?.idNumber ?? ""}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{entry.rotation?.rotationName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{entry.rotation?.rotationUnit ?? ""}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{dayCount(entry, "clinicDays")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{dayCount(entry, "theatreDays")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{dayCount(entry, "cwrDays")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{dayCount(entry, "rwrDays")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{dayCount(entry, "callDuty")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.academicYear?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(entry)}>
                              <BookOpen className="h-3 w-3 mr-2" /> View Details
                            </DropdownMenuItem>
                            {(isAdmin || isTeacher || isConsultant || user?._id === entry.student?._id) && (
                              <>
                                <DropdownMenuItem onClick={() => openForm(entry)}>
                                  <Pencil className="h-3 w-3 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(entry._id)} className="text-red-600">
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

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={(v) => !v && setShowViewModal(false)}>
        <DialogContent className="max-w-[712px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logbook Entry — {viewEntry?.student?.name}</DialogTitle>
            <DialogDescription>View complete details of this logbook entry including all sections and activities.</DialogDescription>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium">{format(new Date(viewEntry.date), "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Rotation</p>
                  <p className="font-medium">{viewEntry.rotation?.rotationName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Student</p>
                  <p className="font-medium">{viewEntry.student?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Academic Year</p>
                  <p className="font-medium">{viewEntry.academicYear?.name ?? "—"}</p>
                </div>
              </div>

              {DAY_SECTIONS.map(({ key, label, icon: Icon }) => {
                const items = (viewEntry as any)[key] as DayEntry[] | undefined;
                if (!items?.length) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">{label}</p>
                      <Badge variant="outline" className="text-xs ml-auto">{items.length} entries</Badge>
                    </div>
                    <div className="space-y-1 bg-muted/40 rounded-lg p-3 text-xs">
                      {items.map((item, i) => (
                        <div key={i} className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {item.time && <p><span className="text-muted-foreground">Time:</span> {item.time}</p>}
                          {item.procedure && <p><span className="text-muted-foreground">Procedure:</span> {item.procedure}</p>}
                          {item.diagnosis && <p><span className="text-muted-foreground">Diagnosis:</span> {item.diagnosis}</p>}
                          {item.supervisor && <p><span className="text-muted-foreground">Supervisor:</span> {item.supervisor}</p>}
                          {item.hours && <p><span className="text-muted-foreground">Hours:</span> {item.hours}</p>}
                          {item.location && <p><span className="text-muted-foreground">Location:</span> {item.location}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {viewEntry.presentationTutorials?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Presentation Tutorials</p>
                  <div className="space-y-1 bg-muted/40 rounded-lg p-3 text-xs">
                    {viewEntry.presentationTutorials.map((t, i) => (
                      <div key={i} className="grid grid-cols-2 gap-x-4">
                        {t.topic && <p><span className="text-muted-foreground">Topic:</span> {t.topic}</p>}
                        {t.presenter && <p><span className="text-muted-foreground">Presenter:</span> {t.presenter}</p>}
                        {t.date && <p><span className="text-muted-foreground">Date:</span> {format(new Date(t.date), "MMM d, yyyy")}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewEntry.personal?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Personal Notes</p>
                  <div className="space-y-1 bg-muted/40 rounded-lg p-3 text-xs">
                    {viewEntry.personal.map((p, i) => (
                      <div key={i} className="grid grid-cols-2 gap-x-4">
                        {p.activity && <p><span className="text-muted-foreground">Activity:</span> {p.activity}</p>}
                        {p.date && <p><span className="text-muted-foreground">Date:</span> {format(new Date(p.date), "MMM d, yyyy")}</p>}
                        {p.notes && <p className="col-span-2"><span className="text-muted-foreground">Notes:</span> {p.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewEntry.notes && (
                <div>
                  <p className="text-sm font-semibold mb-2">Notes</p>
                  <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                    {viewEntry.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent className="max-w-[712px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Entry" : "New Logbook Entry"}</DialogTitle>
            <DialogDescription>{editingEntry ? "Update the details of this logbook entry." : "Fill in the details to create a new logbook entry."}</DialogDescription>
          </DialogHeader>
          <EntryForm
            entry={editingEntry}
            onSubmit={handleFormSubmit}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Entry Form ──────────────────────────────────────────────────────────────

interface EntryFormProps {
  entry: LogbookEntry | null;
  onSubmit: (payload: Record<string, any>) => void;
  onClose: () => void;
}

function EntryForm({ entry, onSubmit, onClose }: EntryFormProps) {
  const { year: currentYear, user } = useAuth();
  const isStudent = user?.role === "student";
  const [form, setForm] = useState<EntryFormData>({
    rotation: entry?.rotation?._id ?? "",
    academicYear: entry?.academicYear?._id ?? currentYear?._id ?? "",
    date: entry?.date?.split("T")[0] ?? "",
    callDuty: entry?.callDuty ?? [],
    clinicDays: entry?.clinicDays ?? [],
    theatreDays: entry?.theatreDays ?? [],
    cwrDays: entry?.cwrDays ?? [],
    rwrDays: entry?.rwrDays ?? [],
    other: entry?.other ?? [],
    presentationTutorials: entry?.presentationTutorials ?? [],
    personal: entry?.personal ?? [],
    notes: entry?.notes ?? "",
  });

  const [activeSection, setActiveSection] = useState<string>("clinicDays");
  const [submitting, setSubmitting] = useState(false);
  const [rotations, setRotations] = useState<Array<{ _id: string; rotationName: string; rotationStatus?: string; student?: { _id?: string } }>>([]);
  const [academicYears, setAcademicYears] = useState<Array<{ _id: string; name: string }>>([]);

  useEffect(() => {
    api.get("/clinical-rotations/list?limit=200").then(({ data }) => {
      const rotationData = Array.isArray(data) ? data : (data?.rotations ?? []);
      setRotations(rotationData.map((r: any) => ({ _id: r._id, rotationName: r.rotationName, rotationStatus: r.rotationStatus, student: r.student, students: r.students } as any)));
    });
    api.get("/academic-years").then(({ data }) => {
      const years = Array.isArray(data) ? data : (data?.years ?? []);
      setAcademicYears(years);
    });
  }, []);

  const signupRotationFromForm = async (rotationId: string) => {
    try {
      const { data } = await api.post(`/clinical-rotations/${rotationId}/signup`);
      toast.success("Signed up for rotation");
      // update rotation list
      setRotations((prev) => prev.map((r) => (r._id === data._id ? { ...r, student: data.student, students: data.students ?? [] } : r)));
    } catch (e: any) {
      console.error("Signup failed", e);
      toast.error(e.response?.data?.message || "Failed to sign up");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      ...form,
      date: new Date(form.date).toISOString(),
    });
    setSubmitting(false);
  };

  const updateDayEntry = (key: keyof EntryFormData, idx: number, field: string, value: string | number) => {
    setForm((prev) => {
      const updated = [...(prev[key] as DayEntry[])];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [key]: updated };
    });
  };

  const addDayEntry = (key: keyof EntryFormData) => {
    setForm((prev) => ({
      ...prev,
      [key]: [...(prev[key] as DayEntry[]), { time: "", procedures: [], diagnosis: "", supervisor: "" }],
    }));
  };

  const removeDayEntry = (key: keyof EntryFormData, idx: number) => {
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] as DayEntry[]).filter((_, i) => i !== idx),
    }));
  };

  const updateProcedure = (key: keyof EntryFormData, idx: number, pIdx: number, value: string) => {
    setForm((prev) => {
      const updated = [...(prev[key] as any[])];
      const entry = { ...(updated[idx] || {}) };
      const procs = Array.isArray(entry.procedures) ? [...entry.procedures] : (entry.procedure ? [entry.procedure] : []);
      procs[pIdx] = value;
      entry.procedures = procs;
      // remove legacy single procedure field to keep shape consistent
      delete entry.procedure;
      updated[idx] = entry;
      return { ...prev, [key]: updated };
    });
  };

  const addProcedure = (key: keyof EntryFormData, idx: number) => {
    setForm((prev) => {
      const updated = [...(prev[key] as any[])];
      const entry = { ...(updated[idx] || {}) };
      const procs = Array.isArray(entry.procedures) ? [...entry.procedures] : (entry.procedure ? [entry.procedure] : []);
      procs.push("");
      entry.procedures = procs;
      delete entry.procedure;
      updated[idx] = entry;
      return { ...prev, [key]: updated };
    });
  };

  const removeProcedure = (key: keyof EntryFormData, idx: number, pIdx: number) => {
    setForm((prev) => {
      const updated = [...(prev[key] as any[])];
      const entry = { ...(updated[idx] || {}) };
      const procs = Array.isArray(entry.procedures) ? [...entry.procedures] : (entry.procedure ? [entry.procedure] : []);
      procs.splice(pIdx, 1);
      entry.procedures = procs;
      delete entry.procedure;
      updated[idx] = entry;
      return { ...prev, [key]: updated };
    });
  };

  const updateTutorial = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const updated = [...prev.presentationTutorials];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, presentationTutorials: updated };
    });
  };

  const addTutorial = () => {
    setForm((prev) => ({
      ...prev,
      presentationTutorials: [...prev.presentationTutorials, { topic: "", presenter: "", date: "" }],
    }));
  };

  const removeTutorial = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      presentationTutorials: prev.presentationTutorials.filter((_, i) => i !== idx),
    }));
  };

  const updatePersonal = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const updated = [...prev.personal];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, personal: updated };
    });
  };

  const addPersonal = () => {
    setForm((prev) => ({
      ...prev,
      personal: [...prev.personal, { activity: "", date: "", notes: "" }],
    }));
  };

  const removePersonal = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      personal: prev.personal.filter((_, i) => i !== idx),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium mb-1 block">Rotation *</label>
          <Select value={form.rotation} onValueChange={(v) => setForm({ ...form, rotation: v })}>
            <SelectTrigger><SelectValue placeholder="Select rotation" /></SelectTrigger>
            <SelectContent>
              {rotations.map((r) => (
                <SelectItem key={r._id} value={r._id}>{r.rotationName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Signup helper for students */}
          {isStudent && form.rotation && (
            (() => {
              const sel = rotations.find((x) => x._id === form.rotation);
              if (!sel) return null;
              const userIsParticipant = (sel as any).students?.some?.((s: any) => s._id === user?._id) || sel.student?._id === user?._id;
              if (userIsParticipant) return <p className="text-xs text-muted-foreground mt-1">You are signed up for this rotation.</p>;
              if (sel.rotationStatus !== "active") return <p className="text-xs text-muted-foreground mt-1">Rotation not open for signup.</p>;
              return <div className="mt-2"><Button size="sm" onClick={() => signupRotationFromForm(sel._id)}>Sign up for this rotation</Button></div>;
            })()
          )}
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Academic Year *</label>
          <Select value={form.academicYear} onValueChange={(v) => setForm({ ...form, academicYear: v })}>
            <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => (
                <SelectItem key={y._id} value={y._id}>{y.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Date *</label>
          <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {DAY_SECTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              activeSection === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/70"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setActiveSection("tutorials")}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            activeSection === "tutorials"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          Tutorials
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("personal")}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            activeSection === "personal"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          Personal
        </button>
      </div>

      {/* Day entry sections */}
      {DAY_SECTIONS.map(({ key, label, icon: Icon }) => {
        if (activeSection !== key) return null;
        const items = (form[key] as DayEntry[]) ?? [];
        return (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{label}</p>
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => addDayEntry(key)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No entries yet.</p>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-muted/40 rounded-lg p-3">
                  <Input placeholder="Time (e.g., 08:00-12:00)" value={item.time ?? ""} onChange={(e) => updateDayEntry(key, idx, "time", e.target.value)} className="text-xs h-8" />
                  <div>
                    <div className="flex flex-col gap-2 max-h-36 overflow-auto pr-1">
                      {( (item.procedures ?? (item.procedure ? [item.procedure] : [])) as string[] ).map((p, pIdx) => (
                        <div key={pIdx} className="flex gap-1 items-center">
                          <Input placeholder={`Procedure ${pIdx + 1}`} value={p ?? ""} onChange={(e) => updateProcedure(key, idx, pIdx, e.target.value)} className="text-xs h-8 flex-1" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeProcedure(key, idx, pIdx)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => addProcedure(key, idx)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Procedure
                      </Button>
                    </div>
                  </div>
                  <Input placeholder="Diagnosis" value={item.diagnosis ?? ""} onChange={(e) => updateDayEntry(key, idx, "diagnosis", e.target.value)} className="text-xs h-8" />
                  <div className="flex gap-1">
                    <Input placeholder="Supervisor" value={item.supervisor ?? ""} onChange={(e) => updateDayEntry(key, idx, "supervisor", e.target.value)} className="text-xs h-8 flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeDayEntry(key, idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}

      {/* Presentation Tutorials */}
      {activeSection === "tutorials" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Presentation Tutorials</p>
            <Button type="button" size="sm" variant="outline" onClick={addTutorial}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {(form.presentationTutorials ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No tutorials yet.</p>
          ) : (
            (form.presentationTutorials ?? []).map((t, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/40 rounded-lg p-3">
                <Input placeholder="Topic" value={t.topic} onChange={(e) => updateTutorial(idx, "topic", e.target.value)} className="text-xs h-8" />
                <Input placeholder="Presenter" value={t.presenter ?? ""} onChange={(e) => updateTutorial(idx, "presenter", e.target.value)} className="text-xs h-8" />
                <div className="flex gap-1">
                  <Input type="date" placeholder="Date" value={t.date ?? ""} onChange={(e) => updateTutorial(idx, "date", e.target.value)} className="text-xs h-8 flex-1" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeTutorial(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Personal */}
      {activeSection === "personal" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Personal Notes</p>
            <Button type="button" size="sm" variant="outline" onClick={addPersonal}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {(form.personal ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No personal entries yet.</p>
          ) : (
            (form.personal ?? []).map((p, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/40 rounded-lg p-3">
                <Input placeholder="Activity" value={p.activity} onChange={(e) => updatePersonal(idx, "activity", e.target.value)} className="text-xs h-8" />
                <Input placeholder="Date" type="date" value={p.date ?? ""} onChange={(e) => updatePersonal(idx, "date", e.target.value)} className="text-xs h-8" />
                <div className="flex gap-1">
                  <Input placeholder="Notes" value={p.notes ?? ""} onChange={(e) => updatePersonal(idx, "notes", e.target.value)} className="text-xs h-8 flex-1" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePersonal(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs font-medium mb-1 block">General Notes</label>
        <Textarea
          placeholder="Additional notes..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="text-sm"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : entry ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
