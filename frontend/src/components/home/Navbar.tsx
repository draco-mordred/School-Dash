import { useEffect, useState } from "react";
import { Menu, 
  // Sparkles, 
  X 
} from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/global/ThemeToggle";

const links = [
  { label: "Overview", href: "#overview" },
  { label: "Modules", href: "#modules" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "FAQ", href: "#faq" },  
  { label: "About", href: "/about" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6e56cf] shadow-lg shadow-violet-500/20">
              <svg viewBox="0 0 40 40" className="h-6 w-6 text-white" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M20 6C13.3726 6 8 11.3726 8 18C8 24.6274 13.3726 30 20 30C26.6274 30 32 24.6274 32 18C32 11.3726 26.6274 6 20 6Z" stroke="currentColor" strokeWidth="2" />
                <path d="M20 12V26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 18H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-[0.24em] text-slate-900 dark:text-white">MED<span className="text-[#6e56cf]">LOG</span></p>
              <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Clinical command center</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {links.map((link) =>
              link.href.startsWith("/") ? (
                <Link key={link.label} to={link.href} className="text-sm font-medium text-slate-700 transition hover:text-[#6e56cf] dark:text-slate-300">
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className="text-sm font-medium text-slate-700 transition hover:text-[#6e56cf] dark:text-slate-300">
                  {link.label}
                </a>
              ),
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/register"
              className="hidden rounded-full bg-[#6e56cf] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-[#5e45c2] sm:inline-flex"
            >
              Get Started
            </Link>
            <Link
              to="/register"
              className="hidden rounded-full border border-slate-300/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-700 dark:text-slate-200 lg:inline-flex"
            >
              Register
            </Link>
            <Link
              to="/login"
              className="hidden rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 lg:inline-flex"
            >
              Login
            </Link>
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
          <div className="border-t border-slate-200/70 bg-white/95 px-4 py-5 shadow-lg backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/95 lg:hidden">
            <div className="space-y-3">
              {links.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-[#6e56cf] dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-[#6e56cf] dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {link.label}
                  </a>
                ),
              )}
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="block rounded-full border border-slate-300/80 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
              >
                Register
              </Link>
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block rounded-full bg-[#6e56cf] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#5e45c2]"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="block rounded-full bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
