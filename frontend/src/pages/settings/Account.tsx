import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Camera,
  Lock,
  User,
  BookOpen,
  GraduationCap,
  UsersRound,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Search,
  Clock,
  TrendingUp,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { W11Icon, type W11Glyph } from "@/components/icons/W11Icon";
import type { user } from "@/types";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────
type NavItemId = "profile" | "photo" | "academic" | "linked" | "password";

interface NavSection {
  title?: string;
  items: { id: NavItemId; icon: W11Glyph; label: string }[];
}

function buildNavSections(role?: string): NavSection[] {
  const sections: NavSection[] = [
    {
      title: "Profile",
      items: [
        { id: "profile", icon: "user-circle", label: "Personal Info" },
        { id: "photo", icon: "camera", label: "Profile Photo" },
      ],
    },
  ];
  if (role === "student" || role === "teacher") {
    sections.push({
      title: "Academic",
      items: [
        {
          id: "academic",
          icon: role === "student" ? "book-open" : "graduation-cap",
          label: role === "student" ? "Class Information" : "Teaching Subjects",
        },
      ],
    });
  }
  if (role === "parent") {
    sections.push({
      title: "Family",
      items: [{ id: "linked", icon: "users", label: "Linked Students" }],
    });
  }
  sections.push({
    title: "Security",
    items: [{ id: "password", icon: "shield", label: "Change Password" }],
  });
  return sections;
}

