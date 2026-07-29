import { Moon, Sun, Laptop } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/provider/theme";

export const ThemeToogle = () => {
  const { setTheme, theme } = useTheme();
  return (
    <div className="flex gap-2">
      <Button
        title="Light Theme"
        size={"icon-sm"}
        variant={theme === "light" ? "outline" : "ghost"}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setTheme("light", {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        title="Dark Theme"
        size={"icon-sm"}
        variant={theme === "dark" ? "outline" : "ghost"}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setTheme("dark", {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }}
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        title="System Theme"
        size={"icon-sm"}
        variant={theme === "system" ? "outline" : "ghost"}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setTheme("system", {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }}
      >
        <Laptop className="h-4 w-4" />
      </Button>
    </div>
  );
};
