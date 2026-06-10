import UniversalUserForm from "@/components/auth/UniversalUserForm";
import { User as UserIcon } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";

const Register = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (user && !loading) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-6 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-8 shadow-lg">
          <Link to="/" className="text-sm text-muted-foreground self-start">Edunexus.</Link>
          <div className="flex flex-col items-center gap-3">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-3xl shadow-inner">
              <UserIcon className="size-10" />
            </div>
            <h2 className="text-lg font-semibold">Create account</h2>
            <p className="text-xs text-muted-foreground">Register an account to access the dashboard</p>
          </div>

          <div className="w-full">
            <UniversalUserForm type="create" onSuccess={() => navigate('/login')} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
