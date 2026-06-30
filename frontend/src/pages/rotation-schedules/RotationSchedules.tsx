import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function RotationSchedules() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);
  const [academicYear, setAcademicYear] = useState("");
  const [classId, setClassId] = useState("");
  const [level, setLevel] = useState<number>(400);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0,10));
  const navigate = useNavigate();

  const fetch = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/rotation-schedules');
      setSchedules(data.schedules || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetch(); }, []);

  const openDetail = (id: string) => navigate(`/rotation-schedules/${id}`);

  const triggerGenerate = async () => {
    try {
      await api.post('/rotation-schedules/generate', { academicYearId: academicYear, classId, level, options: { startDate } });
      toast.success('Generation started');
      setShowGenerate(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to start generation');
    }
  };

  const deleteSchedule = async (id: string) => {
    // open modal
    const sched = schedules.find((s) => String(s._id) === String(id));
    setDeleteTarget({ id, name: sched?.name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/rotation-schedules/${deleteTarget.id}`);
      toast.success('Schedule deleted');
      setDeleteTarget(null);
      await fetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to delete schedule');
    }
  };

  return (
    <div style={{ marginLeft: 30, marginTop: 40 }}>
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/clinical-rotations')} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">Rotation Schedules</h2>
            <p className="text-sm text-muted-foreground">Generated rotation schedules for classes and levels.</p>
          </div>
        </div>
        <div>
          <Button onClick={() => setShowGenerate(true)}>Generate Schedule</Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Levels</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell>Loading...</TableCell></TableRow>
                ) : schedules.length === 0 ? (
                  <TableRow><TableCell>No schedules found</TableCell></TableRow>
                ) : schedules.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{(s.applicableLevels || []).join(', ')}</TableCell>
                    <TableCell>{(s.groups || []).length}</TableCell>
                    <TableCell>{format(new Date(s.generatedAt || s.createdAt), 'PPP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button onClick={() => openDetail(s._id)}>View</Button>
                        <Button variant="destructive" onClick={() => deleteSchedule(s._id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showGenerate} onOpenChange={(v) => setShowGenerate(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Rotation Schedule</DialogTitle>
            <DialogDescription>Create a new rotation schedule for the selected academic year, class, and level.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs block mb-1">Academic Year ID</label>
              <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="Academic Year ID" />
            </div>
            <div>
              <label className="text-xs block mb-1">Class ID</label>
              <Input value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Class ID" />
            </div>
            <div>
              <label className="text-xs block mb-1">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs block mb-1">Level</label>
              <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={triggerGenerate}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Rotation Schedule</DialogTitle>
            <DialogDescription>This action permanently deletes the selected rotation schedule.</DialogDescription>
          </DialogHeader>
          <div>
            <p>Are you sure you want to delete the schedule <strong>{deleteTarget?.name || ''}</strong>? This action cannot be undone.</p>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
