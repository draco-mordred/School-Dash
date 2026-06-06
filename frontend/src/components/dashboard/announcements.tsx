import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing } from "lucide-react";

const announcements = [
  {
    title: "School-wide drill scheduled",
    description: "Clinical training floor closed Friday.",
    time: "2h ago",
  },
  {
    title: "Supervisor sign-off reminder",
    description: "Submit your logbook by 4pm today.",
    time: "5h ago",
  },
  {
    title: "New rotation plan uploaded",
    description: "Check the rotation board for your next shift.",
    time: "1d ago",
  },
];

export function Announcements() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Announcements</CardTitle>
          </div>
          <BellRing className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.map((item) => (
          <div key={item.title} className="rounded-2xl border border-border p-3">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <p className="text-xs text-muted-foreground">{item.time}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
