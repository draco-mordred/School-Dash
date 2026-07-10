import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

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
      return "/admin";
  }
};

/**
 * AdminRoute Component
 * 
 * Protects admin-only routes by checking if the user role is "admin".
 * - If user is loading: shows loading spinner
 * - If user is not authenticated: redirects to login
 * - If user is not admin: redirects to dashboard
 * - If user is admin: renders children
 */
export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated: redirect to login
  if (!user) {
    return <Navigate to={getPortalLoginPath()} replace />;
  }

  // Not admin: redirect to dashboard
  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin user: render the protected content
  return <>{children}</>;
};
