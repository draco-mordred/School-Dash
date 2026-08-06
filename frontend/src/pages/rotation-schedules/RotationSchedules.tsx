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

type RotationScheduleRecord = {
  _id?: string;
  name?: string;
  createdAt?: string | Date;
  generatedAt?: string | Date;
  class?: string;
  meta?: {
    timeline?: Array<Record<string, unknown>>;
  };
  postings?: Array<Record<string, unknown>>;
};

type TimelineWindowRecord = {
  id?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  phaseIndex?: number;
  phaseLabel?: string | null;
  phaseDurationLabel?: string | null;
  departmentGroupIndex?: number;
  departmentSpin?: string | null;
  departmentSupervisorName?: string | null;
  supervisorName?: string | null;
  spin?: string | null;
  studentIds?: Array<string | Record<string, unknown>>;
  unitGroupLabel?: string | null;
  unitGroupIndex?: number;
  unitName?: string | null;
  unitId?: string | null;
  supervisorId?: string | null;
  departmentName?: string | null;
  departmentGroupLabel?: string | null;
};

type UnitGroupCard = {
  key: string;
  label: string;
  windows: TimelineWindowRecord[];
  spin: string | null;
  studentIds: string[];
  supervisorName: string;
};

export default function RotationSchedules() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<RotationScheduleRecord[]>([]);
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
          ? (classesRes.data.classes as Array<Record<string, unknown>>)
          : Array.isArray(classesRes?.data)
            ? (classesRes.data as Array<Record<string, unknown>>)
            : Array.isArray(classesRes?.data?.data)
              ? (classesRes.data.data as Array<Record<string, unknown>>)
              : [];
        const studentList = Array.isArray(studentsRes?.data?.users)
          ? (studentsRes.data.users as Array<Record<string, unknown>>)
          : Array.isArray(studentsRes?.data)
            ? (studentsRes.data as Array<Record<string, unknown>>)
            : Array.isArray(studentsRes?.data?.data)
              ? (studentsRes.data.data as Array<Record<string, unknown>>)
              : [];

        const nextClassNameById = classList.reduce<Record<string, string>>((acc, cls) => {
          const id = cls?._id || cls?.id;
          if (typeof id === "string" && cls?.name) {
            acc[String(id)] = String(cls.name);
          }
          return acc;
        }, {});

        const nextStudentNameById = studentList.reduce<Record<string, string>>((acc, student) => {
          const id = student?._id || student?.id;
          const name = student?.name || student?.fullName || student?.displayName;
          if (typeof id === "string" && typeof name === "string" && name.trim()) {
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
    windows: TimelineWindowRecord[];
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
    const phases = timeline.reduce<Record<string, PhaseGroup>>((acc, currentWindow, index) => {
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
      view.studentIds.forEach((studentId: string | Record<string, unknown>) => {
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
          <div className="space-y-4">
            <div className="text-2xl font-semibold text-foreground">It&apos;s lonely here..</div>
            <div className="text-7xl sad-face-crying">😢</div>
            <div className="text-sm text-muted-foreground">No rotation schedules have been generated yet.</div>
            <Button variant="outline" onClick={() => navigate('/clinical-rotations')} className="mx-auto mt-2">
              Go create a posting schedule
            </Button>
          </div>
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
                    onClick={() => setSelectedScheduleId(schedule._id ?? null)}
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
                    onClick={() => handleDeleteSchedule(schedule._id ?? "")}
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
                    {(() => {
                      const posting = selectedSchedule.postings?.[0] as Record<string, unknown> | undefined;
                      const postingName = typeof posting?.name === "string" ? posting.name : selectedSchedule.name || "Posting";
                      const postingSpin = typeof posting?.spin === "string" ? posting.spin : typeof (posting?.meta as Record<string, unknown> | undefined)?.spin === "string" ? (posting?.meta as Record<string, unknown>).spin : null;
                      return (
                        <>
                          <p className="mt-2 font-medium">{postingName}</p>
                          {postingSpin ? <div className="mt-1 text-xs text-muted-foreground">Posting SPIN: {String(postingSpin)}</div> : null}
                        </>
                      );
                    })()}
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Date range</p>
                    {(() => {
                      const posting = selectedSchedule.postings?.[0] as Record<string, unknown> | undefined;
                      return <p className="mt-2 font-medium">{formatDate(posting?.startDate as string | Date | null | undefined)} – {formatDate(posting?.endDate as string | Date | null | undefined)}</p>;
                    })()}
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Timeline windows</p>
                    <p className="mt-2 font-medium">{Array.isArray(selectedSchedule?.meta?.timeline) ? selectedSchedule.meta.timeline.length : 0}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Posting groups</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(() => {
                      const posting = selectedSchedule.postings?.[0] as Record<string, unknown> | undefined;
                      const groups = Array.isArray(posting?.groups) ? (posting.groups as Array<Record<string, unknown>>) : [];
                      return groups.map((g, gi) => {
                        const groupData = (g?.group as Record<string, unknown> | undefined) || g || {};
                        const spin = (g as Record<string, unknown>).spin ?? (groupData as Record<string, unknown>).spin ?? (groupData as Record<string, unknown>).departmentSpin ?? (groupData as Record<string, unknown>).unitSpin ?? null;
                        const name = (groupData as Record<string, unknown>).name || `Group ${gi + 1}`;
                        const students = Array.isArray((groupData as Record<string, unknown>).students) ? ((groupData as Record<string, unknown>).students as Array<string | Record<string, unknown>>) : ((g as Record<string, unknown>).studentIds as Array<string | Record<string, unknown>> | undefined) || [];
                        return (
                          <div key={`group-${gi}`} className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-sm text-muted-foreground">{String(name)}</div>
                                <div className="mt-1 font-medium">Students: {students.length}</div>
                              </div>
                              {/* {spin ? (
                                <Badge className="px-2 py-0.5 rounded-full text-xs font-semibold border border-primary/20 bg-primary/5 text-primary">{String(spin)}</Badge>
                              ) : null} */}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <h3 className="text-lg font-semibold">Posting phases</h3>
                  <Accordion type="single" collapsible className="space-y-4">
                    {phaseGroups.map((phase) => (
                      <AccordionItem key={phase.key} value={`phase-${phase.key}`}>
                        <AccordionTrigger className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
                          <div className="flex flex-col gap-2 sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">{phase.phaseLabel}</p>
                              <p className="text-lg font-semibold">{phase.phaseDurationLabel}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{formatDate(phase.phaseStartDate)} – {formatDate(phase.phaseEndDate)}</p>
                            </div>
                             <Badge variant="secondary" className="whitespace-nowrap text-sm">Departments: {phase.departments.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <Accordion type="single" collapsible className="space-y-3">
                              {phase.departments.map((dept) => {
                                const postingGroups = Array.isArray((selectedSchedule.postings?.[0] as Record<string, unknown> | undefined)?.groups)
                                  ? ((selectedSchedule.postings?.[0] as Record<string, unknown>).groups as Array<Record<string, unknown>>)
                                  : [];
                                const postingGroup = postingGroups[dept.departmentGroupIndex ?? 0] as Record<string, unknown> | undefined;
                                const postingGroupData = (postingGroup?.group as Record<string, unknown> | undefined) || postingGroup || {};
                                const departmentSupervisor = dept.windows.find((window) => Boolean(window.departmentSupervisorName))?.departmentSupervisorName || dept.windows[0]?.supervisorName || "Unassigned";
                                const departmentSpinValue =
                                  (postingGroup as Record<string, unknown> | undefined)?.departmentSpin
                                  ?? (postingGroupData as Record<string, unknown>).departmentSpin
                                  ?? (postingGroup as Record<string, unknown> | undefined)?.spin
                                  ?? (postingGroupData as Record<string, unknown>).spin
                                  ?? dept.windows.find((window) => Boolean(window.departmentSpin))?.departmentSpin
                                  ?? dept.windows[0]?.spin
                                  ?? null;
                                const departmentSpin = typeof departmentSpinValue === "string" ? departmentSpinValue : null;
                                const unitGroups = dept.hasUnits
                                  ? Object.values(
                                      dept.windows.reduce<Record<string, UnitGroupCard>>((acc, window) => {
                                        const key = `${window.unitGroupLabel || window.unitGroupIndex || window.unitId || "unit"}`;
                                        if (!acc[key]) {
                                          acc[key] = {
                                            key: `${dept.key}-${key}`,
                                            label: window.unitGroupLabel || `Unit Group ${Number(window.unitGroupIndex ?? 0) + 1}`,
                                            windows: [],
                                            spin: window.spin || null,
                                            studentIds: [],
                                            supervisorName: window.supervisorName || "Unassigned",
                                          };
                                        }
                                        acc[key].windows.push(window);
                                        window.studentIds?.forEach((studentId) => {
                                          const id = String(studentId);
                                          if (!acc[key].studentIds.includes(id)) acc[key].studentIds.push(id);
                                        });
                                        if (!acc[key].spin && window.spin) acc[key].spin = window.spin;
                                        if (acc[key].supervisorName === "Unassigned" && window.supervisorName) acc[key].supervisorName = window.supervisorName;
                                        return acc;
                                      }, {}),
                                    )
                                  : [];

                                return (
                                  <AccordionItem key={dept.key} value={`dept-${dept.key}`} className="rounded-2xl border border-border/70 bg-background p-0 shadow-sm">
                                    <AccordionTrigger className="px-4 py-4 text-left hover:no-underline">
                                      <div className="flex w-full items-start justify-between gap-4">
                                        <div className="min-w-0 text-left">
                                          <p className="text-sm font-medium text-muted-foreground">{dept.departmentName}</p>
                                          <p className="text-lg font-semibold">{dept.departmentGroupLabel}</p>
                                          <p className="mt-2 text-sm text-muted-foreground">Duration: {formatWindowDuration(dept.departmentStartDate, dept.departmentEndDate)}</p>
                                          <p className="text-sm text-muted-foreground">Supervisor: {departmentSupervisor}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end gap-2 text-right">
                                          {departmentSpin ? (
                                            <Badge className="whitespace-nowrap border border-primary/20 bg-primary/5 text-primary">SPIN: {departmentSpin}</Badge>
                                          ) : null}
                                          <Badge variant="secondary" className="whitespace-nowrap">{dept.departmentGroupLabel}</Badge>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                      <div className="space-y-3">
                                        {dept.hasUnits && unitGroups.length > 0 ? (
                                          unitGroups.map((unitGroup) => (
                                            <div key={unitGroup.key} className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                                              <Accordion type="single" collapsible>
                                                <AccordionItem value={`unit-${unitGroup.key}`} className="border-0">
                                                  <AccordionTrigger className="px-0 py-0 text-left hover:no-underline">
                                                    <div className="flex w-full items-start justify-between gap-4">
                                                      <div className="min-w-0 text-left">
                                                        <p className="font-medium">{unitGroup.label}</p>
                                                        <p className="mt-1 text-sm text-muted-foreground">Supervisor: {unitGroup.supervisorName} • Students: {unitGroup.studentIds.length}</p>
                                                      </div>
                                                      <div className="flex flex-wrap items-center justify-end gap-2 text-right">
                                                        <Badge variant="outline" className="whitespace-nowrap">{unitGroup.label}</Badge>
                                                        {unitGroup.spin ? (
                                                          <Badge className="whitespace-nowrap border border-primary/20 bg-primary/5 text-primary">SPIN: {unitGroup.spin}</Badge>
                                                        ) : null}
                                                      </div>
                                                    </div>
                                                  </AccordionTrigger>
                                                  <AccordionContent className="pt-3">
                                                    <div className="flex flex-wrap gap-2">
                                                      {unitGroup.studentIds.map((student: string | Record<string, unknown>, index: number) => {
                                                        const studentName = getReferenceDisplayName(student, studentNameById, `Student ${index + 1}`);
                                                        const studentId = typeof student === "string" ? student : (student?._id || student?.id || "");
                                                        return (
                                                          <span key={`${student}-${index}`} className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm">
                                                            {studentId ? `${studentName} (${studentId})` : studentName}
                                                          </span>
                                                        );
                                                      })}
                                                    </div>
                                                  </AccordionContent>
                                                </AccordionItem>
                                              </Accordion>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                              <p className="text-sm font-medium">Students in this department group</p>
                                              <div className="flex flex-wrap items-center gap-2">
                                                {departmentSpin ? (
                                                  <Badge className="whitespace-nowrap border border-primary/20 bg-primary/5 text-primary">SPIN: {departmentSpin}</Badge>
                                                ) : null}
                                              </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                              {dept.studentIds.map((student: string, index: number) => (
                                                <span key={`${student}-${index}`} className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm">
                                                  {getReferenceDisplayName(student, studentNameById, `Student ${index + 1}`)}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
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
