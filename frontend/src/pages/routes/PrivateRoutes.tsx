import { useAuth } from "@/hooks/AuthProvider";
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
    }
    // Scenario B: Non-admins cannot use the system without an active year
    else {
      return <Navigate to="/login" replace />;
    }
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PrivateRoutes;
