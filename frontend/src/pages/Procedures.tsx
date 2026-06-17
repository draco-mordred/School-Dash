import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Procedures() {
  return (
    <div id="page-procedures" className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Procedures</CardTitle>
          <CardDescription>Track and audit clinical procedures in progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Procedure details and approvals will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
