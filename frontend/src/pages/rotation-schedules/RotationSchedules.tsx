import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RotationSchedules() {
  const navigate = useNavigate();

  return (
    <div className="ml-8 mt-10 space-y-6" id="marginLeftMarginTopDiv">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate("/clinical-rotations")} className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-semibold">Rotation Schedules</h2>
          <p className="text-sm text-muted-foreground">This section is being revamped.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-10 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">Content cleared for the redesign.</p>
        <p className="mt-2">A fresh layout and experience will be added soon.</p>
      </div>
    </div>
  );
}
