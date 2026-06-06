"use client";

import { LogOut, ShieldCheck, GraduationCap, BookOpen, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/types";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import { toast } from "sonner"; 
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ThemeToogle } from "./ThemeToogle";
import { sidebardata } from "./sidebardata";

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


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, year, setUser } = useAuth();
  const location = useLocation(); // <--- Get current URL
  const pathname = location.pathname; // e.g., "/dashboard/analytics"
  const navigate = useNavigate();

  const userData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: "",
  };

  const userRole = (user?.role || "student") as UserRole;

  const roleMeta: Record<UserRole, { icon: LucideIcon; label: string }> = {
    admin: { icon: ShieldCheck, label: "Administrator" },
    teacher: { icon: BookOpen, label: "Teacher" },
    student: { icon: GraduationCap, label: "Student" },
    parent: { icon: Users, label: "Parent" },
  };

  const roleInfo = roleMeta[userRole] ?? roleMeta.student;
  const RoleIcon = roleInfo.icon;

  const filteredNav = useMemo(() => {
    return sidebardata.navMain
      .filter((item) => !item.roles || item.roles.includes(userRole))
      .map((item) => {
        const isChildActive = item.items?.some((sub) => sub.url === pathname);
        const isMainActive = item.url === pathname;
        return {
          ...item,
          isActive: isMainActive || isChildActive,
          items: item.items
            ?.filter(
              (subItem) => !subItem.roles || subItem.roles.includes(userRole),
            )
            .map((subItem) => ({
              ...subItem,
              isActive: subItem.url === pathname,
            })),
        };
      });
  }, [pathname, userRole]);
 
  const logout = async () => {
    try {
      await api.post("/users/logout").finally(() => {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/login");
        toast.success("Logged out successfully");
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  }; 
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebardata.teams} yearName={year?.name ?? "Year"} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNav} />
      </SidebarContent>
      <SidebarFooter className="border-t border-border px-0">
        <div className="flex flex-row items-center justify-between gap-2 px-4 py-2">
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
        <div className="px-4 pb-2">
          <NavUser user={userData} />
          <div className="mt-4 rounded-3xl border border-border bg-background p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <RoleIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{roleInfo.label}</p>
                <p className="text-xs text-muted-foreground">UNIJOS, JOS, Nigeria</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
