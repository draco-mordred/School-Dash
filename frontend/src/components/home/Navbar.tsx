import { useEffect, useState } from "react";
import { Menu, 
  // Sparkles, 
  X 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/global/ThemeToggle";
import { api } from "@/lib/api";
import { useSetupStatus } from "@/lib/useSetupStatus";

const links = [
  { label: "Overview", href: "#overview" },
  { label: "Modules", href: "#modules" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "FAQ", href: "#faq" },  
  { label: "About", href: "/about" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isNavigatingSetup, setIsNavigatingSetup] = useState(false);
  const { isSetupConfigured } = useSetupStatus();

  const smoothScrollTo = (hash: string) => {
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    const el = document.getElementById(id);
    if (!el) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const topbar = rootStyles.getPropertyValue("--topbar-height") || "56px";
    const topbarPx = parseInt(topbar, 10) || 56;
    const rect = el.getBoundingClientRect();
    const target = window.scrollY + rect.top - topbarPx - 12; // small gap

    window.scrollTo({ top: target, behavior: "smooth" });

    // move focus for accessibility
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
          scrolled ? "border-b border-border/70 bg-background/80 py-2 shadow-sm backdrop-blur-xl" : "bg-transparent py-3"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/medlog-dark.svg" alt="MedLog logo" className="h-10 w-10" />
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-[0.24em] text-foreground">MED<span className="text-primary">LOG</span></p>
              <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Clinical LMS</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {links.map((link) =>
              link.href.startsWith("/") ? (
                <Link key={link.label} to={link.href} className="text-sm font-medium text-muted-foreground transition hover:text-primary">
                  {link.label}
                </Link>
              ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      smoothScrollTo(link.href);
                    }}
                    className="text-sm font-medium text-muted-foreground transition hover:text-primary"
                  >
                    {link.label}
                  </a>
                ),
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSetupEntry}
              disabled={isNavigatingSetup}
              className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 sm:inline-flex"
            >
              {isNavigatingSetup ? "Loading..." : "Get Started"}
            </button>
            {/* <Link
              to="/register"
              className="hidden rounded-full border border-slate-300/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-700 dark:text-slate-200 lg:inline-flex"
            >
              Register
            </Link> */}
            <a
              href="#role-aware"
              onClick={(e) => {
                e.preventDefault();
                smoothScrollTo("#role-aware");
              }}
              className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 lg:inline-flex"
            >
              Login
            </a>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition hover:border-primary hover:text-primary lg:hidden"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-border/70 bg-card/95 px-4 py-5 shadow-lg backdrop-blur-xl lg:hidden">
            <div className="space-y-3">
              {links.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-base font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsOpen(false);
                      smoothScrollTo(link.href);
                    }}
                    className="block rounded-2xl px-4 py-3 text-base font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-primary"
                  >
                    {link.label}
                  </a>
                ),
              )}
              {/* <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="block rounded-full border border-slate-300/80 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-[#6e56cf] hover:text-[#6e56cf] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
              >
                Register
              </Link> */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  smoothScrollTo("#role-aware");
                }}
                className="block rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  void handleSetupEntry();
                }}
                className="block w-full rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {isNavigatingSetup ? "Loading..." : "Get Started"}
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
