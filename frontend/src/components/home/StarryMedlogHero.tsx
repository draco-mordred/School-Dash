import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeroStars from "@/components/HeroStars";
import { Button } from "@/components/ui/button";
import { ArrowRight, BadgeCheck, BellRing, Circle, LayoutDashboard, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useSetupStatus } from "@/lib/useSetupStatus";

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
  const { isSetupConfigured } = useSetupStatus();

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
      const configured =
        typeof isSetupConfigured === "boolean"
          ? isSetupConfigured
          : Boolean((await api.get("/setup/status")).data?.configured);

      if (!configured) {
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
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/80 via-muted/70 to-card/80 dark:from-background/80 dark:via-card/70 dark:to-black/80" />
      <div className={`relative z-10 mx-auto max-w-7xl px-6 py-20 transition-opacity duration-700 sm:px-8 lg:px-8 ${isRevealed ? "opacity-100" : "opacity-0"}`}>
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <Sparkles className="h-4 w-4" />
              One platform for modern clinical education
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                One Platform for Modern Clinical Education
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Manage clinical postings, attendance, assessments, digital logbooks, timetables, and academic operations from one intelligent platform built specifically for medical schools and teaching hospitals.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="min-w-[150px]" onClick={() => { void handleSetupEntry(); }} disabled={isNavigatingSetup}>
                {isNavigatingSetup ? "Loading..." : isSetupConfigured ? "Welcome back" : "Get Started"}
              </Button>
              <Button variant="outline" size="lg" className="min-w-[150px]">
                Book a Demo
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-muted-foreground">
              {["Secure", "Cloud-Based", "Mobile Ready", "Built for Medical Schools"].map((badge) => (
                <span key={badge} className="rounded-full border border-border/80 bg-card px-3 py-2 shadow-sm backdrop-blur">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div className="absolute -left-8 top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-10 right-6 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative min-h-[480px] rounded-[2rem] border border-border/70 bg-card p-4 shadow-2xl backdrop-blur-xl sm:p-6">
              <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(110,86,207,0.16),_transparent_40%)]" />
              <div className="relative h-full min-h-[420px] overflow-hidden rounded-[1.6rem] border border-border/70 bg-gradient-to-br from-card/50 via-card/70 to-background p-4">
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-border/80 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Live operations</p>
                    <p className="font-semibold text-foreground">Clinical education at a glance</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
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
                        className={`absolute w-[46%] rounded-[1.4rem] border border-border/80 bg-card p-4 text-left shadow-lg backdrop-blur transition-all duration-500 hover:scale-105 hover:shadow-2xl ${preview.position} ${isFocused ? "z-20 scale-105 shadow-2xl ring-2 ring-primary/20" : "z-10 scale-95 opacity-80"}`}
                        
                      >
                        <div className={`inline-flex rounded-2xl bg-gradient-to-r ${preview.accent} p-2 text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-foreground">{preview.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{preview.subtitle}</p>
                        <div className="mt-4 space-y-2">
                          {preview.stats.map((stat) => (
                            <div key={stat} className="flex items-center gap-2 rounded-2xl bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground">
                              <Circle className="h-2.5 w-2.5 fill-current text-primary" />
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
                <div className="mt-4 flex items-center justify-between rounded-[1.2rem] border border-border/80 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-primary" />
                    visit the {focusedCard.title}.
                  </div>
                  <button type="button" className="inline-flex items-center gap-2 font-semibold text-primary">
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

