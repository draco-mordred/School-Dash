import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Stethoscope, ShieldCheck, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useSetupStatus } from "@/lib/useSetupStatus";
import { useInstitution } from "@/lib/useInstitution";
import { Button } from "@/components/ui/button";

type Institution = {
  name: string;
  shortName?: string;
  logoUrl?: string;
};

export default function InstitutionLandingPage() {
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const { isSetupConfigured, isSetupStatusLoading } = useSetupStatus();
  const { institution: cachedInstitution, loading: instLoading } = useInstitution();

  const loading = isSetupStatusLoading || instLoading;

  useEffect(() => {
    if (cachedInstitution) {
      setInstitution(cachedInstitution as Institution);
    }
  }, [cachedInstitution]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="animate-pulse text-center">
          <div className="h-12 w-12 rounded-full bg-[#6e56cf]/20 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading institution...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-[#6e56cf]/10 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#6e56cf] to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {institution?.logoUrl ? (
                <img src={institution.logoUrl} alt="Institution logo" className="h-full w-full object-cover rounded-2xl" />
              ) : (
                institution?.shortName?.slice(0, 2).toUpperCase() || "ML"
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Welcome to</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{institution?.name}</h1>
            </div>
          </div>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Access your institution portal using your role-specific login credentials.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {/* Student Portal */}
          <div className="group rounded-[2rem] border border-slate-200/80 bg-white/80 p-8 shadow-lg backdrop-blur-xl transition hover:shadow-2xl hover:border-cyan-500/50 dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-cyan-500/30">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Student Portal</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Access clinical postings, logbooks, timetables, and progress tracking.
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
              Login with your matriculation number
            </p>
            <Button
              onClick={() => navigate("/student")}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            >
              Enter Student Portal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Staff Portal */}
          <div className="group rounded-[2rem] border border-slate-200/80 bg-white/80 p-8 shadow-lg backdrop-blur-xl transition hover:shadow-2xl hover:border-violet-500/50 dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-violet-500/30">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <Stethoscope className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Staff Portal</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Manage courses, assessments, and clinical supervision. For lecturers, consultants, and residents.
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
              Login with Staff ID or email
            </p>
            <Button
              onClick={() => navigate("/staff")}
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
            >
              Enter Staff Portal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Admin Portal */}
          <div className="group rounded-[2rem] border border-slate-200/80 bg-white/80 p-8 shadow-lg backdrop-blur-xl transition hover:shadow-2xl hover:border-amber-500/50 dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-amber-500/30">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Administrator Portal</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Institution-wide administration, user management, and system configuration.
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
              Authorized administrators only
            </p>
            <Button
              onClick={() => navigate("/admin")}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
            >
              Enter Admin Portal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 text-center dark:border-slate-800/80 dark:bg-slate-900/50">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong>New user?</strong> Your institution administrator will have provisioned your account during setup. Check your email for your login credentials, or contact your administrator if you need assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
