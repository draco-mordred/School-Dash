import { afterEach, describe, expect, it, vi } from "vitest";
import { readOfflineCache, writeOfflineCache } from "./offlineMode";

const cachePrefix = "school-dash:offline-cache";

describe("offline cache storage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("evicts the oldest cached response and retries after a quota error", () => {
    localStorage.setItem(`${cachePrefix}:old`, JSON.stringify({ cachedAt: 1, data: "old" }));
    localStorage.setItem(`${cachePrefix}:newer`, JSON.stringify({ cachedAt: 2, data: "newer" }));

    const originalSetItem = Storage.prototype.setItem;
    let shouldThrowQuotaError = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
      if (shouldThrowQuotaError) {
        shouldThrowQuotaError = false;
        throw new DOMException("Storage is full", "QuotaExceededError");
      }
      originalSetItem.call(this, key, value);
    });

    expect(writeOfflineCache("latest", { records: [1, 2, 3] })).toBe(true);
    expect(localStorage.getItem(`${cachePrefix}:old`)).toBeNull();
    expect(localStorage.getItem(`${cachePrefix}:newer`)).not.toBeNull();
    expect(readOfflineCache("latest")).toEqual({ records: [1, 2, 3] });
  });

  it("does not throw when no space can be freed for the new response", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => writeOfflineCache("oversized", "response")).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      "Offline cache entry was not stored because browser storage is full",
    );
  });
});
