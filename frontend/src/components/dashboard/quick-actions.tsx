import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PlusCircle,
  CheckCircle2,
  ClipboardCheck,
  Upload,
} from "lucide-react";

const actions = [
  {
    title: "Add Logbook entry",
    icon: PlusCircle,
    variant: "default",
  },
  {
    title: "Mark Attendance",
    icon: CheckCircle2,
    variant: "outline",
  },
  {
    title: "Request Supervisor approval/signature",
    icon: ClipboardCheck,
    variant: "outline",
  },
  {
    title: "Upload document",
    icon: Upload,
    variant: "outline",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 overflow-hidden">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.title}
              variant={action.variant as "default" | "outline"}
              className="justify-start w-full overflow-hidden text-ellipsis whitespace-nowrap"
            >
              <Icon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{action.title}</span>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
