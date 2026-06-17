import UniversalUserForm from "@/components/auth/UniversalUserForm";
import { useAuth } from "@/hooks/useAuth";
import { User as UserIcon } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router";

const Login = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (user && !loading) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div id="page-login" className="min-h-svh flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-6 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-8 shadow-lg center-field-labels glass-card">
          <Link to="/" className="text-sm text-muted-foreground self-start">MedLog.</Link>
          <div className="flex flex-col items-center gap-3">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-3xl shadow-inner">
              <UserIcon className="size-10" />
            </div>
            <h2 className="text-lg font-semibold">Sign in</h2>
            <p className="text-xs text-muted-foreground">Enter your email and password to continue</p>
          </div>

          <div className="w-full">
            <UniversalUserForm type="login" singleColumn onSuccess={() => navigate("/dashboard")} />
          </div>

          <div className="w-full text-center mt-1">
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:underline">Forgot password?</Link>
          </div>
          <div className="w-full text-center mt-2">
            <p className="text-sm text-muted-foreground">No account yet? <Link to="/register" className="text-primary hover:underline">Create one</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
