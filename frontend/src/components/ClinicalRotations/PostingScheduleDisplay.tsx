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

  const nestedPhases = schedule.nestedSchedule ? Object.entries(schedule.nestedSchedule) : [];
  const phases = schedule.phases ?? [];
  const studentCategories = schedule.studentCategories ?? [];

  return (
    <Card className="w-full border border-border bg-card">
      <CardHeader className="bg-card text-slate-900 rounded-t-lg">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{schedule.postingName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Type: {schedule.postingType} | Duration: {schedule.durationWeeks} weeks
            </p>
            <p className="text-sm text-muted-foreground">
              {getDates(schedule.startDate, schedule.endDate)}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="mb-2">
              {phases.join(" → ") || "No phases"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Students: {studentCategories.reduce((sum, cat) => sum + (cat.studentCount ?? 0), 0)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {validation && !validation.valid && validation.errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="font-semibold text-destructive-foreground mb-2">Validation Warnings:</p>
            <ul className="list-disc list-inside space-y-1 text-destructive text-sm">
              {validation.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Student Categories Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedule.studentCategories.map((category) => (
            <div key={category.category} className="bg-surface border border-border rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">{category.category}</h4>
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

        {nestedPhases.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Nested Posting Schedule
            </h3>

            {nestedPhases.map(([phaseKey, phaseData]) => (
              <Card key={phaseKey} className="border border-border bg-surface">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg text-primary">
                    {phaseKey === "phase1" ? "Phase 1" : "Phase 2"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(phaseData).map(([groupKey, groupData]) => (
                    <div key={`${phaseKey}-${groupKey}`} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-semibold text-slate-900">
                          {groupKey === "groupA" ? "Group A" : "Group B"}
                        </h4>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-slate-900">Posting:</span> {groupData.posting} •
                          <span className="ml-1 font-medium text-slate-900">Duration:</span> {groupData.duration} month(s) •
                          <span className="ml-1 font-medium text-slate-900">Units/student:</span> {groupData.totalNumberofUnitsPerStudent}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {Object.entries(groupData.units).map(([unitSlot, unitMap]) => (
                          Object.entries(unitMap).map(([unitKey, unitData]) => (
                            <div key={`${phaseKey}-${groupKey}-${unitSlot}-${unitKey}`} className="rounded-md border border-border bg-surface p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-slate-900">{unitData.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {unitData.postingType} • {unitData.duration} weeks
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  Supervisor: {unitData.supervisor.name}
                                </Badge>
                              </div>

                              <div className="mt-3 rounded border border-dashed border-border bg-background p-3">
                                <p className="mb-2 text-sm font-semibold text-slate-900">Assigned Students ({unitData.students.length})</p>
                                {unitData.students.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {unitData.students.map((student) => (
                                      <div key={student._id} className="rounded-full border border-border bg-surface px-2.5 py-1 text-sm text-slate-900">
                                        {student.name}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No students assigned</p>
                                )}
                              </div>
                            </div>
                          ))
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Departments and Units */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" /> Departments & Assignments
          </h3>

          {schedule.departments.map((dept) => (
            <Card key={dept.department} className="border-l-4 border-primary/70 bg-surface">
              <CardHeader
                className="cursor-pointer hover:bg-muted py-3"
                onClick={() =>
                  setExpandedDept(expandedDept === dept.department ? null : dept.department)
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-primary">
                      {dept.department}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Code: {dept.departmentCode} | Duration: {dept.rotationDurationWeeks} weeks
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    {expandedDept === dept.department ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {expandedDept === dept.department && (
                <CardContent className="space-y-4">
                  {/* Units for this department */}
                  {schedule.unitAssignments
                    .filter((ua) => ua.department === dept.department)
                    .reduce(
                      (unique, ua) => {
                        const exists = unique.find(
                          (u) => u.unitId === ua.unitId && u.phase === ua.phase
                        );
                        if (!exists) unique.push(ua);
                        return unique;
                      },
                      [] as typeof schedule.unitAssignments
                    )
                    .map((unit, idx) => (
                      <Card
                        key={`${unit.unitId}-${unit.phase}-${idx}`}
                        className="border-l-4 border-secondary/70 bg-surface"
                      >
                        <CardHeader
                          className="cursor-pointer hover:bg-muted py-3"
                          onClick={() => {
                            const unitKey = `${unit.unitId}-${unit.phase}`;
                            setExpandedCategory(
                              expandedCategory === unitKey ? null : unitKey
                            );
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base text-secondary">
                                {unit.unit} - {unit.phase}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                Consultant: {unit.consultant.name || "TBD"} | Resident:{" "}
                                {unit.resident.name || "TBD"}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm">
                              {expandedCategory === `${unit.unitId}-${unit.phase}` ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>

                        {expandedCategory === `${unit.unitId}-${unit.phase}` && (
                          <CardContent className="space-y-3">
                            {/* Supervisors */}
                            <div className="bg-surface border border-border rounded p-3">
                              <p className="text-sm font-semibold text-slate-900 mb-2">
                                👨‍⚕️ Supervisors
                              </p>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>
                                  <span className="font-medium text-slate-900">Consultant:</span>{" "}
                                  {unit.consultant.name || "TBD"}
                                  {unit.consultant.email && (
                                    <span className="text-muted-foreground"> ({unit.consultant.email})</span>
                                  )}
                                </p>
                                <p>
                                  <span className="font-medium text-slate-900">Resident:</span>{" "}
                                  {unit.resident.name || "TBD"}
                                  {unit.resident.email && (
                                    <span className="text-muted-foreground"> ({unit.resident.email})</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Student List */}
                            <div className="bg-surface border border-border rounded p-3">
                              <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Assigned Students ({unit.students.length})
                              </p>
                              {unit.students.length > 0 ? (
                                <div className="space-y-1">
                                  {unit.students.map((student) => (
                                    <div
                                      key={student._id}
                                      className="text-sm text-slate-900 bg-background rounded px-2 py-1 flex justify-between border border-border"
                                    >
                                      <span>{student.name}</span>
                                      {student.idNumber && (
                                        <span className="text-muted-foreground">ID: {student.idNumber}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No students assigned</p>
                              )}
                            </div>

                            {/* Timeline Information from rotation history */}
                            {schedule.rotationHistory
                              .filter(
                                (history) =>
                                  history.department === dept.department && history.phase === unit.phase
                              )
                              .slice(0, 1)
                              .map((history) => (
                                <div
                                  key={`timeline-${history.student._id}`}
                                  className="bg-surface border border-border rounded p-3"
                                >
                                  <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" /> Rotation Timeline
                                  </p>
                                  <div className="space-y-2">
                                    {history.blocks.map((block, blockIdx) => (
                                      <div
                                        key={blockIdx}
                                        className="text-sm bg-background rounded px-2 py-1 border-l-2 border-l-primary"
                                      >
                                        <p className="font-medium text-slate-900">
                                          Weeks {block.weeks} - {block.unit}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                          {getDates(block.startDate, block.endDate)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
