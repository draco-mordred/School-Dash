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
          <p className="text-gray-500">No posting schedule data available</p>
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

  return (
    <Card className="w-full border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{schedule.postingName}</CardTitle>
            <p className="text-sm text-blue-100 mt-2">
              Type: {schedule.postingType} | Duration: {schedule.durationWeeks} weeks
            </p>
            <p className="text-sm text-blue-100">
              {getDates(schedule.startDate, schedule.endDate)}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="mb-2">
              {schedule.phases.join(" → ")}
            </Badge>
            <p className="text-sm text-blue-100">
              Students: {schedule.studentCategories.reduce((sum, cat) => sum + cat.studentCount, 0)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {validation && !validation.valid && validation.errors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-semibold text-yellow-800 mb-2">Validation Warnings:</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700 text-sm">
              {validation.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Student Categories Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedule.studentCategories.map((category) => (
            <div key={category.category} className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">{category.category}</h4>
              <div className="space-y-2 text-sm">
                <p className="text-purple-700">
                  <span className="font-medium">Students:</span> {category.studentCount}
                </p>
                <p className="text-purple-700">
                  <span className="font-medium">Phase 1:</span> {category.departmentPhase1}
                </p>
                <p className="text-purple-700">
                  <span className="font-medium">Phase 2:</span> {category.departmentPhase2}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Departments and Units */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Stethoscope className="w-5 h-5" /> Departments & Assignments
          </h3>

          {schedule.departments.map((dept) => (
            <Card key={dept.department} className="border-l-4 border-l-green-500">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 py-3"
                onClick={() =>
                  setExpandedDept(expandedDept === dept.department ? null : dept.department)
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-green-700">
                      {dept.department}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
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
                        className="border-l-4 border-l-orange-400"
                      >
                        <CardHeader
                          className="cursor-pointer hover:bg-gray-50 py-3"
                          onClick={() => {
                            const unitKey = `${unit.unitId}-${unit.phase}`;
                            setExpandedCategory(
                              expandedCategory === unitKey ? null : unitKey
                            );
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base text-orange-700">
                                {unit.unit} - {unit.phase}
                              </CardTitle>
                              <p className="text-sm text-gray-600 mt-1">
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
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <p className="text-sm font-semibold text-blue-900 mb-2">
                                👨‍⚕️ Supervisors
                              </p>
                              <div className="space-y-1 text-sm text-blue-800">
                                <p>
                                  <span className="font-medium">Consultant:</span>{" "}
                                  {unit.consultant.name || "TBD"}
                                  {unit.consultant.email && (
                                    <span className="text-gray-600"> ({unit.consultant.email})</span>
                                  )}
                                </p>
                                <p>
                                  <span className="font-medium">Resident:</span>{" "}
                                  {unit.resident.name || "TBD"}
                                  {unit.resident.email && (
                                    <span className="text-gray-600"> ({unit.resident.email})</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Student List */}
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <p className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Assigned Students ({unit.students.length})
                              </p>
                              {unit.students.length > 0 ? (
                                <div className="space-y-1">
                                  {unit.students.map((student) => (
                                    <div
                                      key={student._id}
                                      className="text-sm text-green-800 bg-white rounded px-2 py-1 flex justify-between"
                                    >
                                      <span>{student.name}</span>
                                      {student.idNumber && (
                                        <span className="text-gray-500">ID: {student.idNumber}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-green-600">No students assigned</p>
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
                                  className="bg-amber-50 border border-amber-200 rounded p-3"
                                >
                                  <p className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Rotation Timeline
                                  </p>
                                  <div className="space-y-2">
                                    {history.blocks.map((block, blockIdx) => (
                                      <div
                                        key={blockIdx}
                                        className="text-sm bg-white rounded px-2 py-1 border-l-2 border-l-amber-400"
                                      >
                                        <p className="font-medium text-amber-900">
                                          Weeks {block.weeks} - {block.unit}
                                        </p>
                                        <p className="text-gray-600 text-xs">
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
