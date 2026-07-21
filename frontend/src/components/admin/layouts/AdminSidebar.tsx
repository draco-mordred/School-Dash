"use client";

import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronRight, LogOut, Shield } from "lucide-react";
import { adminSidebarData } from "./admin-sidebar-data";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  collapsible?: "offcanvas" | "icon" | "none";
}

/**
 * AdminSidebar Component
 * 
 * Navigation sidebar for admin portal with:
 * - Nested collapsible menu items
 * - Current path highlighting
 * - Admin-only navigation structure
 * - Logout button
 */
export function AdminSidebar({ collapsible = "icon", ...props }: AdminSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  // Build filtered and enhanced nav with active states
  const filteredNav = useMemo(() => {
    return adminSidebarData.navMain.map((item) => {
      const isItemActive = pathname === item.url;
      const isSubActive = item.items?.some((sub) => sub.url === pathname) ?? false;
      const isActive = isItemActive || isSubActive;

      return {
        ...item,
        isActive,
        items: item.items?.map((sub) => ({
          ...sub,
          isActive: sub.url === pathname,
        })),
      };
    });
  }, [pathname]);

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

  return (
    <Sidebar collapsible={collapsible} {...props}>
      {/* Header: Admin Portal Logo */}
      <SidebarHeader className="border-b border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Admin</span>
                <span className="text-xs text-muted-foreground">Portal</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarMenu>
          {filteredNav.map((item) => {
            // Items with submenu (collapsible)
            if (item.items && item.items.length > 0) {
              return (
                <Collapsible key={item.title} defaultOpen={item.isActive || item.title === "Users"}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={item.isActive}
                        onClick={() => navigate(item.url)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={subItem.isActive}
                              onClick={() => navigate(subItem.url)}
                            >
                              <span className="cursor-pointer">{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            // Simple menu items (no submenu)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.isActive}
                  onClick={() => navigate(item.url)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer: User Info & Logout */}
      <SidebarFooter className="border-t border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <span className="text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-sm">{user?.name}</span>
                <span className="text-xs text-muted-foreground">Administrator</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
