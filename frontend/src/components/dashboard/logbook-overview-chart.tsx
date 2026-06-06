import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", approved: 24, pending: 14 },
  { month: "Feb", approved: 30, pending: 18 },
  { month: "Mar", approved: 28, pending: 12 },
  { month: "Apr", approved: 35, pending: 15 },
  { month: "May", approved: 42, pending: 13 },
  { month: "Jun", approved: 48, pending: 21 },
];

export function LogbookOverviewChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Logbook Overview</CardTitle>
        <CardDescription>Approved vs pending logs over the last six months.</CardDescription>
      </CardHeader>
      <CardContent className="h-[216px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="pending" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
