/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { format, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft } from "lucide-react";

export default function RotationScheduleDetail() {
  const { id } = useParams();
  const [schedule, setSchedule] = useState<any | null>(null);
  const [selectedPosting, setSelectedPosting] = useState<any | null>(null);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPosting, setEditedPosting] = useState<any | null>(null);
  const [showCsvConfig, setShowCsvConfig] = useState(false);
  const [csvColumns, setCsvColumns] = useState<Record<string, boolean>>({
    scheduleId: false, scheduleName: true, postingName: true, postingCategory: true, periodIndex: true, periodUnit: true, periodSupervisorName: true, periodSupervisorEmail: true, supervisorPhone: true, groupName: true, studentName: true, studentIdNumber: true
  });

  const safeFormat = (d: any, fmt = "PPP") => {
    if (!d) return "TBA";
    const dt = d instanceof Date ? d : new Date(d);
    if (!isValid(dt)) return "TBA";
    try {
      return format(dt, fmt);
    } catch (e) {
      return "TBA";
    }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/rotation-schedules/${id}`);
        setSchedule(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [id]);

  if (!schedule) return <div className="ml-8 mt-10">Loading...</div>;

  return (
    <div className="ml-8 mt-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/rotation-schedules')} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <Button variant="ghost" className="ml-2" onClick={() => setShowCsvConfig(true)}>Export CSV</Button>
            {showCsvConfig && (
              <div className="p-3 bg-card border rounded shadow-md absolute z-50">
                <div className="font-medium mb-2">CSV Columns</div>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto">
                  {Object.keys(csvColumns).map((k) => (
                    <label key={k} className="text-sm"><input type="checkbox" checked={csvColumns[k]} onChange={(e) => setCsvColumns({ ...csvColumns, [k]: e.target.checked })} /> <span className="ml-2">{k}</span></label>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button onClick={async () => {
                    try {
                      const cols = Object.keys(csvColumns).filter(c => csvColumns[c]).join(',');
                      const resp = await api.get(`/rotation-schedules/${id}/export`, { params: { format: 'csv', columns: cols }, responseType: 'blob' });
                      const blob = resp.data as Blob;
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `rotation-schedule-${id}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                      setShowCsvConfig(false);
                    } catch (e) { console.error(e); toast.error('CSV export failed'); }
                  }}>Download CSV</Button>
                  <Button variant="outline" onClick={() => setShowCsvConfig(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <Button variant="ghost" className="ml-2" onClick={async () => {
              try {
                const resp = await api.get(`/rotation-schedules/${id}/export`, { params: { format: 'csv' }, responseType: 'blob' });
                const blob = resp.data as Blob;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rotation-schedule-${id}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (e) { console.error(e); toast.error('CSV export failed'); }
            }}>Export CSV</Button>
            <Button variant="ghost" className="ml-2" onClick={async () => {
              try {
                const resp = await api.get(`/rotation-schedules/${id}/export`, { params: { format: 'json' } });
                const data = resp.data;
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rotation-schedule-${id}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (e) { console.error(e); toast.error('JSON export failed'); }
            }}>Export JSON</Button>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{schedule.name}</h2>
            <p className="text-sm text-muted-foreground">Generated: {safeFormat(schedule.generatedAt || schedule.createdAt, 'PPP')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4">
            <Card className="w-full mx-auto">
              <CardContent>
                <h3 className="font-medium">Postings</h3>
                <div className="mt-3">
                  {/* Group postings by category */}
                  {(() => {
                    const categories: Record<string, any[]> = {};
                    (schedule.postings || []).forEach((p: any) => {
                      const cat = p.category || 'uncategorized';
                      categories[cat] = categories[cat] || [];
                      categories[cat].push(p);
                    });

                    return Object.keys(categories).map((cat) => (
                      <div key={cat} className="mb-6">
                        <h4 className="text-md font-semibold mb-2">{cat.toUpperCase()}</h4>
                        <div className="space-y-3">
                          {categories[cat].map((p: any) => {
                            const isOpen = selectedPosting && selectedPosting.name === p.name;
                            return (
                              <div key={p.name} className="bg-card rounded-md overflow-hidden border">
                                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_160px] gap-4 items-center p-3 cursor-pointer" onClick={() => setSelectedPosting((prev: any) => prev && prev.name === p.name ? null : p)}>
                                  <div className="font-medium truncate">{p.name}</div>
                                  <div className="truncate">{p.category}</div>
                                  <div className="truncate">
                                    <div className="text-sm">{p.unitRotationWeeks}wk</div>
                                    <div className="text-xs text-muted-foreground">{(p.units || []).map((u: any) => u.unitName || u).join(', ')}</div>
                                  </div>
                                  <div className="text-right">
                                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedPosting((prev: any) => prev && prev.name === p.name ? null : p); }}>View</Button>
                                  </div>
                                </div>

                                {isOpen && (
                                  <div className="bg-muted/5 p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_160px] gap-4">
                                      <div>
                                        <div className="text-lg font-semibold">{p.name} — {p.category}</div>
                                        <div className="text-sm text-muted-foreground">Duration: {safeFormat(p?.startDate, 'PPP')} — {safeFormat(p?.endDate, 'PPP')}</div>
                                      </div>
                                      <div />
                                      <div>
                                        <div className="mb-2">
                                          <Button variant="outline" onClick={() => { setIsEditing(true); setEditedPosting({ ...p }); }}>Edit</Button>
                                          <Button variant="destructive" className="ml-2" onClick={async () => {
                                            if (!confirm(`Delete posting ${p.name}?`)) return;
                                            try {
                                              const { data } = await api.delete(`/rotation-schedules/${id}/postings/${encodeURIComponent(p.name)}`);
                                              setSchedule(data.schedule || data);
                                              setSelectedPosting(null);
                                              toast.success('Posting deleted');
                                            } catch (err) { console.error(err); toast.error('Failed to delete posting'); }
                                          }}>Delete</Button>
                                        </div>
                                        {isEditing && editedPosting && editedPosting.name === p.name && (
                                          <div className="mb-4 border p-3 rounded">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-xs">Name</label>
                                                <Input placeholder="Name" value={editedPosting.name} onChange={(e) => setEditedPosting({ ...editedPosting, name: e.target.value })} />
                                              </div>
                                              <div>
                                                <label className="text-xs">Category</label>
                                                <Input placeholder="Category" value={editedPosting.category} onChange={(e) => setEditedPosting({ ...editedPosting, category: e.target.value })} />
                                              </div>
                                              <div>
                                                <label className="text-xs">Start Date</label>
                                                <Input type="date" placeholder="Start" value={editedPosting.startDate ? new Date(editedPosting.startDate).toISOString().slice(0,10) : ''} onChange={(e) => setEditedPosting({ ...editedPosting, startDate: e.target.value })} />
                                              </div>
                                              <div>
                                                <label className="text-xs">End Date</label>
                                                <Input type="date" placeholder="End" value={editedPosting.endDate ? new Date(editedPosting.endDate).toISOString().slice(0,10) : ''} onChange={(e) => setEditedPosting({ ...editedPosting, endDate: e.target.value })} />
                                              </div>
                                              <div>
                                                <label className="text-xs">Unit Rotation Weeks</label>
                                                <Input type="number" placeholder="Weeks" value={editedPosting.unitRotationWeeks || 0} onChange={(e) => setEditedPosting({ ...editedPosting, unitRotationWeeks: Number(e.target.value) })} />
                                              </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                              <Button onClick={async () => {
                                                try {
                                                  const payload: any = {
                                                    name: editedPosting.name,
                                                    category: editedPosting.category,
                                                    startDate: editedPosting.startDate,
                                                    endDate: editedPosting.endDate,
                                                    unitRotationWeeks: editedPosting.unitRotationWeeks,
                                                  };
                                                  const { data } = await api.patch(`/rotation-schedules/${id}/postings/${encodeURIComponent(p.name)}`, payload);
                                                  setSchedule(data || data.schedule || data);
                                                  setIsEditing(false);
                                                  setSelectedPosting(null);
                                                  toast.success('Posting updated');
                                                } catch (e) { console.error(e); toast.error('Failed to update posting'); }
                                              }}>Save</Button>
                                              <Button variant="outline" onClick={() => { setIsEditing(false); setEditedPosting(null); }}>Cancel</Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div />
                                    </div>

                                    <div className="mt-4 space-y-3" style={{ overflow: 'scroll', height: '400px' }}>
                                      {/* Periods */}
                                      {(p?.periods || []).length > 0 && (
                                        <div className="mb-4">
                                          <div className="font-medium mb-2">Periods</div>
                                          {(p.periods || []).map((period: any, pi: number) => (
                                            <div key={pi} className="mb-2 border rounded p-2 bg-card">
                                              <div className="text-sm text-muted-foreground">Period {pi + 1}: {safeFormat(period.startDate, 'MMM d')} — {safeFormat(period.endDate, 'MMM d')}</div>
                                              <div className="mt-1 text-sm">
                                                {(period.assignments || []).map((a: any, ai: number) => {
                                                  const groupEntry = (p.groups || []).find((g: any) => String(g.groupId) === String(a.groupId));
                                                  const groupName = groupEntry?.group?.name || `Group ${String(a.groupId).slice(-3)}`;
                                                  return (
                                                    <div key={ai} className="flex justify-between text-xs py-1 border-b">
                                                      <div>{groupName} — {a.category}</div>
                                                      <div className="text-muted-foreground">{a.unitName} — {a.supervisorName || 'TBA'}</div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Groups with students and per-student units */}
                                      {(p?.groups || []).map((pg: any, idx: number) => {
                                        const group = pg.group || pg;
                                        // assignments from API: schedule.assignments
                                        const postingAssignments = (schedule.assignments || []).filter((as: any) => String(as.postingName) === String(p.name));
                                        // students for this group: either from populated group.students or from assignments
                                        const studentsFromGroup = group?.students || [];
                                        const studentDocs = postingAssignments.filter((as: any) => String(as.assignedGroup?._id || as.assignedGroup) === String(group?._id)).map((as: any) => as.student).filter(Boolean);
                                        // merge unique students
                                        const studentMap: Record<string, any> = {};
                                        for (const s of studentsFromGroup) studentMap[String(s._id)] = s;
                                        for (const s of studentDocs) studentMap[String(s._id)] = s;
                                        const students = Object.values(studentMap);

                                        const assigned = pg.assigned || [];
                                        let start: any = null; let end: any = null;
                                        if (assigned.length) {
                                          start = new Date(assigned[0].startDate);
                                          end = new Date(assigned[assigned.length - 1].endDate);
                                        }
                                        return (
                                          <Card key={group?._id || idx} className="mb-2">
                                            <CardContent>
                                              <div className="flex justify-between items-center">
                                                <div>
                                                  <div className="font-medium">{group?.name || group?._id}</div>
                                                  <div className="text-xs text-muted-foreground">Supervisor: {group?.supervisor?.name || group?.supervisor || 'TBA'}</div>
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                  <div>Students: {students.length}</div>
                                                  <div>Duration: {start ? `${safeFormat(start, 'MMM d')} — ${safeFormat(end, 'MMM d')}` : 'TBA'}</div>
                                                </div>
                                              </div>
                                              <div className="mt-3">
                                                <div className="font-medium mb-1">Student List</div>
                                                <div className="space-y-2">
                                                  {students.map((s: any) => {
                                                    // per-student units: look up periods where this group's assignment exists and show supervisor per unit
                                                    const unitsForStudent: any[] = [];
                                                    (p.periods || []).forEach((period: any, pi: number) => {
                                                      (period.assignments || []).forEach((a: any) => {
                                                        if (String(a.groupId) === String(group?._id)) {
                                                          unitsForStudent.push({ unitName: a.unitName, supervisorName: a.supervisorName, periodIndex: pi + 1 });
                                                        }
                                                      });
                                                    });

                                                    // also include completedUnits from assignment doc if present
                                                    const stuAssign = (postingAssignments || []).find((as: any) => String(as.student?._id || as.student) === String(s._id));
                                                    const completed = (stuAssign && stuAssign.completedUnits) || [];

                                                    return (
                                                      <div key={s._id} className="border rounded p-2">
                                                        <div className="flex items-center justify-between">
                                                          <div>
                                                            <div className="font-medium">{s.name}</div>
                                                            <div className="text-xs text-muted-foreground">ID: {s.idNumber || '—'}</div>
                                                          </div>
                                                          <div className="text-xs text-muted-foreground">Completed: {completed.length}</div>
                                                        </div>
                                                        <div className="mt-2 text-sm">
                                                          {unitsForStudent.length === 0 ? (
                                                            <div className="text-xs text-muted-foreground">No units assigned in periods</div>
                                                          ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                              {unitsForStudent.map((u, ui) => (
                                                                <div key={ui} className="p-2 border rounded">
                                                                  <div className="font-medium text-sm">{u.unitName}</div>
                                                                  <div className="text-xs text-muted-foreground">Supervisor: {u.supervisorName || 'TBA'}</div>
                                                                  <div className="text-xs text-muted-foreground">Period: {u.periodIndex}</div>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

      {/* Posting details are rendered inline within the table rows above */}

      {/* Group details are shown inline within posting expansion; no modal used */}
    </div>
  );
}
