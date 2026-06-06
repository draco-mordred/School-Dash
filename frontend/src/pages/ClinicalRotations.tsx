import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ClinicalRotations() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Clinical Rotations</CardTitle>
          <CardDescription>Overview of active and upcoming clinical rotations.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Rotation schedules and summaries will be shown here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
