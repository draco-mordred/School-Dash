import { useEffect, useState } from "react";
import HeroStars from "@/components/HeroStars";
import { Button } from "@/components/ui/button";

export default function StarryMedlogHero() {
  const [isRevealed, setIsRevealed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setIsRevealed(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-[calc(100vh-72px)] overflow-hidden pt-28">
      <HeroStars className="absolute inset-0 -z-20 w-full h-full" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/80 via-slate-100/90 to-slate-200 dark:from-slate-950/80 dark:via-slate-900/70 dark:to-black/80" />
      <div className={`relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-20 transition-opacity duration-700 ${isRevealed ? "opacity-100" : "opacity-0"}`}>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#6e56cf]/25 bg-[#6e56cf]/10 px-4 py-2 text-sm font-semibold text-[#4d3794] shadow-sm">Premium clinical learning platform</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">A modern command center for clinical education and medical schools.</h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">MedLog streamlines rotation planning, attendance, assessments, logbooks, and faculty sign-off into a single intelligent platform designed for medical educators and hospital-based learners.</p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg">Book a Demo</Button>
              <Button variant="outline" size="lg">Explore the platform</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-3xl border border-border bg-white/80 dark:bg-slate-950/60 p-4 shadow-sm">Secure student and faculty workflows with enterprise-grade controls.</div>
              <div className="rounded-3xl border border-border bg-white/80 dark:bg-slate-950/60 p-4 shadow-sm">Optimize clinical placement, attendance, and progress reporting in one place.</div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div className="absolute -left-8 top-8 h-40 w-40 rounded-full bg-[#6e56cf]/20 blur-3xl" />
            <div className="rounded-[2rem] border border-border bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:bg-slate-950/90">
              <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-6 shadow-inner dark:border-slate-800/80 dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Live school analytics</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">95.4%</p>
                  </div>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#6e56cf]">
                    <span className="text-xl font-bold">A</span>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-border bg-white p-4 dark:bg-slate-950">
                    <p className="text-sm font-semibold">Rotation readiness</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Align learners and supervisors faster.</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-white p-4 dark:bg-slate-950">
                    <p className="text-sm font-semibold">Attendance accuracy</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Instant validation across clinical sites.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-slate-950 to-slate-900 p-6 text-white shadow-xl">
                <div className="grid gap-5">
                  <div className="rounded-3xl bg-white/10 p-5">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Student logbook</span>
                      <span className="font-semibold">Active</span>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-800">
                      <div className="h-2 w-[72%] rounded-full bg-gradient-to-r from-[#7c5cff] to-[#6e56cf]" />
                    </div>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl bg-slate-900/70 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Pending reviews</p>
                        <p className="mt-3 text-2xl font-semibold">16</p>
                      </div>
                      <div className="rounded-3xl bg-slate-900/70 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Clinics active</p>
                        <p className="mt-3 text-2xl font-semibold">24</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 right-6 h-24 w-24 rounded-full bg-[#6e56cf]/15 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

