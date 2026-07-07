import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

type OnboardingStage = "welcome" | "academic-year" | "class" | null;

type StudentClassStatus = "loading" | "assigned" | "not-assigned" | "not-found";

const getStorageKey = (userId: string, suffix: string) => `schooldash.onboarding.${suffix}:${userId}`;

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const maybeResponse = error as { response?: { data?: { message?: string } } };
  return maybeResponse?.response?.data?.message || fallback;
};

const OnboardingFlow = () => {
  const { user, loading, year, setYear } = useAuth();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<OnboardingStage>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stageVisible, setStageVisible] = useState(false);
  const [yearName, setYearName] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [className, setClassName] = useState("");
  const [studentClassStatus, setStudentClassStatus] = useState<StudentClassStatus>("loading");
  const [studentClassName, setStudentClassName] = useState<string | null>(null);
  const stageRef = useRef<OnboardingStage>(null);

  useEffect(() => {
    if (loading || !user) return;

    const welcomeSeen = window.localStorage.getItem(getStorageKey(user._id, "welcome")) === "true";
    const setupState = window.localStorage.getItem(getStorageKey(user._id, "setup"));

    if (!welcomeSeen) {
      setStage("welcome");
      setOpen(true);
      return;
    }

    if (user.role === "admin" && !year) {
      const nextStage = setupState === "class" ? "class" : "academic-year";
      setStage(nextStage);
      setOpen(true);
      return;
    }

    setStage(null);
    setOpen(false);
  }, [loading, user, year]);

  useEffect(() => {
    if (!open || !stage) {
      setStageVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setStageVisible(true), 20);
    stageRef.current = stage;
    return () => window.clearTimeout(timer);
  }, [open, stage]);

  useEffect(() => {
    if (!user || user.role !== "student") {
      setStudentClassStatus("not-assigned");
      setStudentClassName(null);
      return;
    }

    const resolveStudentClass = async () => {
      const rawClass = (user as typeof user & { studentClass?: unknown; studentClasses?: unknown }).studentClass ?? (user as typeof user & { studentClass?: unknown; studentClasses?: unknown }).studentClasses;

      if (!rawClass) {
        setStudentClassStatus("not-assigned");
        setStudentClassName(null);
        return;
      }

      if (typeof rawClass === "string") {
        try {
          const { data } = await api.get(`/classes/${rawClass}`);
          setStudentClassName(data?.name || "Unnamed class");
          setStudentClassStatus("assigned");
        } catch {
          setStudentClassStatus("not-found");
          setStudentClassName(null);
        }
        return;
      }

      if (typeof rawClass === "object" && rawClass !== null) {
        const maybeClass = rawClass as { name?: string };
        setStudentClassName(maybeClass.name || null);
        setStudentClassStatus(maybeClass.name ? "assigned" : "not-assigned");
        return;
      }

      setStudentClassStatus("not-assigned");
      setStudentClassName(null);
    };

    resolveStudentClass();
  }, [user]);

  const saveSetupState = (state: string) => {
    if (!user) return;
    window.localStorage.setItem(getStorageKey(user._id, "setup"), state);
  };

  const handleWelcomeContinue = () => {
    if (!user) return;

    window.localStorage.setItem(getStorageKey(user._id, "welcome"), "true");
    setOpen(false);

    if (user.role === "admin" && !year) {
      saveSetupState("academic-year");
      setStage("academic-year");
      setOpen(true);
      return;
    }

    saveSetupState("done");
    setStage(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (stage === "welcome") {
        if (user) {
          window.localStorage.setItem(getStorageKey(user._id, "welcome"), "true");
        }
      }

      if (stage === "academic-year") {
        saveSetupState("done");
      }

      if (stage === "class") {
        saveSetupState("done");
      }

      setStage(null);
      setOpen(false);
    }
  };

  const handleAcademicYearSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!yearName.trim() || !fromYear || !toYear) {
      toast.error("Please provide a year name and date range.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/academic-years", {
        name: yearName.trim(),
        fromYear,
        toYear,
        isCurrent: true,
      });

      if (setYear) {
        setYear(data);
      }

      const { data: classesData } = await api.get("/classes?limit=1&page=1");
      const classCount = Number(classesData?.pagination?.total ?? 0);

      toast.success("Academic year is now active.");
      saveSetupState(classCount > 0 ? "done" : "class");
      setStage(classCount > 0 ? null : "class");
      setOpen(classCount === 0);
      setClassName("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to create the academic year."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClassSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!className.trim()) {
      toast.error("Please enter a class name.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/classes/create", {
        name: className.trim(),
        academicYear: year?._id,
      });

      saveSetupState("done");
      toast.success("Class setup completed.");
      setStage(null);
      setOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to create the class."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden sm:max-w-xl">
        {stage === "welcome" && (
          <div className={`transition-all duration-500 ease-out ${stageVisible ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"}`}>
            <DialogHeader>
              <DialogTitle>Welcome to School Dash</DialogTitle>
              <DialogDescription>
                We&apos;re glad you&apos;re here. Here is a quick snapshot of your account before you get started.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{user.role}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">ID Number</p>
                  <p className="font-medium">{user.idNumber || "—"}</p>
                </div>
              </div>

              {user.role === "student" ? (
                <div className="rounded-md border border-dashed border-border bg-background/70 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Class</p>
                  {studentClassStatus === "loading" && <p className="mt-1">Checking your class record…</p>}
                  {studentClassStatus === "assigned" && <p className="mt-1 font-medium">{studentClassName || "Assigned class found"}</p>}
                  {studentClassStatus === "not-assigned" && <p className="mt-1 font-medium">No class has been assigned to your account yet.</p>}
                  {studentClassStatus === "not-found" && <p className="mt-1 font-medium">The class linked to your account could not be found yet.</p>}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-background/70 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Next step</p>
                  <p className="mt-1 font-medium">We&apos;ll help you set up the system essentials right away.</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleWelcomeContinue}>Continue</Button>
            </DialogFooter>
          </div>
        )}

        {stage === "academic-year" && (
          <form className={`transition-all duration-500 ease-out ${stageVisible ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"}`} onSubmit={handleAcademicYearSubmit}>
            <DialogHeader>
              <DialogTitle>Set the active academic year</DialogTitle>
              <DialogDescription>
                Create the first academic year so the system can start using the correct calendar.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="academic-year-name">
                  Academic year name
                </label>
                <Input
                  id="academic-year-name"
                  placeholder="2025/2026"
                  value={yearName}
                  onChange={(event) => setYearName(event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="from-year">
                    Start date
                  </label>
                  <Input
                    id="from-year"
                    type="date"
                    value={fromYear}
                    onChange={(event) => setFromYear(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="to-year">
                    End date
                  </label>
                  <Input
                    id="to-year"
                    type="date"
                    value={toYear}
                    onChange={(event) => setToYear(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Skip for now
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save academic year"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {stage === "class" && (
          <form className={`transition-all duration-500 ease-out ${stageVisible ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"}`} onSubmit={handleClassSubmit}>
            <DialogHeader>
              <DialogTitle>Create your first class</DialogTitle>
              <DialogDescription>
                Add a class so the system has a starting point for students, teachers, and timetables.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="class-name">
                  Class name
                </label>
                <Input
                  id="class-name"
                  placeholder="400 Level"
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                />
              </div>
              <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                This step is optional, but it helps the system organize your first set of learners.
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Skip for now
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create class"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;
