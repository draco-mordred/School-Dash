// @vitest-environment jsdom
// PR F — vitest suite for the offline attendance tap queue (Phase F1).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  newTapKey,
  enqueueOfflineTap,
  getOfflineTaps,
  getRetryableOfflineTaps,
  removeOfflineTap,
  markOfflineTapFailed,
  clearOfflineTapsForSession,
} from "./attendanceOfflineQueue";

const tap = (over: Record<string, unknown> = {}) => ({
  id: newTapKey(),
  session: "sess-1",
  choice: "present" as const,
  coords: { lat: 9.87589, lng: 8.8834 },
  clientTimestamp: new Date().toISOString(),
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("newTapKey", () => {
  it("generates unique non-empty keys", () => {
    const a = newTapKey();
    const b = newTapKey();
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});

describe("enqueueOfflineTap", () => {
  it("stores a tap with attempts 0, immediately retryable", () => {
    const queued = enqueueOfflineTap(tap());
    expect(queued.attempts).toBe(0);
    expect(getRetryableOfflineTaps()).toHaveLength(1);
  });

  it("replaces a queued tap for the same session", () => {
    enqueueOfflineTap(tap());
    const second = enqueueOfflineTap(tap({ id: "key-2", choice: "absent", absenceReason: "sick" }));
    expect(getOfflineTaps()).toHaveLength(1);
    expect(getOfflineTaps()[0].id).toBe("key-2");
    expect(second.absenceReason).toBe("sick");
  });

  it("keeps taps for different sessions", () => {
    enqueueOfflineTap(tap());
    enqueueOfflineTap(tap({ id: "k2", session: "sess-2" }));
    expect(getOfflineTaps()).toHaveLength(2);
  });
});

describe("retry backoff", () => {
  it("gates retries behind exponential backoff capped at 5 minutes", () => {
    vi.useFakeTimers({ now: new Date("2026-11-01T10:00:00Z") });
    const queued = enqueueOfflineTap(tap());
    expect(getRetryableOfflineTaps()).toHaveLength(1); // fresh tap is retryable

    markOfflineTapFailed(queued.id);
    expect(getRetryableOfflineTaps()).toHaveLength(0); // +30s gate
    vi.setSystemTime(new Date("2026-11-01T10:00:29Z"));
    expect(getRetryableOfflineTaps()).toHaveLength(0);
    vi.setSystemTime(new Date("2026-11-01T10:00:31Z"));
    expect(getRetryableOfflineTaps()).toHaveLength(1);

    markOfflineTapFailed(queued.id); // attempts 2 -> +60s
    vi.setSystemTime(new Date("2026-11-01T10:01:00Z"));
    expect(getRetryableOfflineTaps()).toHaveLength(0);
    vi.setSystemTime(new Date("2026-11-01T10:01:31Z"));
    expect(getRetryableOfflineTaps()).toHaveLength(1);

    // high attempt counts never exceed the 5-minute cap
    markOfflineTapFailed(queued.id);
    markOfflineTapFailed(queued.id);
    markOfflineTapFailed(queued.id);
    const stored = getOfflineTaps()[0];
    expect(stored.nextAttemptAt).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
  });
});

describe("removal", () => {
  it("removes a single tap by id", () => {
    const a = enqueueOfflineTap(tap());
    enqueueOfflineTap(tap({ id: "k2", session: "sess-2" }));
    removeOfflineTap(a.id);
    expect(getOfflineTaps().map((t) => t.id)).toEqual(["k2"]);
  });

  it("clears all taps for a session", () => {
    enqueueOfflineTap(tap({ id: "k1", session: "sess-1" }));
    enqueueOfflineTap(tap({ id: "k2", session: "sess-1" }));
    enqueueOfflineTap(tap({ id: "k3", session: "sess-9" }));
    clearOfflineTapsForSession("sess-1");
    expect(getOfflineTaps().map((t) => t.id)).toEqual(["k3"]);
  });
});

describe("corrupted storage", () => {
  it("treats invalid JSON as an empty queue", () => {
    window.localStorage.setItem("school-dash:offline-attendance-queue", "{not json");
    expect(getOfflineTaps()).toEqual([]);
  });

  it("treats non-array JSON as an empty queue and keeps working", () => {
    window.localStorage.setItem("school-dash:offline-attendance-queue", "42");
    enqueueOfflineTap(tap());
    expect(getOfflineTaps()).toHaveLength(1);
  });
});
