"use client";

import { useLocation } from "react-router";

import { NavMain } from "@/components/sidebar/nav-main";
import type { LucideIcon } from "lucide-react";
import { sidebardata } from "@/components/sidebar/sidebardata";
import type { UserRole } from "@/types";



import { useAuth } from "@/hooks/useAuth";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import { ThemeToogle } from "@/components/sidebar/ThemeToogle";
import { NavUser } from "@/components/sidebar/nav-user";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

/**
 * Mini sidebar: icons-only, used on medium + smaller screens.
 * Uses the same sidebar data/filters/active logic as AppSidebar.
 */
export function AppMiniSidebar({
  yearNameOverride,
  ...props
}: React.ComponentProps<typeof Sidebar> & { yearNameOverride?: string }) {
  const { user, year, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
  const isCollapsedIconsOnly = true;

  const userRole = (user?.role || "student") as UserRole;

  const filteredNav = sidebardata.navMain
    .filter((item) => !item.roles || item.roles.includes(userRole))
    .map((item) => {
      const isChildActive = item.items?.some((sub: { url: string }) => sub.url === pathname);
      const isMainActive = item.url === pathname;
      return {
        ...item,
        isActive: isMainActive || isChildActive,
        items: item.items
          ?.filter((subItem) => !subItem.roles || subItem.roles.includes(userRole))
          .map((subItem) => ({
            ...subItem,
            isActive: subItem.url === pathname,
          })),
      } as typeof sidebardata.navMain[number];
    });

  const userData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: "",
  };

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
    <Sidebar
      collapsible="icon"
      side="left"
      className={cn("hidden md:flex", isCollapsedIconsOnly && "md:block")}
      {...props}
    >
      <SidebarHeader>
        <TeamSwitcher
          teams={sidebardata.teams}
          yearName={year?.name ?? yearNameOverride ?? "Year"}
        />
      </SidebarHeader>

      <SidebarContent>
        {/* NavMain already supports icon-only mode via collapsible=icon */}
        <NavMain
          items={filteredNav.map((item) => ({
            title: item.title,
            url: item.url,
            icon: item.icon as LucideIcon,
            isActive: item.isActive,
            items: item.items?.map((sub) => ({
              title: sub.title,
              url: sub.url,
              isActive: sub.isActive,
            })),
          }))}
        />
      </SidebarContent>

      <SidebarFooter>
        <div className="gap-2">
          <Button onClick={logout} variant="ghost" size="icon-sm" aria-label="Logout">
            <LogOut />
          </Button>
          <ThemeToogle />
        </div>
        <div className="hidden" aria-hidden>
          {/* NavUser exists for footer spacing in AppSidebar; mini keeps icons-only */}
          <NavUser user={userData} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

