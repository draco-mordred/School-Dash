import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import PortalAuthLayout from "@/components/auth/PortalAuthLayout";

type PortalKind = "admin" | "student" | "staff";

interface ForgotPasswordPageProps {
  kind?: PortalKind;
}

const copy: Record<PortalKind, { title: string; description: string; helperText: string; loginPath: string; }> = {
  admin: {
    title: "Reset administrator access",
    description: "Enter your institutional email to start the recovery process for the administrator portal.",
    helperText: "Use the recovery code sent back from the system or the one you received in your email inbox.",
    loginPath: "/admin",
  },
  student: {
    title: "Reset student access",
    description: "Enter your matriculation number or email to recover access to the student portal.",
    helperText: "Use the recovery code sent back from the system or the one you received in your email inbox.",
    loginPath: "/student",
  },
  staff: {
    title: "Reset staff access",
    description: "Enter your staff ID or institutional email to recover access to the staff portal.",
    helperText: "Use the recovery code sent back from the system or the one you received in your email inbox.",
    loginPath: "/staff",
  },
};

export default function ForgotPasswordPage({ kind = "admin" }: ForgotPasswordPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");
  const [message, setMessage] = useState("");
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const portal = useMemo(() => copy[kind], [kind]);

  const handleRequestReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim()) {
      toast.error("Enter your appropriate credential to get a code.");
      return;
    }

    setIsRequesting(true);
    setMessage("");

    try {
      const response = await api.post("/users/forgot-password", { identifier });
      setMessage(response.data?.message || "If your account exists, recovery instructions have been prepared.");
      if (response.data?.resetToken) {
        setDevResetToken(response.data.resetToken);
        setToken(response.data.resetToken);
        setStep("reset");
      } else {
        setStep("reset");
      }
      toast.success("Recovery request received.");
    } catch (error: unknown) {
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(responseMessage || "We could not start the recovery process right now.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token.trim() || !newPassword.trim()) {
      toast.error("Enter the recovery code and a new password.");
      return;
    }

    setIsResetting(true);
    try {
      const response = await api.post("/users/reset-password", {
        token: token.trim(),
        newPassword,
      });

      setMessage(response.data?.message || "Your password has been reset successfully.");
      setToken("");
      setNewPassword("");
      setDevResetToken(null);
      toast.success("Password reset completed.");
    } catch (error: unknown) {
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(responseMessage || "The recovery code was invalid or has expired.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link to={portal.loginPath} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#6e56cf] dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" />
          Return to sign in
        </Link>

        <PortalAuthLayout
          kind={kind}
          title={portal.title}
          description={portal.description}
          note="If the account exists, we will prepare a secure recovery code for you to finish the reset.
"
          helperText={portal.helperText}
          backgroundImageUrl={null}
          primaryColor={null}
          accentColor={null}
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <LockKeyhole className="h-4 w-4" />
              Secure recovery
            </div>
            <p>{message || "Enter your identifier to receive a recovery code. If your account exists, the code will be shown here in development mode so you can continue immediately."}</p>
          </div>

          {step === "request" ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email, matriculation number, or staff ID
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[#6e56cf] dark:border-slate-700 dark:bg-slate-950"
                  placeholder="e.g. student@school.edu"
                  disabled={isRequesting}
                />
              </label>

              <Button type="submit" disabled={isRequesting} className="w-full">
                {isRequesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRequesting ? "Preparing recovery..." : "Send recovery code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Recovery code
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[#6e56cf] dark:border-slate-700 dark:bg-slate-950"
                  placeholder="Paste the recovery code"
                  disabled={isResetting}
                />
              </label>

              {devResetToken ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Development recovery code
                  </div>
                  <p className="mt-1 break-all">{devResetToken}</p>
                </div>
              ) : null}

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[#6e56cf] dark:border-slate-700 dark:bg-slate-950"
                  placeholder="Choose a new password"
                  disabled={isResetting}
                />
              </label>

              <Button type="submit" disabled={isResetting} className="w-full">
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isResetting ? "Resetting password..." : "Set new password"}
              </Button>
            </form>
          )}
        </PortalAuthLayout>
      </div>
    </div>
  );
}
