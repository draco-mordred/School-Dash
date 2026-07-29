import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light" | "system";
type ThemeOrigin = { x: number; y: number };
type ThemeTransitionDirection = "outward" | "inward";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const getResolvedTheme = (theme: Theme) => {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return theme;
};

const applyThemeToDocument = (theme: Theme) => {
  const root = window.document.documentElement;
  const resolvedTheme = getResolvedTheme(theme);

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;
};

const createThemeTransitionOverlay = (
  origin?: ThemeOrigin,
  direction: ThemeTransitionDirection = "outward",
) => {
  if (typeof window === "undefined") return null;

  const overlay = window.document.createElement("div");
  overlay.className = `theme-transition-ripple ${direction === "inward" ? "is-inward" : "is-outward"}`;

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;

  overlay.style.left = `${x}px`;
  overlay.style.top = `${y}px`;

  window.document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add("is-active");
  });

  window.setTimeout(() => overlay.remove(), 1100);

  return overlay;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (nextTheme: Theme, origin?: ThemeOrigin) => {
      if (nextTheme === theme) {
        return;
      }

      const direction: ThemeTransitionDirection =
        theme === "system" || nextTheme === "system" ? "inward" : "outward";

      const root = window.document.documentElement;
      root.classList.add("theme-transition-active");

      createThemeTransitionOverlay(origin, direction);

      window.setTimeout(
        () => {
          localStorage.setItem(storageKey, nextTheme);
          applyThemeToDocument(nextTheme);
          setTheme(nextTheme);
        },
        direction === "inward" ? 120 : 220,
      );

      window.setTimeout(() => {
        root.classList.remove("theme-transition-active");
      }, 1100);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
