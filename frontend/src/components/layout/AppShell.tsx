import type { PropsWithChildren } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Bell, Menu, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar-context";
import { useAuth } from "@/hooks/useAuth";

import { cn } from "@/lib/utils";

import Footer from "@/components/home/Footer";

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
      return "Settings";
    case "users":
      return "People";
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
      return parts[1] === "exams" ? "Exams" : "LMS";
    default:
      return "Page";
  }
}

export default function AppShell({ children }: PropsWithChildren) {
  // Note: Outlet is rendered by react-router. Using Outlet here allows
  // route elements to render into the right-side content.
  const { toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-svh w-full bg-background">
      {/* Right column wrapper */}
      <div className="flex min-h-svh flex-col md:ml-[0px]">
        {/* Top Nav */}
        {location.pathname !== "/" && location.pathname !== "/login" && (
          <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
              <div className="flex items-center gap-2">
                {/* Hamburger toggles sidebar open/close */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSidebar}
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-4 w-4" />
                </Button>

                <div className="hidden sm:block">
                  <h1 className="text-base font-semibold">{pageTitle}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/notifications")}
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Button>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="User menu"
                    onClick={() => {
                      // placeholder; dropdown can be added later
                    }}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </div>

                <div className="hidden md:block text-sm text-muted-foreground">
                  {user?.name ?? "User"}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={cn("flex-1", location.pathname === "/" || location.pathname === "/login" ? "" : "p-0")}> 
          {/* If the route uses children, render it; otherwise Outlet will be provided by parent router */}
          {children ?? <Outlet />}
        </main>

        {/* Footer for protected pages */}
        {location.pathname !== "/" && location.pathname !== "/login" && (
          <div className="mt-auto">
            <Footer />
          </div>
        )}
      </div>
    </div>
  );
}

