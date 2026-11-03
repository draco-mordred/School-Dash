// PR M3/M7 — DALE chat settings (per-user, stored locally).
export const ANIMATIONS_KEY = "dale-animations";
export const GLASS_KEY = "dale-glass";
export const ACCENT_KEY = "dale-accent";

export const animationsEnabled = (): boolean => {
  try { return localStorage.getItem(ANIMATIONS_KEY) !== "off"; } catch { return true; }
};
export const setAnimationsEnabled = (enabled: boolean) => {
  try { localStorage.setItem(ANIMATIONS_KEY, enabled ? "on" : "off"); } catch {}
};
export const glassEnabled = (): boolean => {
  try { return localStorage.getItem(GLASS_KEY) !== "off"; } catch { return true; }
};
export const setGlassEnabled = (enabled: boolean) => {
  try { localStorage.setItem(GLASS_KEY, enabled ? "on" : "off"); } catch {}
};
export const DALE_ACCENTS: { name: string; color: string; rgb: string }[] = [
  { name: "Violet", color: "#6e56cf", rgb: "110, 86, 207" },
  { name: "Blue", color: "#3b82f6", rgb: "59, 130, 246" },
  { name: "Green", color: "#22c55e", rgb: "34, 197, 94" },
  { name: "Pink", color: "#ec4899", rgb: "236, 72, 153" },
  { name: "Orange", color: "#f97316", rgb: "249, 115, 22" },
];
export const getAccent = (): { name: string; color: string; rgb: string } =>
  DALE_ACCENTS.find((a) => a.color === localStorage.getItem(ACCENT_KEY)) ?? DALE_ACCENTS[0];
export const setAccent = (color: string) => {
  try { localStorage.setItem(ACCENT_KEY, color); } catch {}
};

export const PINS_KEY = "dale-dm-pins";
export const getPinnedPartnerIds = (): string[] => {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch { return []; }
};
export const setPinnedPartnerIds = (ids: string[]) => {
  try { localStorage.setItem(PINS_KEY, JSON.stringify(ids)); } catch {}
};
export const togglePinPartner = (partnerId: string): string[] => {
  const pins = getPinnedPartnerIds();
  const next = pins.includes(partnerId) ? pins.filter((id) => id !== partnerId) : [...pins, partnerId];
  setPinnedPartnerIds(next);
  return next;
};
