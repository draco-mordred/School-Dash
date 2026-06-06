import type { PropsWithChildren } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  Bell,
  Home,
  Menu,
  User,
  LogOut,
  Settings,
  GraduationCap,
  Shield,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar-context";
import { useAuth } from "@/hooks/useAuth";

import { cn } from "@/lib/utils";

function getRoleIcon(role?: string) {
  switch (role) {
    case "admin":
      return <Shield className="h-4 w-4" />;
    case "teacher":
      return <GraduationCap className="h-4 w-4" />;
    case "student":
      return <User className="h-4 w-4" />;
    case "parent":
      return <Users className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
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
    case "users":
      return parts[1]
        ? parts[1].replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase())
        : "People";
    case "classes":
      return "Classes";
    case "courses":
      return "Courses";
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
  const { toggleSidebar } = useSidebar();
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = getPageTitle(location.pathname);
  const isProtected = location.pathname !== "/" && location.pathname !== "/login";

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <div className="flex min-h-screen flex-1 flex-col">
          {isProtected && (
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
              <div className="flex max-w-7xl h-14 items-center justify-between gap-3 px-3 sm:px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleSidebar}
                    aria-label="Toggle sidebar"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/")}
                    aria-label="Go home"
                  >
                    <Home className="h-4 w-4" />
                  </Button>

                  <div className="min-w-0">
                    <h1 className="truncate text-sm font-semibold sm:text-base">{pageTitle}</h1>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/notifications")}
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Open user menu"
                        className="flex items-center gap-1"
                      >
                        {getRoleIcon(user?.role)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom">
                      <DropdownMenuLabel className="font-semibold">
                        {user?.name ?? "Account"}
                      </DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => navigate("/settings/account")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Account Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>
          )}

          <main className={cn("flex-1", isProtected ? "px-4 md:pl-0 md:pr-4 py-4" : "")}>{children ?? <Outlet />}</main>

          {isProtected && (
            <footer className="border-t border-border bg-background px-4 py-3 text-xs text-muted-foreground">
              <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <span>© {new Date().getFullYear()} Avalon Industries</span>
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

