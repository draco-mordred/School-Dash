import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Calendar, Users, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleStudent {
  _id: string;
  name: string;
  idNumber?: string;
  department?: string;
}

interface SupervisorSummary {
  _id: string | null;
  name: string;
  role: string;
  email?: string;
  department?: string;
}

interface RotationBlock {
  unit: string;
  unitId: string;
  consultant: SupervisorSummary;
  resident: SupervisorSummary;
  startDate: string;
  endDate: string;
  weeks: string;
  completed: boolean;
}

interface UnitAssignment {
  department: string;
  phase: string;
  unit: string;
  unitId: string;
  consultant: SupervisorSummary;
  resident: SupervisorSummary;
  students: ScheduleStudent[];
}

interface DepartmentSchedule {
  department: string;
  departmentCode: string;
  rotationDurationWeeks: number;
  activeUnits: { id: string; name: string }[];
  supervisors: Array<{
    unit: string;
    consultant: SupervisorSummary;
    resident: SupervisorSummary;
  }>;
}

interface NestedUnitSchedule {
  name: string;
  unitId: string;
  duration: number;
  postingType: string;
  students: ScheduleStudent[];
  supervisor: SupervisorSummary;
}

interface NestedGroupSchedule {
  posting: string;
  duration: number;
  totalNumberofUnitsPerStudent: number;
  units: Record<string, Record<string, NestedUnitSchedule>>;
}

interface StudentCategory {
  category: string;
  studentCount: number;
  departmentPhase1: string;
  departmentPhase2: string;
  students: ScheduleStudent[];
}

interface PostingSchedule {
  postingName: string;
  postingType: string;
  durationWeeks: number;
  startDate: string;
  endDate: string;
  phases: string[];
  departments: DepartmentSchedule[];
  studentCategories: StudentCategory[];
  unitAssignments: UnitAssignment[];
  nestedSchedule?: {
    phase1: {
      groupA: NestedGroupSchedule;
      groupB: NestedGroupSchedule;
    };
    phase2: {
      groupA: NestedGroupSchedule;
      groupB: NestedGroupSchedule;
    };
  };
  rotationHistory: Array<{
    student: ScheduleStudent;
    department: string;
    phase: string;
    blocks: RotationBlock[];
  }>;
}

interface PostingScheduleDisplayProps {
  schedule: PostingSchedule;
  validation?: { valid: boolean; errors: string[] };
}

