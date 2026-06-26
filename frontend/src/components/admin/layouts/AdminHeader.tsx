"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";

/**
 * AdminHeader Component
 * 
 * Displays at the top of all admin pages with:
 * - Current admin name and role
 * - Current academic session
 * - Notifications
 * - Settings & logout menu
 */
export const AdminHeader = () => {
  const { user, year, setUser } = useAuth();
  const navigate = useNavigate();

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

  const roleLabel = user?.role === "admin" ? "Administrator" : user?.role;

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6 py-4">
        {/* Left section: Admin info */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-sm font-semibold text-foreground">{user?.name}</h1>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>

        {/* Center section: Active session */}
        {year && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Active Session</p>
            <p className="text-sm font-medium">{year.name}</p>
          </div>
        )}

        {/* Right section: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/notifications")}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>

          {/* Settings & Logout menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Menu">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/admin/settings/institution")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/settings/authentication")}>
                Authentication
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
