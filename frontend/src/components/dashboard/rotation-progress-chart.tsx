import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const data = [
  { name: "Completed", value: 55, fill: "#22c55e" },
  { name: "In Progress", value: 28, fill: "#0ea5e9" },
  { name: "Upcoming", value: 17, fill: "#f59e0b" },
];

export function RotationProgressChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rotation Progress</CardTitle>
        <CardDescription>Completion status for active rotations.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={96}
              paddingAngle={4}
              stroke="transparent"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={48} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
