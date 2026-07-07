"use client";

import { useLocation } from "react-router-dom";

import { NavMainMini } from "@/components/sidebar/nav-main-mini";
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
import { ThemeToogle } from "@/components/sidebar/ThemeToogle";
import { NavUser } from "@/components/sidebar/nav-user";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import appIcon from "@/image/medlog icons2.png";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Mini sidebar: icons-only, used on medium + smaller screens.
 * Uses the same sidebar data/filters/active logic as AppSidebar.
 */
export function AppMiniSidebar({
  yearNameOverride,
  className,
  ...props
}: React.ComponentProps<typeof Sidebar> & { yearNameOverride?: string }) {
  const { user, year, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
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
    avatar: user?.profileImage ?? "",
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
      collapsible="offcanvas"
      side="left"
      className={cn("", className)}
      {...props}
    >
      <SidebarHeader className="px-2 py-2">
        <div className="flex items-center gap-2">
          <img
            src={appIcon}
            alt="School Dash"
            className="w-7 h-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground shrink-0 object-cover"
          />
          <div className="flex-1 text-left text-sm leading-tight overflow-hidden">
            <span className="truncate font-medium text-xs">{year?.name ?? yearNameOverride ?? "School Dash"}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0 py-1">
        {/* Icon-only navigation with popover dropdowns */}
        <NavMainMini
          items={filteredNav.map((item) => ({
            title: item.title,
            url: item.url,
            icon: item.icon as LucideIcon,
            isActive: Boolean(item.isActive),
            items: item.items?.map((sub) => ({
              title: sub.title,
              url: sub.url,
              isActive: Boolean((sub as { isActive?: boolean }).isActive),
            })),
          }))}
        />
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            aria-label="Logout"
            className="h-8 px-2 rounded hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
          <ThemeToogle />
        </div>
        <div className="hidden" aria-hidden>
          {/* NavUser exists for footer spacing in AppSidebar */}
          <NavUser user={userData} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

