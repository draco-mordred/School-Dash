import { User as UserIcon } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Register = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (user && !loading) {
    return <Navigate to="/dashboard" />;
  }

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [isFirst, setIsFirst] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);
  // No class selection during registration; classes managed by admin after account creation

  const checkFirst = async () => {
    try {
      const { data } = await api.get('/users/public/is-first');
      setIsFirst(data.isFirst || false);
      // set default role for next step
      setRole(data.isFirst ? 'admin' : 'student');
      return data.isFirst;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const submitStepOne = async () => {
    if (!email) return toast.error('Enter email');
    if (!password || password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    await checkFirst();
    setStep(2);
  };

  const submitFinal = async () => {
    try {
      const payload: any = { name, email, password, idNumber, role };
      await api.post('/users/public/register', payload);
      toast.success('Account created successfully. Please sign in.');
      navigate('/login');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div id="page-register" className="min-h-svh flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-6 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-8 shadow-lg center-field-labels glass-card">
          <Link to="/" className="text-sm text-muted-foreground self-start">MedLog.</Link>
          <div className="flex flex-col items-center gap-3">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-3xl shadow-inner">
              <UserIcon className="size-10" />
            </div>
            <h2 className="text-lg font-semibold">Create account</h2>
            <p className="text-xs text-muted-foreground">Register an account to access the dashboard</p>
          </div>

          <div className="w-full">
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1 block text-center w-full">Email</label>
                  <input className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-center w-full">Password</label>
                  <input className="input w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-center w-full">Confirm Password</label>
                  <input className="input w-full" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/login')}>Back to Login</Button>
                  <Button onClick={submitStepOne}>Next</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1 block text-center w-full">Full name</label>
                  <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-center w-full">ID Number (optional)</label>
                  <input className="input w-full" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-center w-full">Role</label>
                  <select className="input w-full" value={role} onChange={(e) => setRole(e.target.value)}>
                    {isFirst
                      ? (
                        <>
                          <option value="admin">Admin</option>
                          <option value="teacher">Teacher</option>
                        </>
                      ) : (
                        <>
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="parent">Parent</option>
                        </>
                      )}
                  </select>
                </div>
                {/* Class selection removed from registration — admins will assign classes later */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={submitFinal}>Create account</Button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
