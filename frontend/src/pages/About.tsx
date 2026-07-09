import { Link } from "react-router-dom";
import { Award, BookOpen, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    title: "Unified clinical workflows",
    description: "Manage rotations, attendance, assessments, and sign-offs from one secure platform.",
    icon: Globe2,
  },
  {
    title: "Role-aware access",
    description: "Students, supervisors, and administrators each see the right information and tools.",
    icon: ShieldCheck,
  },
  {
    title: "Enterprise-level readiness",
    description: "Designed for medical schools, teaching hospitals, and accreditation-driven programs.",
    icon: Award,
  },
];

const About = () => {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(110,86,207,0.16),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(52,178,123,0.12),_transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[#c8b7ff] shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#c8b7ff]" />
              About MedLog
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">A premium platform built for modern clinical education.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              MedLog is the next-generation school operations platform for medical programs, combining clinical placement management, attendance tracking, digital logbooks, and accreditation workflows in one elegant experience.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg">Request a Demo</Button>
              <Link to="/" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                Back to Home
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-2xl backdrop-blur-xl">
            <div className="space-y-6">
              <div className="rounded-[1.75rem] bg-slate-900/90 p-6">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Why MedLog</p>
                <h2 className="mt-4 text-2xl font-semibold text-white">Built with the operational realities of clinical education in mind.</h2>
              </div>
              <div className="grid gap-4">
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-slate-200">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#a27cff]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-24 rounded-[2rem] border border-white/10 bg-slate-950/80 p-10 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e56cf]">Our mission</p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Help medical teams deliver better clinical training without administrative friction.</h2>
              <p className="max-w-xl text-slate-300">
                We believe clinical training should be powered by intelligent workflows, not tangled spreadsheets. MedLog puts supervision, reporting, and progress tracking in one place so teams can stay focused on learning.
              </p>
            </div>
            <div className="grid gap-4 rounded-[1.75rem] bg-slate-900/80 p-6 text-slate-300">
              <div className="flex items-center justify-between rounded-3xl bg-white/5 p-4">
                <span>Trusted by clinical schools</span>
                <strong className="text-white">100+</strong>
              </div>
              <div className="flex items-center justify-between rounded-3xl bg-white/5 p-4">
                <span>Average rollout</span>
                <strong className="text-white">30 days</strong>
              </div>
              <div className="flex items-center justify-between rounded-3xl bg-white/5 p-4">
                <span>Platform uptime</span>
                <strong className="text-white">99.9%</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
