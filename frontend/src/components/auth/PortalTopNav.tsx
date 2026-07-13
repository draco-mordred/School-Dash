import { GraduationCap, ShieldCheck, Stethoscope } from "lucide-react";

type PortalTopNavProps = {
  institutionName?: string | null;
  institutionLogoUrl?: string | null;
  kind?: "student" | "staff" | "admin";
};

const portalMeta = {
  student: {
    icon: GraduationCap,
    accent: "from-cyan-500 to-blue-600",
  },
  staff: {
    icon: Stethoscope,
    accent: "from-violet-500 to-indigo-600",
  },
  admin: {
    icon: ShieldCheck,
    accent: "from-amber-500 to-orange-600",
  },
};

export default function PortalTopNav({ institutionName, institutionLogoUrl, kind = "student" }: PortalTopNavProps) {
  const meta = portalMeta[kind] ?? portalMeta.student;
  const Icon = meta.icon;
  const displayName = institutionName || "No institution set";
  const isConfigured = Boolean(institutionName);

  return (
    <header className="border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <img src="/medlog-dark.svg" alt="MedLog logo" className="h-10 w-10" />
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-[0.24em] text-slate-900 dark:text-white">MED<span className="text-[#6e56cf]">LOG</span></p>
              <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Clinical LMS</p>
            </div>
        </div>

        <div className={`flex items-center gap-3 rounded-full border px-3 py-2 shadow-sm ${isConfigured ? "border-slate-200/80 bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-900/70" : "border-amber-200/80 bg-amber-50/80 dark:border-amber-800/70 dark:bg-amber-950/40"}`}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${meta.accent} text-white shadow-sm`}>
            {institutionLogoUrl && isConfigured ? (
              <img src={institutionLogoUrl} alt="Institution logo" className="h-full w-full rounded-full object-cover" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className={`truncate text-sm font-semibold ${isConfigured ? "text-slate-900 dark:text-white" : "text-amber-700 dark:text-amber-300"}`}>{displayName}</p>
            <p className={`text-xs ${isConfigured ? "text-slate-500 dark:text-slate-400" : "text-amber-600 dark:text-amber-400"}`}>{isConfigured ? "Institution portal" : "Setup required"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
