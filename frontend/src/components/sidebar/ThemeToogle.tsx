import { Moon, Sun, Laptop } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/provider/theme";

export const ThemeToogle = ({ layout = "row" }: { layout?: "row" | "col" }) => {
  const { setTheme, theme } = useTheme();
  const setThemeFromEvent = (
    event: React.MouseEvent<HTMLButtonElement>,
    nextTheme: "light" | "dark" | "system",
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTheme(nextTheme, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  const containerClass =
    layout === "col" ? "flex flex-col items-center gap-1" : "flex gap-2";

  return (
    <div className={containerClass}>
      <Button
        title="Light Theme"
        aria-label="Light Theme"
        size={"icon-sm"}
        variant={theme === "light" ? "outline" : "ghost"}
        onClick={(event) => setThemeFromEvent(event, "light")}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        title="Dark Theme"
        aria-label="Dark Theme"
        size={"icon-sm"}
        variant={theme === "dark" ? "outline" : "ghost"}
        onClick={(event) => setThemeFromEvent(event, "dark")}
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        title="System Theme"
        aria-label="System Theme"
        size={"icon-sm"}
        variant={theme === "system" ? "outline" : "ghost"}
        onClick={(event) => setThemeFromEvent(event, "system")}
      >
        <Laptop className="h-4 w-4" />
      </Button>
    </div>
  );
};
