import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, ArrowRight } from "lucide-react";

export function UpcomingRotation() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Rotation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 rounded-3xl border border-muted/20 bg-muted/10 p-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-950/90 text-white">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">General Surgery Rotation</p>
            <p className="text-2xl font-semibold">{day} {month}</p>
          </div>
        </div>
        <Button className="w-full justify-between" size="sm">
          View Rotation details
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
