"use client";

import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

/**
 * AdminLayout Component
 * 
 * Master layout wrapper for all admin pages.
 * Includes:
 * - Admin sidebar with nested navigation
 * - Admin header with user info and actions
 * - Main content area with outlet for page content
 */
export const AdminLayout = () => {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="flex min-h-screen flex-col pl-0">
        <AdminHeader />
        <main className="flex-1 overflow-auto bg-background" style={{ margin: "10px 10px 5px 25px" }}>
          <div className="container max-w-7xl mx-auto py-6 px-4 md:px-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
