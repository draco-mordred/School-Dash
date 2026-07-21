
"use client";

import { LogOut, ShieldCheck, GraduationCap, BookOpen, Users, type LucideIcon } from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavMainMiniSidebar } from "@/components/sidebar/nav-main-mini-sidebar";
import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/types";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import { toast } from "sonner"; 
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ThemeToogle } from "./ThemeToogle";
import { sidebardata } from "./sidebardata";
import { useInstitution } from "@/lib/useInstitution";
import { getInstitutionDisplayName, getInstitutionSubtitle } from "@/lib/institutionDisplay";

// NOTE: AppSidebar header customization (institution + academic year)
// NavItem is intentionally left as-is for compatibility.
export interface NavItem {
  title: string;
  url: string; // Used for linking and active state matching
  icon?: LucideIcon;
  isActive?: boolean; // Default open state for collapsibles
  roles?: UserRole[]; // Who can see this section? (undefined = everyone)
  items?: {
    title: string;
    url: string;
    roles?: UserRole[]; // Who can see this specific link?
  }[];
}


export function AppSidebar({ collapsible = "icon", ...props }: React.ComponentProps<typeof Sidebar> & { collapsible?: "offcanvas" | "icon" | "none" }) {
  const { user, year, setUser } = useAuth();
  const location = useLocation(); // <--- Get current URL
  const pathname = location.pathname; // e.g., "/dashboard/analytics"
  const navigate = useNavigate();

  const userData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: user?.profileImage ?? "",
  };

  const userRole = (user?.role || "student") as UserRole;
  const normalizedUserRole = ((userRole as string) === "staff" ? "teacher" : userRole) as UserRole | "teacher";

  const roleMeta: Record<string, { icon: LucideIcon; label: string }> = {
    admin: { icon: ShieldCheck, label: "Administrator" },
    teacher: { icon: BookOpen, label: "Teacher" },
    student: { icon: GraduationCap, label: "Student" },
    parent: { icon: Users, label: "Parent" },
    unitconsultant: { icon: BookOpen, label: "Unit Consultant" },
    unitresident: { icon: GraduationCap, label: "Unit Resident" },
  };

  const roleInfo = roleMeta[normalizedUserRole] ?? roleMeta.student;
  const RoleIcon = roleInfo.icon;

  const filteredNav = useMemo(() => {
    return sidebardata.navMain
      .filter((item) => !item.roles || item.roles.includes(normalizedUserRole))
      .map((item) => {
        const isChildActive = item.items?.some((sub) => sub.url === pathname);
        const isMainActive = item.url === pathname;
        return {
          ...item,
          isActive: isMainActive || isChildActive,
          items: item.items
            ?.filter(
              (subItem) => !subItem.roles || subItem.roles.includes(normalizedUserRole),
            )
            .map((subItem) => ({
              ...subItem,
              isActive: subItem.url === pathname,
            })),
        };
      });
  }, [pathname, normalizedUserRole]);
 
  const logout = async () => {
    try {
      const role = user?.role;
      await api.post("/users/logout").finally(() => {
        localStorage.removeItem("token");
        setUser(null);
        if (role === "student") navigate("/student");
        else if (role === "admin") navigate("/admin");
        else navigate("/staff");
        toast.success("Logged out successfully");
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  }; 
  const { institution } = useInstitution();
  const institutionName = getInstitutionDisplayName(institution);
  const institutionSubtitle = getInstitutionSubtitle(institution, year?.name ?? "") || "Institution profile";

  return (
    <Sidebar collapsible={collapsible} {...props}>
      <SidebarHeader>
        {(() => {
          const institutionLogoUrl = institution?.logoUrl ?? null;
          return (
            <div className="w-full px-1">
              <div className="flex items-center gap-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted overflow-hidden border border-border/70 shrink-0">
                  {institutionLogoUrl ? (
                    <img
                      src={institutionLogoUrl}
                      alt={institutionName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {institutionName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{institutionName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{institutionSubtitle}</p>
                </div>
              </div>

              {/* <div className="mt-2 rounded-lg bg-muted/50 px-2 py-2 items-center">
                <p className="text-xs text-muted-foreground">{academicYearName}</p>
              </div> */}
            </div>
          );
        })()}
      </SidebarHeader>
      <SidebarContent>
        {/* Expanded sidebar: click Collapsible (NavMain visible when expanded) */}
        <div className="group-data-[collapsible=icon]:hidden">
          <NavMain items={filteredNav} />
        </div>
        {/* Icon-only sidebar: hover popover (NavMainMiniSidebar visible when collapsed) */}
        <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col">
          <NavMainMiniSidebar items={filteredNav} />
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-border px-0">
        {/* ── Centering overrides for mini (icon-only) sidebar ── */}
        <style>{`
          /* Center the MedLog logo button in the header */
          [data-collapsible="icon"] [data-slot="sidebar-header"] [data-slot="sidebar-menu-button"] {
            justify-content: center !important;
            width: 100%;
          }
          /* TeamSwitcher logo button: hide text grid div (2nd child) and chevron, keep logo div (1st child) */
          [data-collapsible="icon"] [data-slot="sidebar-header"] [data-slot="sidebar-menu-button"] > :nth-child(2) {
            display: none;
          }
          [data-collapsible="icon"] [data-slot="sidebar-header"] [data-slot="sidebar-menu-button"] > :last-child {
            display: none;
          }
          /* Center the nav icons and hide labels + chevrons in icon mode */
          [data-collapsible="icon"] [data-slot="sidebar-menu"] {
            align-items: center;
          }
          [data-collapsible="icon"] [data-slot="sidebar-menu-button"] {
            justify-content: center !important;
          }
          /* Hide text label and chevron arrows in icon mode */
          [data-collapsible="icon"] [data-slot="sidebar-menu-button"] > span:last-of-type {
            display: none;
          }
          [data-collapsible="icon"] [data-slot="sidebar-menu-button"] svg:last-child {
            display: none;
          }
          /* Hide the "Platform" group label in icon mode */
          [data-collapsible="icon"] [data-slot="sidebar-group-label"] {
            display: none;
          }
        `}</style>
        {/* Expanded footer — hidden when collapsed to icon */}
        <div className="group-data-[collapsible=icon]:hidden flex flex-row items-center justify-between gap-2 px-4 py-2">
          <div className="flex flex-row items-center gap-1">
            <SidebarMenuItem title="Logout" className="list-none">
              <Button
                onClick={logout}
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </SidebarMenuItem>
            <ThemeToogle />
          </div>
        </div>
        <div className="group-data-[collapsible=icon]:hidden px-4 pb-2">
          <NavUser user={userData} />
          <div className="mt-4 rounded-3xl border border-border bg-background p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <RoleIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{roleInfo.label}</p>
                <p className="text-xs text-muted-foreground">UNIJOS, JOS, Nigeria</p>
                <p className="truncate text-[7px] text-muted-foreground">{institutionSubtitle}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-1 py-2">
        {/* Compact icon-only footer — only visible when collapsed */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-1 py-2">
          <Button
            onClick={logout}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <RoleIcon className="h-4 w-4" />
          </span>
        </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
