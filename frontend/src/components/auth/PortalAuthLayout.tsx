import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, ShieldCheck, Stethoscope } from "lucide-react";

type PortalKind = "student" | "staff" | "admin";

type PortalAuthLayoutProps = {
  kind: PortalKind;
  title: string;
  description: string;
  note: string;
  helperText: string;
  backgroundImageUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  children: ReactNode;
};

const portalStyles: Record<PortalKind, { icon: typeof GraduationCap; accent: string; badge: string }> = {
  student: {
    icon: GraduationCap,
    accent: "from-cyan-500 to-blue-600",
    badge: "Student portal",
  },
  staff: {
    icon: Stethoscope,
    accent: "from-violet-500 to-indigo-600",
    badge: "Staff portal",
  },
  admin: {
    icon: ShieldCheck,
    accent: "from-amber-500 to-orange-600",
    badge: "Administrator portal",
  },
};

export default function PortalAuthLayout({ kind, title, description, note, helperText, backgroundImageUrl, primaryColor, accentColor, children }: PortalAuthLayoutProps) {
  const config = portalStyles[kind];
  const Icon = config.icon;
  const resolvedPrimaryColor = primaryColor || "#6e56cf";
  const resolvedAccentColor = accentColor || "#4f46e5";
  const backgroundStyle = backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(135deg, ${resolvedPrimaryColor}1f 0%, ${resolvedAccentColor}2f 50%, rgba(255,255,255,0.96) 100%), url(${backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(110,86,207,0.16),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_40%,_#f7f8ff_100%)] px-4 py-8 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(110,86,207,0.18),_transparent_30%),linear-gradient(135deg,_#030712_0%,_#111827_45%,_#020617_100%)] dark:text-slate-50 sm:px-6 lg:px-8" style={backgroundStyle}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <div className="flex-1 rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80 dark:shadow-black/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${config.accent} text-white`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Institution access</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{config.badge}</p>
              </div>
            </div>
            <Link to="/" className="text-sm font-semibold text-slate-600 transition hover:text-[#6e56cf] dark:text-slate-300">
              Back home
            </Link>
          </div>

          <div className="mt-10 space-y-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">Institution notice</p>
              <p className="mt-2 leading-6">{helperText}</p>
            </div>

            <div className="rounded-2xl border border-[#6e56cf]/20 bg-[#6e56cf]/10 p-4 text-sm text-slate-700 dark:text-slate-200">
              <div className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#6e56cf]" />
                <p className="leading-6">{note}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80 dark:shadow-black/30 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
