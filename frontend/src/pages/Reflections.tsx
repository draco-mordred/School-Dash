import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Reflections() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Reflections</CardTitle>
          <CardDescription>Capture learning notes and clinical reflections.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Reflection entries and feedback will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
