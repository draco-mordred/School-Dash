import { useEffect, useState } from "react";
import { Menu, Sparkles, Stethoscope, X } from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/global/ThemeToggle";

const links = [
  { label: "Overview", href: "#overview" },
  { label: "Modules", href: "#modules" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "FAQ", href: "#faq" },
  { label: "About", href: "#about" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const navEl = document.querySelector("nav");
    if (!navEl) return;

    const setHeight = () => {
      const height = navEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--topbar-height", `${Math.ceil(height)}px`);
    };

    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, [scrolled, isOpen]);

  return (
    <header className="relative z-50">
      <nav
        id="top-navbar"
        className={`fixed inset-x-0 top-0 transition-all duration-300 ${
          scrolled
            ? "border-b border-slate-200/70 bg-white/80 py-2 shadow-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80"
            : "bg-transparent py-3"
        }`}
      >
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(110,86,207,0.16),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(52,178,123,0.12),_transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(127,90,240,0.28),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(69,182,255,0.2),_transparent_30%)]" />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.72) 1px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1px)",
              backgroundSize: "180px 180px, 260px 260px",
              backgroundPosition: "0 0, 90px 90px",
            }}
          />
        </div>

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6e56cf] shadow-lg shadow-violet-500/20">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-[0.24em] text-slate-900 dark:text-white">MED<span className="text-[#6e56cf]">LOG</span></p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Clinical excellence</p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-700 transition hover:text-[#6e56cf] dark:text-slate-300"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/register"
                className="rounded-full border border-slate-300/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-700 dark:text-slate-200"
              >
                Register
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#6e56cf] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:translate-y-[-1px]"
              >
                <Sparkles className="h-4 w-4" />
                Login
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300/80 text-slate-700 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-700 dark:text-slate-200 lg:hidden"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-slate-200/70 bg-white/90 px-4 py-5 shadow-lg backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/90 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-2xl px-3 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-[#6e56cf] dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 sm:hidden">
                <Link
                  to="/register"
                  className="rounded-full border border-slate-300/80 px-4 py-2 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  onClick={() => setIsOpen(false)}
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="rounded-full bg-[#6e56cf] px-4 py-2 text-center text-sm font-semibold text-white"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
