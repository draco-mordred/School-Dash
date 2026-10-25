// Phase F1: offline tap queue for auto lecture attendance. When a
// check-in POST fails with no HTTP response (device offline), the tap is
// buffered in localStorage with its client timestamp and an idempotency
// key, then replayed with exponential backoff once connectivity returns.

export type OfflineTap = {
  id: string; // idempotency key
  session: string;
  choice: "present" | "absent";
  absenceReason?: string;
  coords: { lat: number; lng: number } | null;
  clientTimestamp: string; // when the student actually tapped
  attempts: number;
  nextAttemptAt: number; // epoch ms — exponential backoff gate
};

const STORAGE_KEY = "school-dash:offline-attendance-queue";
const BASE_BACKOFF_MS = 30 * 1000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

const readAll = (): OfflineTap[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineTap[]) : [];
  } catch {
    return [];
  }
};

const writeAll = (taps: OfflineTap[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(taps));
  } catch {
    // Storage full/unavailable — the live path still works without the queue.
  }
};

export const newTapKey = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the manual generator below
  }
  return "tap-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
};

export const enqueueOfflineTap = (
  tap: Omit<OfflineTap, "attempts" | "nextAttemptAt">,
): OfflineTap => {
  const taps = readAll();
  // One buffered tap per session — a re-tap replaces the queued one.
  const filtered = taps.filter((t) => t.session !== tap.session);
  const queued: OfflineTap = { ...tap, attempts: 0, nextAttemptAt: Date.now() };
  filtered.push(queued);
  writeAll(filtered);
  return queued;
};

export const getOfflineTaps = (): OfflineTap[] => readAll();

export const getRetryableOfflineTaps = (): OfflineTap[] =>
  readAll().filter((t) => t.nextAttemptAt <= Date.now());

export const removeOfflineTap = (id: string) => {
  writeAll(readAll().filter((t) => t.id !== id));
};

export const markOfflineTapFailed = (id: string) => {
  writeAll(
    readAll().map((t) =>
      t.id === id
        ? {
            ...t,
            attempts: t.attempts + 1,
            nextAttemptAt:
              Date.now() +
              Math.min(BASE_BACKOFF_MS * Math.pow(2, t.attempts), MAX_BACKOFF_MS),
          }
        : t,
    ),
  );
};

export const clearOfflineTapsForSession = (sessionId: string) => {
  writeAll(readAll().filter((t) => t.session !== sessionId));
};
