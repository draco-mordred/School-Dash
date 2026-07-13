import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import AppShell from "@/components/layout/AppShell";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

const getPortalLoginPath = () => {
  const lastPortalRole = localStorage.getItem("lastPortalRole");

  switch (lastPortalRole) {
    case "admin":
      return "/admin";
    case "student":
      return "/student";
    case "teacher":
    case "unitconsultant":
    case "unitresident":
    case "parent":
      return "/staff";
    default:
      return "/student";
  }
};

const PrivateRoutes = () => {
  const { loading, user, year } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={getPortalLoginPath()} replace />;
  }

  if (!year && user.role !== "admin") {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex min-h-screen flex-col pl-0">
          <AppShell>
            <div className="rounded-xl border border-border bg-muted p-8 text-center">
              <h1 className="text-2xl font-semibold">No current academic year</h1>
              <p className="mt-4 text-sm text-muted-foreground">
                You are signed in, but the system does not have an active academic year configured yet.
                Please contact your administrator.
              </p>
            </div>
          </AppShell>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen flex-col pl-0">
        <AppShell>
          <Outlet />
          <OnboardingFlow />
        </AppShell>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PrivateRoutes;
