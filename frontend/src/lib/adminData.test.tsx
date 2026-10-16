import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn() },
}));

import { api } from "@/lib/api";
import { useAdminClassOptions } from "./adminData";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("admin data resources", () => {
  it("shares class data and refetches if a mutation occurs during an active request", async () => {
    let resolveInitialRequest: ((value: unknown) => void) | undefined;
    const get = vi.mocked(api.get);
    get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitialRequest = resolve;
        }) as never,
    );
    get.mockResolvedValueOnce({
      data: { classes: [{ _id: "class-after-mutation", name: "500 Level" }] },
    } as never);

    const first = renderHook(() => useAdminClassOptions());
    const second = renderHook(() => useAdminClassOptions());
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    window.dispatchEvent(
      new CustomEvent("app:mutation", {
        detail: { url: "/classes/class-id", method: "patch" },
      }),
    );
    resolveInitialRequest?.({
      data: { classes: [{ _id: "stale-class", name: "Old class list" }] },
    });

    await waitFor(() => {
      expect(first.result.current.data?.[0]?._id).toBe("class-after-mutation");
      expect(second.result.current.data?.[0]?._id).toBe("class-after-mutation");
    });
    expect(get).toHaveBeenCalledTimes(2);
  });
});
