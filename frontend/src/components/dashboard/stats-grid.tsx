import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Layers,
} from "lucide-react";

interface StatsGridProps {
  data?: {
    totalProcedures?: number;
    approved?: number;
    pendingApproval?: number;
    rotationsCompleted?: number;
  };
}

const stats = [
  {
    title: "Total Procedures",
    key: "totalProcedures",
    icon: Layers,
    description: "Procedures logged",
  },
  {
    title: "Approved",
    key: "approved",
    icon: CheckCircle2,
    description: "Logs approved",
  },
  {
    title: "Pending Approval",
    key: "pendingApproval",
    icon: Clock,
    description: "Awaiting supervisor review",
  },
  {
    title: "Rotations Completed",
    key: "rotationsCompleted",
    icon: ClipboardList,
    description: "Rotation events done",
  },
];

export function StatsGrid({ data }: StatsGridProps) {
  return (
    <>
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title}>
            <CardHeader className="flex items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data?.[item.key as keyof typeof data] ?? 0}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
