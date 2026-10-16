import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  api: { request: vi.fn() },
}));

vi.mock("@/lib/offlineMode", () => ({
  readOfflineMutationQueue: () => [],
  removeOfflineMutationFromQueue: vi.fn(),
  clearOfflineMutationQueue: vi.fn(),
}));

import { OfflineModeProvider } from "./OfflineModeProvider";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("OfflineModeProvider network notices", () => {
  it("slides in a connection-lost notice and removes it after the animation", () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<OfflineModeProvider><div>Application</div></OfflineModeProvider>);

    act(() => fireEvent(window, new Event("offline")));
    expect(screen.getByRole("status")).toHaveTextContent("Connection lost");
    expect(screen.getByRole("status")).toHaveClass("network-status-notice");
    expect(screen.getByText("Application")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2800));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the restored notice and replays queued changes without a generic status toast", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<OfflineModeProvider><div>Application</div></OfflineModeProvider>);

    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await act(async () => {
      fireEvent(window, new Event("online"));
    });

    expect(screen.getByRole("status")).toHaveTextContent("Connection restored");
    const { toast } = await import("sonner");
    expect(toast.success).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(2800));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
