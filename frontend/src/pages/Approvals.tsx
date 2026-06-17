import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Approvals() {
  return (
    <div id="page-approvals" className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Approvals</CardTitle>
          <CardDescription>Manage supervisor approvals and signature requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Approval tasks and pending signatures are listed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
