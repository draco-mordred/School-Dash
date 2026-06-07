/**
 * Flat-style icon component.
 * Renders a rounded tile with a single solid background color and a white glyph SVG.
 */
import { cn } from "@/lib/utils";

export type W11Glyph =
  | "users"
  | "graduation-cap"
  | "camera"
  | "layers"
  | "clipboard-list"
  | "clock"
  | "settings"
  | "book-open"
  | "bar-chart"
  | "trending-up"
  | "user-circle"
  | "shield"
  | "bell"
  | "chevron-right"
  | "check"
  | "warning"
  | "info"
  | "search";

interface W11IconProps {
  glyph: W11Glyph;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "h-9 w-9", glyph: "h-4 w-4", radius: "rounded-lg" },
  md: { container: "h-11 w-11", glyph: "h-5 w-5", radius: "rounded-xl" },
  lg: { container: "h-14 w-14", glyph: "h-6 w-6", radius: "rounded-2xl" },
};

// SVG paths for each glyph (white stroke, round caps/joins)
const glyphPaths: Record<W11Glyph, string> = {
  "users": "M9 7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM2 21a4 4 0 0 1 4-4h.5M14.5 17a4 4 0 0 1 0-8 4 4 0 0 1 0 8zM18 21a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
  "graduation-cap": "M12 4L2 9l10 5 10-5-10-5zM2 9v6l10 5 10-5V9",
  "layers": "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  "clipboard-list": "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 9h6M9 13h6M9 17h4",
  "clock": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  "settings": "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  "book-open": "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  "bar-chart": "M12 20V10M6 20v-4M18 20V4",
  "trending-up": "M23 6l-9.5 9.5-5-5L1 17M17 6h6v6",
  "user-circle": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 11a3 3 0 1 1 6 0M12 17c-2 0-3.5-1-3.5-2H16c0 1.5-1.5 2-1.5 2",
  "shield": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "bell": "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  "chevron-right": "M9 18l6-6-6-6",
  "check": "M20 6L9 17l-5-5",
  "warning": "M12 2L2 22h20zM12 9v4M12 17h.01",
  "info": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 16v-4M12 8h.01",
  "search": "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
};

// Flat solid background colors per glyph (single-tone flat icons)
const glyphColors: Record<W11Glyph, string> = {
  "users":           "#0078D4",
  "graduation-cap":  "#A437EE",
  "layers":          "#00B7C3",
  "clipboard-list":  "#008A05",
  "clock":           "#FFB900",
  "settings":        "#5C2D91",
  "book-open":       "#C19C00",
  "bar-chart":       "#00A4EF",
  "trending-up":     "#00B450",
  "user-circle":     "#5673F0",
  "shield":          "#D13438",
  "bell":            "#FFB900",
  "camera":          "#0078D4",
  "chevron-right":   "#606060",
  "check":           "#107C10",
  "warning":         "#CA5010",
  "info":            "#0078D4",
  "search":          "#484848",
};

export function W11Icon({ glyph, size = "md", className }: W11IconProps) {
  const { container, glyph: glyphSize, radius } = sizeMap[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0",
        container,
        radius,
        className
      )}
      style={{ backgroundColor: glyphColors[glyph] }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(glyphSize, "pointer-events-none")}
      >
        <path d={glyphPaths[glyph]} />
      </svg>
    </div>
  );
}
