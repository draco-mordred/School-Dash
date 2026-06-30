import type { PropsWithChildren } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Home,
  Menu,
  LogOut,
  Settings,
  GraduationCap,
  Shield,
  Users,
  BookOpen,
  UserCircle,
  UsersRound,
  Search,
  X,
  ChevronRight,
} from "lucide-react";
import { W11Icon, type W11Glyph } from "@/components/icons/W11Icon";
import { useState, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar-context";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { MordredFloatingChat } from "../dashboard/mordred-floating-chat";

import { cn } from "@/lib/utils";

function getRoleIcon(role?: string) {
  switch (role) {
    case "admin":
      return <Shield className="h-4 w-4" />;
    case "teacher":
      return <GraduationCap className="h-4 w-4" />;
    case "student":
      return <BookOpen className="h-4 w-4" />;
    case "parent":
      return <UsersRound className="h-4 w-4" />;
    default:
      return <UserCircle className="h-4 w-4" />;
  }
}

function getRoleIconLarge(role?: string) {
  switch (role) {
    case "admin":
      return <Shield className="h-6 w-6" />;
    case "teacher":
      return <GraduationCap className="h-6 w-6" />;
    case "student":
      return <BookOpen className="h-6 w-6" />;
    case "parent":
      return <UsersRound className="h-6 w-6" />;
    default:
      return <UserCircle className="h-6 w-6" />;
  }
}

function getRoleLabel(role?: string) {
  switch (role) {
    case "admin":
      return "Administrator";
    case "teacher":
      return "Teacher";
    case "student":
      return "Student";
    case "parent":
      return "Parent";
    default:
      return "User";
  }
}

function getAcademicStatusLabel(status?: string | null) {
  switch (status) {
    case "professor":
      return "Prof.";
    case "associate professor":
      return "Assoc. Prof.";
    case "lecturer i":
      return "Lect. I";
    case "lecturer ii":
      return "Lect. II";
    case "assistant lecturer":
      return "Asst. Lect.";
    case "resident":
      return "Res.";
    default:
      return null;
  }
}

function getDepartmentRoleLabel(role?: string | null) {
  switch (role) {
    case "head of department":
      return "HOD";
    case "dean of faculty":
      return "Dean";
    case "exam officer":
      return "Ex. Off.";
    default:
      return null;
  }
}

function getUserSubInfo(user: any) {
  switch (user?.role) {
    case "student":
      if (user?.studentClass) {
        return `Class: ${typeof user.studentClass === 'object' ? user.studentClass.name : user.studentClass}`;
      }
      if (user?.studentClasses?.length) {
        const classes = user.studentClasses.map((c: any) => typeof c === 'object' ? c.name : c);
        return `Classes: ${classes.join(", ")}`;
      }
      return "Student";
    case "teacher":
      if (user?.teacherSubjects?.length) {
        const subjects = user.teacherSubjects.map((s: any) => typeof s === 'object' ? s.name : s);
        return `Subjects: ${subjects.join(", ")}`;
      }
      if (user?.teacherSubject?.length) {
        const subjects = user.teacherSubject.map((s: any) => typeof s === 'object' ? s.name : s);
        return `Subjects: ${subjects.join(", ")}`;
      }
      return "Teacher";
    case "parent":
      if (user?.parentStudents?.length) {
        const count = (user.parentStudents ?? []).length;
        // Collect class names if available on child objects (avoid showing raw IDs)
        const classNames: string[] = [];
        (user.parentStudents ?? []).forEach((s: any) => {
          if (s && typeof s === "object") {
            const rawClass = s.studentClasses ?? s.studentClass;
            const className = rawClass && typeof rawClass === "object" ? rawClass.name : (typeof rawClass === "string" ? null : null);
            if (className) classNames.push(className);
          }
        });
        const classesPart = classNames.length ? ` · Classes: ${Array.from(new Set(classNames)).join(", ")}` : "";
        return `Children: ${count}${classesPart}`;
      }
      return "Parent";
    case "admin":
      return `ID: ${user?.idNumber || "N/A"} • Admin Access`;
    default:
      return user?.role || "User";
  }
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getPageTitle(pathname: string) {
  const clean = pathname.replace(/^\//, "");
  if (!clean) return "Home";
  const parts = clean.split("/");
  const first = parts[0];

  switch (first) {
    case "dashboard":
      return "Dashboard";
    case "activities-log":
      return "Activities Log";
    case "settings":
      return parts[1] === "academic-years" ? "Academic Years" : "Settings";
    case "timetable":
      return parts[1] === "calendar" ? "Academic Calendar" : "Timetable";
    case "users":
      return parts[1]
        ? parts[1].replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase())
        : "People";
    case "classes":
      return "Classes";
    case "courses":
      return "Courses";
    case "student-portal":
      return "Student Portal";
    case "student":
      if (!parts[1]) return "Student";
      return parts[1]
        .split("-")
        .map((segment) => segment[0].toUpperCase() + segment.slice(1))
        .join(" ");
    case "subjects":
      return "Subjects";
    case "attendance":
      return "Attendance";
    case "timetable":
      return "Timetable";
    case "lms":
      return parts[1] === "exams"
        ? parts[2]
          ? "Exam Details"
          : "Exams"
        : "LMS";
    case "notifications":
      return "Notifications";
    default:
      return first.replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
  }
}

export default function AppShell({ children }: PropsWithChildren) {
  const { toggleSidebar, state: sidebarState } = useSidebar();
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const pageTitle = getPageTitle(location.pathname);
  const isProtected = location.pathname !== "/" && location.pathname !== "/login";

  // Expandable search state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search expands
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  // Collapse search on Escape
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchExpanded(false);
      setSearchQuery("");
    }
  };

  // Collapse search when clicking outside
  const handleSearchBlur = () => {
    if (!searchQuery) {
      setSearchExpanded(false);
    }
  };

  // ─── Role-based pages registry ────────────────────────────────
  const allPages = [
    // Admin
    { role: "admin", title: "Dashboard", path: "/dashboard", icon: "shield" as W11Glyph },
    { role: "admin", title: "Manage Students", path: "/users/students", icon: "graduation-cap" as W11Glyph },
    { role: "admin", title: "All Users", path: "/users", icon: "users" as W11Glyph },
    { role: "admin", title: "Classes", path: "/classes", icon: "layers" as W11Glyph },
    { role: "admin", title: "Attendance", path: "/attendance", icon: "clipboard-list" as W11Glyph },
    { role: "admin", title: "Timetable", path: "/timetable", icon: "clock" as W11Glyph },
    { role: "admin", title: "Settings", path: "/settings", icon: "settings" as W11Glyph },
    { role: "admin", title: "Academic Years", path: "/timetable/calendar", icon: "info" as W11Glyph },
    { role: "admin", title: "Notifications", path: "/notifications", icon: "bell" as W11Glyph },
    { role: "admin", title: "Activities Log", path: "/activities-log", icon: "shield" as W11Glyph },
    // Teacher
    { role: "teacher", title: "Dashboard", path: "/dashboard", icon: "shield" as W11Glyph },
    { role: "teacher", title: "Take Attendance", path: "/attendance", icon: "clipboard-list" as W11Glyph },
    { role: "teacher", title: "My Classes", path: "/classes", icon: "layers" as W11Glyph },
    { role: "teacher", title: "Timetable", path: "/timetable", icon: "clock" as W11Glyph },
    { role: "teacher", title: "Results", path: "/lms/exams", icon: "trending-up" as W11Glyph },
    { role: "teacher", title: "Notifications", path: "/notifications", icon: "bell" as W11Glyph },
    { role: "teacher", title: "Settings", path: "/settings", icon: "settings" as W11Glyph },
    // Student
    { role: "student", title: "Dashboard", path: "/dashboard", icon: "shield" as W11Glyph },
    { role: "student", title: "My Portal", path: "/student-portal", icon: "book-open" as W11Glyph },
    { role: "student", title: "My Attendance", path: "/attendance", icon: "bar-chart" as W11Glyph },
    { role: "student", title: "Timetable", path: "/timetable", icon: "clock" as W11Glyph },
    { role: "student", title: "Courses", path: "/courses", icon: "book-open" as W11Glyph },
    { role: "student", title: "Notifications", path: "/notifications", icon: "bell" as W11Glyph },
    { role: "student", title: "Settings", path: "/settings", icon: "settings" as W11Glyph },
    // Parent
    { role: "parent", title: "Dashboard", path: "/dashboard", icon: "shield" as W11Glyph },
    { role: "parent", title: "My Children", path: "/settings/account", icon: "users" as W11Glyph },
    { role: "parent", title: "Children's Attendance", path: "/attendance", icon: "bar-chart" as W11Glyph },
    { role: "parent", title: "Timetables", path: "/timetable", icon: "clock" as W11Glyph },
    { role: "parent", title: "Notifications", path: "/notifications", icon: "bell" as W11Glyph },
    { role: "parent", title: "Settings", path: "/settings", icon: "settings" as W11Glyph },
  ];

  const userRole = user?.role ?? "";
  const filteredPages = allPages.filter(
    (page) =>
      page.role === userRole &&
      page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-14deg); }
          30% { transform: rotate(12deg); }
          40% { transform: rotate(-12deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(-8deg); }
          70% { transform: rotate(6deg); }
          80% { transform: rotate(-4deg); }
          90% { transform: rotate(2deg); }
        }
        .animate-ring { animation: ring 1.2s ease-in-out infinite; }
      `}</style>
      <div className="flex min-h-screen">
        <div className="flex min-h-screen flex-1 flex-col">
          {isProtected && (
            <header className="fixed top-0 z-60 left-0 right-0 border-b border-border bg-background/60 dark:bg-background/60 backdrop-blur-xl Supports-[backdrop-blur]:bg-background/30 transition-all duration-200 ease-in-out" style={{backdropFilter: 'blur(10px)'}}>
              <div className="flex h-14 items-center justify-between gap-4 px-4">
                {/* Left: Hamburger + Home + Title */}
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    aria-label="Toggle sidebar"
                    className="h-8 w-8"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/dashboard")}
                    aria-label="Go to dashboard"
                    className="h-8 w-8"
                  >
                    <Home className="h-4 w-4" />
                  </Button>

                  <div className="hidden xs:flex items-center gap-1.5 min-w-0">
                    <span className="text-muted-foreground">/</span>
                    <h1 className="truncate text-sm font-medium">{pageTitle}</h1>
                  </div>

                  {/* Mobile only title */}
                  <div className="xs:hidden min-w-0">
                    <h1 className="truncate text-sm font-medium">{pageTitle}</h1>
                  </div>
                </div>

                {/* Center: User Info (hidden on small screens) */}
                <div className="hidden md:flex flex-col items-center justify-center text-center mx-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{user?.name?.toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground">—</span>
                    <span className="text-xs text-muted-foreground font-mono">{user?.idNumber || "N/A"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {getUserSubInfo(user)}
                  </div>
                </div>

                {/* Right: Search + Notifications + User Avatar (always visible, sticky) */}
                <div className="flex items-center gap-1">
                  {/* Role-aware Search with dropdown */}
                  <div className={cn("relative transition-all duration-300 ease-in-out", searchExpanded ? "w-64" : "w-8")}>
                    {searchExpanded ? (
                      /* Full search input */
                      <div className="flex items-center gap-1 w-full rounded-lg border border-border bg-muted/50 px-2 py-1">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          onBlur={handleSearchBlur}
                          placeholder="Search pages..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={() => { setSearchExpanded(false); setSearchQuery(""); }}
                          className="rounded p-0.5 hover:bg-accent"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      /* Search icon button — click to expand */
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchExpanded(true)}
                        aria-label="Search"
                        className="h-8 w-8"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Search Results Dropdown */}
                    {searchExpanded && searchQuery && filteredPages.length > 0 && (
                      <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
                        {filteredPages.map((page) => (
                          <button
                            key={page.path}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              navigate(page.path);
                              setSearchExpanded(false);
                              setSearchQuery("");
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <W11Icon glyph={page.icon} size="sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{page.title}</div>
                              <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
                            </div>
                            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results */}
                    {searchExpanded && searchQuery && filteredPages.length === 0 && (
                      <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg z-50 px-4 py-6 text-center">
                        <p className="text-sm text-muted-foreground">No pages found</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">Try searching for {user?.role} pages</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/notifications")}
                    aria-label="Notifications"
                    className="relative h-8 w-8"
                  >
                    <Bell
                      className={cn(
                        "h-4 w-4 transition-transform",
                        unreadCount > 0 && "animate-ring"
                      )}
                    />
                    {unreadCount > 0 ? (
                      <span className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Open user menu"
                        className="h-8 w-8 p-0"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(user?.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user?.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                          <div className="flex items-center gap-1 pt-1">
                            {getRoleIcon(user?.role)}
                            <span className="text-xs text-muted-foreground">{getRoleLabel(user?.role)}</span>
                          </div>
                          {(user?.academicStatus || user?.departmentRole) && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              {user?.departmentRole && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  {getDepartmentRoleLabel(user.departmentRole)}
                                </span>
                              )}
                              {user?.academicStatus && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  {getAcademicStatusLabel(user.academicStatus)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => navigate("/settings/account")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Account Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleLogout} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>
          )}

          <main id="app-main" className={cn("flex-1 overflow-y-auto", isProtected ? "mt-[0px] px-4 md:pl-0 md:pr-4 py-4 pb-16" : "")}>{children ?? <Outlet />}</main>
          <MordredFloatingChat />
          {isProtected && (
            <footer
              id="app-footer"
              className="fixed bottom-0 z-50 border-t border-border bg-background px-4 py-3 text-xs text-muted-foreground transition-[left,right,width] duration-200 ease-linear"
              style={{
                left: sidebarState === "expanded" ? "var(--sidebar-width)" : "var(--sidebar-width-icon)",
                right: 0,
                width: `calc(100% - ${sidebarState === "expanded" ? "var(--sidebar-width)" : "var(--sidebar-width-icon)"})`,
              }}
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <span>© {new Date().getFullYear()} Avalon Enterprises</span>
                <div className="flex flex-wrap items-center gap-2">
                  <a href="#" className="transition-colors hover:text-foreground">
                    Privacy policy
                  </a>
                  <span className="hidden sm:inline">|</span>
                  <a href="#" className="transition-colors hover:text-foreground">
                    Terms of use
                  </a>
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

