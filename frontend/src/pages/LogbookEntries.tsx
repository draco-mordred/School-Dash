import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LogbookEntries() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Logbook Entries</CardTitle>
          <CardDescription>Review and manage all clinical logbook submissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your logbook entries will appear here once logged.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