// ─── Main component ───────────────────────────────────────────
const Account = () => {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<NavItemId>("profile");
  const [openSections, setOpenSections] = useState<Record<NavItemId, boolean>>({ profile: true });

  // ─── State ───────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Parent-specific
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<user[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<user | null>(null);
  const [studentAttendance, setStudentAttendance] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [studentCourses, setStudentCourses] = useState<any[]>([]);

  // ─── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (!studentSearch.trim() || studentSearch.length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const { data } = await api.get(`/users?role=student&search=${encodeURIComponent(studentSearch)}&limit=20`);
        const students = (data.users as user[]).filter((s) => {
          const fullName = (s.name ?? "").toLowerCase();
          const query = studentSearch.toLowerCase().trim();
          return fullName.startsWith(query);
        });
        const existingIds = (user?.parentStudents ?? []).map((s: any) =>
          typeof s === "string" ? s : s._id
        );
        setSearchResults(students.filter((s) => !existingIds.includes(s._id)));
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch, user]);

  // ─── Helpers ─────────────────────────────────────────────────
  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getDisplayClasses = () => {
    if (user?.role === "student") {
      if (user?.studentClass)
        return typeof user.studentClass === "object" ? user.studentClass.name : user.studentClass;
      if (user?.studentClasses?.length)
        return user.studentClasses.map((c: any) => (typeof c === "object" ? c.name : c)).join(", ");
    }
    if (user?.role === "teacher") {
      if (user?.teacherSubjects?.length)
        return user.teacherSubjects.map((s: any) => (typeof s === "object" ? s.name : s)).join(", ");
      if (user?.teacherSubject?.length)
        return user.teacherSubject.map((s: any) => (typeof s === "object" ? s.name : s)).join(", ");
    }
    return "N/A";
  };

  const getAttendanceStats = () => {
    if (!studentAttendance?.stats) return null;
    const stats: Record<string, number> = {};
    studentAttendance.stats.forEach((s: any) => { stats[s._id] = s.count; });
    const total = Object.values(stats).reduce((a, b) => a + b, 0) || 1;
    return {
      present: stats.present ?? 0,
      absent: stats.absent ?? 0,
      late: stats.late ?? 0,
      excused: stats.excused ?? 0,
      percentage: Math.round(((stats.present ?? 0) + (stats.late ?? 0)) / total * 100),
    };
  };

  const loadStudentDetails = async (student: user) => {
    setSelectedStudent(student);
    setLoadingDetails(true);
    try {
      const { data: attendanceData } = await api.get(`/attendance/student/${student._id}/summary`);
      setStudentAttendance(attendanceData);
      const { data: profileData } = await api.get(`/users/${student._id}`);
      const profile = profileData.user ?? profileData;
      setStudentDetails(profile);
      const classId = typeof profile.studentClasses === "object" ? profile.studentClasses?._id : profile.studentClasses;
      if (classId) {
        try {
          const { data: classData } = await api.get(`/classes/${classId}`);
          setStudentCourses((classData.class ?? classData).subjects ?? (classData.class ?? classData).courses ?? []);
        } catch { setStudentCourses([]); }
      } else { setStudentCourses([]); }
    } catch (e) { console.error(e); }
    finally { setLoadingDetails(false); }
  };

  const handleLinkStudent = async (studentId: string) => {
    try {
      setLinking(true);
      const existingIds = (user?.parentStudents ?? []).map((s: any) => typeof s === "string" ? s : s._id);
      await api.put(`/users/update/${user?._id}`, { parentStudents: [...existingIds, studentId] });
      toast.success("Student linked successfully");
      const { data } = await api.get(`/users/profile`);
      setUser(data.user ?? data);
      setStudentSearch(""); setSearchResults([]); setIsLinkDialogOpen(false);
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to link student"); }
    finally { setLinking(false); }
  };

  const handleUnlinkStudent = async (studentId: string) => {
    try {
      const existingIds = (user?.parentStudents ?? []).map((s: any) => typeof s === "string" ? s : s._id);
      await api.put(`/users/update/${user?._id}`, { parentStudents: existingIds.filter((id) => id !== studentId) });
      toast.success("Student unlinked");
      const { data } = await api.get(`/users/profile`);
      setUser(data.user ?? data);
      if (selectedStudent?._id === studentId) { setSelectedStudent(null); setStudentAttendance(null); setStudentDetails(null); }
    } catch (e) { toast.error("Failed to unlink student"); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image size must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!imagePreview || !user) return;
    try { setUploadingImage(true); await api.put(`/users/update/${user._id}`, { profileImage: imagePreview }); setProfileImage(imagePreview); setImagePreview(null); toast.success("Profile image updated"); }
    catch (e) { toast.error("Failed to update profile image"); }
    finally { setUploadingImage(false); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try { setSaving(true); await api.put(`/users/update/${user._id}`, { name, email }); const { data } = await api.get(`/users/${user._id}`); setUser(data.user ?? data); toast.success("Profile updated"); }
    catch (e) { toast.error("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) { toast.error("Please fill in all password fields"); return; }
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    try { setChangingPassword(true); await api.put(`/users/update/${user?._id}`, { currentPassword, password: newPassword }); toast.success("Password changed successfully"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    catch (e: any) { toast.error(e.response?.data?.message || "Failed to change password"); }
    finally { setChangingPassword(false); }
  };

  const navSections = buildNavSections(user?.role);
  const flatSections = navSections.flatMap((s) => s.items);

  const toggleSection = (id: NavItemId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Animated collapse for smooth Windows-11-like reveal
  function AnimatedCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      // measure and animate maxHeight for smooth transition to/from auto
      const height = el.scrollHeight;
      if (open) {
        el.style.transition = "max-height 320ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease, transform 260ms cubic-bezier(.2,.9,.2,1)";
        el.style.maxHeight = height + "px";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      } else {
        el.style.transition = "max-height 280ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease, transform 220ms cubic-bezier(.2,.9,.2,1)";
        el.style.maxHeight = "0px";
        el.style.opacity = "0";
        el.style.transform = "translateY(-6px)";
      }
    }, [open]);

    return (
      <div
        ref={ref}
        style={{ maxHeight: open ? undefined : "0px", overflow: "hidden", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(-6px)" }}
      >
        {children}
      </div>
    );
  }

  const AtAGlance = () => {
    if (!user) return null;
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">At a glance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {user.role === "parent" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Children</p>
              <p className="text-lg font-medium">{(user.parentStudents ?? []).length ?? 0}</p>
            </div>
          )}
          {user.role === "teacher" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Classes / Subjects</p>
              <p className="text-lg font-medium">{getDisplayClasses()}</p>
            </div>
          )}
          {user.role === "student" && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Upcoming Lectures</p>
                <p className="text-lg font-medium">{user.upcomingLectures?.length ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Upcoming Exams</p>
                <p className="text-lg font-medium">{user.upcomingExams?.length ?? "—"}</p>
              </div>
            </>
          )}
          {user.role === "admin" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">System</p>
              <p className="text-lg font-medium">Admin privileges</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Content panels ─────────────────────────────────────────
  const ProfilePanel = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Personal Info</h2>
        <p className="text-sm text-muted-foreground mt-1">Update your name and contact details</p>
      </div>
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={imagePreview ?? profileImage ?? ""} alt={user?.name} />
              <AvatarFallback className="text-lg">{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1.5" onClick={() => { setActiveSection("photo"); fileInputRef.current?.click(); }}>
                <Camera className="h-3 w-3" /> Change photo
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="name" className="text-xs font-medium">Full Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="email" className="text-xs font-medium">Email Address</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs font-medium">ID Number</Label><div className="flex h-9 items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">{user?.idNumber ?? "N/A"}</div></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Role</Label>
              <div className="flex h-9 items-center gap-2 px-3 rounded-md border bg-muted text-sm">
                {user?.role === "admin" ? <Shield className="h-4 w-4" /> : user?.role === "teacher" ? <GraduationCap className="h-4 w-4" /> : user?.role === "student" ? <BookOpen className="h-4 w-4" /> : user?.role === "parent" ? <UsersRound className="h-4 w-4" /> : <User className="h-4 w-4" />}
                <span className="capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" size="sm" onClick={() => { setName(user?.name ?? ""); setEmail(user?.email ?? ""); }}>Reset</Button>
          <Button size="sm" onClick={handleSaveProfile} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>
    </div>
  );

  const PhotoPanel = () => (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">Profile Photo</h2><p className="text-sm text-muted-foreground mt-1">Upload a photo to personalize your account</p></div>
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <Avatar className="h-28 w-28">
              <AvatarImage src={imagePreview ?? profileImage ?? ""} alt={user?.name} />
              <AvatarFallback className="text-2xl">{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>
          <div className="flex flex-col gap-2">
            {imagePreview ? (
              <>
                <p className="text-sm font-medium">Preview: {user?.name}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleImageUpload} disabled={uploadingImage}>{uploadingImage ? "Uploading..." : "Save Photo"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setImagePreview(null)}>Cancel</Button>
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground">Click the camera icon to upload a photo</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const AcademicPanel = () => (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">{user?.role === "student" ? "Class Information" : "Teaching Subjects"}</h2><p className="text-sm text-muted-foreground mt-1">{user?.role === "student" ? "Your assigned class and academic details" : "Subjects you teach"}</p></div>
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-5">
          <div className="flex flex-wrap gap-2">
            {getDisplayClasses().split(", ").map((item, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-secondary text-secondary-foreground">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const LinkedStudentsPanel = () => (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">Linked Students</h2><p className="text-sm text-muted-foreground mt-1">Students associated with your account</p></div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><UsersRound className="h-4 w-4" /><span>{user?.parentStudents?.length ?? 0} linked</span></div>
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Link Student</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Link a Student</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by full student name..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="pl-9" />
                  {searching && <div className="absolute right-2.5 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {searchResults.length === 0 && studentSearch.length >= 3 && !searching && <p className="text-sm text-muted-foreground text-center py-4">No students found</p>}
                  {searchResults.length === 0 && studentSearch.length < 3 && <p className="text-sm text-muted-foreground text-center py-4">Enter full student name to search</p>}
                  {searchResults.map((student) => (
                    <div key={student._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border"><AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(student.name)}</AvatarFallback></Avatar>
                        <div><p className="text-sm font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.idNumber}</p></div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleLinkStudent(student._id)} disabled={linking}><Plus className="h-3 w-3" />Link</Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {!user?.parentStudents || user.parentStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4"><UsersRound className="h-10 w-10 text-muted-foreground/50 mb-3" /><p className="text-sm text-muted-foreground text-center">No students linked yet.<br /><span className="text-xs">Click "Link Student" to add your child.</span></p></div>
        ) : (
          <div className="divide-y">
            {user.parentStudents.map((student: any, index: number) => {
              const studentId = typeof student === "string" ? student : student._id;
              const studentName = typeof student === "object" ? student.name : null;
              const isSelected = selectedStudent?._id === studentId;
              return (
                <div key={index} className={cn("flex items-center justify-between px-5 py-3.5 transition-colors cursor-pointer", isSelected ? "bg-primary/5" : "hover:bg-muted/30")}
                  onClick={() => {
                    const s = typeof student === "object" ? student : null;
                    if (!s) { const found = searchResults.find((r) => r._id === studentId); if (found) loadStudentDetails(found); }
                    else { loadStudentDetails(s); }
                  }}>
                  <div className="flex items-center gap-3">
                    <Avatar className={cn("h-10 w-10 border", isSelected ? "border-primary ring-2 ring-primary/20" : "border-border")}>
                      <AvatarFallback className={cn("text-sm", isSelected ? "bg-primary text-primary-foreground" : "bg-muted")}>{getInitials(studentName ?? "Loading...")}</AvatarFallback>
                    </Avatar>
                    <div><p className={cn("text-sm font-medium", isSelected && "text-primary")}>{studentName ?? "Loading..."}</p>{studentName && <p className="text-xs text-muted-foreground">Student</p>}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected && <span className="text-xs text-primary font-medium">Selected</span>}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleUnlinkStudent(studentId); }}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedStudent && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4 border-b">
            <Avatar className="h-12 w-12 border-2 border-primary/20"><AvatarFallback className="bg-primary/10 text-primary">{getInitials(selectedStudent.name)}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0"><h3 className="text-base font-semibold truncate">{selectedStudent.name}</h3><p className="text-sm text-muted-foreground">{selectedStudent.idNumber}</p></div>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { setSelectedStudent(null); setStudentAttendance(null); setStudentDetails(null); }}><X className="h-4 w-4" /></Button>
          </div>
          <div className="divide-y">
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3"><BookOpen className="h-4 w-4 text-muted-foreground" /><h4 className="text-sm font-semibold">Class Information</h4></div>
              {loadingDetails ? (<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading...</div>) :
               studentDetails?.studentClasses?.length ? (
                <div className="space-y-2 pl-6">
                  <div className="flex flex-wrap gap-2">{studentDetails.studentClasses.map((c: any, i: number) => (<span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{c.name ?? c}</span>))}</div>
                  {studentDetails.studentClasses[0]?.academicYear?.name && <p className="text-xs text-muted-foreground">Academic Year: {studentDetails.studentClasses[0].academicYear.name}</p>}
                </div>
              ) : studentDetails?.studentClass ? (
                <div className="space-y-1 pl-6"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{typeof studentDetails.studentClass === "object" ? studentDetails.studentClass.name : studentDetails.studentClass}</span></div>
              ) : (<p className="text-sm text-muted-foreground pl-6">No class assigned</p>)}
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-muted-foreground" /><h4 className="text-sm font-semibold">Attendance</h4></div>
              {loadingDetails ? (<div className="flex items-center gap-2 text-sm text-muted-foreground pl-6"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading...</div>) : (() => {
                const stats = getAttendanceStats();
                if (!stats) return <p className="text-sm text-muted-foreground pl-6">No attendance data</p>;
                return (
                  <div className="space-y-3 pl-6">
                    <div className="flex items-center justify-between max-w-xs"><span className="text-sm text-muted-foreground">Overall</span><span className={cn("text-sm font-semibold", stats.percentage >= 75 ? "text-green-600" : stats.percentage >= 50 ? "text-yellow-600" : "text-red-600")}>{stats.percentage}%</span></div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden max-w-xs"><div className={cn("h-full rounded-full", stats.percentage >= 75 ? "bg-green-500" : stats.percentage >= 50 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${stats.percentage}%` }} /></div>
                    <div className="flex gap-6 max-w-xs"><div><p className="text-lg font-bold text-green-600">{stats.present}</p><p className="text-xs text-muted-foreground">Present</p></div><div><p className="text-lg font-bold text-red-600">{stats.absent}</p><p className="text-xs text-muted-foreground">Absent</p></div><div><p className="text-lg font-bold text-yellow-600">{stats.late}</p><p className="text-xs text-muted-foreground">Late</p></div><div><p className="text-lg font-bold text-blue-600">{stats.excused}</p><p className="text-xs text-muted-foreground">Excused</p></div></div>
                  </div>
                );
              })()}
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-muted-foreground" /><h4 className="text-sm font-semibold">Recent Attendance</h4></div>
              {loadingDetails ? (<div className="flex items-center gap-2 text-sm text-muted-foreground pl-6"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading...</div>) :
               studentAttendance?.records?.length ? (
                <div className="space-y-2 pl-6">
                  {studentAttendance.records.slice(0, 6).map((record: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize", record.status === "present" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : record.status === "absent" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : record.status === "late" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300")}>{record.status}</span>
                        <div><p className="text-sm font-medium">{record.course?.name ?? "Unknown Course"}</p><p className="text-xs text-muted-foreground">{new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
                      </div>
                      {record.lecturer?.name && <p className="text-xs text-muted-foreground">{record.lecturer.name}</p>}
                    </div>
                  ))}
                </div>
              ) : (<p className="text-sm text-muted-foreground pl-6">No attendance records yet</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const PasswordPanel = () => (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">Change Password</h2><p className="text-sm text-muted-foreground mt-1">Update your password to keep your account secure</p></div>
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-xs font-medium">Current Password</Label>
            <div className="relative">
              <Input id="currentPassword" type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="pr-10" />
              <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="newPassword" className="text-xs font-medium">New Password</Label><Input id="newPassword" type={showPasswords ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" /></div>
            <div className="space-y-1.5"><Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm New Password</Label><Input id="confirmPassword" type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" /></div>
          </div>
          <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
        </div>
        <div className="flex items-center justify-end border-t px-6 py-4">
          <Button onClick={handleChangePassword} disabled={changingPassword}>{changingPassword ? "Changing..." : "Change Password"}</Button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "photo": return <PhotoPanel />;
      case "academic": return <AcademicPanel />;
      case "linked": return <LinkedStudentsPanel />;
      case "password": return <PasswordPanel />;
      default: return <ProfilePanel />;
    }
  };

  return (
    <div className="flex-1 min-h-0">
      {/* Profile header spanning full width */}
      <div className="rounded-xl bg-card p-6 max-w-[1100px] mx-auto ml-[2%]">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Avatar className="h-28 w-28">
            <AvatarImage src={imagePreview ?? profileImage ?? ""} alt={user?.name} />
            <AvatarFallback className="text-2xl">{getInitials(user?.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold truncate">{user?.name}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs">
              {user?.role === "admin" ? <Shield className="h-3.5 w-3.5" /> : user?.role === "teacher" ? <GraduationCap className="h-3.5 w-3.5" /> : user?.role === "student" ? <BookOpen className="h-3.5 w-3.5" /> : <UsersRound className="h-3.5 w-3.5" />}
              <span className="capitalize">{user?.role}</span>
            </div>
          </div>
          <div className="sm:ml-4">
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-9">Change photo</Button>
          </div>
        </div>
      </div>

      {/* Main single-column content */}
      <main className="mt-6 p-6 space-y-6 max-w-[1100px] mx-auto">
        <AtAGlance />
        <div className="space-y-4">
          {flatSections.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card overflow-hidden">
              <button onClick={() => toggleSection(item.id)} className="w-full flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <W11Icon glyph={item.icon} size="sm" className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex flex-col items-start">
                    <p className="text-sm font-medium text-left">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 text-left">{item.label === "Personal Info" ? "Update your name and contact details" : item.label === "Profile Photo" ? "Upload a photo to personalize your account" : item.label === "Linked Students" ? "Students associated with your account" : item.label === "Change Password" ? "Update your password to keep your account secure" : ""}</p>
                  </div>
                </div>
                <ChevronRight className={cn("h-4 w-4 transition-transform", openSections[item.id] ? "rotate-90 text-primary" : "text-muted-foreground")} />
              </button>
              <AnimatedCollapse open={!!openSections[item.id]}>
                <div className="px-6 pb-6">
                  {(() => {
                    switch (item.id) {
                      case "photo": return <PhotoPanel />;
                      case "academic": return <AcademicPanel />;
                      case "linked": return <LinkedStudentsPanel />;
                      case "password": return <PasswordPanel />;
                      default: return <ProfilePanel />;
                    }
                  })()}
                </div>
              </AnimatedCollapse>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Account;
