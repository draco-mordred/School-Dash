import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { MoreHorizontal, Plus, Pencil, Trash2, ClipboardList, Stethoscope, CalendarDays, RefreshCw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
import { useNavigate } from "react-router-dom";
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

interface RotationGroup {
  _id?: string;
  name?: string;
  students?: Array<{ _id?: string; name?: string; idNumber?: string }>;
  supervisorName?: string;
  supervisor?: { name?: string };
}

interface PostingEntry {
  name?: string;
  groups?: Array<{
    group?: RotationGroup;
    groupId?: string;
    assigned?: Array<{ startDate: string; endDate: string }>;
  }>;
}

interface RotationSchedule {
  _id?: string;
  postings?: PostingEntry[];
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
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RotationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<RotationType | "all">("all");

  const [showForm, setShowForm] = useState(false);
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);
  const [selectedRotation, setSelectedRotation] = useState<Rotation | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [schedulePostings, setSchedulePostings] = useState<PostingEntry[]>([]);
  const [postingsLoading, setPostingsLoading] = useState(false);
  const [selectedRotationIds, setSelectedRotationIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

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
          const childIds = (parentUser?.parentStudents ?? []).map((child: unknown) =>
            typeof child === "string" ? child : (child as { _id: string })._id
          );
        if (childIds.length > 0) {
          params.set("studentIds", childIds.join(","));
          endpoint = `/clinical-rotations?${params}`;
        }
      }

      const { data } = await api.get(endpoint);
      setRotations(data.rotations ?? []);
      setTotalPages(Math.ceil((data.total ?? 0) / limit));
    } catch (error) {
      console.error("Failed to load rotations", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, user]);

  useEffect(() => {
    void fetchRotations();
  }, [fetchRotations]);

  // Clear selection when rotations are reloaded
  useEffect(() => {
    setSelectedRotationIds(new Set());
  }, [search, statusFilter, typeFilter]);

  // For students, also load generated schedule postings so we can display Active/Upcoming postings
  useEffect(() => {
    if (user?.role !== "student") return;
    let cancelled = false;
    const load = async () => {
      try {
        setPostingsLoading(true);
        // load recent schedules (global) as a fallback
        const { data } = await api.get('/rotation-schedules', { params: { page: 1, limit: 50 } });
        const schedules = (data.schedules as RotationSchedule[]) || [];
        // flatten postings from schedules, keep unique by name
        const map = new Map<string, PostingEntry>();
        for (const s of schedules) {
          for (const p of s.postings || []) {
            if (!p || !p.name) continue;
            if (!map.has(p.name)) map.set(p.name, p);
          }
        }
        if (!cancelled) setSchedulePostings(Array.from(map.values()));
      } catch (e: unknown) {
        console.error('Failed to load schedule postings', e);
      } finally {
        if (!cancelled) setPostingsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user]);

  // For students, also load schedules scoped to their class(es) to show class schedule card
  const [classPostings, setClassPostings] = useState<PostingEntry[]>([]);
  useEffect(() => {
    if (user?.role !== "student") return;
    let cancelled = false;
    const load = async () => {
      try {
        // attempt to derive class ids from user object; fallback to fetching profile if missing
        let rawStudentClasses = (user as any)?.studentClasses ?? (user as any)?.studentClass ?? [];
        if ((!rawStudentClasses || (Array.isArray(rawStudentClasses) && rawStudentClasses.length === 0)) ) {
          try {
            const { data: profileData } = await api.get('/users/profile');
            rawStudentClasses = profileData.user?.studentClasses ?? profileData.user?.studentClass ?? rawStudentClasses;
          } catch (pfErr) {
            // ignore profile fetch errors and continue with whatever we have
          }
        }
        const classIds = Array.isArray(rawStudentClasses)
          ? rawStudentClasses.map((c: any) => (typeof c === 'string' ? c : c._id))
          : rawStudentClasses
            ? [ (typeof rawStudentClasses === 'string' ? rawStudentClasses : rawStudentClasses._id) ]
            : [];

        const params: any = { page: 1, limit: 50 };
        if (classIds.length) params.classId = classIds[0];

        const { data } = await api.get('/rotation-schedules', { params });
        const schedules = (data.schedules as RotationSchedule[]) || [];
        const map = new Map<string, PostingEntry>();
        for (const s of schedules) {
          for (const p of s.postings || []) {
            if (!p || !p.name) continue;
            if (!map.has(p.name)) map.set(p.name, p);
          }
        }
        if (!cancelled) setClassPostings(Array.from(map.values()));
      } catch (e) {
        console.error('Failed to load class schedule postings', e);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this clinical rotation?")) return;
    try {
      await api.delete(`/clinical-rotations/${id}`);
      setRotations((prev) => prev.filter((r) => r._id !== id));
    } catch (error) {
      console.error("Failed to delete rotation", error);
    }
  };

  const handleDeleteMultiple = async () => {
    if (!confirm(`Delete ${selectedRotationIds.size} rotation(s)? This action cannot be undone.`)) return;
    try {
      const ids = Array.from(selectedRotationIds);
      await Promise.all(ids.map((id) => api.delete(`/clinical-rotations/${id}`)));
      setRotations((prev) => prev.filter((r) => !selectedRotationIds.has(r._id)));
      setSelectedRotationIds(new Set());
      setShowDeleteConfirm(false);
      toast.success(`Deleted ${ids.length} rotation(s)`);
    } catch (error) {
      console.error("Failed to delete rotations", error);
      toast.error("Failed to delete some rotations");
    }
  };

  const toggleRotationSelect = (id: string) => {
    const newSelected = new Set(selectedRotationIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRotationIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRotationIds.size === rotations.length && rotations.length > 0) {
      setSelectedRotationIds(new Set());
    } else {
      setSelectedRotationIds(new Set(rotations.map((r) => r._id)));
    }
  };

  const handleDeleteAll = async () => {
    try {
      const ids = rotations.map((r) => r._id);
      await Promise.all(ids.map((id) => api.delete(`/clinical-rotations/${id}`)));
      setRotations([]);
      setSelectedRotationIds(new Set());
      setShowDeleteAllConfirm(false);
      toast.success(`Deleted ${ids.length} rotation(s)`);
    } catch (error) {
      console.error("Failed to delete all rotations", error);
      toast.error("Failed to delete all rotations");
    }
  };

  const openForm = (rotation?: Rotation) => {
    setEditingRotation(rotation ?? null);
    setShowForm(true);
  };

  const handleFormSubmit = async (payload: Record<string, unknown>) => {
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
  const isConsultant = user?.role === "unitconsultant";
  const isResident = user?.role === "unitresident";
  const canCreate = isAdmin || isTeacher || isConsultant || isResident;
  const canGenerateSchedule = isAdmin || isTeacher;

  const [showAvailableDialog, setShowAvailableDialog] = useState(false);
  const [availableRotations, setAvailableRotations] = useState<Rotation[]>([]);
  const [availableSearch, setAvailableSearch] = useState("");
  const [availableLoading, setAvailableLoading] = useState(false);
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [signupRotation, setSignupRotation] = useState<Rotation | null>(null);
  const [supervisors, setSupervisors] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");

  // Generate schedule dialog
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [genAcademicYears, setGenAcademicYears] = useState<Array<{ _id: string; name: string }>>([]);
  const [genClasses, setGenClasses] = useState<Array<{ _id: string; name: string }>>([]);
  const [genAcademicYearId, setGenAcademicYearId] = useState<string>("");
  const [genClassId, setGenClassId] = useState<string>("");
  const [genLevel, setGenLevel] = useState<number>(400);
  const [genStartDate, setGenStartDate] = useState<string>(new Date().toISOString().slice(0,10));

  const openGenerateDialog = async () => {
    setShowGenerateDialog(true);
    try {
      const [{ data: years }, { data: classesRes }] = await Promise.all([
        api.get('/academic-years'),
        api.get('/classes?limit=200')
      ]);
      setGenAcademicYears(Array.isArray(years) ? years : (years?.years ?? []));
      setGenClasses(classesRes.classes ?? []);
    } catch (e: unknown) {
      console.error('Failed to load generation lists', e);
    }
  };

  const confirmGenerate = async () => {
    try {
      await api.post('/rotation-schedules/generate', { academicYearId: genAcademicYearId, classId: genClassId, level: genLevel, options: { startDate: genStartDate } });
      toast.success('Rotation generation started');
      setShowGenerateDialog(false);
      // poll for the generated schedule and navigate to its detail page
      startPollForSchedule(genAcademicYearId, genClassId, genLevel);
    } catch (e: unknown) {
      console.error('Failed to start generation', e);
      toast.error('Failed to start generation');
    }
  };

  const navigate = useNavigate();
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [groupsForRotation, setGroupsForRotation] = useState<Array<{ group?: RotationGroup; groupId?: string; assigned?: Array<{ startDate: string; endDate: string }> }> | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const openGroupsForRotation = async (rot: Rotation) => {
    try {
      setGroupsLoading(true);
      // fetch recent schedules and try to find a posting that matches this rotation name
      const { data } = await api.get('/rotation-schedules', { params: { page: 1, limit: 200 } });
      const schedules = (data.schedules as RotationSchedule[]) || [];
      let found: RotationSchedule | null = null;
      for (const s of schedules) {
        const p = (s.postings || []).find((pp) => String(pp.name) === String(rot.rotationName));
        if (p) { found = s; break; }
      }
      if (!found) {
        toast.warning('No schedule postings found for this rotation');
        setGroupsForRotation(null);
        setShowGroupsModal(true);
        return;
      }
      const { data: detailData } = await api.get(`/rotation-schedules/${found._id}`);
      const detail = detailData as RotationSchedule;
      const posting = (detail.postings || []).find((pp) => String(pp.name) === String(rot.rotationName));
      if (!posting) {
        toast.warning('Posting not found in schedule');
        setGroupsForRotation(null);
        setShowGroupsModal(true);
        return;
      }
      // posting.groups: array of { group: RotationGroup, assigned }
      setGroupsForRotation(posting.groups || []);
      setShowGroupsModal(true);
    } catch (err: unknown) {
      console.error('Failed to load groups', err);
      toast.error('Failed to load groups for this rotation');
    } finally {
      setGroupsLoading(false);
    }
  };
  // tiny helper: poll backend for schedule for this class/year/level
  const startPollForSchedule = (ayId: string, classId: string, level: number) => {
    const maxMs = 60 * 1000; // poll up to 60s
    const start = Date.now();
    const iv = setInterval(async () => {
      try {
        const { data } = await api.get('/rotation-schedules', { params: { academicYearId: ayId, classId, level } });
        if (data && Array.isArray(data.schedules) && data.schedules.length > 0) {
          clearInterval(iv);
          const recent = data.schedules[0];
          navigate(`/rotation-schedules/${recent._id}`);
        } else if (Date.now() - start > maxMs) {
          clearInterval(iv);
          toast.warning('Schedule generation taking longer than expected. Refresh the Rotation Schedules page later.');
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);
  };

  const fetchAvailable = async (q = "") => {
    try {
      setAvailableLoading(true);
      const params: Record<string, string | number> = { page: 1, limit: 50 };
      if (q) params.q = q;

      // Students browse "available" postings (batch-visibility rules) and should see computed status.
      const { data } = await api.get("/clinical-rotations/available", { params: { ...params, page: 1, limit: 50 } });
      setAvailableRotations(data.rotations ?? []);
    } catch (e: unknown) {
      console.error("Failed to fetch available rotations", e);
      toast.error("Failed to fetch available postings");
    } finally {
      setAvailableLoading(false);
    }
  };

  // compute active/upcoming splits for student view
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);
  const activeRotations = rotations.filter((r) => {
    const start = new Date(r.rotationStartDate);
    const end = new Date(r.rotationEndDate);
    return !(end < now || start > nextMonth);
  });
  const upcomingRotations = rotations.filter((r) => new Date(r.rotationStartDate) > nextMonth);

  const openSignupDialog = async (rotation: Rotation) => {
    setSignupRotation(rotation);
    setShowSignupDialog(true);
    // fetch supervisors list (teachers/consultants)
    try {
      const { data } = await api.get('/users?role=teacher&limit=200');
      setSupervisors(data.users ?? []);
      // preselect rotation's current supervisor if present
      setSelectedSupervisor(rotation.rotationSupervisor?._id ?? "");
    } catch (e: unknown) {
      console.error('Failed to load supervisors', e);
      setSupervisors([]);
    }
  };

  // prepare rotations content to avoid nested JSX ternary parsing issues
  // prepare schedule postings view for students
  const postingViews = schedulePostings.map((p, idx) => {
    // determine posting start/end by scanning assigned entries across groups
    let startDate: string | null = null;
    let endDate: string | null = null;
    for (const g of p.groups || []) {
      for (const a of g.assigned || []) {
        const s = new Date(a.startDate);
        const e = new Date(a.endDate);
        if (!startDate || s < new Date(startDate)) startDate = a.startDate;
        if (!endDate || e > new Date(endDate)) endDate = a.endDate;
      }
    }
    const supervisorName = (p.groups && p.groups[0]?.group?.supervisorName) || p.groups?.[0]?.group?.supervisor?.name || "—";
    return {
      _id: `${p.name}-${idx}`,
      rotationName: p.name || "",
      rotationStartDate: startDate || new Date().toISOString(),
      rotationEndDate: endDate || new Date().toISOString(),
      rotationUnit: "—",
      rotationSupervisor: { _id: "", name: supervisorName },
      raw: p,
    } as Rotation & { raw?: PostingEntry };
  });

  // transform class-specific postings into view objects
  const classPostingViews = classPostings.map((p, idx) => {
    let startDate: string | null = null;
    let endDate: string | null = null;
    for (const g of p.groups || []) {
      for (const a of g.assigned || []) {
        const s = new Date(a.startDate);
        const e = new Date(a.endDate);
        if (!startDate || s < new Date(startDate)) startDate = a.startDate;
        if (!endDate || e > new Date(endDate)) endDate = a.endDate;
      }
    }
    const supervisorName = (p.groups && p.groups[0]?.group?.supervisorName) || p.groups?.[0]?.group?.supervisor?.name || "—";
    return {
      _id: `${p.name}-${idx}`,
      rotationName: p.name || "",
      rotationStartDate: startDate || new Date().toISOString(),
      rotationEndDate: endDate || new Date().toISOString(),
      rotationUnit: "—",
      rotationSupervisor: { _id: "", name: supervisorName },
      raw: p,
    } as Rotation & { raw?: PostingEntry };
  });

  const activeClassPostings = classPostingViews.filter((r) => {
    const start = new Date(r.rotationStartDate);
    const end = new Date(r.rotationEndDate);
    return start <= now && end >= now;
  });
  const upcomingClassPostings = classPostingViews.filter((r) => new Date(r.rotationStartDate) > now);

  // student's own rotations (persisted ClinicalRotation documents) that may have been created by the scheduler
  const personalActiveRotations = rotations.filter((r) => r.rotationStatus === "active");
  const personalUpcomingRotations = rotations.filter((r) => r.rotationStatus === "upcoming");

  const activePostings = postingViews.filter((r) => {
    const start = new Date(r.rotationStartDate);
    const end = new Date(r.rotationEndDate);
    return !(end < now || start > nextMonth);
  });
  const upcomingPostings = postingViews.filter((r) => new Date(r.rotationStartDate) > nextMonth);

  // Component: render a student card with expandable list of rotations
  function StudentGroupCard({ g }: { g: { student: { _id?: string; name?: string; idNumber?: string }; rotations: Rotation[] } }) {
    const [open, setOpen] = useState(false);
    const student = g.student;
    const [postingGroups, setPostingGroups] = useState<Record<string, { groupName?: string; supervisorName?: string }>>({});
    const [loadingPostingGroups, setLoadingPostingGroups] = useState(false);
    useEffect(() => {
      let cancelled = false;
      const loadGroups = async () => {
        if (!open) return;
        setLoadingPostingGroups(true);
        try {
          // single call to fetch this student's assignments across schedules
          const { data } = await api.get('/rotation-schedules/student-assignments', { params: { studentId: student._id } });
          const map: Record<string, { groupName?: string; supervisorName?: string }> = {};
          const assignments = data?.assignments || {};
          for (const [postingName, info] of Object.entries(assignments)) {
            if (!info) continue;
            map[postingName] = { groupName: (info as any).groupName, supervisorName: (info as any).supervisorName };
          }
          if (!cancelled) setPostingGroups(map);
        } catch (e) {
          console.error('Failed to load student assignments', e);
        } finally {
          if (!cancelled) setLoadingPostingGroups(false);
        }
      };
      void loadGroups();
      return () => { cancelled = true; };
    }, [open]);
    // precompute sections JSX to avoid complex inline IIFE in JSX
    const sectionsJsx = (() => {
      const now = new Date();
      const byStatus: Record<string, Rotation[]> = { active: [], upcoming: [], completed: [] };
      for (const r of g.rotations) {
        const start = new Date(r.rotationStartDate);
        const end = new Date(r.rotationEndDate);
        const status = (start <= now && end >= now) ? 'active' : (start > now ? 'upcoming' : 'completed');
        byStatus[status].push(r);
      }
      const sections: Array<{ title: string; key: keyof typeof byStatus }> = [ { title: 'Active', key: 'active' }, { title: 'Upcoming', key: 'upcoming' }, { title: 'Completed', key: 'completed' } ];
      return sections.map((sec) => (
        <div key={sec.key} className="space-y-2">
          <div className="text-sm font-medium">{sec.title} ({byStatus[sec.key].length})</div>
          {byStatus[sec.key].length === 0 ? (
            <div className="text-xs text-muted-foreground">No {sec.title.toLowerCase()} rotations</div>
          ) : (
            byStatus[sec.key].map((rot) => {
              const pg = postingGroups[rot.rotationName] || {};
              return (
                <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between bg-white/5">
                  <div>
                    <p className="font-medium">{rot.rotationName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                    <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit} • Supervisor: {pg.supervisorName ?? rot.rotationSupervisor?.name ?? '—'}</p>
                    {pg.groupName && <p className="text-xs text-muted-foreground">Group: {pg.groupName}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Checkbox checked={selectedRotationIds.has(rot._id)} onCheckedChange={() => toggleRotationSelect(rot._id)} aria-label={`Select ${rot.rotationName}`} />
                    )}
                    <Badge className={`text-xs capitalize ${STATUS_COLORS[rot.rotationStatus]}`}>{rot.rotationStatus}</Badge>
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
                        <DropdownMenuItem onClick={() => openGroupsForRotation(rot)}>
                          Groups
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
                  </div>
                </div>
              );
            })
          )}
        </div>
      ));
    })();

    return (
      <div className="border rounded-md p-4 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{student?.name || 'Unknown Student'}</div>
            <div className="text-xs text-muted-foreground">ID: {student?.idNumber || '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">{g.rotations.length} rotation{g.rotations.length !== 1 ? 's' : ''}</div>
            <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>{open ? 'Hide' : 'Show'}</Button>
          </div>
        </div>
        {open && (
          <div className="mt-3 space-y-3">
            {loadingPostingGroups && <div className="text-sm text-muted-foreground">Loading group assignments…</div>}
            {sectionsJsx}
          </div>
        )}
      </div>
    );
  }
  const studentRotationsElement = postingsLoading ? (
    <div className="p-4 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  ) : schedulePostings.length > 0 ? (
    <>
      <div>
        <h3 className="text-lg font-semibold">Active Rotations</h3>
        {activePostings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active rotations</p>
        ) : (
          <div className="grid gap-3">
              {/* Show student's personal active rotations first */}
              {personalActiveRotations.length > 0 ? personalActiveRotations.map((rot) => (
                <div key={`personal-${rot._id}`} className="border rounded-md p-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{rot.rotationName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                    <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit} • Supervisor: {rot.rotationSupervisor?.name ?? '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`text-xs capitalize ${STATUS_COLORS['active']}`}>active</Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                      <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                    </div>
                  </div>
                </div>
              )) : null}
              {activePostings.map((rot) => (
              <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit} • Supervisor: {rot.rotationSupervisor?.name ?? '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['active']}`}>active</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">Upcoming Rotations</h3>
        {upcomingPostings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming rotations</p>
        ) : (
          <div className="grid gap-3">
            {/* Show student's personal upcoming rotations first */}
            {personalUpcomingRotations.length > 0 ? personalUpcomingRotations.map((rot) => (
              <div key={`personal-upcoming-${rot._id}`} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">Starts {format(new Date(rot.rotationStartDate), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['upcoming']}`}>upcoming</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                  </div>
                </div>
              </div>
            )) : null}
            {upcomingPostings.map((rot) => (
              <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">Starts {format(new Date(rot.rotationStartDate), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['upcoming']}`}>upcoming</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  ) : (
    <>
      <div>
        <h3 className="text-lg font-semibold">Active Rotations</h3>
        {activeRotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active rotations</p>
        ) : (
          <div className="grid gap-3">
            {activeRotations.map((rot) => (
              <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit} • Supervisor: {rot.rotationSupervisor?.name ?? '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['active']}`}>active</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">Upcoming Rotations</h3>
        {upcomingRotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming rotations</p>
        ) : (
          <div className="grid gap-3">
            {upcomingRotations.map((rot) => (
              <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">Starts {format(new Date(rot.rotationStartDate), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['upcoming']}`}>upcoming</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
  const rotationsContent = loading ? (
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
      {user?.role === "student" ? (
        <div className="p-4">
          <Card>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Class Rotation Schedule</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Active</h4>
                    {activeClassPostings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active rotations for your class.</p>
                    ) : (
                      <div className="space-y-3 mt-2">
                        {activeClassPostings.map((rot) => (
                          <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                            <div>
                              <p className="font-medium">{rot.rotationName}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                              <p className="text-xs text-muted-foreground">Supervisor: {rot.rotationSupervisor?.name ?? '—'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={`text-xs capitalize ${STATUS_COLORS['active']}`}>active</Badge>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                                <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium">Upcoming</h4>
                    {upcomingClassPostings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upcoming rotations for your class.</p>
                    ) : (
                      <div className="space-y-3 mt-2">
                        {upcomingClassPostings.map((rot) => (
                          <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                            <div>
                              <p className="font-medium">{rot.rotationName}</p>
                              <p className="text-xs text-muted-foreground">Starts {format(new Date(rot.rotationStartDate), 'MMM d, yyyy')}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={`text-xs capitalize ${STATUS_COLORS['upcoming']}`}>upcoming</Badge>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                                <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
          ) : (
            // Group rotations by student for non-student users
            <div className="space-y-4">
              {selectedRotationIds.size > 0 && isAdmin && (
                <div className="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="text-sm font-medium">
                    {selectedRotationIds.size} rotation{selectedRotationIds.size !== 1 ? 's' : ''} selected
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              )}

              {/* Build grouping */}
              {(() => {
                const groups = new Map<string, { student: { _id?: string; name?: string; idNumber?: string }; rotations: Rotation[] }>();
                for (const r of rotations) {
                  const sid = r.student?._id || 'unknown';
                  if (!groups.has(sid)) groups.set(sid, { student: { _id: r.student?._id, name: r.student?.name, idNumber: r.student?.idNumber }, rotations: [] });
                  groups.get(sid)!.rotations.push(r);
                }
                const entries = Array.from(groups.entries());
                return entries.map(([sid, g]) => (
                  <StudentGroupCard key={sid} g={g} />
                ));
              })()}
            </div>
          )}
    </div>
  );

  const confirmSignup = async () => {
    if (!signupRotation) return;
    try {
      const payload: Record<string, unknown> = {};
      if (selectedSupervisor) (payload as Record<string, unknown>).rotationSupervisor = selectedSupervisor;
      const { data } = await api.post(`/clinical-rotations/${signupRotation._id}/signup`, payload);
      toast.success('Signed up successfully');
      setAvailableRotations((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      setRotations((prev) => [data, ...prev]);
      setShowSignupDialog(false);
      setSignupRotation(null);
    } catch (e: unknown) {
      console.error('Signup failed', e);
      toast.error('Failed to sign up for rotation');
    }
  };

  // handleSignup is intentionally not used; prefer using signup dialog flows.

  return (
    <div id="page-clinical-rotations" className="space-y-6 ml-8 mt-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Clinical Rotations</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage student clinical rotation schedules and records.
            </p>
          </div>
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
          {canGenerateSchedule && (
            <Button variant="outline" onClick={() => openGenerateDialog()} className="ml-2">
              <CalendarDays className="h-4 w-4 mr-2" />
              Generate Schedule
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/rotation-schedules')} className="ml-2">
            View Schedules
          </Button>
          {/* Manual creation of clinical postings removed; use Generated Schedules */}
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

      {/* Groups Modal (for postings) */}
      <Dialog open={showGroupsModal} onOpenChange={(v) => !v && setShowGroupsModal(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Groups</DialogTitle>
            <DialogDescription>View groupings and students for this posting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {groupsLoading ? (
              <div>Loading...</div>
            ) : !groupsForRotation || groupsForRotation.length === 0 ? (
              <div className="text-sm text-muted-foreground">No groups found for this posting.</div>
            ) : (
              <div className="space-y-3">
                {groupsForRotation.map((pg) => {
                  const group = pg.group;
                  const assigned = pg.assigned;
                  return (
                    <Card key={group?._id || pg.groupId}>
                      <CardContent>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{group?.name || 'Group'}</div>
                            <div className="text-xs text-muted-foreground">Students: {(group?.students || []).length || 0}</div>
                            <div className="text-xs text-muted-foreground">Supervisor: {group?.supervisorName || group?.supervisor?.name || '—'}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Duration: {assigned && assigned.length ? `${new Date(assigned[0].startDate).toLocaleDateString()} — ${new Date(assigned[assigned.length-1].endDate).toLocaleDateString()}` : 'TBA'}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="font-medium mb-2">Students</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(group?.students || []).map((s) => (
                              <div key={s._id} className="p-2 border rounded">
                                <div className="font-medium">{s.name}</div>
                                <div className="text-xs text-muted-foreground">{s.idNumber || '—'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                                <Button size="sm" onClick={() => openSignupDialog(r)}>Sign up</Button>
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
                                <Button size="sm" onClick={() => openSignupDialog(r)}>Sign up</Button>
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
      {/* Signup Dialog for students to choose supervisor */}
      <Dialog open={showSignupDialog} onOpenChange={(v) => !v && setShowSignupDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign up for rotation</DialogTitle>
            <DialogDescription>Choose the unit supervisor to assign for this signup.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Rotation</label>
              <div className="text-sm">{signupRotation?.rotationName}</div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Posting status</label>
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-xs capitalize ${STATUS_COLORS[(signupRotation?.rotationStatus ?? "upcoming") as RotationStatus]}`}
                >
                  {signupRotation?.rotationStatus ?? "upcoming"}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Select Supervisor</label>
              <Select value={selectedSupervisor} onValueChange={(v) => setSelectedSupervisor(v)}>
                <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignupDialog(false)}>Cancel</Button>
            <Button onClick={confirmSignup}>Confirm Signup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Schedule Dialog (admin/teacher) */}
      <Dialog open={showGenerateDialog} onOpenChange={(v) => setShowGenerateDialog(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Rotation Schedule</DialogTitle>
            <DialogDescription>Choose academic year and class to generate schedules for.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs block mb-1">Academic Year</label>
              <Select value={genAcademicYearId} onValueChange={(v) => setGenAcademicYearId(v)}>
                <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                <SelectContent>
                  {genAcademicYears.map((y) => <SelectItem key={y._id} value={y._id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs block mb-1">Class</label>
              <Select value={genClassId} onValueChange={(v) => setGenClassId(v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {genClasses.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs block mb-1">Level</label>
              <Select value={String(genLevel)} onValueChange={(v) => setGenLevel(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs block mb-1">Start Date</label>
              <Input type="date" value={genStartDate} onChange={(e) => setGenStartDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={confirmGenerate}>Start Generation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardContent className="p-0">{rotationsContent}</CardContent>
        {totalPages > 1 && (
          <div className="border-t px-4 py-3">
            <CustomPagination loading={loading} page={page} setPage={setPage} totalPages={totalPages} />
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

      {/* Delete Multiple Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(v) => !v && setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Rotations</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRotationIds.size} rotation{selectedRotationIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMultiple}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={showDeleteAllConfirm} onOpenChange={(v) => !v && setShowDeleteAllConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete All Rotations</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {rotations.length} rotation{rotations.length !== 1 ? 's' : ''}? This action cannot be undone and will permanently remove all clinical rotation records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAll}>Delete All</Button>
          </DialogFooter>
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

      {/* Delete All Button */}
      {isAdmin && rotations.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteAllConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All {rotations.length} Postings
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Rotation Form ─────────────────────────────────────────────────────────────

interface RotationFormProps {
  rotation: Rotation | null;
  onSubmit: (payload: Record<string, unknown>) => void;
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