export default function PostingScheduleDisplay({ schedule, validation }: PostingScheduleDisplayProps) {
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  if (!schedule) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No posting schedule data available</p>
        </CardContent>
      </Card>
    );
  }

  const getDates = (startDate: string, endDate: string) => {
    try {
      const start = new Date(startDate).toLocaleDateString();
      const end = new Date(endDate).toLocaleDateString();
      return `${start} - ${end}`;
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  const legacySchedule = schedule as typeof schedule & {
    phase1?: {
      groupA?: { posting?: string; units?: Record<string, Record<string, NestedUnitSchedule>> };
      groupB?: { posting?: string; units?: Record<string, Record<string, NestedUnitSchedule>> };
    };
    phase2?: {
      groupA?: { posting?: string; units?: Record<string, Record<string, NestedUnitSchedule>> };
      groupB?: { posting?: string; units?: Record<string, Record<string, NestedUnitSchedule>> };
    };
  };

  const rawNestedSchedule = schedule.nestedSchedule ?? (legacySchedule.phase1 || legacySchedule.phase2
    ? {
        phase1: legacySchedule.phase1,
        phase2: legacySchedule.phase2,
      }
    : undefined);
  const nestedPhases = rawNestedSchedule ? Object.entries(rawNestedSchedule) : [];

  const derivedStudentCategories = () => {
    if (schedule.studentCategories?.length) return schedule.studentCategories;
    const categoryMap = new Map<string, StudentCategory>();

    nestedPhases.forEach(([phaseKey, phaseData]) => {
      const phaseLabel = phaseKey === "phase1" ? "Phase 1" : "Phase 2";
      [phaseData.groupA, phaseData.groupB].forEach((group) => {
        const postingName = group?.posting || "Posting";
        const existing = categoryMap.get(postingName) ?? {
          category: postingName,
          studentCount: 0,
          departmentPhase1: phaseLabel,
          departmentPhase2: phaseLabel,
          students: [],
        };

        const studentCount = Object.values(group?.units ?? {}).reduce((sum, unitMap) => {
          return sum + Object.values(unitMap ?? {}).reduce((unitSum, unitData) => unitSum + (unitData.students?.length ?? 0), 0);
        }, 0);

        existing.studentCount += studentCount;
        existing.students.push(...Object.values(group?.units ?? {}).flatMap((unitMap) => Object.values(unitMap ?? {}).flatMap((unitData) => unitData.students ?? [])));
        existing.departmentPhase1 = existing.departmentPhase1 || phaseLabel;
        existing.departmentPhase2 = existing.departmentPhase2 || phaseLabel;
        categoryMap.set(postingName, existing);
      });
    });

    return Array.from(categoryMap.values());
  };

  const derivedDepartments = () => {
    if (schedule.departments?.length) return schedule.departments;
    const departments = new Map<string, DepartmentSchedule>();

    nestedPhases.forEach(([, phaseData]) => {
      [phaseData.groupA, phaseData.groupB].forEach((group) => {
        const departmentName = group?.posting || "General";
        const existing = departments.get(departmentName) ?? {
          department: departmentName,
          departmentCode: departmentName.slice(0, 3).toUpperCase(),
          rotationDurationWeeks: schedule.durationWeeks,
          activeUnits: [],
          supervisors: [],
        };

        const units = Object.values(group?.units ?? {}).flatMap((unitMap) => Object.values(unitMap ?? {}));
        existing.activeUnits = existing.activeUnits.concat(units.map((unit) => ({ id: unit.unitId, name: unit.name })));
        existing.supervisors = existing.supervisors.concat(units.map((unit) => ({
          unit: unit.name,
          consultant: unit.supervisor,
          resident: unit.supervisor,
        })));
        departments.set(departmentName, existing);
      });
    });

    return Array.from(departments.values());
  };

  const derivedUnitAssignments = () => {
    if (schedule.unitAssignments?.length) return schedule.unitAssignments;
    const unitAssignments: UnitAssignment[] = [];

    nestedPhases.forEach(([phaseKey, phaseData]) => {
      const phaseName = phaseKey === "phase1" ? "Phase 1" : "Phase 2";
      [phaseData.groupA, phaseData.groupB].forEach((group) => {
        Object.values(group?.units ?? {}).forEach((unitMap) => {
          Object.values(unitMap ?? {}).forEach((unitData) => {
            unitAssignments.push({
              department: group?.posting || "General",
              phase: phaseName,
              unit: unitData.name,
              unitId: unitData.unitId,
              consultant: unitData.supervisor,
              resident: unitData.supervisor,
              students: unitData.students,
            });
          });
        });
      });
    });

    return unitAssignments;
  };

  const effectiveStudentCategories = derivedStudentCategories();
  const effectiveDepartments = derivedDepartments();
  const effectiveUnitAssignments = derivedUnitAssignments();
  const totalStudents = effectiveStudentCategories.reduce((sum, cat) => sum + cat.studentCount, 0);

  const phaseSections = nestedPhases.length > 0
    ? nestedPhases.map(([phaseKey, phaseData]) => ({
        phaseName: phaseKey === "phase1" ? "Phase 1" : "Phase 2",
        groups: [
          {
            title: "Group A",
            entries: Object.entries(phaseData.groupA.units).flatMap(([unitSlot, unitMap]) =>
              Object.entries(unitMap).map(([unitKey, unitData]) => ({
                id: `${phaseKey}-groupA-${unitSlot}-${unitKey}`,
                posting: phaseData.groupA.posting,
                duration: phaseData.groupA.duration,
                unit: unitData.name,
                unitId: unitData.unitId,
                postingType: unitData.postingType,
                supervisor: unitData.supervisor.name,
                students: unitData.students,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
              }))
            ),
          },
          {
            title: "Group B",
            entries: Object.entries(phaseData.groupB.units).flatMap(([unitSlot, unitMap]) =>
              Object.entries(unitMap).map(([unitKey, unitData]) => ({
                id: `${phaseKey}-groupB-${unitSlot}-${unitKey}`,
                posting: phaseData.groupB.posting,
                duration: phaseData.groupB.duration,
                unit: unitData.name,
                unitId: unitData.unitId,
                postingType: unitData.postingType,
                supervisor: unitData.supervisor.name,
                students: unitData.students,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
              }))
            ),
          },
        ],
      }))
    : schedule.phases.map((phaseName, index) => ({
        phaseName,
        groups: [
          {
            title: "Group A",
            entries: schedule.unitAssignments
              .filter((unit) => unit.phase === phaseName)
              .slice(0, 2)
              .map((unit, unitIndex) => ({
                id: `${phaseName}-groupA-${unitIndex}`,
                posting: unit.department,
                duration: Math.max(1, Math.round(schedule.durationWeeks / Math.max(schedule.phases.length, 1))),
                unit: unit.unit,
                unitId: unit.unitId,
                postingType: unit.department,
                supervisor: unit.consultant.name,
                students: unit.students,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
              })),
          },
          {
            title: "Group B",
            entries: schedule.unitAssignments
              .filter((unit) => unit.phase === phaseName)
              .slice(2, 4)
              .map((unit, unitIndex) => ({
                id: `${phaseName}-groupB-${unitIndex}`,
                posting: unit.department,
                duration: Math.max(1, Math.round(schedule.durationWeeks / Math.max(schedule.phases.length, 1))),
                unit: unit.unit,
                unitId: unit.unitId,
                postingType: unit.department,
                supervisor: unit.consultant.name,
                students: unit.students,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
              })),
          },
        ],
      }));

  return (
    <Card className="w-full border border-border bg-card shadow-sm">
      <CardHeader className="rounded-t-lg border-b border-border bg-muted/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-2xl text-foreground">{schedule.postingName}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Type: {schedule.postingType} | Duration: {schedule.durationWeeks} weeks
            </p>
            <p className="text-sm text-muted-foreground">
              {getDates(schedule.startDate, schedule.endDate)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/80 px-3 py-2 text-right">
            <Badge variant="secondary" className="mb-2 bg-background text-foreground">
              {schedule.phases.join(" → ")}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Students: {totalStudents}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {validation && !validation.valid && validation.errors.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="mb-2 font-semibold text-destructive-foreground">Validation Warnings:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
              {validation.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {effectiveStudentCategories.map((category) => (
            <div key={category.category} className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <h4 className="mb-2 font-semibold text-foreground">{category.category}</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Students:</span> {category.studentCount}
                </p>
                <p>
                  <span className="font-medium">Phase 1:</span> {category.departmentPhase1}
                </p>
                <p>
                  <span className="font-medium">Phase 2:</span> {category.departmentPhase2}
                </p>
              </div>
            </div>
          ))}
        </div>

        {phaseSections.length > 0 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Calendar className="h-5 w-5 text-primary" /> Posting Schedule by Phase
            </h3>

            {phaseSections.map((phase) => (
              <div key={phase.phaseName} className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-lg font-semibold text-foreground">{phase.phaseName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Total duration: {Math.max(1, Math.round(schedule.durationWeeks / Math.max(schedule.phases.length, 1)))} weeks
                  </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {phase.groups.map((group) => (
                    <div key={group.title} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h5 className="font-semibold text-foreground">{group.title}</h5>
                        <Badge variant="outline">{group.entries.length} block{group.entries.length === 1 ? "" : "s"}</Badge>
                      </div>

                      <div className="space-y-3">
                        {group.entries.length > 0 ? (
                          group.entries.map((entry) => (
                            <div key={entry.id} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-foreground">{entry.posting}</p>
                                  <p className="text-sm text-muted-foreground">Duration: {entry.duration} weeks</p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {entry.postingType}
                                </Badge>
                              </div>

                              <div className="mt-3 rounded-md border border-dashed border-border bg-background/80 p-3">
                                <p className="text-sm font-semibold text-foreground">Unit</p>
                                <p className="text-sm text-muted-foreground">{entry.unit}</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Supervisor: {entry.supervisor}
                                </p>
                              </div>

                              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                                <p>
                                  <span className="font-medium text-foreground">Students:</span>{" "}
                                  {entry.students.length > 0
                                    ? entry.students.map((student) => student.name).join(", ")
                                    : "TBD"}
                                </p>
                                <p>
                                  <span className="font-medium text-foreground">Start:</span>{" "}
                                  {getDates(entry.startDate, entry.endDate)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No placements available for this group.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Stethoscope className="h-5 w-5 text-primary" /> Departments & Assignments
          </h3>

          {effectiveDepartments.length > 0 ? (
            effectiveDepartments.map((dept) => (
              <Card key={dept.department} className="border-l-4 border-primary/70 bg-background/80">
                <CardHeader
                  className="cursor-pointer py-3 hover:bg-muted"
                  onClick={() => setExpandedDept(expandedDept === dept.department ? null : dept.department)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground">{dept.department}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Code: {dept.departmentCode} | Duration: {dept.rotationDurationWeeks} weeks
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {expandedDept === dept.department ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </div>
                </CardHeader>

                {expandedDept === dept.department && (
                  <CardContent className="space-y-4">
                    {effectiveUnitAssignments
                      .filter((ua) => ua.department === dept.department)
                      .reduce((unique, ua) => {
                        const exists = unique.find((item) => item.unitId === ua.unitId && item.phase === ua.phase);
                        if (!exists) unique.push(ua);
                        return unique;
                      }, [] as typeof effectiveUnitAssignments)
                      .map((unit, idx) => (
                        <Card key={`${unit.unitId}-${unit.phase}-${idx}`} className="border-l-4 border-secondary/70 bg-muted/20">
                          <CardHeader
                            className="cursor-pointer py-3 hover:bg-muted"
                            onClick={() => {
                              const unitKey = `${unit.unitId}-${unit.phase}`;
                              setExpandedCategory(expandedCategory === unitKey ? null : unitKey);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base text-foreground">{unit.unit} - {unit.phase}</CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Consultant: {unit.consultant.name || "TBD"} | Resident: {unit.resident.name || "TBD"}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">
                                {expandedCategory === `${unit.unitId}-${unit.phase}` ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </Button>
                            </div>
                          </CardHeader>

                          {expandedCategory === `${unit.unitId}-${unit.phase}` && (
                            <CardContent className="space-y-3">
                              <div className="rounded-lg border border-border bg-background/90 p-3">
                                <p className="mb-2 text-sm font-semibold text-foreground">Supervisors</p>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>
                                    <span className="font-medium text-foreground">Consultant:</span> {unit.consultant.name || "TBD"}
                                  </p>
                                  <p>
                                    <span className="font-medium text-foreground">Resident:</span> {unit.resident.name || "TBD"}
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-lg border border-border bg-background/90 p-3">
                                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <Users className="h-4 w-4" /> Assigned Students ({unit.students.length})
                                </p>
                                {unit.students.length > 0 ? (
                                  <div className="space-y-1">
                                    {unit.students.map((student) => (
                                      <div key={student._id} className="flex items-center justify-between rounded border border-border bg-muted/20 px-2 py-1 text-sm text-foreground">
                                        <span>{student.name}</span>
                                        {student.idNumber && <span className="text-muted-foreground">ID: {student.idNumber}</span>}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No students assigned</p>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
              No department assignments are available for this posting yet.
            </p>
          )}
        </div>

        {schedule.rotationHistory.length > 0 && (
          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Posting History</h3>
            <div className="mt-3 space-y-2">
              {schedule.rotationHistory.slice(0, 4).map((history, index) => (
                <div key={`${history.student._id}-${index}`} className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{history.student.name}</p>
                  <p>{history.department} • {history.phase}</p>
                  <p className="mt-1 text-xs">{history.blocks.length} block{history.blocks.length === 1 ? "" : "s"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
