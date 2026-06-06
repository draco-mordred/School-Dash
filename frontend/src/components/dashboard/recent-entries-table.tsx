import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const rows = [
  {
    entry: "Patient assessment log",
    patientId: "PT-1024",
    supervisor: "Dr. A. Okoro",
    status: "Approved",
  },
  {
    entry: "IV line procedure",
    patientId: "PT-2091",
    supervisor: "Dr. K. Musa",
    status: "Pending",
  },
  {
    entry: "Wound dressing",
    patientId: "PT-3340",
    supervisor: "Dr. S. Bello",
    status: "Approved",
  },
  {
    entry: "Vital signs chart",
    patientId: "PT-4455",
    supervisor: "Dr. H. Nwosu",
    status: "Pending",
  },
  {
    entry: "Medication review",
    patientId: "PT-5566",
    supervisor: "Dr. F. Etim",
    status: "Approved",
  },
];

const badgeVariant = (status: string) =>
  status === "Approved" ? "default" : "outline";

export function RecentEntriesTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Logbook Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Supervisor</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {rows.map((row) => (
                <tr key={row.entry} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-4 font-medium text-foreground">{row.entry}</td>
                  <td className="px-4 py-4 text-muted-foreground">{row.patientId}</td>
                  <td className="px-4 py-4 text-muted-foreground">{row.supervisor}</td>
                  <td className="px-4 py-4">
                    <Badge variant={badgeVariant(row.status)}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
