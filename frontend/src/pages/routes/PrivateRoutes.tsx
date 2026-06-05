import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react"; // Optional: for loading spinner 
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";

const PrivateRoutes = () => {
  const { loading, user, year } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!year) {
    // Scenario A: Admin needs to create a year
    if (user.role === "admin") {
      // CRITICAL: Only redirect if they are NOT ALREADY on the settings page.
      // If we don't check this, it causes an infinite loop (Blank Page).
      if (location.pathname !== "/settings/academic-years") {
        return <Navigate to="/settings/academic-years" replace />;
      } 
      // If they ARE on the settings page, we let code flow down to render the Sidebar/Outlet
      return (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="overflow-x-hidden pl-0 md:ml-[var(--sidebar-width)]">
            <Outlet />
          </SidebarInset>
        </SidebarProvider>

      );
    }

    // Scenario B: Non-admins should remain authenticated rather than bouncing back to login.
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="rounded-xl border border-border bg-muted p-8 text-center">
            <h1 className="text-2xl font-semibold">No current academic year</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              You are signed in, but the system does not have an active academic year configured yet.
              Please contact your administrator.
            </p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* Shift outlet content to the right of the sidebar */}
      <SidebarInset className="overflow-x-hidden pl-0 md:ml-[var(--sidebar-width)]">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>


  );
};


export default PrivateRoutes;
