import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeroStars from "@/components/HeroStars";
import { Button } from "@/components/ui/button";
import { ArrowRight, BadgeCheck, BellRing, Circle, LayoutDashboard, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import { api } from "@/lib/api";

const previews = [
  {
    id: "student",
    title: "Student Dashboard",
    subtitle: "Clinical postings and progress",
    accent: "from-violet-500 to-fuchsia-500",
    icon: LayoutDashboard,
    stats: ["6 postings", "3 pending", "92% attendance"],
    position: "left-0 top-12 md:top-8",
  },
  {
    id: "lecturer",
    title: "Lecturer Dashboard",
    subtitle: "Timetable and assessments",
    accent: "from-sky-500 to-cyan-500",
    icon: Users,
    stats: ["13 sessions", "4 reviews", "96% readiness"],
    position: "left-10 right-10 top-0",
  },
  {
    id: "staff",
    title: "Staff Dashboard",
    subtitle: "Clinical supervision hub",
    accent: "from-emerald-500 to-teal-500",
    icon: Stethoscope,
    stats: ["12 rotations", "5 evaluations", "2 approvals"],
    position: "right-0 top-12 md:top-8",
  },
  {
    id: "admin",
    title: "Admin Dashboard",
    subtitle: "Institution-wide oversight",
    accent: "from-amber-500 to-orange-500",
    icon: ShieldCheck,
    stats: ["18 units", "124 learners", "44 reports"],
    position: "left-1/2 top-36 -translate-x-1/2",
  },
];

export default function StarryMedlogHero() {
  const navigate = useNavigate();
  const [isRevealed, setIsRevealed] = useState(false);
  const [focusedPreview, setFocusedPreview] = useState("lecturer");
  const [isNavigatingSetup, setIsNavigatingSetup] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsRevealed(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const focusedCard = useMemo(() => previews.find((preview) => preview.id === focusedPreview) ?? previews[1], [focusedPreview]);

  const scrollToDashboardSection = () => {
    const target = document.getElementById("role-aware");
    if (!target) return false;

    const rootStyles = getComputedStyle(document.documentElement);
    const topbar = rootStyles.getPropertyValue("--topbar-height") || "56px";
    const topbarPx = parseInt(topbar, 10) || 56;
    const rect = target.getBoundingClientRect();
    const nextTop = window.scrollY + rect.top - topbarPx - 12;

    window.scrollTo({ top: nextTop, behavior: "smooth" });
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    return true;
  };

  const handleSetupEntry = async () => {
    setIsNavigatingSetup(true);
    try {
      const response = await api.get("/setup/status");
      if (!response.data?.configured) {
        navigate("/setup");
        return;
      }

      if (!scrollToDashboardSection()) {
        navigate("/");
      }
    } catch {
      navigate("/setup");
    } finally {
      setIsNavigatingSetup(false);
    }
  };

  return (
    <section id="overview" className="relative overflow-hidden pt-24 sm:pt-28">
      <HeroStars className="absolute inset-0 -z-20 h-full w-full" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/80 via-slate-100/90 to-slate-200 dark:from-slate-950/80 dark:via-slate-900/70 dark:to-black/80" />
      <div className={`relative z-10 mx-auto max-w-7xl px-6 py-20 transition-opacity duration-700 sm:px-8 lg:px-8 ${isRevealed ? "opacity-100" : "opacity-0"}`}>
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6e56cf]/25 bg-[#6e56cf]/10 px-4 py-2 text-sm font-semibold text-[#4d3794] shadow-sm dark:text-[#cdbdff]">
              <Sparkles className="h-4 w-4" />
              One platform for modern clinical education
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                One Platform for Modern Clinical Education
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Manage clinical postings, attendance, assessments, digital logbooks, timetables, and academic operations from one intelligent platform built specifically for medical schools and teaching hospitals.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="min-w-[150px]" onClick={() => { void handleSetupEntry(); }} disabled={isNavigatingSetup}>
                {isNavigatingSetup ? "Loading..." : "Get Started"}
              </Button>
              <Button variant="outline" size="lg" className="min-w-[150px]">
                Book a Demo
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              {["Secure", "Cloud-Based", "Mobile Ready", "Built for Medical Schools"].map((badge) => (
                <span key={badge} className="rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div className="absolute -left-8 top-8 h-40 w-40 rounded-full bg-[#6e56cf]/20 blur-3xl" />
            <div className="absolute -bottom-10 right-6 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative min-h-[480px] rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-2xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 sm:p-6">
              <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(110,86,207,0.16),_transparent_40%)]" />
              <div className="relative h-full min-h-[420px] overflow-hidden rounded-[1.6rem] border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 dark:border-slate-800/70 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-300">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Live operations</p>
                    <p className="font-semibold text-slate-900 dark:text-white">Clinical education at a glance</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#6e56cf]/10 px-3 py-1 text-xs font-semibold text-[#6e56cf]">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Synced
                  </div>
                </div>

                <div className="relative h-[320px]">
                  {previews.map((preview) => {
                    const Icon = preview.icon;
                    const isFocused = preview.id === focusedCard.id;
                    return (
                      <button
                        key={preview.id}
                        type="button"
                        onMouseEnter={() => setFocusedPreview(preview.id)}
                        onFocus={() => setFocusedPreview(preview.id)}
                        onMouseLeave={() => setFocusedPreview("lecturer")}
                        className={`absolute w-[46%] rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-4 text-left shadow-lg backdrop-blur transition-all duration-500 hover:scale-105 hover:shadow-2xl dark:border-slate-800/80 dark:bg-slate-900/90 ${preview.position} ${isFocused ? "z-20 scale-105 shadow-2xl ring-2 ring-[#6e56cf]/20" : "z-10 scale-95 opacity-80"}`}
                        
                      >
                        <div className={`inline-flex rounded-2xl bg-gradient-to-r ${preview.accent} p-2 text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{preview.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{preview.subtitle}</p>
                        <div className="mt-4 space-y-2">
                          {preview.stats.map((stat) => (
                            <div key={stat} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                              <Circle className="h-2.5 w-2.5 fill-current text-[#6e56cf]" />
                              {stat}
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
                  <br />
                  <br />
                  <br />
                <div className="mt-4 flex items-center justify-between rounded-[1.2rem] border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-[#6e56cf]" />
                    visit the {focusedCard.title}.
                  </div>
                  <button type="button" className="inline-flex items-center gap-2 font-semibold text-[#6e56cf]">
                    Explore <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

