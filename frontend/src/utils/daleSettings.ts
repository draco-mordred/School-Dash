// PR M3 — DALE chat settings (per-user, stored locally).
export const ANIMATIONS_KEY = "dale-animations";

export const animationsEnabled = (): boolean => {
  try {
    return localStorage.getItem(ANIMATIONS_KEY) !== "off";
  } catch {
    return true;
  }
};

export const setAnimationsEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(ANIMATIONS_KEY, enabled ? "on" : "off");
  } catch {
    /* storage unavailable — keep default on */
  }
};

export const PINS_KEY = "dale-dm-pins";

export const getPinnedPartnerIds = (): string[] => {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export const setPinnedPartnerIds = (ids: string[]) => {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};

export const togglePinPartner = (partnerId: string): string[] => {
  const pins = getPinnedPartnerIds();
  const next = pins.includes(partnerId)
    ? pins.filter((id) => id !== partnerId)
    : [...pins, partnerId];
  setPinnedPartnerIds(next);
  return next;
};
