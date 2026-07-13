import { Link } from "react-router-dom";
import { ArrowLeft, Award, Globe2, ShieldCheck, Sparkles, Github, Mail, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const developers = [
  {
    name: "Israel T. Oladele",
    role: "Lead Full-stack Developer",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=280&q=80",
    github: "draco-mordred",
    email: "israelicheal227@gmail.com",
    phone: "+234 9067604081",
    website: "https://draco-mordred.vercel.app",
  },
  {
    name: "Charles Nwaeze",
    role: "Product Designer & Frontend Lead",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=280&q=80",
    github: "nwaezecharles",
    email: "ada@schooldash.app",
    phone: "+234 812 345 6789",
    website: "https://schooldash.app",
  },
];

const About = () => {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(110,86,207,0.16),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(52,178,123,0.12),_transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(127,90,240,0.18),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(69,182,255,0.16),_transparent_32%)]" />
      <div className="relative z-20 px-4 pt-4 sm:px-6 sm:pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-16">
        <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-primary shadow-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              About MedLog
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              A premium platform built for modern clinical education.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              MedLog is the next-generation school operations platform for medical programs, combining clinical placement management, attendance tracking, digital logbooks, and accreditation workflows in one elegant experience.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg">Request a Demo</Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-2xl backdrop-blur-xl">
            <div className="space-y-6">
              <div className="rounded-[1.75rem] bg-secondary/10 p-6">
                <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Why MedLog</p>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">
                  Built with the operational realities of clinical education in mind.
                </h2>
              </div>
              <div className="grid gap-4">
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5 text-foreground">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-24 rounded-[2rem] border border-border/70 bg-card/90 p-10 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Our mission</p>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                Help medical teams deliver better clinical training without administrative friction.
              </h2>
              <p className="max-w-xl text-muted-foreground">
                We believe clinical training should be powered by intelligent workflows, not tangled spreadsheets. MedLog puts supervision, reporting, and progress tracking in one place so teams can stay focused on learning.
              </p>
            </div>
            <div className="grid gap-4 rounded-[1.75rem] bg-background/80 p-6 text-muted-foreground">
              <div className="flex items-center justify-between rounded-3xl bg-muted/10 p-4">
                <span>Trusted by clinical schools</span>
                <strong className="text-foreground">100+</strong>
              </div>
              <div className="flex items-center justify-between rounded-3xl bg-muted/10 p-4">
                <span>Average rollout</span>
                <strong className="text-foreground">30 days</strong>
              </div>
              <div className="flex items-center justify-between rounded-3xl bg-muted/10 p-4">
                <span>Platform uptime</span>
                <strong className="text-foreground">99.9%</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-24 rounded-[2rem] border border-border/70 bg-card/90 p-10 shadow-2xl backdrop-blur-xl">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">About the developers</p>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                Meet the team behind MedLog.
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Our developers combine healthcare operations experience with modern engineering practices to build a reliable, polished product.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {developers.map((developer) => (
                <div key={developer.name} className="rounded-[1.75rem] border border-border/70 bg-background/70 p-6 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center">
                    <Avatar className="h-24 w-24 shrink-0 overflow-hidden rounded-[1.5rem] border border-border/70 bg-muted/20">
                      <AvatarImage src={developer.avatar} alt={developer.name} className="h-full w-full object-cover" />
                      <AvatarFallback className="text-2xl text-foreground">
                        {developer.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">{developer.role}</p>
                      <h3 className="mt-3 text-xl font-semibold text-foreground">{developer.name}</h3>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                    <a
                      href={`https://github.com/${developer.github}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3 text-foreground transition hover:bg-muted"
                    >
                      <Github className="h-4 w-4 text-primary" />
                      <span>{developer.github}</span>
                    </a>
                    <a
                      href={`mailto:${developer.email}`}
                      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3 text-foreground transition hover:bg-muted"
                    >
                      <Mail className="h-4 w-4 text-primary" />
                      <span>{developer.email}</span>
                    </a>
                    <a
                      href={`tel:${developer.phone.replace(/\s+/g, "")}`}
                      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3 text-foreground transition hover:bg-muted"
                    >
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{developer.phone}</span>
                    </a>
                    <a
                      href={developer.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3 text-foreground transition hover:bg-muted"
                    >
                      <Globe2 className="h-4 w-4 text-primary" />
                      <span>{developer.website}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
