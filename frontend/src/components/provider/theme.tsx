import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light" | "system";
type ThemeOrigin = { x: number; y: number };

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
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

      const root = window.document.documentElement;
      const updateTheme = () => {
        localStorage.setItem(storageKey, nextTheme);
        applyThemeToDocument(nextTheme);
        setTheme(nextTheme);
      };
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const documentWithTransitions = window.document as ViewTransitionDocument;

      if (!documentWithTransitions.startViewTransition || prefersReducedMotion) {
        updateTheme();
        return;
      }

      root.style.setProperty(
        "--theme-transition-x",
        `${origin?.x ?? window.innerWidth / 2}px`,
      );
      root.style.setProperty(
        "--theme-transition-y",
        `${origin?.y ?? window.innerHeight / 2}px`,
      );

      const transition = documentWithTransitions.startViewTransition(updateTheme);
      const clearTransitionOrigin = () => {
        root.style.removeProperty("--theme-transition-x");
        root.style.removeProperty("--theme-transition-y");
      };
      void transition.finished.then(clearTransitionOrigin, clearTransitionOrigin);
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
