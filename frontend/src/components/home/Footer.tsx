import { ArrowUp, Github, Linkedin, Sparkles, Stethoscope, Twitter } from "lucide-react";

const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Clinical modules", href: "#modules" },
      { label: "Attendance intelligence", href: "#overview" },
      { label: "Program roadmap", href: "#roadmap" },
    ],
  },
  {
    title: "For teams",
    links: [
      { label: "Students", href: "#overview" },
      { label: "Faculty", href: "#overview" },
      { label: "Program leaders", href: "#overview" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Support", href: "#overview" },
      { label: "Contact", href: "#overview" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="relative border-t border-slate-200/70 bg-white/80 text-slate-700 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80 dark:text-slate-300">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(110,86,207,0.12),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(52,178,123,0.1),_transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(127,90,240,0.2),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(69,182,255,0.16),_transparent_30%)]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6e56cf] shadow-lg shadow-violet-500/20">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[0.24em] text-slate-900 dark:text-white">MED<span className="text-[#6e56cf]">LOG</span></p>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">For modern medical schools</p>
              </div>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">
              A premium operating layer for clinical education, built to keep rotation planning, attendance insight, and learner progress aligned in real time.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#" aria-label="Twitter" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" aria-label="LinkedIn" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" aria-label="GitHub" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-900 dark:text-white">
                {column.title}
              </h3>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="transition hover:text-[#6e56cf]">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-[#6e56cf]" />
              Stay in the loop
            </div>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
              Receive updates for new modules, workflow launches, and campus-ready analytics.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200/70 pt-6 text-sm text-slate-500 dark:border-slate-800/70 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 MedLog. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="transition hover:text-[#6e56cf]">Privacy</a>
            <a href="#" className="transition hover:text-[#6e56cf]">Terms</a>
            <a href="#" className="transition hover:text-[#6e56cf]">Cookies</a>
          </div>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
