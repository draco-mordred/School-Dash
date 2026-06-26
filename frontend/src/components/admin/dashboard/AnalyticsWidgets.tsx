"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

export interface ChartDataPoint {
  name: string;
  value: number;
}

interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  type?: "line" | "bar" | "area";
  loading?: boolean;
}

/**
 * Analytics Card Component
 * 
 * Displays a chart widget for analytics visualization
 * Used for trends like student growth, attendance, assessments, etc.
 */
export const AnalyticsCard = ({
  title,
  subtitle,
  data,
  type = "line",
  loading = false,
}: AnalyticsCardProps) => {
  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <p className="text-sm">No data available</p>
        </div>
      );
    }

    const chartProps = {
      data,
      margin: { top: 5, right: 10, left: 0, bottom: 5 },
    };

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" fill="var(--primary)" stroke="var(--primary)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="var(--primary)" dot={{ fill: "var(--primary)" }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
};

/**
 * Analytics Widgets Grid
 * Displays multiple analytics cards
 */
export const AnalyticsWidgets = ({ loading = false }: { loading?: boolean }) => {
  // Sample data - will be replaced with real data in Phase 2 integration
  const mockData = [
    { name: "Jan", value: 120 },
    { name: "Feb", value: 145 },
    { name: "Mar", value: 167 },
    { name: "Apr", value: 189 },
    { name: "May", value: 205 },
    { name: "Jun", value: 234 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <AnalyticsCard
        title="Student Growth"
        subtitle="Last 6 months"
        data={mockData}
        type="line"
        loading={loading}
      />
      <AnalyticsCard
        title="Attendance Trends"
        subtitle="Weekly average"
        data={mockData}
        type="area"
        loading={loading}
      />
      <AnalyticsCard
        title="Assessment Scores"
        subtitle="Class average"
        data={mockData}
        type="bar"
        loading={loading}
      />
      <AnalyticsCard
        title="Logbook Completion"
        subtitle="By student"
        data={mockData}
        type="line"
        loading={loading}
      />
    </div>
  );
};
