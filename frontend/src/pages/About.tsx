import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Award, Globe2, ShieldCheck, Sparkles, Github, Mail, Phone, Twitter, X, QrCode, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/provider/theme";
import mordredImage from "./assets/mordred.png";
import medlogDarkLogo from "/medlog-dark.svg";
import charlesImage from "./assets/charles.png";
import abokImage from "./assets/abok.png";
import aeImage from "./../../public/ae.png";

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
    avatar: mordredImage,
    github: "draco-mordred",
    email: "israelicheal227@gmail.com",
    phone: "+234 906 760 4081",
    website: "https://draco-mordred.vercel.app",
    twitter: "https://twitter.com/DracoMordred",
    company: {
      name: "Avalon Ent.",
      logo: aeImage,
      website: "https://avaloncorp.com",
    }
  },
  {
    name: "Charles M. Nwaeze",
    role: "Product Designer",
    avatar: charlesImage,
    github: "Charliecodenaija",
    email: "charles@schooldash.app",
    phone: "+234 703 261 7644",
    website: "https://bigchange9ja.com",
    twitter: "https://twitter.com/Charliecodenaija",
    company: {
      name: "BigChange9ja",
      logo: charlesImage,
      website: "https://bigchange9ja.com",
    }
  },
    {
    name: "Prof. Ishaya Abok",
    role: "Technical Advisor & Teacher",
    avatar: abokImage,
    github: "nwaezecharles",
    email: "ada@schooldash.app",
    phone: "+234 812 345 6789",
    website: "https://schooldash.app",
    twitter: "https://twitter.com/profishayabok",
    company: {
      name: "University of Jos",
      logo: abokImage,
      website: "https://universityofjos.edu.ng",
    }
  },
];

