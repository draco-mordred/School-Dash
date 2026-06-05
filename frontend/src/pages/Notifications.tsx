import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Notifications() {
  const items = useMemo(
    () => [
      {
        title: "New attendance submissions",
        message:
          "Attendance for the latest session has been submitted. Review details in Attendance.",
        date: "Today",
      },
      {
        title: "Schedule update",
        message:
          "Timetable changes are now available. Please check Timetable.",
        date: "Yesterday",
      },
      {
        title: "Exam announcements",
        message:
          "New exam materials and dates were added to LMS - Exams.",
        date: "2 days ago",
      },
    ],
    []
  );

  return (
    <div className="flex w-full flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notifications</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((n) => (
          <Card key={n.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{n.title}</CardTitle>
              <div className="text-xs text-muted-foreground">{n.date}</div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {n.message}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

