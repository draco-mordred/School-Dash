import { User as UserIcon } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Register = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [transitioning, setTransitioning] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [isFirst, setIsFirst] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  // Student registration only
  const [studentClassName, setStudentClassName] = useState("");
  const [studentClassNameTouched, setStudentClassNameTouched] = useState(false);

  const allowedClassNameTokens = useMemo(
    () => ["400 level", "500 level", "600 level", "Final year"] as const,
    [],
  );

  const normalizeClassToken = (val: string) => val.trim().toLowerCase().replace(/\s+/g, " ");

  const isValidStudentClassName = (val: string) => {
    const norm = normalizeClassToken(val);
    return allowedClassNameTokens.some((t) => normalizeClassToken(t) === norm);
  };

  // Early return ONLY when already authenticated (hooks are already called above).
  if (user && !loading) {
    return <Navigate to="/dashboard" />;
  }

  const checkFirst = async () => {
    const { data } = await api.get("/users/public/is-first");
    setIsFirst(data.isFirst || false);
    setRole(data.isFirst ? "admin" : "student");
    return data.isFirst;
  };

  const goToStep = (next: 1 | 2) => {
    if (next === step || transitioning) return;
    setTransitioning(true);

    window.setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 240);
  };

  const submitStepOne = async () => {
    if (!email) return toast.error("Enter email");
    if (!password || password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");

    await checkFirst();
    goToStep(2);
  };

  const submitFinal = async () => {
    try {
      if (!role) return toast.error("Select a role");

      if (role === "student") {
        setStudentClassNameTouched(true);
        if (!studentClassName) return toast.error("Enter your Class name");
        if (!isValidStudentClassName(studentClassName)) {
          return toast.error('Class name must be: "400 level", "500 level", "600 level", or "Final year"');
        }
      }

      const payload: {
        name: string;
        email: string;
        password: string;
        idNumber: string;
        role: string;
        studentClassName?: string;
      } = {
        name,
        email,
        password,
        idNumber,
        role,
      };

      if (role === "student") {
        payload.studentClassName = studentClassName.trim();
      }

      await api.post("/users/public/register", payload);
      toast.success("Account created successfully. Please sign in.");
      navigate("/login");
    } catch (error: unknown) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || "Registration failed";
      toast.error(msg);
    }
  };

  // Swipe-ish left animation via CSS. No conditional component declarations.
  const showStep1 = step === 1;
  const panelClass = !transitioning ? "reg-panel reg-enter-forward" : "reg-panel reg-exit-forward";

  return (
    <div id="page-register" className="min-h-svh flex items-center justify-center bg-surface p-6">
      <style>{`
        @keyframes regSlideLeftIn {
          from { transform: translateX(28px); opacity: 0; filter: blur(1px); }
          to { transform: translateX(0); opacity: 1; filter: blur(0); }
        }
        @keyframes regSlideLeftOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-28px); opacity: 0; }
        }

        .reg-panel { will-change: transform, opacity; backface-visibility: hidden; }
        .reg-enter-forward { animation: regSlideLeftIn 240ms cubic-bezier(.2,.9,.2,1) both; }
        .reg-exit-forward { animation: regSlideLeftOut 240ms cubic-bezier(.2,.9,.2,1) both; }
      `}</style>

      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-6 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-8 shadow-lg center-field-labels glass-card">
          <Link to="/" className="text-sm text-muted-foreground self-start">
            MedLog.
          </Link>

          <div className="flex flex-col items-center gap-3">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-3xl shadow-inner">
              <UserIcon className="size-10" />
            </div>
            <h2 className="text-lg font-semibold">Create account</h2>
            <p className="text-xs text-muted-foreground">Register an account to access the dashboard</p>
          </div>

          <div className="w-full">
            <div className={panelClass}>
              {/* Step 1 */}
              {showStep1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block text-center w-full" htmlFor="reg-email">Email</label>
                    <input
                      id="reg-email"
                      className="input w-full"
                      type="email"
                      placeholder="your.email@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block text-center w-full" htmlFor="reg-password">Password</label>
                    <input
                      id="reg-password"
                      className="input w-full"
                      type="password"
                      placeholder="Enter a strong password (min. 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block text-center w-full" htmlFor="reg-confirm">Confirm Password</label>
                    <input
                      id="reg-confirm"
                      className="input w-full"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/login")}>Back to Login</Button>
                    <Button onClick={submitStepOne}>Next</Button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {!showStep1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block text-center w-full" htmlFor="reg-name">Full name</label>
                    <input id="reg-name" className="input w-full" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block text-center w-full" htmlFor="reg-id">ID Number (optional)</label>
                    <input id="reg-id" className="input w-full" placeholder="e.g., MED/2022/001" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block text-center w-full" htmlFor="reg-role">Role</label>
                    <select
                      id="reg-role"
                      className="input w-full"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="">Select your role</option>
                      {isFirst ? (
                        <>
                          <option value="admin">Admin</option>
                          <option value="teacher">Teacher (Staff)</option>
                          <option value="unit_consultant">Unit Consultant (Staff)</option>
                          <option value="unit_resident">Unit Resident (Staff)</option>
                        </>
                      ) : (
                        <>
                          <option value="student">Student</option>
                          <option value="teacher">Teacher (Staff)</option>
                          <option value="unit_consultant">Unit Consultant (Staff)</option>
                          <option value="unit_resident">Unit Resident (Staff)</option>
                          <option value="parent">Parent</option>
                        </>
                      )}
                    </select>
                  </div>

                  {role === "student" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium mb-1 block text-center w-full" htmlFor="reg-class">Class name</label>
                      <input
                        id="reg-class"
                        className="input w-full"
                        placeholder="e.g., 500 level"
                        value={studentClassName}
                        onChange={(e) => setStudentClassName(e.target.value)}
                        onBlur={() => setStudentClassNameTouched(true)}
                      />
                      {studentClassNameTouched && studentClassName && !isValidStudentClassName(studentClassName) && (
                        <p className="text-[11px] text-destructive text-center">
                          Must be: 400 level, 500 level, 600 level, or Final year
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => goToStep(1)}>Back</Button>
                    <Button onClick={submitFinal}>Create account</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

