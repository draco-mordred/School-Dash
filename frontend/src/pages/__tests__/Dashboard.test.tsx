import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { _id: "user-1", role: "admin" },
    year: "2024/2025",
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    refetch: vi.fn(),
    markAsRead: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAdminDashboard", () => ({
  useAdminDashboard: () => ({
    stats: {
      totalStudents: 10,
      totalParents: 5,
      totalStaff: 3,
      activeSession: "2024/2025",
    },
    loading: false,
    error: null,
  }),
}));

vi.mock("@/components/admin/dashboard/KPICards", () => ({
  KPICards: () => <div data-testid="kpi-cards" />,
}));

vi.mock("@/components/admin/dashboard/OperationalAlerts", () => ({
  OperationalAlerts: () => <div data-testid="operational-alerts" />,
}));

vi.mock("@/components/admin/dashboard/RecentActivityFeed", () => ({
  RecentActivityFeed: () => <div data-testid="recent-activity-feed" />,
}));

vi.mock("@/components/admin/dashboard/QuickActions", () => ({
  QuickActions: () => <div data-testid="quick-actions" />,
}));

vi.mock("@/components/admin/dashboard/AnalyticsWidgets", () => ({
  AnalyticsWidgets: () => <div data-testid="analytics-widgets" />,
}));

vi.mock("@/components/dashboard/ai-insight-widget", () => ({
  AIInsightWidget: () => <div data-testid="ai-insight-widget" />,
}));

vi.mock("@/components/activities/ActivityDashboard", () => ({
  default: () => <div data-testid="activity-dashboard" />,
}));

vi.mock("@/components/ui/sidebar-context", () => ({
  useSidebar: () => ({ open: true }),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
}));

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the lazy activity dashboard widget without crashing", async () => {
    const { default: Dashboard } = await import("../Dashboard");

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("activity-dashboard")).toBeInTheDocument();
  });
});
