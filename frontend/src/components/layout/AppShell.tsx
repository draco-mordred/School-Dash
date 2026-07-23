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
// Using the Web Animations API directly for the notifications dropdown

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const { notifications, unreadCount, isLoading } = useNotifications(1, 5);

  const pageTitle = getPageTitle(location.pathname);
  const isProtected = location.pathname !== "/" && location.pathname !== "/login";

  // Expandable search state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsMenuState, setNotificationsMenuState] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsTimerRef = useRef<number | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const notificationsWrapperRef = useRef<HTMLDivElement | null>(null);
  const notificationsAnimRef = useRef<Animation | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

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

  const clearNotificationsTimer = () => {
    if (notificationsTimerRef.current) {
      window.clearTimeout(notificationsTimerRef.current);
      notificationsTimerRef.current = null;
    }
  };

  const openNotificationsMenu = () => {
    clearNotificationsTimer();
    setNotificationsMenuState("opening");
    setIsNotificationsOpen(true);
  };

  const closeNotificationsMenu = () => {
    clearNotificationsTimer();
    setNotificationsMenuState("closing");
  };

  const handleNotificationItemClick = (link?: string) => {
    if (link) navigate(link);
    else navigate("/notifications");
    closeNotificationsMenu();
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      // If click is outside the notifications wrapper, close menu
      if (!notificationsWrapperRef.current) return;
      if (!notificationsWrapperRef.current.contains(event.target as Node)) {
        closeNotificationsMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      clearNotificationsTimer();
    };
  }, []);

  // Accessibility: if any ancestor is set to aria-hidden while it contains
  // the active element, blur the active element and set `inert` on that
  // subtree when supported so assistive tech won't lose sync.
  useEffect(() => {
    if (typeof MutationObserver === "undefined" || typeof document === "undefined") return;

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "aria-hidden") {
          const target = m.target as HTMLElement | null;
          if (!target) continue;
          const isHidden = target.getAttribute("aria-hidden") === "true";
          try {
            if (isHidden) {
              const active = document.activeElement as HTMLElement | null;
              if (active && target.contains(active)) {
                try { active.blur(); } catch {}
                try { (target as any).inert = true; } catch {}
                try { (document.body as HTMLElement).focus(); } catch {}
              }
            } else {
              try { (target as any).inert = false; } catch {}
            }
          } catch (err) {
            // ignore errors here
          }
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["aria-hidden"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!notificationsMenuRef.current) return;
    const el = notificationsMenuRef.current;
    const backdropEl = backdropRef.current;

    // cancel any in-flight animations
    if (notificationsAnimRef.current) {
      try { notificationsAnimRef.current.cancel(); } catch (e) {}
      notificationsAnimRef.current = null;
    }

    if (notificationsMenuState === "opening") {
      if (!el) return;
      // ensure starting styles to avoid jumps
      el.style.opacity = "0";
      el.style.transform = "translateY(-8px) scaleY(0.96)";
      el.style.clipPath = "inset(0 0 100% 0 round 16px)";
      el.style.transformOrigin = "top right";
      el.style.willChange = "transform, opacity, clip-path";

      // animate backdrop (if present)
      if (backdropEl) {
        try { backdropEl.style.pointerEvents = "auto"; } catch (e) {}
        const bAnim = backdropEl.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 200, easing: "linear", fill: "forwards" }
        );
        // safe store so we can cancel later
        notificationsAnimRef.current = bAnim;
      }

      const anim = el.animate(
        [
          { opacity: 0, transform: "translateY(-8px) scaleY(0.96)", clipPath: "inset(0 0 100% 0 round 16px)" },
          { opacity: 1, transform: "translateY(0) scaleY(1)", clipPath: "inset(0 0 0% 0 round 16px)" },
        ],
        { duration: 260, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", fill: "forwards" }
      );
      notificationsAnimRef.current = anim;
      anim.finished.then(() => {
        notificationsAnimRef.current = null;
        if (notificationsMenuState === "opening") setNotificationsMenuState("open");
      }).catch(() => {});
      return;
    }

    if (notificationsMenuState === "closing") {
      if (!el) return;
      // animate backdrop out
      if (backdropEl) {
        try { backdropEl.style.pointerEvents = "none"; } catch (e) {}
        const bAnim = backdropEl.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 200, easing: "linear", fill: "forwards" }
        );
        notificationsAnimRef.current = bAnim;
      }

      const anim = el.animate(
        [
          { opacity: 1, transform: "translateY(0) scaleY(1)", clipPath: "inset(0 0 0% 0 round 16px)" },
          { opacity: 0, transform: "translateY(-8px) scaleY(0.96)", clipPath: "inset(0 0 100% 0 round 16px)" },
        ],
        { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }
      );
      notificationsAnimRef.current = anim;
      anim.finished.then(() => {
        notificationsAnimRef.current = null;
        if (notificationsMenuState === "closing") {
          setNotificationsMenuState("closed");
          setIsNotificationsOpen(false);
        }
      }).catch(() => {});
    }
  }, [notificationsMenuState, isNotificationsOpen]);

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
    const role = user?.role;
    localStorage.removeItem("token");
    setUser(null);
    if (role === "student") navigate("/student");
    else if (role === "admin") navigate("/admin");
    else navigate("/staff");
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
        .animate-ring { 
        animation: ring 1.2s ease-in-out infinite; 
        }
        .notification-dropdown-scroll {
          transform-origin: top right;
          will-change: transform, opacity, clip-path;
          backface-visibility: hidden;
          contain: layout paint;
          background: var(--background);
          border: solid 0.5px var(--accent);
          box-shadow: 0px 8px 20px 4px var(--border);
          max-height: 28rem;
          overflow: hidden;
        }
        #app-main {
          contain: layout paint;
          transform: translateZ(0);
          isolation: isolate;
        }
        #notificationScrollHeader{
          box-shadow: black 2px -8px 20px 0px;
        }
        .page-transition {
          contain: layout paint;
          transform: translateZ(0);
          isolation: isolate;
        }
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

                  <div className="relative" ref={notificationsWrapperRef}>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Notifications"
                      className="relative h-8 w-8"
                      onClick={() => {
                        if (isNotificationsOpen) {
                          closeNotificationsMenu();
                        } else {
                          openNotificationsMenu();
                        }
                      }}
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

                    {isNotificationsOpen && (
                      <>
                        {/* <div
                          ref={backdropRef}
                          className={cn(
                            "fixed inset-0 z-40 bg-background/25 transition-opacity duration-200",
                            notificationsMenuState === "open" || notificationsMenuState === "opening"
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                          aria-hidden="true"
                          style={{ pointerEvents: notificationsMenuState === "open" || notificationsMenuState === "opening" ? "auto" : "none" }}
                        /> */}
                        <div></div>
                        <div
                          ref={notificationsMenuRef}
                          className="notification-dropdown-scroll absolute right-0 top-full mt-2 z-[60] w-80 overflow-hidden rounded-xl border border-border/80 bg-background/85 p-0 shadow-2xl"
                        >
                        <div id="notificationScrollHeader" className="flex items-center justify-between border-b border-border px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold">Notifications</p>
                            <p className="text-xs text-muted-foreground">
                              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleNotificationItemClick("/notifications")}>
                            View all
                          </Button>
                        </div>
                        {isLoading ? (
                          <div className="space-y-2 p-3">
                            <div className="h-8 animate-pulse rounded bg-muted" />
                            <div className="h-8 animate-pulse rounded bg-muted" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-muted-foreground">No recent notifications</div>
                        ) : (
                          <div className="max-h-80 overflow-y-auto">
                            {notifications.slice(0, 5).map((notification) => (
                              <button
                                key={notification._id}
                                type="button"
                                onClick={() => handleNotificationItemClick(notification.link || "/notifications")}
                                className="flex w-full cursor-pointer flex-col items-start gap-1 rounded-none px-3 py-2 text-left transition-colors hover:bg-accent"
                              >
                                <div className="flex w-full items-center justify-between gap-3">
                                  <span className="truncate text-sm font-medium">{notification.title}</span>
                                  {!notification.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                                </div>
                                <span className="text-xs text-muted-foreground">{notification.message}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        </div>
                      </>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Open user menu"
                        className="h-8 w-8 p-0"
                      >
                        <Avatar className="h-8 w-8">
                          {user?.profileImage ? (
                            <AvatarImage src={user.profileImage} alt={user?.name ?? "User"} />
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {getInitials(user?.name)}
                            </AvatarFallback>
                          )}
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

          <main
            id="app-main"
            className={cn("flex-1 overflow-y-auto will-change-transform", isProtected ? "mt-[0px] px-4 md:pl-0 md:pr-4 py-4 pb-16" : "")}
            style={{ contain: "layout paint" }}
          >
            <div key={location.pathname} className="page-transition will-change-transform">{children ?? <Outlet />}</div>
          </main>
          {/* <MordredFloatingChat /> */}
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