const About = () => {
  const { theme, setTheme } = useTheme();
  const [activeContactDeveloper, setActiveContactDeveloper] = useState<(typeof developers)[number] | null>(null);
  const [isContactVisible, setIsContactVisible] = useState(false);
  const isDark = theme === "dark";

  const handlePhoneAction = (phone: string) => {
    if (typeof window === "undefined") return;
    const cleanPhone = phone.replace(/\s+/g, "");
    window.location.href = `tel:${cleanPhone}`;
    void navigator.clipboard?.writeText(cleanPhone);
  };

  const buildQrCodeUrl = (developer: (typeof developers)[number]) => {
    const vCard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${developer.name}`,
      `ORG:${developer.company?.name ?? "MedLog"}`,
      `EMAIL:${developer.email}`,
      `TEL:${developer.phone}`,
      `URL:${developer.website}`,
      "END:VCARD",
    ].join("\n");

    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(vCard)}`;
  };

  const openContactPopover = (developer: (typeof developers)[number], event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveContactDeveloper(developer);
    setIsContactVisible(true);
  };

  const closeContactPopover = () => {
    setIsContactVisible(false);
    window.setTimeout(() => {
      setActiveContactDeveloper(null);
    }, 400);
  };

  const handleCardLeave = (developer: (typeof developers)[number]) => {
    if (activeContactDeveloper?.name === developer.name) {
      closeContactPopover();
    }
  };

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
                Strategic technologists and creative problem-solvers committed to transforming healthcare education through thoughtful, elegant software design.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {developers.map((developer) => (
                <div
                  key={developer.name}
                  onMouseLeave={() => handleCardLeave(developer)}
                  className="group relative isolate h-[34rem] overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_30px_70px_-35px_rgba(15,23,42,0.35)] transition-all duration-500 hover:z-20 hover:-translate-y-4 hover:scale-[1.03] hover:shadow-[0_30px_70px_-30px_rgba(15,23,42,0.35)]"
                >
                  <div className="absolute inset-0 bg-background/70">
                    <img
                      src={developer.avatar}
                      alt={developer.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
                  </div>

                  <div className="absolute left-5 right-5 bottom-5 z-10 rounded-[1.75rem] border border-border/70 bg-background/85 p-5 backdrop-blur-xl shadow-lg shadow-foreground/5 transition-all duration-500 group-hover:translate-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Developer</p>
                    <h3 className="mt-2 text-2xl font-semibold leading-tight text-foreground">{developer.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{developer.role}</p>
                  </div>

                  <div className={`absolute inset-x-0 bottom-0 z-20 flex h-full flex-col justify-end bg-gradient-to-t from-background via-background/95 to-transparent p-6 pt-24 transition-all duration-500 ${activeContactDeveloper?.name === developer.name && isContactVisible ? "translate-y-6 opacity-0 pointer-events-none" : "translate-y-6 opacity-0 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto"}`}>
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5">
                          {developer.company?.name ?? "Team Member"}
                        </span>
                        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5">
                          {developer.website.replace(/^https?:\/\//, "")}
                        </span>
                      </div>

                      <div className="rounded-[1.75rem] border border-border/70 bg-background/80 p-5 shadow-inner shadow-foreground/5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Professional profiles</p>
                          {developer.company?.logo ? (
                            <img src={developer.company.logo} alt={`${developer.company.name} logo`} className="h-7 w-7 rounded-full border border-border/70 object-cover shadow-sm" />
                          ) : null}
                        </div>
                        <div className="mt-4 grid gap-2.5">
                          <a
                            href={`https://github.com/${developer.github}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-muted"
                          >
                            <Github className="h-3.5 w-3.5 text-primary" />
                            <span>{developer.github}</span>
                          </a>
                          <a
                            href={`mailto:${developer.email}`}
                            className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-muted"
                          >
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            <span>{developer.email}</span>
                          </a>
                          <a
                            href={`tel:${developer.phone.replace(/\s+/g, "")}`}
                            onClick={(event) => {
                              event.preventDefault();
                              handlePhoneAction(developer.phone);
                            }}
                            className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-muted"
                          >
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            <span>{developer.phone}</span>
                          </a>
                          <a
                            href={developer.twitter?.startsWith("http") ? developer.twitter : `https://x.com/${developer.twitter?.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-muted"
                          >
                            <Twitter className="h-3.5 w-3.5 text-primary" />
                            <span>{developer.twitter?.replace(/^https?:\/\/twitter\.com\//i, "@")}</span>
                          </a>
                          <a
                            href={developer.website}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-muted"
                          >
                            <Globe2 className="h-3.5 w-3.5 text-primary" />
                            <span>{developer.website.replace(/^https?:\/\//, "")}</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-border/70 bg-background/80 px-0 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(event) => openContactPopover(developer, event)}
                          className="rounded-full border border-border/70 bg-background/70 px-4 py-3 text-foreground hover:bg-muted"
                        >
                          Save contact
                        </Button>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://github.com/${developer.github}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex h-8 w-8 items-center justify-center rounded-2xl bg-background/70 text-primary transition hover:bg-muted"
                          >
                            <Github className="h-3 w-3" />
                          </a>
                          {developer.twitter ? (
                            <a
                              href={developer.twitter.startsWith("http") ? developer.twitter : `https://x.com/${developer.twitter.replace(/^@/, "")}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="flex h-8 w-8 items-center justify-center rounded-2xl bg-background/70 text-primary transition hover:bg-muted"
                            >
                              <Twitter className="h-3 w-3" />
                            </a>
                          ) : null}
                          <a
                            href={`mailto:${developer.email}`}
                            className="flex h-8 w-8 items-center justify-center rounded-2xl bg-background/70 text-primary transition hover:bg-muted"
                          >
                            <Mail className="h-3 w-3" />
                          </a>
                          <a
                            href={`tel:${developer.phone.replace(/\s+/g, "")}`}
                            onClick={(event) => {
                              event.preventDefault();
                              handlePhoneAction(developer.phone);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-2xl bg-background/70 text-primary transition hover:bg-muted"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`absolute inset-x-0 bottom-0 z-30 rounded-[1.75rem] border border-border/70 bg-background/95 p-5 shadow-2xl shadow-foreground/10 backdrop-blur-xl transition-all duration-500 ${activeContactDeveloper?.name === developer.name && isContactVisible ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-6 opacity-0 pointer-events-none"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                          <QrCode className="h-3 w-3" />
                          Contact QR
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">{developer.name}</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Scan to save a contact card for {developer.email}.</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          closeContactPopover();
                        }}
                        className="rounded-full border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-background/80 p-3">
                      <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-[1rem] bg-white p-3">
                        <img src={buildQrCodeUrl(developer)} alt="Contact QR code" className="h-full w-full object-contain" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img src={medlogDarkLogo} alt="MedLog logo" className="h-10 w-10 rounded-full border border-slate-200 bg-white p-1 shadow-lg" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${developer.email}`}
                        className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                      <a
                        href={`tel:${developer.phone.replace(/\s+/g, "")}`}
                        onClick={(event) => {
                          event.preventDefault();
                          handlePhoneAction(developer.phone);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-3 text-sm font-semibold text-foreground shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-muted"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span>{isDark ? "Light" : "Dark"}</span>
      </button>
    </div>
  );
};

export default About;
