import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Layers3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { api } from "@/lib/api";
import { buildTimelineWindowView, formatWindowDuration, getReferenceDisplayName } from "@/lib/rotationScheduleViews";
import { toast } from "sonner";

export default function RotationSchedules() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [classNameById, setClassNameById] = useState<Record<string, string>>({});
  const [studentNameById, setStudentNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const { data } = await api.get("/rotation-schedules", { params: { page: 1, limit: 50 } });
        const docs = Array.isArray(data?.schedules) ? data.schedules : [];
        setSchedules(docs);
        setSelectedScheduleId((current) => current || docs[0]?._id || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const loadReferenceNames = async () => {
      try {
        const [classesRes, studentsRes] = await Promise.all([
          api.get("/classes?limit=200"),
          api.get("/users?role=student&limit=500"),
        ]);

        const classList = Array.isArray(classesRes?.data?.classes)
          ? classesRes.data.classes
          : Array.isArray(classesRes?.data)
            ? classesRes.data
            : Array.isArray(classesRes?.data?.data)
              ? classesRes.data.data
              : [];
        const studentList = Array.isArray(studentsRes?.data?.users)
          ? studentsRes.data.users
          : Array.isArray(studentsRes?.data)
            ? studentsRes.data
            : Array.isArray(studentsRes?.data?.data)
              ? studentsRes.data.data
              : [];

        const nextClassNameById = classList.reduce<Record<string, string>>((acc, cls: any) => {
          const id = cls?._id || cls?.id;
          if (id && cls?.name) {
            acc[String(id)] = String(cls.name);
          }
          return acc;
        }, {});

        const nextStudentNameById = studentList.reduce<Record<string, string>>((acc, student: any) => {
          const id = student?._id || student?.id;
          const name = student?.name || student?.fullName || student?.displayName;
          if (id && name) {
            acc[String(id)] = String(name);
          }
          return acc;
        }, {});

        setClassNameById(nextClassNameById);
        setStudentNameById(nextStudentNameById);
      } catch (error) {
        console.error("Failed to load class and student names", error);
      }
    };

    void loadSchedules();
    void loadReferenceNames();
  }, []);

  const selectedSchedule = useMemo(() => schedules.find((schedule) => schedule._id === selectedScheduleId) || schedules[0] || null, [schedules, selectedScheduleId]);

  const handleDeleteSchedule = async (scheduleId: string) => {
    const schedule = schedules.find((item) => item._id === scheduleId);
    if (!schedule) return;

    const confirmed = window.confirm(`Delete posting schedule "${schedule.name || "Untitled"}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/rotation-schedules/${scheduleId}`);
      const remaining = schedules.filter((item) => item._id !== scheduleId);
      setSchedules(remaining);
      if (selectedScheduleId === scheduleId) {
        setSelectedScheduleId(remaining[0]?._id ?? null);
      }
      toast.success("Posting schedule deleted");
    } catch (error) {
      console.error("Failed to delete rotation schedule", error);
      toast.error("Unable to delete posting schedule");
    } finally {
      setDeleteLoading(false);
    }
  };

  type PhaseDepartment = {
    key: string;
    departmentGroupIndex: number;
    departmentName: string;
    departmentGroupLabel: string;
    departmentStartDate: Date | null;
    departmentEndDate: Date | null;
    windows: any[];
    hasUnits: boolean;
    studentIds: string[];
  };

  type PhaseGroup = {
    key: string;
    phaseLabel: string;
    phaseDurationLabel: string;
    phaseStartDate: Date | null;
    phaseEndDate: Date | null;
    departments: Record<string, PhaseDepartment>;
  };

  const phaseGroups = useMemo(() => {
    if (!selectedSchedule) {
      return [] as Array<{
        key: string;
        phaseLabel: string;
        phaseDurationLabel: string;
        phaseStartDate: Date | null;
        phaseEndDate: Date | null;
        departments: Array<PhaseDepartment>;
      }>;
    }

    const timeline = Array.isArray(selectedSchedule?.meta?.timeline) ? selectedSchedule.meta.timeline : [];
    const phases = timeline.reduce((acc: Record<string, PhaseGroup>, currentWindow: any, index: number) => {
      const view = buildTimelineWindowView(selectedSchedule, currentWindow, index);
      const phaseKey = `${view.phaseIndex ?? 0}`;
      if (!acc[phaseKey]) {
        acc[phaseKey] = {
          key: phaseKey,
          phaseLabel: view.phaseLabel,
          phaseDurationLabel: view.phaseDurationLabel,
          phaseStartDate: view.startDate,
          phaseEndDate: view.endDate,
          departments: {},
        };
      }

      const phase = acc[phaseKey];
      if (view.startDate && (!phase.phaseStartDate || view.startDate < phase.phaseStartDate)) {
        phase.phaseStartDate = view.startDate;
      }
      if (view.endDate && (!phase.phaseEndDate || view.endDate > phase.phaseEndDate)) {
        phase.phaseEndDate = view.endDate;
      }

      const deptKey = `${view.departmentGroupLabel}-${view.departmentName}`;
      if (!phase.departments[deptKey]) {
        phase.departments[deptKey] = {
          key: deptKey,
          departmentGroupIndex: typeof currentWindow?.departmentGroupIndex === 'number' ? currentWindow.departmentGroupIndex : 0,
          departmentName: view.departmentName,
          departmentGroupLabel: view.departmentGroupLabel,
          departmentStartDate: view.startDate,
          departmentEndDate: view.endDate,
          windows: [],
          hasUnits: false,
          studentIds: [],
        };
      }

      const department = phase.departments[deptKey];
      if (view.startDate && (!department.departmentStartDate || view.startDate < department.departmentStartDate)) {
        department.departmentStartDate = view.startDate;
      }
      if (view.endDate && (!department.departmentEndDate || view.endDate > department.departmentEndDate)) {
        department.departmentEndDate = view.endDate;
      }
      department.windows.push(view);
      department.hasUnits = department.hasUnits || Boolean(view.unitId);
      view.studentIds.forEach((studentId: any) => {
        const id = String(studentId);
        if (!department.studentIds.includes(id)) {
          department.studentIds.push(id);
        }
      });
      return acc;
    }, {});

    return Object.values(phases)
      .sort((a, b) => Number(a.key) - Number(b.key))
      .map((phase) => ({
        ...phase,
        departments: Object.values(phase.departments).sort((a, b) => a.departmentGroupIndex - b.departmentGroupIndex),
      }));
  }, [selectedSchedule]);

  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) {
      return "TBA";
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? "TBA" : date.toLocaleDateString("en", { dateStyle: "medium" });
  };

  return (
    <div className="ml-8 mt-10 space-y-6" id="marginLeftMarginTopDiv">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/clinical-rotations")} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">Rotation Schedules</h2>
            <p className="text-sm text-muted-foreground">Full posting, department-group, unit-group, and supervisor details for each generated schedule.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-10 text-center text-muted-foreground">
          Loading generated schedules...
        </div>
      ) : !selectedSchedule ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-10 text-center text-muted-foreground">
          No rotation schedules have been generated yet.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-4 w-4" />
                Schedules
              </CardTitle>
              <CardDescription>Select a generated posting plan to inspect its full layout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {schedules.map((schedule) => (
                <div
                  key={schedule._id}
                  className={`flex items-center gap-2 rounded-xl border p-1 transition ${selectedScheduleId === schedule._id ? "border-primary bg-primary/5" : "border-border/70 bg-background"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedScheduleId(schedule._id)}
                    className={`flex-1 rounded-lg p-3 text-left transition ${selectedScheduleId === schedule._id ? "bg-primary/10" : "bg-background"}`}
                  >
                    <div className="font-medium">{schedule.name || "Rotation Schedule"}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{formatDate(schedule.createdAt || schedule.generatedAt)}</div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full"
                    disabled={deleteLoading}
                    onClick={() => handleDeleteSchedule(schedule._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{selectedSchedule.name || "Rotation Schedule"}</CardTitle>
                <CardDescription>
                  Generated on {formatDate(selectedSchedule.createdAt || selectedSchedule.generatedAt)} · Class {getReferenceDisplayName(selectedSchedule.class, classNameById, "Unassigned class")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Posting</p>
                    <p className="mt-2 font-medium">{selectedSchedule.postings?.[0]?.name || selectedSchedule.name || "Posting"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Date range</p>
                    <p className="mt-2 font-medium">{formatDate(selectedSchedule.postings?.[0]?.startDate)} – {formatDate(selectedSchedule.postings?.[0]?.endDate)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Timeline windows</p>
                    <p className="mt-2 font-medium">{Array.isArray(selectedSchedule?.meta?.timeline) ? selectedSchedule.meta.timeline.length : 0}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Posting groups</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(selectedSchedule.postings?.[0]?.groups || []).map((g: any, gi: number) => {
                      const groupData = g?.group || g || {};
                      const spin = g?.spin ?? groupData.spin ?? null;
                      const name = groupData.name || `Group ${gi + 1}`;
                      const students = Array.isArray(groupData.students) ? groupData.students : (g?.studentIds || []);
                      return (
                        <div key={`group-${gi}`} className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm text-muted-foreground">{name}</div>
                              <div className="mt-1 font-medium">Students: {students.length}</div>
                            </div>
                            {spin ? (
                              <Badge className="px-2 py-0.5 rounded-full text-xs font-semibold border border-primary/20 bg-primary/5 text-primary">{spin}</Badge>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <h3 className="text-lg font-semibold">Posting phases</h3>
                  <Accordion type="single" collapsible className="space-y-4">
                    {phaseGroups.map((phase, phaseIndex) => (
                      <AccordionItem key={phase.key} value={`phase-${phase.key}`}>
                        <AccordionTrigger className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">{phase.phaseLabel}</p>
                              <p className="text-lg font-semibold">{phase.phaseDurationLabel}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{formatDate(phase.phaseStartDate)} – {formatDate(phase.phaseEndDate)}</p>
                            </div>
                            <div className="text-sm text-muted-foreground">Departments: {phase.departments.length}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            {phase.departments.map((dept, deptIndex) => {
                              const nextDepartment = phase.departments[deptIndex + 1]?.departmentName || "End of phase";
                              return (
                                <div key={dept.key} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">{dept.departmentName}</p>
                                      <p className="text-lg font-semibold">{dept.departmentGroupLabel}</p>
                                      <p className="mt-2 text-sm text-muted-foreground">Duration: {formatWindowDuration(dept.departmentStartDate, dept.departmentEndDate)}</p>
                                      <p className="text-sm text-muted-foreground">{formatDate(dept.departmentStartDate)} – {formatDate(dept.departmentEndDate)}</p>
                                    </div>
                                  </div>

                                  {dept.hasUnits ? (
                                    <div className="mt-4 grid gap-4">
                                      {dept.windows
                                        .slice()
                                        .sort((a, b) => Number(a.startDate?.getTime?.() ?? 0) - Number(b.startDate?.getTime?.() ?? 0))
                                        .map((window) => (
                                          <div key={window.id} className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                              <div>
                                                <p className="font-medium">{window.unitGroupLabel}</p>
                                                <p className="text-sm text-muted-foreground">Unit: {window.unitName}</p>
                                                {window.spin ? (
                                                  <div className="mt-2">
                                                    <Badge className="px-2 py-0.5 rounded-full text-xs font-semibold border border-primary/20 bg-primary/5 text-primary">SPIN: {window.spin}</Badge>
                                                  </div>
                                                ) : null}
                                                <p className="mt-2 text-sm text-muted-foreground">{formatDate(window.startDate)} – {formatDate(window.endDate)}</p>
                                                <p className="text-sm text-muted-foreground">Duration: {window.durationLabel}</p>
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                <div>Supervisor: {window.supervisorName}</div>
                                                <div>Students: {window.studentCount}</div>
                                              </div>
                                            </div>
                                            {window.studentIds.length ? (
                                              <div className="mt-3">
                                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Students in this unit group</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                  {window.studentIds.map((student: any, index: number) => {
                                                    const studentName = getReferenceDisplayName(student, studentNameById, `Student ${index + 1}`);
                                                    const studentId = typeof student === "string" ? student : (student?._id || student?.id || "");
                                                    return (
                                                      <span key={`${student}-${index}`} className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm">
                                                        {studentId ? `${studentName} (${studentId})` : studentName}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ) : null}
                                          </div>
                                        ))}
                                    </div>
                                  ) : (
                                    <div className="mt-4 rounded-2xl border border-border/70 bg-muted/40 p-4">
                                      <p className="text-sm text-muted-foreground">No units enabled for this department in this phase.</p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {dept.studentIds.map((student: any, index: number) => (
                                          <span key={`${student}-${index}`} className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm">
                                            {getReferenceDisplayName(student, studentNameById, `Student ${index + 1}`)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
