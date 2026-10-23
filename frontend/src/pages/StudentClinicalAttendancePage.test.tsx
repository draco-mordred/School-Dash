import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentClinicalAttendancePage from "./StudentClinicalAttendancePage";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: { get: mocks.get, post: mocks.post } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") } }));

const makeContext = (withActiveSession: boolean, attendanceStatus = "pending") => {
  const session = {
    _id: "session-1",
    title: "Morning ward round",
    activityType: "ward_round",
    date: new Date().toISOString(),
    startTime: new Date().toISOString(),
    status: "ongoing",
    supervisorName: "Dr Supervisor",
    supervisorGroupLabel: "Unit Group A",
    attendees: [{ student: { _id: "student-1" }, status: attendanceStatus }],
  };
  return {
    data: {
      assignment: {
        postingName: "Medicine",
        groupLabel: "Unit Group A",
        groupType: "unit",
        departmentName: "Medicine",
        unitName: "Ward A",
        supervisorName: "Dr Supervisor",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      },
      activeSession: withActiveSession ? session : null,
      sessions: withActiveSession ? [session] : [],
    },
  };
};

describe("Student clinical attendance page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { _id: "student-1", role: "student" } });
    mocks.get.mockResolvedValue({ data: makeContext(false) });
  });

  it("does not allow QR generation before the server reports an active session", async () => {
    render(<StudentClinicalAttendancePage />);

    const generateButton = await screen.findByRole("button", { name: "Generate attendance QR" });
    expect(generateButton).toBeDisabled();
    expect(screen.getByText("No active session available.")).toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("generates a QR only for the active session supplied by the server", async () => {
    mocks.get.mockResolvedValue({ data: makeContext(true) });
    mocks.post.mockResolvedValue({ data: { data: { qrPayload: "signed-qr", otp: "123456" } } });
    render(<StudentClinicalAttendancePage />);

    const generateButton = await screen.findByRole("button", { name: "Generate attendance QR" });
    await waitFor(() => expect(generateButton).toBeEnabled());
    fireEvent.click(generateButton);

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/clinical-attendance/qr/generate", { sessionId: "session-1" }));
    expect(await screen.findByAltText("Attendance QR code")).toBeInTheDocument();
    expect(screen.getByText("123456")).toBeInTheDocument();

    mocks.get.mockResolvedValue({ data: makeContext(true, "present") });
    window.dispatchEvent(new Event("clinical-attendance-updated"));
    await waitFor(() => expect(screen.queryByAltText("Attendance QR code")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Attendance already recorded" })).toBeDisabled();
  });

  it("disables QR generation when attendance is already finalized", async () => {
    mocks.get.mockResolvedValue({ data: makeContext(true, "present") });
    render(<StudentClinicalAttendancePage />);

    expect(await screen.findByRole("button", { name: "Attendance already recorded" })).toBeDisabled();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("shows a recoverable error state when attendance cannot be loaded", async () => {
    mocks.get.mockRejectedValue(new Error("network error"));
    render(<StudentClinicalAttendancePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load your clinical attendance details.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});