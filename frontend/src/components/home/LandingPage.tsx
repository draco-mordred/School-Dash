import { useEffect, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  TabletSmartphone,
  Globe2,
  Layers,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const roleCards = [
  {
    title: "Student Success",
    description: "Track clinical rotations, digital logbooks, attendance, and competency milestones in one polished dashboard.",
    icon: Users,
  },
  {
    title: "Faculty Intelligence",
    description: "Coordinate supervisors, progress reports, assessments, and workflow approvals without email chaos.",
    icon: Stethoscope,
  },
  {
    title: "Program Leadership",
    description: "Align academic years, timetables, clinical placements, and accreditation data with real-time analytics.",
    icon: Award,
  },
];

const modules = [
  {
    title: "Timetable Builder",
    description: "Create organized clinical schedules, assign supervisors, and publish session details instantly.",
    icon: CalendarDays,
  },
  {
    title: "Smart Attendance",
    description: "Capture presence across wards, lectures, and practical sessions with audit-ready reports.",
    icon: CheckCircle2,
  },
  {
    title: "Digital Logbooks",
    description: "Students submit cases and procedures, faculty review with comments, and compliance is tracked automatically.",
    icon: BookOpen,
  },
  {
    title: "AI Clinical Coach",
    description: "Get adaptive guidance, competency checklists, and next-step recommendations tailored to each rotation.",
    icon: Zap,
  },
];

const roadmapItems = [
  {
    title: "Enterprise-grade workflows",
    detail: "2026 Q3 — multi-campus registration, assessment imports, clinician rostering.",
  },
  {
    title: "Self-service analytics",
    detail: "2026 Q4 — customizable dashboards, cohort heatmaps, and compliance alerts.",
  },
  {
    title: "Mobile learning hub",
    detail: "2027 Q1 — offline case logging, mobile sign-in, and smart scheduling notifications.",
  },
];

const faqs = [
  {
    question: "Can MedLog replace existing clinical rotation spreadsheets?",
    answer: "Yes. MedLog moves your rotation planning, attendance tracking, and learner evaluation into a single secure platform with built-in approvals.",
  },
  {
    question: "Does it support multi-role access?",
    answer: "Absolutely. Students, educators, unit consultants, and program managers each see tailored workflows and permissioned data views.",
  },
  {
    question: "How quickly can we onboard a new cohort?",
    answer: "Most schools can configure their first academic year and launch pilot rotations in under 30 days with guided support.",
  },
];

export default function LandingPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20">
        <div
          className={`grid gap-8 md:grid-cols-[1.1fr_0.9fr] items-center transition-all duration-700 ease-out ${
            isMounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 dark:text-slate-200 dark:ring-slate-700/50">
              <Sparkles className="h-4 w-4 text-[#6e56cf]" />
              Native clinical workflows for medical education teams
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Everything clinical education needs to run smoothly — from rotation planning to digital logbooks and attendance intelligence.</h2>
            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">MedLog brings clinical placements, assessments, supervisor communication, and accreditation tracking into one secure platform for students, supervisors, and administrators.</p>
            <div className="flex flex-wrap gap-4">
              <Button className="min-w-[160px]" size="lg">Schedule a Demo</Button>
              <Button variant="outline" className="min-w-[160px]" size="lg">Learn More</Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-white/80 dark:bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#6e56cf] via-[#7e67d9] to-[#a34be5] p-5 text-white shadow-lg">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em]">Live platform metrics</p>
                  <p className="mt-3 text-3xl font-semibold">98.7%</p>
                </div>
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                  <BarChart3 className="h-7 w-7" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-slate-50/90 p-5 text-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Learner engagement</p>
                  <p className="mt-4 text-3xl font-semibold">+42%</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Faster rotation completions and fewer missed sign-offs.</p>
                </div>
                <div className="rounded-3xl border border-border bg-slate-50/90 p-5 text-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Faculty efficiency</p>
                  <p className="mt-4 text-3xl font-semibold">+68%</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Reduce manual approvals and schedule coordination overhead.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="solutions" className="border-t border-slate-200/80 dark:border-slate-800/80 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e56cf]">Role-based workflows</p>
            <h3 className="mt-4 text-3xl font-bold sm:text-4xl">Designed for every member of the clinical learning ecosystem.</h3>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-300">MedLog gives students, instructors, and administrators a unified platform with the right data, the right access, and the right experience.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {roleCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-[2rem] border border-border bg-card p-8 shadow-sm transition-all duration-600 ease-out"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#6e56cf]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="mt-6 text-xl font-semibold">{card.title}</h4>
                  <p className="mt-3 text-slate-600 dark:text-slate-400">{card.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="ecosystem" className="bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e56cf]">Connected operations</p>
              <h3 className="text-3xl font-bold sm:text-4xl">Your academic ecosystem, visualized and synchronized.</h3>
              <p className="max-w-xl text-slate-600 dark:text-slate-400">Coordinate course rosters, unit supervisors, clinical sites, and accreditation reports in a single system that keeps everyone aligned.</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                <li className="rounded-3xl border border-border bg-card p-5 text-slate-700 dark:text-slate-200">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#6e56cf]">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-semibold">Multi-campus readiness</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Share rotation details, schedules, and approvals across hospital partners.</p>
                </li>
                <li className="rounded-3xl border border-border bg-card p-5 text-slate-700 dark:text-slate-200">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#6e56cf]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-semibold">Audit-ready compliance</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Attendance, assessment, and supervisor sign-off records are stored securely.</p>
                </li>
                <li className="rounded-3xl border border-border bg-card p-5 text-slate-700 dark:text-slate-200">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#6e56cf]">
                    <Layers className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-semibold">Shared curriculum view</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Align rotations, lectures, and practical assessments with academic goals.</p>
                </li>
                <li className="rounded-3xl border border-border bg-card p-5 text-slate-700 dark:text-slate-200">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#6e56cf]">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-semibold">Supervisor collaboration</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Enable mentors and unit leads to review logbooks and approve student competencies.</p>
                </li>
              </ul>
            </div>

            <div className="relative mx-auto max-w-xl">
              <div className="absolute inset-0 rounded-[2rem] bg-[#6e56cf]/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-border bg-slate-950/90 p-8 shadow-2xl">
                <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 p-5 text-white">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Platform hub</p>
                    <p className="mt-3 text-xl font-semibold">MedLog Core</p>
                  </div>
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-white/10">
                    <Circle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-6 grid gap-4">
                  {[
                    "Rotation planning",
                    "Attendance cycles",
                    "Digital logs & assessments",
                    "Supervisor feedback",
                  ].map((item) => (
                    <div key={item} className="rounded-3xl border border-slate-800/90 bg-slate-900/75 p-4 text-slate-200">
                      <p className="text-sm font-medium">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#2c2a5e] via-[#161432] to-[#070714] p-6 text-white">
                  <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-[#6e56cf]/20 blur-3xl" />
                  <div className="absolute right-4 top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Active rotations</span>
                      <span className="font-semibold">124</span>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-4 text-sm">
                      <p className="font-semibold">Clinical site activity</p>
                      <p className="mt-1 text-slate-300">Ward agendas, supervisor coverage, and student progress all connected.</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-3xl bg-white/10 p-4">
                        <p className="text-sm uppercase text-slate-400">Hospitals</p>
                        <p className="mt-2 text-xl font-semibold">18</p>
                      </div>
                      <div className="rounded-3xl bg-white/10 p-4">
                        <p className="text-sm uppercase text-slate-400">Supervisors</p>
                        <p className="mt-2 text-xl font-semibold">92</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="programs" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e56cf]">Core modules</p>
              <h3 className="mt-4 text-3xl font-bold sm:text-4xl">Built to support every phase of clinical education delivery.</h3>
              <p className="mt-4 max-w-xl text-slate-600 dark:text-slate-400">From onboarding cohorts to closing out competencies, MedLog gives your team a structured, configurable foundation.</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div key={module.title} className="rounded-3xl border border-border/80 bg-white/70 p-5 shadow-sm dark:bg-slate-950/90">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#6e56cf]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="mt-4 font-semibold">{module.title}</h4>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{module.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="assistant" className="bg-slate-950 text-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7b5bff]">Smart attendance</p>
              <h3 className="text-3xl font-bold sm:text-4xl">Capture attendance reliably with intelligent workflow support.</h3>
              <p className="max-w-xl text-slate-300">Whether students are in simulation labs, wards, or community outreach rotations, MedLog makes attendance simple, verifiable, and integrated with assessments.</p>
              <ul className="space-y-4">
                <li className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#6e56cf]/20 text-[#6e56cf]">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-semibold">Audit-ready presence logs</h4>
                    <p className="text-sm text-slate-300">Automated timestamping and supervisor verification for every clinical encounter.</p>
                  </div>
                </li>
                <li className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#6e56cf]/20 text-[#6e56cf]">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-semibold">Case-based progress tracking</h4>
                    <p className="text-sm text-slate-300">Link attendance to clinical cases, learning objectives, and supervisor feedback.</p>
                  </div>
                </li>
                <li className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#6e56cf]/20 text-[#6e56cf]">
                    <TabletSmartphone className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-semibold">Mobile-ready sign-in</h4>
                    <p className="text-sm text-slate-300">Students and supervisors can complete attendance from any device on campus.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
              <div className="grid gap-4 rounded-[1.75rem] bg-slate-900/90 p-6 text-white">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Attendance cycle</span>
                  <span className="font-semibold text-white">In progress</span>
                </div>
                <div className="rounded-3xl bg-slate-950/90 p-5">
                  <div className="mb-4 flex items-center justify-between gap-4 text-sm text-slate-300">
                    <span>Rotation session</span>
                    <span>Ped Surgery</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-2 w-[72%] rounded-full bg-gradient-to-r from-[#6e56cf] to-[#8b69ff]" />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Present</p>
                      <p className="mt-2 text-xl font-semibold">28</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pending</p>
                      <p className="mt-2 text-xl font-semibold">4</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="stats" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e56cf]">Clinical journey</p>
              <h3 className="text-3xl font-bold sm:text-4xl">From onboarding to graduation, every stage in one coherent path.</h3>
              <p className="max-w-xl text-slate-600 dark:text-slate-400">Map rotation progress, evaluations, and milestones with a timeline that keeps departments and students aligned.</p>
            </div>
            <div className="space-y-4">
              {[
                "Cohort planning and course approvals",
                "Rotation slot allocation and supervisor matching",
                "Real-time attendance and logbook validation",
                "Assessment review, remediation, and final competency sign-off",
              ].map((step, idx) => (
                <div key={step} className="flex gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#6e56cf]/10 text-[#6e56cf]">
                    <span className="font-semibold">{idx + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{step}</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Keep every rotation milestone visible to students and administrators with automated notifications.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard" className="bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e56cf]">Platform experience</p>
              <h3 className="text-3xl font-bold sm:text-4xl">A dashboard designed for busy clinical teams.</h3>
              <p className="max-w-xl text-slate-600 dark:text-slate-400">Get fast access to rotation status, upcoming assessments, learner progress, and supervisor assignments from one elegant workspace.</p>
              <ul className="grid gap-4">
                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#6e56cf]/10 text-[#6e56cf]"><BarChart3 className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold">Live performance snapshots</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">One view for capacity, attendance, and rotation readiness.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#6e56cf]/10 text-[#6e56cf]"><CalendarDays className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold">Daily planner</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">See session schedules, facility assignments, and staff availability at a glance.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#6e56cf]/10 text-[#6e56cf]"><ShieldCheck className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold">Compliance-ready reports</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Generate audit logs, attendance summaries, and assessment records instantly.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-slate-950/95 p-8 shadow-2xl">
              <div className="absolute left-8 top-8 h-44 w-44 rounded-full bg-[#6e56cf]/10 blur-3xl" />
              <div className="relative grid gap-5">
                <div className="rounded-[1.75rem] bg-slate-900/95 p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <p>Rotation overview</p>
                    <p className="font-semibold">Today</p>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-2 w-[68%] rounded-full bg-gradient-to-r from-[#6e56cf] to-[#8b69ff]" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Ward visits complete</span>
                      <span>68%</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.75rem] bg-slate-900/95 p-5 text-white shadow-lg">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pending reviews</p>
                    <p className="mt-4 text-3xl font-semibold">14</p>
                  </div>
                  <div className="rounded-[1.75rem] bg-slate-900/95 p-5 text-white shadow-lg">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active teams</p>
                    <p className="mt-4 text-3xl font-semibold">9</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e56cf]">Why MedLog</p>
            <h3 className="mt-4 text-3xl font-bold sm:text-4xl">Enterprise-grade clinical education with a friendly, modern experience.</h3>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Built for complex programs",
                description: "Handle multi-year curriculum, multiple hospitals, and multiple student cohorts with confidence.",
                icon: Globe2,
              },
              {
                title: "Insightful analytics",
                description: "Actionable reports help faculty and leadership spot gaps, improve rotations, and support accreditation.",
                icon: BarChart3,
              },
              {
                title: "Secure and compliant",
                description: "Role-based access, enterprise controls, and audit trails keep student data protected.",
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#6e56cf]/10 text-[#6e56cf]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="mt-6 text-xl font-semibold">{item.title}</h4>
                  <p className="mt-3 text-slate-600 dark:text-slate-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="roadmap" className="bg-slate-950 text-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6bf7]">Roadmap</p>
            <h3 className="mt-4 text-3xl font-bold sm:text-4xl">A product roadmap built for growth and enterprise readiness.</h3>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {roadmapItems.map((item, index) => (
              <div key={item.title} className="group rounded-[2rem] border border-white/10 bg-white/5 p-8 transition hover:-translate-y-1 hover:border-[#6e56cf]/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[#6e56cf]/15 text-[#6e56cf]">
                  <span className="font-semibold">Q{index + 3}</span>
                </div>
                <h4 className="mt-6 text-xl font-semibold">{item.title}</h4>
                <p className="mt-3 text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e56cf]">FAQ</p>
            <h3 className="mt-4 text-3xl font-bold sm:text-4xl">Frequently asked questions.</h3>
          </div>
          <div className="grid gap-4">
            {faqs.map((item) => (
              <details key={item.question} className="rounded-[1.75rem] border border-border bg-card p-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {item.question}
                  <span className="text-xl text-[#6e56cf]">+</span>
                </summary>
                <p className="mt-4 text-slate-600 dark:text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#6e56cf] via-[#7b5bff] to-[#a24cf0] py-20 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">Ready to transform your clinical education?</p>
              <h3 className="mt-4 text-3xl font-bold sm:text-4xl">Launch MedLog and give your medical school one premium command center.</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button className="min-w-[160px] bg-white text-[#2c2b4c] hover:bg-slate-100" size="lg">Book a personalized demo</Button>
              <Button variant="outline" className="min-w-[160px] border-white text-white hover:bg-white/10" size="lg">Get started now</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
