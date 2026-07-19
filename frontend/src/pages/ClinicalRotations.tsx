import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { MoreHorizontal, Plus, Pencil, Trash2, ClipboardList, Stethoscope, CalendarDays, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Search from "@/components/global/Search";
import CustomPagination from "@/components/global/CustomPagination";
import { getClockPhaseId, getClassLevelPhasePlan } from "@/lib/academicClock";
import {
  deletePersistedPostingSchedule,
  loadPersistedPostingSchedule,
  savePersistedPostingSchedule,
} from "@/lib/postingScheduleStorage";

type RotationStatus = "upcoming" | "active" | "completed";
type RotationType = "medicine" | "surgery" | "paediatrics" | "obstetrics" | "psychiatry" | "community" | "elective";


interface Tutorial {
  _id?: string;
  topic: string;
  date?: string;
  notes?: string;
}

interface PatientClerked {
  _id?: string;
  patientName: string;
  diagnosis: string;
  clerkedAt?: string;
  notes?: string;
}

interface Rotation {
  _id: string;
  rotationName: string;
  rotationDescription: string;
  rotationType: RotationType;
  rotationStartDate: string;
  rotationEndDate: string;
  rotationUnit: string;
  rotationSupervisor: { _id: string; name: string; email?: string };
  rotationStatus: RotationStatus;
  rotationNotes: string;
  rotationActivities: {
    numberOfWeeks: number;
    numberOfConsultantWardRound: number;
    numberOfClinics: number;
    numberOfResidentWardRound: number;
    numberOfCallDuty: number;
    numberOfTheatreDays: number;
  };
  rotationTutorials: Tutorial[];
  rotationTutorialPersonal: string;
  patientsClerked: PatientClerked[];
  student: { _id: string; name: string; idNumber?: string };
  students?: { _id: string; name: string }[];
  academicYear: { _id: string; name: string };
  createdAt: string;
}

interface RotationGroup {
  _id?: string;
  name?: string;
  students?: Array<{ _id?: string; name?: string; idNumber?: string }>;
  supervisorName?: string;
  supervisor?: { name?: string };
}

interface PostingEntry {
  name?: string;
  groups?: Array<{
    group?: RotationGroup;
    groupId?: string;
    assigned?: Array<{ startDate: string; endDate: string }>;
  }>;
}

interface RotationSchedule {
  _id?: string;
  postings?: PostingEntry[];
}

interface ClassOption {
  _id: string;
  name: string;
  academicYearId?: string;
}

interface AcademicClockSummary {
  _id?: string;
  classId?: string;
  classLevel?: string | null;
  clockPhase?: string | null;
  clockStartDate?: string | null;
  phaseConfig?: Record<string, { name?: string; duration?: number; postingType?: string | null; postingId?: string | null } | null>;
}

const ROTATION_TYPES: RotationType[] = ["medicine", "surgery", "paediatrics", "obstetrics", "psychiatry", "community", "elective"];
const STATUS_COLORS: Record<RotationStatus, string> = {
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const samplePostingSchedule = {
  postingName: "Dummy Junior O&G & Paediatrics Posting",
  postingType: "Combined clinical posting",
  durationWeeks: 12,
  startDate: "2026-07-06T00:00:00.000Z",
  endDate: "2026-09-28T00:00:00.000Z",
  phases: ["Phase 1", "Phase 2"],
  departments: [
    {
      department: "Obstetrics & Gynaecology",
      departmentCode: "OG",
      rotationDurationWeeks: 6,
      activeUnits: [
        { id: "og-1", name: "Ward Unit" },
        { id: "og-2", name: "Labour Ward" },
      ],
      supervisors: [
        {
          unit: "Ward Unit",
          consultant: { _id: "sup-1", name: "Dr. A. Njeri", role: "Consultant", email: "anjeri@schooldash.org", department: "OG" },
          resident: { _id: "res-1", name: "Dr. M. Otieno", role: "Resident", department: "OG" },
        },
      ],
    },
    {
      department: "Paediatrics",
      departmentCode: "PED",
      rotationDurationWeeks: 6,
      activeUnits: [
        { id: "ped-1", name: "Children's Ward" },
        { id: "ped-2", name: "Neonatal Unit" },
      ],
      supervisors: [
        {
          unit: "Children's Ward",
          consultant: { _id: "sup-2", name: "Dr. S. Mwangi", role: "Consultant", email: "smwangi@schooldash.org", department: "PED" },
          resident: { _id: "res-2", name: "Dr. T. Kimani", role: "Resident", department: "PED" },
        },
      ],
    },
  ],
  studentCategories: [
    {
      category: "Junior O&G",
      studentCount: 8,
      departmentPhase1: "Obstetrics & Gynaecology",
      departmentPhase2: "Obstetrics & Gynaecology",
      students: [
        { _id: "st-1", name: "Alice Wanjiku" },
        { _id: "st-2", name: "Brian Oduor" },
      ],
    },
    {
      category: "Junior Paediatrics",
      studentCount: 8,
      departmentPhase1: "Paediatrics",
      departmentPhase2: "Paediatrics",
      students: [
        { _id: "st-3", name: "Cynthia Mugo" },
        { _id: "st-4", name: "Daniel Kiptoo" },
      ],
    },
  ],
  unitAssignments: [
    {
      department: "Obstetrics & Gynaecology",
      phase: "Phase 1",
      unit: "Ward Unit",
      unitId: "og-1",
      consultant: { _id: "sup-1", name: "Dr. A. Njeri", role: "Consultant", email: "anjeri@schooldash.org" },
      resident: { _id: "res-1", name: "Dr. M. Otieno", role: "Resident" },
      students: [
        { _id: "st-1", name: "Alice Wanjiku", idNumber: "2024001" },
        { _id: "st-2", name: "Brian Oduor", idNumber: "2024002" },
      ],
    },
    {
      department: "Paediatrics",
      phase: "Phase 1",
      unit: "Children's Ward",
      unitId: "ped-1",
      consultant: { _id: "sup-2", name: "Dr. S. Mwangi", role: "Consultant", email: "smwangi@schooldash.org" },
      resident: { _id: "res-2", name: "Dr. T. Kimani", role: "Resident" },
      students: [
        { _id: "st-3", name: "Cynthia Mugo", idNumber: "2024003" },
        { _id: "st-4", name: "Daniel Kiptoo", idNumber: "2024004" },
      ],
    },
  ],
  nestedSchedule: {
    phase1: {
      groupA: {
        posting: "Ward rotation",
        duration: 3,
        totalNumberofUnitsPerStudent: 2,
        units: {
          week1: {
            unit1: {
              name: "Ward Unit",
              unitId: "og-1",
              duration: 3,
              postingType: "Ward",
              students: [{ _id: "st-1", name: "Alice Wanjiku" }],
              supervisor: { _id: "sup-1", name: "Dr. A. Njeri", role: "Consultant" },
            },
          },
        },
      },
      groupB: {
        posting: "Clinic rotation",
        duration: 3,
        totalNumberofUnitsPerStudent: 2,
        units: {
          week1: {
            unit1: {
              name: "Children's Ward",
              unitId: "ped-1",
              duration: 3,
              postingType: "Ward",
              students: [{ _id: "st-3", name: "Cynthia Mugo" }],
              supervisor: { _id: "sup-2", name: "Dr. S. Mwangi", role: "Consultant" },
            },
          },
        },
      },
    },
    phase2: {
      groupA: {
        posting: "Labour ward",
        duration: 3,
        totalNumberofUnitsPerStudent: 2,
        units: {
          week1: {
            unit1: {
              name: "Labour Ward",
              unitId: "og-2",
              duration: 3,
              postingType: "Labour",
              students: [{ _id: "st-2", name: "Brian Oduor" }],
              supervisor: { _id: "sup-1", name: "Dr. A. Njeri", role: "Consultant" },
            },
          },
        },
      },
      groupB: {
        posting: "Neonatal unit",
        duration: 3,
        totalNumberofUnitsPerStudent: 2,
        units: {
          week1: {
            unit1: {
              name: "Neonatal Unit",
              unitId: "ped-2",
              duration: 3,
              postingType: "Neonatal",
              students: [{ _id: "st-4", name: "Daniel Kiptoo" }],
              supervisor: { _id: "sup-2", name: "Dr. S. Mwangi", role: "Consultant" },
            },
          },
        },
      },
    },
  },
  rotationHistory: [
    {
      student: { _id: "st-1", name: "Alice Wanjiku" },
      department: "Obstetrics & Gynaecology",
      phase: "Phase 1",
      blocks: [
        { unit: "Ward Unit", weeks: "1-3", startDate: "2026-07-06T00:00:00.000Z", endDate: "2026-07-24T00:00:00.000Z", completed: false, unitId: "og-1", consultant: { _id: "sup-1", name: "Dr. A. Njeri", role: "Consultant" }, resident: { _id: "res-1", name: "Dr. M. Otieno", role: "Resident" } },
      ],
    },
  ],
};

const buildOgPedsJuniorPostingSchedule = ({
  postingName,
  postingType,
  startDate,
  endDate,
  durationMonths,
  students,
}: {
  postingName: string;
  postingType: string;
  startDate?: string;
  endDate?: string;
  durationMonths: number;
  students?: Array<{ _id?: string; name?: string; idNumber?: string }>;
}) => {
  const fallbackStudents = Array.from({ length: 8 }, (_, index) => ({
    _id: `student-${index + 1}`,
    name: `Student ${index + 1}`,
    idNumber: `ST${String(index + 1).padStart(3, "0")}`,
  }));

  const normalizedStudents = (students && students.length > 0 ? students : fallbackStudents).map((student, index) => ({
    _id: student._id ?? `student-${index + 1}`,
    name: student.name ?? `Student ${index + 1}`,
    idNumber: student.idNumber ?? `ST${String(index + 1).padStart(3, "0")}`,
  }));

  const splitIndex = Math.max(1, Math.ceil(normalizedStudents.length / 2));
  const groupAStudents = normalizedStudents.slice(0, splitIndex);
  const groupBStudents = normalizedStudents.slice(splitIndex);
  const phaseDurationMonths = Math.max(1, Math.round((durationMonths || 4) / 2));
  const phaseDurationWeeks = phaseDurationMonths * 4;
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + phaseDurationMonths * 2 * 30 * 24 * 60 * 60 * 1000);

  const buildGroupUnits = (
    departmentName: string,
    departmentCode: string,
    unitNames: string[],
    groupStudents: Array<{ _id: string; name: string; idNumber: string }>,
    unitPrefix: string,
  ) => {
    const chunkSize = Math.max(1, Math.ceil(groupStudents.length / Math.max(1, unitNames.length)));
    return {
      units: {
        week1: Object.fromEntries(
          unitNames.map((unitName, index) => {
            const unitStudents = groupStudents.slice(index * chunkSize, (index + 1) * chunkSize);
            const unitId = `${unitPrefix.toLowerCase()}-${index + 1}`;
            return [unitId, {
              name: unitName,
              unitId,
              duration: phaseDurationWeeks,
              postingType: departmentName,
              students: unitStudents,
              supervisor: {
                _id: `${departmentCode.toLowerCase()}-${index + 1}`,
                name: `${departmentName} Supervisor`,
                role: "Consultant",
                department: departmentName,
              },
            }];
          }).filter(([, unit]) => (unit as { students: Array<{ _id: string; name: string; idNumber: string }> }).students.length > 0)
        ) as Record<string, any>,
      },
      unitAssignments: unitNames
        .map((unitName, index) => {
          const unitStudents = groupStudents.slice(index * chunkSize, (index + 1) * chunkSize);
          const unitId = `${unitPrefix.toLowerCase()}-${index + 1}`;
          if (!unitStudents.length) return null;
          return {
            department: departmentName,
            phase: "Phase 1",
            unit: unitName,
            unitId,
            consultant: {
              _id: `${departmentCode.toLowerCase()}-${index + 1}`,
              name: `${departmentName} Supervisor`,
              role: "Consultant",
              email: `${departmentCode.toLowerCase()}@schooldash.org`,
              department: departmentName,
            },
            resident: {
              _id: `${departmentCode.toLowerCase()}-resident-${index + 1}`,
              name: `${departmentName} Resident`,
              role: "Resident",
              department: departmentName,
            },
            students: unitStudents,
          };
        })
        .filter(Boolean),
    };
  };

  const ogPhase = buildGroupUnits("Obstetrics & Gynaecology", "OG", ["Ward Unit", "Labour Ward"], groupAStudents, "og");
  const pedPhase = buildGroupUnits("Paediatrics", "PED", ["Children's Ward", "Neonatal Unit"], groupBStudents, "ped");
  const swappedOgPhase = buildGroupUnits("Obstetrics & Gynaecology", "OG", ["Ward Unit", "Labour Ward"], groupBStudents, "og");
  const swappedPedPhase = buildGroupUnits("Paediatrics", "PED", ["Children's Ward", "Neonatal Unit"], groupAStudents, "ped");

  return {
    postingName,
    postingType,
    scheduleVariant: "junior",
    durationWeeks: phaseDurationWeeks * 2,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    phases: ["Phase 1", "Phase 2"],
    departments: [
      {
        department: "Obstetrics & Gynaecology",
        departmentCode: "OG",
        rotationDurationWeeks: phaseDurationWeeks,
        activeUnits: [
          { id: "og-1", name: "Ward Unit" },
          { id: "og-2", name: "Labour Ward" },
        ],
        supervisors: [
          { unit: "Ward Unit", consultant: { _id: "og-1", name: "OG Supervisor", role: "Consultant", department: "Obstetrics & Gynaecology" }, resident: { _id: "og-res-1", name: "OG Resident", role: "Resident", department: "Obstetrics & Gynaecology" } },
          { unit: "Labour Ward", consultant: { _id: "og-2", name: "OG Supervisor", role: "Consultant", department: "Obstetrics & Gynaecology" }, resident: { _id: "og-res-2", name: "OG Resident", role: "Resident", department: "Obstetrics & Gynaecology" } },
        ],
      },
      {
        department: "Paediatrics",
        departmentCode: "PED",
        rotationDurationWeeks: phaseDurationWeeks,
        activeUnits: [
          { id: "ped-1", name: "Children's Ward" },
          { id: "ped-2", name: "Neonatal Unit" },
        ],
        supervisors: [
          { unit: "Children's Ward", consultant: { _id: "ped-1", name: "Pediatrics Supervisor", role: "Consultant", department: "Paediatrics" }, resident: { _id: "ped-res-1", name: "Pediatrics Resident", role: "Resident", department: "Paediatrics" } },
          { unit: "Neonatal Unit", consultant: { _id: "ped-2", name: "Pediatrics Supervisor", role: "Consultant", department: "Paediatrics" }, resident: { _id: "ped-res-2", name: "Pediatrics Resident", role: "Resident", department: "Paediatrics" } },
        ],
      },
    ],
    studentCategories: [
      {
        category: "Group A",
        studentCount: groupAStudents.length,
        departmentPhase1: "Obstetrics & Gynaecology",
        departmentPhase2: "Paediatrics",
        students: groupAStudents,
      },
      {
        category: "Group B",
        studentCount: groupBStudents.length,
        departmentPhase1: "Paediatrics",
        departmentPhase2: "Obstetrics & Gynaecology",
        students: groupBStudents,
      },
    ],
    unitAssignments: [
      ...ogPhase.unitAssignments.map((assignment) => ({ ...assignment, phase: "Phase 1" })),
      ...pedPhase.unitAssignments.map((assignment) => ({ ...assignment, phase: "Phase 1" })),
      ...swappedPedPhase.unitAssignments.map((assignment) => ({ ...assignment, phase: "Phase 2" })),
      ...swappedOgPhase.unitAssignments.map((assignment) => ({ ...assignment, phase: "Phase 2" })),
    ],
    nestedSchedule: {
      phase1: {
        groupA: {
          posting: "Obstetrics & Gynaecology",
          duration: phaseDurationMonths,
          totalNumberofUnitsPerStudent: ogPhase.units.week1 ? Object.keys(ogPhase.units.week1).length : 2,
          units: ogPhase.units,
        },
        groupB: {
          posting: "Paediatrics",
          duration: phaseDurationMonths,
          totalNumberofUnitsPerStudent: pedPhase.units.week1 ? Object.keys(pedPhase.units.week1).length : 2,
          units: pedPhase.units,
        },
      },
      phase2: {
        groupA: {
          posting: "Paediatrics",
          duration: phaseDurationMonths,
          totalNumberofUnitsPerStudent: swappedPedPhase.units.week1 ? Object.keys(swappedPedPhase.units.week1).length : 2,
          units: swappedPedPhase.units,
        },
        groupB: {
          posting: "Obstetrics & Gynaecology",
          duration: phaseDurationMonths,
          totalNumberofUnitsPerStudent: swappedOgPhase.units.week1 ? Object.keys(swappedOgPhase.units.week1).length : 2,
          units: swappedOgPhase.units,
        },
      },
    },
    rotationHistory: [],
  };
};

const buildOgPedsSeniorPostingSchedule = ({
  postingName,
  postingType,
  startDate,
  endDate,
  durationMonths,
  students,
}: {
  postingName: string;
  postingType: string;
  startDate?: string;
  endDate?: string;
  durationMonths: number;
  students?: Array<{ _id?: string; name?: string; idNumber?: string }>;
}) => {
  const fallbackStudents = Array.from({ length: 8 }, (_, index) => ({
    _id: `student-${index + 1}`,
    name: `Student ${index + 1}`,
    idNumber: `ST${String(index + 1).padStart(3, "0")}`,
  }));

  const normalizedStudents = (students && students.length > 0 ? students : fallbackStudents).map((student, index) => ({
    _id: student._id ?? `student-${index + 1}`,
    name: student.name ?? `Student ${index + 1}`,
    idNumber: student.idNumber ?? `ST${String(index + 1).padStart(3, "0")}`,
  }));

  const splitIndex = Math.max(1, Math.ceil(normalizedStudents.length / 2));
  const groupAStudents = normalizedStudents.slice(0, splitIndex);
  const groupBStudents = normalizedStudents.slice(splitIndex);
  const phaseDurationMonths = Math.max(1, Math.round((durationMonths || 4) / 2));
  const phaseDurationWeeks = phaseDurationMonths * 4;
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + phaseDurationMonths * 2 * 30 * 24 * 60 * 60 * 1000);

  const buildGroupUnits = (
    departmentName: string,
    departmentCode: string,
    unitNames: string[],
    groupStudents: Array<{ _id: string; name: string; idNumber: string }>,
    unitPrefix: string,
  ) => {
    const chunkSize = Math.max(1, Math.ceil(groupStudents.length / Math.max(1, unitNames.length)));
    return {
      units: {
        week1: Object.fromEntries(
          unitNames.map((unitName, index) => {
            const unitStudents = groupStudents.slice(index * chunkSize, (index + 1) * chunkSize);
            const unitId = `${unitPrefix.toLowerCase()}-${index + 1}`;
            return [unitId, {
              name: unitName,
              unitId,
              duration: phaseDurationWeeks,
              postingType: departmentName,
              students: unitStudents,
              supervisor: {
                _id: `${departmentCode.toLowerCase()}-${index + 1}`,
                name: `${departmentName} Supervisor`,
                role: "Consultant",
                department: departmentName,
              },
            }];
          }).filter(([, unit]) => (unit as { students: Array<{ _id: string; name: string; idNumber: string }> }).students.length > 0)
        ) as Record<string, any>,
      },
      unitAssignments: unitNames
        .map((unitName, index) => {
          const unitStudents = groupStudents.slice(index * chunkSize, (index + 1) * chunkSize);
          const unitId = `${unitPrefix.toLowerCase()}-${index + 1}`;
          if (!unitStudents.length) return null;
          return {
            department: departmentName,
            phase: "Phase 1",
            unit: unitName,
            unitId,
            consultant: {
              _id: `${departmentCode.toLowerCase()}-${index + 1}`,
              name: `${departmentName} Supervisor`,
              role: "Consultant",
              email: `${departmentCode.toLowerCase()}@schooldash.org`,
              department: departmentName,
            },
            resident: {
              _id: `${departmentCode.toLowerCase()}-resident-${index + 1}`,
              name: `${departmentName} Resident`,
              role: "Resident",
              department: departmentName,
            },
            students: unitStudents,
          };
        })
        .filter(Boolean),
    };
  };

  const ogPhase = buildGroupUnits("Obstetrics & Gynaecology", "OG", ["Senior Ward Unit", "High Dependency Unit"], groupAStudents, "og");
  const pedPhase = buildGroupUnits("Paediatrics", "PED", ["Children's Ward", "PICU"], groupBStudents, "ped");
  const swappedOgPhase = buildGroupUnits("Obstetrics & Gynaecology", "OG", ["Senior Ward Unit", "High Dependency Unit"], groupBStudents, "og");
  const swappedPedPhase = buildGroupUnits("Paediatrics", "PED", ["Children's Ward", "PICU"], groupAStudents, "ped");

  return {
    postingName,
    postingType,
    scheduleVariant: "senior",
    durationWeeks: phaseDurationWeeks * 2,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    phases: ["Phase 1", "Phase 2"],
    departments: [
      {
        department: "Obstetrics & Gynaecology",
        departmentCode: "OG",
        rotationDurationWeeks: phaseDurationWeeks,
        activeUnits: [
          { id: "og-1", name: "Senior Ward Unit" },
          { id: "og-2", name: "High Dependency Unit" },
        ],
        supervisors: [
          { unit: "Senior Ward Unit", consultant: { _id: "og-1", name: "OG Supervisor", role: "Consultant", department: "Obstetrics & Gynaecology" }, resident: { _id: "og-res-1", name: "OG Resident", role: "Resident", department: "Obstetrics & Gynaecology" } },
          { unit: "High Dependency Unit", consultant: { _id: "og-2", name: "OG Supervisor", role: "Consultant", department: "Obstetrics & Gynaecology" }, resident: { _id: "og-res-2", name: "OG Resident", role: "Resident", department: "Obstetrics & Gynaecology" } },
        ],
      },
      {
        department: "Paediatrics",
        departmentCode: "PED",
        rotationDurationWeeks: phaseDurationWeeks,
        activeUnits: [
          { id: "ped-1", name: "Children's Ward" },
          { id: "ped-2", name: "PICU" },
        ],
        supervisors: [
          { unit: "Children's Ward", consultant: { _id: "ped-1", name: "Pediatrics Supervisor", role: "Consultant", department: "Paediatrics" }, resident: { _id: "ped-res-1", name: "Pediatrics Resident", role: "Resident", department: "Paediatrics" } },
          { unit: "PICU", consultant: { _id: "ped-2", name: "Pediatrics Supervisor", role: "Consultant", department: "Paediatrics" }, resident: { _id: "ped-res-2", name: "Pediatrics Resident", role: "Resident", department: "Paediatrics" } },
        ],
      },
    ],
    studentCategories: [
      {
        category: "Group A",
        studentCount: groupAStudents.length,
        departmentPhase1: "Obstetrics & Gynaecology",
        departmentPhase2: "Paediatrics",
        students: groupAStudents,
      },
      {
        category: "Group B",
        studentCount: groupBStudents.length,
        departmentPhase1: "Paediatrics",
        departmentPhase2: "Obstetrics & Gynaecology",
        students: groupBStudents,
      },
    ],
    unitAssignments: [
      ...ogPhase.unitAssignments.map((assignment) => ({ ...assignment, phase: "Phase 1" })),
      ...pedPhase.unitAssignments.map((assignment) => ({ ...assignment, phase: "Phase 1" })),
      ...swappedPedPhase.unitAssignments.map((assignment) => ({ ...assignment, phase: "Phase 2" })),
      ...swappedOgPhase.unitAssignments.map((assignment) => ({ ...assignment, phase: "Phase 2" })),
    ],
    nestedSchedule: {
      phase1: {
        groupA: {
          posting: "Obstetrics & Gynaecology",
          duration: phaseDurationMonths,
          totalNumberofUnitsPerStudent: ogPhase.units.week1 ? Object.keys(ogPhase.units.week1).length : 2,
          units: ogPhase.units,
        },
        groupB: {
          posting: "Paediatrics",
          duration: phaseDurationMonths,
          totalNumberofUnitsPerStudent: pedPhase.units.week1 ? Object.keys(pedPhase.units.week1).length : 2,
          units: pedPhase.units,
        },
      },
      phase2: {
        groupA: {
          posting: "Paediatrics",
          duration: phaseDurationMonths,
          totalNumberofUnitsPerStudent: swappedPedPhase.units.week1 ? Object.keys(swappedPedPhase.units.week1).length : 2,
          units: swappedPedPhase.units,
        },
        groupB: {
          posting: "Obstetrics & Gynaecology",
          duration: phaseDurationMonths,
          totalNumberofUnitsPerStudent: swappedOgPhase.units.week1 ? Object.keys(swappedOgPhase.units.week1).length : 2,
          units: swappedOgPhase.units,
        },
      },
    },
    rotationHistory: [],
  };
};

export default function ClinicalRotations() {
  const { user, year: currentYear } = useAuth();
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Array<{ _id: string; name: string; academicYearId?: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClock, setSelectedClock] = useState<AcademicClockSummary | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RotationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<RotationType | "all">("all");

  const [showForm, setShowForm] = useState(false);
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);
  const [selectedRotation, setSelectedRotation] = useState<Rotation | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [schedulePostings, setSchedulePostings] = useState<PostingEntry[]>([]);
  const [postingsLoading, setPostingsLoading] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<Array<{ _id?: string; name?: string; createdAt?: string }>>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [selectedRotationIds, setSelectedRotationIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [selectedClassStudents, setSelectedClassStudents] = useState<Array<{ _id?: string; name?: string; idNumber?: string }>>([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);

  const limit = 15;

  const authStudentClassId = (() => {
    if (user?.role !== "student") return undefined;
    if (user.studentClass && typeof user.studentClass === "object") return user.studentClass._id;
    if (typeof user.studentClasses === "string") return user.studentClasses;
    if (!Array.isArray(user?.studentClasses) && user?.studentClasses && typeof user?.studentClasses === "object") return (user.studentClasses as any)._id;
    return undefined;
  })();

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const { data } = await api.get("/classes?limit=200");
        const classList = Array.isArray(data) ? data : (data?.classes ?? data?.data ?? []);
        const mappedClasses = (classList as Array<{ _id?: string; name?: string; academicYear?: string | { _id?: string } }> || [])
          .filter((cls) => cls?._id)
          .map((cls) => ({
            _id: cls._id!,
            name: cls.name ?? "Untitled class",
            academicYearId: typeof cls.academicYear === "string" ? cls.academicYear : cls.academicYear?._id,
          }));

        setAvailableClasses(mappedClasses);
        if (!selectedClassId && (!user?.role || user.role !== "student" || !authStudentClassId) && mappedClasses[0]?._id) {
          setSelectedClassId(mappedClasses[0]._id);
        }
      } catch (error) {
        console.error("Failed to load classes", error);
      }
    };

    loadClasses();
  }, [authStudentClassId, selectedClassId, user?.role]);

  useEffect(() => {
    const selectedClass = availableClasses.find((cls) => cls._id === selectedClassId);
    const academicYearId = selectedClass?.academicYearId;

    if (!selectedClassId || !academicYearId) {
      setSelectedClock(null);
      return;
    }

    let isActive = true;

    const loadClock = async () => {
      setClockLoading(true);
      try {
        const { data } = await api.get(`/academic-clocks?academicYearId=${academicYearId}&classId=${selectedClassId}`);
        const clocks = Array.isArray(data) ? data : (data?.data ?? data?.clocks ?? data?.academicClocks ?? []);
        const clock = Array.isArray(clocks) ? clocks[0] ?? null : null;

        if (isActive) {
          setSelectedClock(clock as AcademicClockSummary | null);
        }
      } catch (error) {
        console.error("Failed to load academic clock", error);
        if (isActive) {
          setSelectedClock(null);
        }
      } finally {
        if (isActive) {
          setClockLoading(false);
        }
      }
    };

    loadClock();

    return () => {
      isActive = false;
    };
  }, [selectedClassId, currentYear?._id]);

  useEffect(() => {
    let isActive = true;

    const loadClassStudents = async () => {
      if (!selectedClassId) {
        setSelectedClassStudents([]);
        return;
      }

      setClassStudentsLoading(true);
      try {
        const { data } = await api.get(`/classes/${selectedClassId}/students`);
        const students = Array.isArray(data?.students) ? data.students : [];
        if (!isActive) return;
        setSelectedClassStudents(students.map((student: any) => ({
          _id: student._id,
          name: student.name,
          idNumber: student.idNumber,
        })));
      } catch (error) {
        console.error("Failed to load class students", error);
        if (isActive) {
          setSelectedClassStudents([]);
        }
      } finally {
        if (isActive) {
          setClassStudentsLoading(false);
        }
      }
    };

    void loadClassStudents();

    return () => {
      isActive = false;
    };
  }, [selectedClassId]);

  // Reset posting generation form when dialog opens/closes
  useEffect(() => {
    if (!showPostingGenerateDialog) {
      // Reset form when dialog closes
      setPostingGenerateName("");
      setPostingGenerateStartDate(new Date().toISOString().slice(0, 10));
      setPostingGenerateEndDate("");
      setSelectedDepartments({});
      setUnitsByDept({});
      setDepartmentDurationDays({});
      setUnitDurationDays({});
    }
  }, [showPostingGenerateDialog]);

  const fetchRotations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== "all" && { rotationStatus: statusFilter }),
        ...(typeFilter !== "all" && { rotationType: typeFilter }),
      });

      // If user is a parent, fetch their profile to get children's IDs
      let endpoint = `/clinical-rotations?${params}`;
      if (user?.role === "parent") {
        const { data: profileData } = await api.get("/users/profile");
        const parentUser = profileData.user;
          const childIds = (parentUser?.parentStudents ?? []).map((child: unknown) =>
            typeof child === "string" ? child : (child as { _id: string })._id
          );
        if (childIds.length > 0) {
          params.set("studentIds", childIds.join(","));
          endpoint = `/clinical-rotations?${params}`;
        }
      }

      const { data } = await api.get(endpoint);
      setRotations(data.rotations ?? []);
      setTotalPages(Math.ceil((data.total ?? 0) / limit));
    } catch (error) {
      console.error("Failed to load rotations", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, user]);

  // Disabled initial data fetch on page load.
  // useEffect(() => {
  //   void fetchRotations();
  // }, [fetchRotations]);

  // Disabled selection-reset effect on page load.
  // useEffect(() => {
  //   setSelectedRotationIds(new Set());
  // }, [search, statusFilter, typeFilter]);

  // Disabled generated schedule postings load on page load.
  // useEffect(() => {
  //   let cancelled = false;
  //   const load = async () => {
  //     try {
  //       setPostingsLoading(true);
  //       // load recent schedules (global) as a fallback
  //       const { data } = await api.get('/rotation-schedules', { params: { page: 1, limit: 50 } });
  //       const schedules = (data.schedules as RotationSchedule[]) || [];
  //       // flatten postings from schedules, keep unique by name
  //       const map = new Map<string, PostingEntry>();
  //       for (const s of schedules) {
  //         for (const p of s.postings || []) {
  //           if (!p || !p.name) continue;
  //           if (!map.has(p.name)) map.set(p.name, p);
  //         }
  //       }
  //       if (!cancelled) setSchedulePostings(Array.from(map.values()));
  //     } catch (e: unknown) {
  //       console.error('Failed to load schedule postings', e);
  //     } finally {
  //       if (!cancelled) setPostingsLoading(false);
  //     }
  //   };
  //   void load();
  //   return () => { cancelled = true; };
  // }, [user]);

  // Disabled saved schedules load on page load.
  // useEffect(() => {
  //   let cancelled = false;
  //   const load = async () => {
  //     try {
  //       setSchedulesLoading(true);
  //       const { data } = await api.get('/rotation-schedules', { params: { page: 1, limit: 200 } });
  //       if (cancelled) return;
  //       setSavedSchedules(data.schedules || []);
  //     } catch (e) {
  //       console.error('Failed to load saved schedules', e);
  //       setSavedSchedules([]);
  //     } finally {
  //       if (!cancelled) setSchedulesLoading(false);
  //     }
  //   };
  //   void load();
  //   return () => { cancelled = true; };
  // }, []);

  // For students, also load schedules scoped to their class(es) to show class schedule card
  const [classPostings, setClassPostings] = useState<PostingEntry[]>([]);
  const [selectedPostingSchedule, setSelectedPostingSchedule] = useState<any | null>(null);
  const [selectedPostingId, setSelectedPostingId] = useState<string>("");
  const [selectedSixthPostingId, setSelectedSixthPostingId] = useState<string>("");
  const [selectedFourthPostingId, setSelectedFourthPostingId] = useState<string>("");
  const [showPostingGenerateDialog, setShowPostingGenerateDialog] = useState(false);
  const [postingGenerateLevel, setPostingGenerateLevel] = useState<string>("");
  const [postingGenerateName, setPostingGenerateName] = useState<string>("");
  const [postingGenerateStartDate, setPostingGenerateStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [postingGenerateEndDate, setPostingGenerateEndDate] = useState<string>("");
  const [selectedDepartments, setSelectedDepartments] = useState<Record<string, boolean>>({});
  const [unitsByDept, setUnitsByDept] = useState<Record<string, string[]>>({});
  const [departmentDurationDays, setDepartmentDurationDays] = useState<Record<string, number>>({});
  const [unitDurationDays, setUnitDurationDays] = useState<Record<string, number>>({});
  const [showDeleteScheduleDialog, setShowDeleteScheduleDialog] = useState(false);
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  // Disabled student class schedule load on page load.
  // useEffect(() => {
  //   if (user?.role !== "student") return;
  //   let cancelled = false;
  //   const load = async () => {
  //     try {
  //       // attempt to derive class ids from user object; fallback to fetching profile if missing
  //       let rawStudentClasses = (user as any)?.studentClasses ?? (user as any)?.studentClass ?? [];
  //       if ((!rawStudentClasses || (Array.isArray(rawStudentClasses) && rawStudentClasses.length === 0)) ) {
  //         try {
  //           const { data: profileData } = await api.get('/users/profile');
  //           rawStudentClasses = profileData.user?.studentClasses ?? profileData.user?.studentClass ?? rawStudentClasses;
  //         } catch (pfErr) {
  //           // ignore profile fetch errors and continue with whatever we have
  //         }
  //       }
  //       const classIds = Array.isArray(rawStudentClasses)
  //         ? rawStudentClasses.map((c: any) => (typeof c === 'string' ? c : c._id))
  //         : rawStudentClasses
  //           ? [ (typeof rawStudentClasses === 'string' ? rawStudentClasses : rawStudentClasses._id) ]
  //           : [];

  //       const params: any = { page: 1, limit: 50 };
  //       if (classIds.length) params.classId = classIds[0];

  //       const { data } = await api.get('/rotation-schedules', { params });
  //       const schedules = (data.schedules as RotationSchedule[]) || [];
  //       const map = new Map<string, PostingEntry>();
  //       for (const s of schedules) {
  //         for (const p of s.postings || []) {
  //           if (!p || !p.name) continue;
  //           if (!map.has(p.name)) map.set(p.name, p);
  //         }
  //       }
  //       if (!cancelled) setClassPostings(Array.from(map.values()));
  //     } catch (e) {
  //       console.error('Failed to load class schedule postings', e);
  //     }
  //   };
  //   void load();
  //   return () => { cancelled = true; };
  // }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this clinical rotation?")) return;
    try {
      await api.delete(`/clinical-rotations/${id}`);
      setRotations((prev) => prev.filter((r) => r._id !== id));
    } catch (error) {
      console.error("Failed to delete rotation", error);
    }
  };

  const handleDeleteMultiple = async () => {
    if (!confirm(`Delete ${selectedRotationIds.size} rotation(s)? This action cannot be undone.`)) return;
    try {
      const ids = Array.from(selectedRotationIds);
      await Promise.all(ids.map((id) => api.delete(`/clinical-rotations/${id}`)));
      setRotations((prev) => prev.filter((r) => !selectedRotationIds.has(r._id)));
      setSelectedRotationIds(new Set());
      setShowDeleteConfirm(false);
      toast.success(`Deleted ${ids.length} rotation(s)`);
    } catch (error) {
      console.error("Failed to delete rotations", error);
      toast.error("Failed to delete some rotations");
    }
  };

  const toggleRotationSelect = (id: string) => {
    const newSelected = new Set(selectedRotationIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRotationIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRotationIds.size === rotations.length && rotations.length > 0) {
      setSelectedRotationIds(new Set());
    } else {
      setSelectedRotationIds(new Set(rotations.map((r) => r._id)));
    }
  };

  const handleDeleteAll = async () => {
    try {
      const ids = rotations.map((r) => r._id);
      await Promise.all(ids.map((id) => api.delete(`/clinical-rotations/${id}`)));
      setRotations([]);
      setSelectedRotationIds(new Set());
      setShowDeleteAllConfirm(false);
      toast.success(`Deleted ${ids.length} rotation(s)`);
    } catch (error) {
      console.error("Failed to delete all rotations", error);
      toast.error("Failed to delete all rotations");
    }
  };

  const openForm = (rotation?: Rotation) => {
    setEditingRotation(rotation ?? null);
    setShowForm(true);
  };

  const handleFormSubmit = async (payload: Record<string, unknown>) => {
    try {
      if (editingRotation) {
        const { data } = await api.put(`/clinical-rotations/${editingRotation._id}`, payload);
        setRotations((prev) => prev.map((r) => (r._id === editingRotation._id ? data : r)));
      } else {
        const { data } = await api.post("/clinical-rotations", payload);
        setRotations((prev) => [data, ...prev]);
      }
      setShowForm(false);
    } catch (error) {
      console.error("Failed to save rotation", error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedRotation || !noteText.trim()) return;
    try {
      const { data } = await api.post(`/clinical-rotations/${selectedRotation._id}/notes`, { note: noteText });
      setSelectedRotation(data);
      setRotations((prev) => prev.map((r) => (r._id === selectedRotation._id ? data : r)));
      setNoteText("");
      setShowNotesModal(false);
    } catch (error) {
      console.error("Failed to add note", error);
    }
  };

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isConsultant = user?.role === "unitconsultant";
  const isResident = user?.role === "unitresident";
  const canCreate = isAdmin || isTeacher || isConsultant || isResident;
  const canGenerateSchedule = isAdmin || isTeacher;

  const [showAvailableDialog, setShowAvailableDialog] = useState(false);
  const [availableRotations, setAvailableRotations] = useState<Rotation[]>([]);
  const [availableSearch, setAvailableSearch] = useState("");
  const [availableLoading, setAvailableLoading] = useState(false);
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [signupRotation, setSignupRotation] = useState<Rotation | null>(null);
  const [supervisors, setSupervisors] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");

  // Generate schedule dialog
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [genAcademicYears, setGenAcademicYears] = useState<Array<{ _id: string; name: string }>>([]);
  const [genClasses, setGenClasses] = useState<Array<{ _id: string; name: string }>>([]);
  const [genAcademicYearId, setGenAcademicYearId] = useState<string>("");
  const [genClassId, setGenClassId] = useState<string>("");
  const [genLevel, setGenLevel] = useState<number>(400);
  const [genPostingScheduleType, setGenPostingScheduleType] = useState<string>("");
  const [genStartDate, setGenStartDate] = useState<string>(new Date().toISOString().slice(0,10));

  const selectedGenClass = genClasses.find((c) => c._id === genClassId);
  const className = selectedGenClass?.name?.trim().toLowerCase() ?? "";

  const openGenerateDialog = async () => {
    setGenPostingScheduleType("");
    setShowGenerateDialog(true);
    try {
      const [{ data: years }, { data: classesRes }] = await Promise.all([
        api.get('/academic-years'),
        api.get('/classes?limit=200')
      ]);
      setGenAcademicYears(Array.isArray(years) ? years : (years?.years ?? []));
      setGenClasses(classesRes.classes ?? []);
    } catch (e: unknown) {
      console.error('Failed to load generation lists', e);
    }
  };

  const handlePostingGenerateSubmit = async () => {
    if (selectedPostingSchedule) {
      setSelectedPostingSchedule(null);
    }

    if (!selectedClassId || !selectedClass) {
      toast.error("Please select a class first");
      return;
    }

    // Validate at least one department is selected
    const selectedDeptIds = Object.keys(selectedDepartments).filter(d => selectedDepartments[d]);
    if (selectedDeptIds.length === 0) {
      toast.error("Please select at least one department");
      return;
    }

    try {
      const startDate = postingGenerateStartDate || new Date().toISOString().slice(0, 10);
      const endDate = postingGenerateEndDate || new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + Math.max(1, currentPhaseDuration || 2))).toISOString().slice(0, 10);
      const totalDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));

      // Build departments array from selected departments
      const departments = selectedDeptIds.map(deptId => ({
        departmentId: deptId,
        activeUnitIds: (unitsByDept[deptId] || []).filter(u => u.trim()).length > 0 ? (unitsByDept[deptId] || []).filter(u => u.trim()) : [`${deptId}-unit-1`],
        departmentDurationDays: Math.max(1, departmentDurationDays[deptId] || totalDays),
        unitDurationDays: Math.max(1, unitDurationDays[deptId] || 7),
      }));

      const payload = {
        class: selectedClassId,
        name: postingGenerateName.trim() || `${selectedClass.name} ${postingGenerateLevel?.toUpperCase() || "Level"} Posting`,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        generateWith: "krysta",
        krysta: true,
        departments,
      };

      const { data } = await api.post("/rotation-schedules", payload);

      if (data?._id) {
        // Store reference to the generated schedule
        setSelectedPostingSchedule({
          _id: data._id,
          postingName: data.name,
          postingType: "KRYSTA",
          timeline: data.meta?.timeline || [],
          supervisors: {},
        });
        userSelectedScheduleRef.current = true;
        setShowPostingGenerateDialog(false);
        toast.success(`Posting schedule generated: ${data.name}`);
        return;
      }

      toast.error("Failed to generate posting schedule");
    } catch (err: any) {
      console.error("Posting generation error:", err);
      toast.error(err?.response?.data?.message || "Failed to generate posting schedule");
    }
  };

  const confirmGenerate = async () => {
    try {
      const selectedClass = genClasses.find((c) => c._id === genClassId);
      const is500LevelClass = selectedClass?.name?.toLowerCase().includes('500') || genLevel === 500;
      if (is500LevelClass) {
        if (!genPostingScheduleType) {
          toast.error('Please select a posting schedule type for 500 Level classes.');
          return;
        }
        if (genPostingScheduleType === 'ogPedJunior') {
          const { data } = await api.post('/og-ped-rotations/oGPeds-JuniorPosting-Schedule', {
            classId: genClassId,
            postingName: '500 Level O&G/Pediatrics Junior Posting Schedule',
            postingStartDate: genStartDate,
          });
          if (data?.schedule) {
            savePersistedPostingSchedule(genClassId, genPostingScheduleType === 'ogPedJunior' ? 'og-ped-junior' : 'og-ped-senior', data.schedule);
            setSelectedPostingSchedule(data.schedule);
            userSelectedScheduleRef.current = true;
            if (data?.saved?._id) {
              setSavedSchedules((prev) => [data.saved, ...prev.filter((s) => s._id !== data.saved._id)]);
            }
            toast.success('500 Level posting schedule generated');
            setShowGenerateDialog(false);
            return;
          }
        }
      }

      // Default fallback for non-500 work (future schedule generation paths)
      await api.post('/rotation-schedules/generate', { academicYearId: genAcademicYearId, classId: genClassId, level: genLevel, options: { startDate: genStartDate } });
      toast.success('Rotation generation started');
      setShowGenerateDialog(false);
      startPollForSchedule(genAcademicYearId, genClassId, genLevel);
    } catch (e: unknown) {
      console.error('Failed to start generation', e);
      toast.error('Failed to start generation');
    }
  };

  const navigate = useNavigate();
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [groupsForRotation, setGroupsForRotation] = useState<Array<{ group?: RotationGroup; groupId?: string; assigned?: Array<{ startDate: string; endDate: string }> }> | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const userSelectedScheduleRef = useRef(false);

  const openGroupsForRotation = async (rot: Rotation) => {
    try {
      setGroupsLoading(true);
      // fetch recent schedules and try to find a posting that matches this rotation name
      const { data } = await api.get('/rotation-schedules', { params: { page: 1, limit: 200 } });
      const schedules = (data.schedules as RotationSchedule[]) || [];
      let found: RotationSchedule | null = null;
      for (const s of schedules) {
        const p = (s.postings || []).find((pp) => String(pp.name) === String(rot.rotationName));
        if (p) { found = s; break; }
      }
      if (!found) {
        toast.warning('No schedule postings found for this rotation');
        setGroupsForRotation(null);
        setShowGroupsModal(true);
        return;
      }
      const { data: detailData } = await api.get(`/rotation-schedules/${found._id}`);
      const detail = detailData as RotationSchedule;
      const posting = (detail.postings || []).find((pp) => String(pp.name) === String(rot.rotationName));
      if (!posting) {
        toast.warning('Posting not found in schedule');
        setGroupsForRotation(null);
        setShowGroupsModal(true);
        return;
      }
      // posting.groups: array of { group: RotationGroup, assigned }
      setGroupsForRotation(posting.groups || []);
      setShowGroupsModal(true);
    } catch (err: unknown) {
      console.error('Failed to load groups', err);
      toast.error('Failed to load groups for this rotation');
    } finally {
      setGroupsLoading(false);
    }
  };
  // tiny helper: poll backend for schedule for this class/year/level
  const startPollForSchedule = (ayId: string, classId: string, level: number) => {
    const maxMs = 60 * 1000; // poll up to 60s
    const start = Date.now();
    const iv = setInterval(async () => {
      try {
        const { data } = await api.get('/rotation-schedules', { params: { academicYearId: ayId, classId, level } });
        if (data && Array.isArray(data.schedules) && data.schedules.length > 0) {
          clearInterval(iv);
          const recent = data.schedules[0];
          navigate(`/rotation-schedules/${recent._id}`);
        } else if (Date.now() - start > maxMs) {
          clearInterval(iv);
          toast.warning('Schedule generation taking longer than expected. Refresh the Rotation Schedules page later.');
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);
  };

  const fetchAvailable = async (q = "") => {
    try {
      setAvailableLoading(true);
      const params: Record<string, string | number> = { page: 1, limit: 50 };
      if (q) params.q = q;

      // Students browse "available" postings (batch-visibility rules) and should see computed status.
      const { data } = await api.get("/clinical-rotations/available", { params: { ...params, page: 1, limit: 50 } });
      setAvailableRotations(data.rotations ?? []);
    } catch (e: unknown) {
      console.error("Failed to fetch available rotations", e);
      toast.error("Failed to fetch available postings");
    } finally {
      setAvailableLoading(false);
    }
  };

  // compute active/upcoming splits for student view
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);
  const activeRotations = rotations.filter((r) => {
    const start = new Date(r.rotationStartDate);
    const end = new Date(r.rotationEndDate);
    return !(end < now || start > nextMonth);
  });
  const upcomingRotations = rotations.filter((r) => new Date(r.rotationStartDate) > nextMonth);

  const openSignupDialog = async (rotation: Rotation) => {
    setSignupRotation(rotation);
    setShowSignupDialog(true);
    // fetch supervisors list (teachers/consultants)
    try {
      const { data } = await api.get('/users?role=teacher&limit=200');
      setSupervisors(data.users ?? []);
      // preselect rotation's current supervisor if present
      setSelectedSupervisor(rotation.rotationSupervisor?._id ?? "");
    } catch (e: unknown) {
      console.error('Failed to load supervisors', e);
      setSupervisors([]);
    }
  };

  // prepare rotations content to avoid nested JSX ternary parsing issues
  // prepare schedule postings view for students
  const postingViews = schedulePostings.map((p, idx) => {
    // determine posting start/end by scanning assigned entries across groups
    let startDate: string | null = null;
    let endDate: string | null = null;
    for (const g of p.groups || []) {
      for (const a of g.assigned || []) {
        const s = new Date(a.startDate);
        const e = new Date(a.endDate);
        if (!startDate || s < new Date(startDate)) startDate = a.startDate;
        if (!endDate || e > new Date(endDate)) endDate = a.endDate;
      }
    }
    const supervisorName = (p.groups && p.groups[0]?.group?.supervisorName) || p.groups?.[0]?.group?.supervisor?.name || "—";
    return {
      _id: `${p.name}-${idx}`,
      rotationName: p.name || "",
      rotationStartDate: startDate || new Date().toISOString(),
      rotationEndDate: endDate || new Date().toISOString(),
      rotationUnit: "—",
      rotationSupervisor: { _id: "", name: supervisorName },
      raw: p,
    } as Rotation & { raw?: PostingEntry };
  });

  // transform class-specific postings into view objects
  const classPostingViews = classPostings.map((p, idx) => {
    let startDate: string | null = null;
    let endDate: string | null = null;
    for (const g of p.groups || []) {
      for (const a of g.assigned || []) {
        const s = new Date(a.startDate);
        const e = new Date(a.endDate);
        if (!startDate || s < new Date(startDate)) startDate = a.startDate;
        if (!endDate || e > new Date(endDate)) endDate = a.endDate;
      }
    }
    const supervisorName = (p.groups && p.groups[0]?.group?.supervisorName) || p.groups?.[0]?.group?.supervisor?.name || "—";
    return {
      _id: `${p.name}-${idx}`,
      rotationName: p.name || "",
      rotationStartDate: startDate || new Date().toISOString(),
      rotationEndDate: endDate || new Date().toISOString(),
      rotationUnit: "—",
      rotationSupervisor: { _id: "", name: supervisorName },
      raw: p,
    } as Rotation & { raw?: PostingEntry };
  });

  const mapPostingEntryToSchedule = (p: PostingEntry) => {
    const groups = p.groups || [];
    let start: string | null = null;
    let end: string | null = null;
    for (const g of groups) {
      for (const a of g.assigned || []) {
        if (!start || new Date(a.startDate) < new Date(start)) start = a.startDate;
        if (!end || new Date(a.endDate) > new Date(end)) end = a.endDate;
      }
    }
    const studentCategories = groups.map((g: any, i: number) => ({
      category: g.group?.name || `Group ${i + 1}`,
      studentCount: (g.group?.students || []).length,
      departmentPhase1: g.group?.department || "OBG",
      departmentPhase2: g.group?.department || "Pediatrics",
      students: g.group?.students || [],
    }));

    const unitAssignments = groups.map((g: any, i: number) => ({
      department: g.group?.department || "General",
      phase: g.group?.phase || "Phase 1",
      unit: g.group?.name || `Group ${i + 1}`,
      unitId: g.groupId || `${i}`,
      consultant: { _id: null, name: "TBD - Assign Later", role: "supervisor" },
      resident: { _id: null, name: "TBD - Assign Later", role: "supervisor" },
      students: g.group?.students || [],
    }));

    return {
      postingName: p.name || "Posting",
      postingType: "OG_PEDS",
      durationWeeks: 16,
      startDate: start || new Date().toISOString(),
      endDate: end || new Date().toISOString(),
      phases: ["Phase 1", "Phase 2"],
      departments: [],
      studentCategories,
      unitAssignments,
      rotationHistory: [],
    };
  };

  const buildPostingCards = (postings: PostingEntry[]) => {
    if (!postings || postings.length === 0) return null;

    return (
      <div className="space-y-4 py-4">
        <h3 className="text-lg font-semibold">Clinical Posting Schedules</h3>
        {postings.map((posting, index) => {
          const groups = posting.groups || [];
          const start = groups.reduce<string | null>((current, entry) => {
            for (const assigned of entry.assigned || []) {
              if (!current || new Date(assigned.startDate) < new Date(current)) return assigned.startDate;
            }
            return current;
          }, null);
          const end = groups.reduce<string | null>((current, entry) => {
            for (const assigned of entry.assigned || []) {
              if (!current || new Date(assigned.endDate) > new Date(current)) return assigned.endDate;
            }
            return current;
          }, null);
          return (
            <div key={`${posting.name || 'clinical-posting'}-${index}`} className="border border-border bg-surface rounded-xl overflow-hidden">
                <div className="py-4 px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold">{posting.name || "Clinical Posting"}</h4>
                      <p className="text-sm text-muted-foreground">
                        {posting.name || "Clinical Posting"}
                        {start && end ? ` · ${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <Badge className="text-xs">{groups.length} Department Posting{groups.length !== 1 ? "s" : ""}</Badge>
                  </div>
                </div>
                <div className="space-y-4 px-5 pb-5">
                  <div className="grid gap-3 lg:grid-cols-2">
                  {groups.map((entry, groupIndex) => {
                    const group = entry.group || {};
                    const department = group.department || "General";
                    const phase = group.phase || "Phase 1";
                    const unit = group.name || `Unit ${groupIndex + 1}`;
                    const students = Array.isArray(group.students) ? group.students : [];
                    const assignedStart = entry.assigned?.[0]?.startDate ? new Date(entry.assigned[0].startDate).toLocaleDateString() : null;
                    const assignedEnd = entry.assigned?.[entry.assigned.length - 1]?.endDate ? new Date(entry.assigned[entry.assigned.length - 1].endDate).toLocaleDateString() : null;
                    const assignedRange = assignedStart && assignedEnd ? `${assignedStart} – ${assignedEnd}` : "TBA";
                    return (
                      <div key={`${posting.name || 'posting'}-group-${groupIndex}`} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">{department}</div>
                            <p className="text-xs text-muted-foreground">Phase: {phase}</p>
                            <p className="text-xs text-muted-foreground">Unit: {unit}</p>
                          </div>
                          <Badge className="text-xs">{students.length} student{students.length !== 1 ? "s" : ""}</Badge>
                        </div>
                        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                          <div>Rotation dates: {assignedRange}</div>
                          <div>Supervisor: {group.supervisor?.name || group.supervisorName || "TBD"}</div>
                        </div>
                        {students.length > 0 && (
                          <div className="mt-3 rounded-lg bg-background p-3 text-xs">
                            <div className="font-medium">Assigned Students</div>
                            <div className="mt-2 grid gap-2">
                              {students.map((student: any) => (
                                <div key={student?._id || student?.name || `${unit}-${groupIndex}`} className="rounded-md bg-slate-950/5 p-2">
                                  <div>{student.name || student}</div>
                                  {student.idNumber && <div className="text-[11px] text-muted-foreground">{student.idNumber}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                  </div>
            </div>
          );
        })}
      </div>
    );
  };



  const transformRotationPlanToPostingSchedule = (plan: any): any => {
    if (!plan) return null;
    const posting = (plan.postings && plan.postings[0]) || null;
    const startDate = posting?.startDate || (plan.createdAt) || new Date().toISOString();
    const endDate = posting?.endDate || new Date().toISOString();
    const normalizedNestedSchedule = plan?.phase1 || plan?.phase2
      ? {
          phase1: plan.phase1,
          phase2: plan.phase2,
        }
      : null;
    const unitAssignments = (posting?.groups || []).map((g: any, i: number) => ({
      department: g.group?.department || 'General',
      phase: g.group?.phase || 'Phase 1',
      unit: g.group?.name || `Unit ${i+1}`,
      unitId: g.groupId || `unit-${i}`,
      consultant: { _id: null, name: g.supervisorName || 'TBD - Assign Later', role: 'supervisor' },
      resident: { _id: null, name: g.supervisorName || 'TBD - Assign Later', role: 'supervisor' },
      students: (g.group?.students || []).map((s: any) => ({ _id: s._id || s, name: s.name || 'Student', idNumber: s.idNumber }))
    }));

    const studentCategories = [
      {
        category: posting?.name || plan.name || 'Generated Posting',
        studentCount: unitAssignments.reduce((sum: number, u: any) => sum + (u.students?.length || 0), 0),
        departmentPhase1: 'OBG',
        departmentPhase2: 'Pediatrics',
        students: unitAssignments.flatMap((u: any) => u.students).slice(0, 50),
      }
    ];

    return {
      postingName: posting?.name || plan.name || 'Posting',
      postingType: posting?.category || 'OG_PEDS',
      durationWeeks: 16,
      startDate,
      endDate,
      phases: ['Phase 1','Phase 2'],
      departments: [],
      studentCategories,
      unitAssignments,
      nestedSchedule: normalizedNestedSchedule,
      rotationHistory: [],
    };
  };

  const openSavedSchedule = async (id?: string) => {
    if (!id) return;
    try {
      const { data } = await api.get(`/rotation-schedules/${id}`);
      const schedule = transformRotationPlanToPostingSchedule(data);
      setSelectedPostingSchedule(schedule);
      userSelectedScheduleRef.current = true;
      scheduleRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      console.error('Failed to load schedule detail', e);
      toast.error('Failed to load schedule');
    }
  };

  const activeClassPostings = classPostingViews.filter((r) => {
    const start = new Date(r.rotationStartDate);
    const end = new Date(r.rotationEndDate);
    return start <= now && end >= now;
  });
  const upcomingClassPostings = classPostingViews.filter((r) => new Date(r.rotationStartDate) > now);

  // student's own rotations (persisted ClinicalRotation documents) that may have been created by the scheduler
  const personalActiveRotations = rotations.filter((r) => r.rotationStatus === "active");
  const personalUpcomingRotations = rotations.filter((r) => r.rotationStatus === "upcoming");

  const activePostings = postingViews.filter((r) => {
    const start = new Date(r.rotationStartDate);
    const end = new Date(r.rotationEndDate);
    return !(end < now || start > nextMonth);
  });
  const upcomingPostings = postingViews.filter((r) => new Date(r.rotationStartDate) > nextMonth);

  const uniqueSchedulePostings = (() => {
    const map = new Map<string, PostingEntry>();
    for (const posting of [...schedulePostings, ...classPostings]) {
      const key = posting.name || `posting-${Math.random()}`;
      if (!map.has(key)) map.set(key, posting);
    }
    return Array.from(map.values());
  })();

  const schedulePostingSection = buildPostingCards(uniqueSchedulePostings);

  // Component: render a student card with expandable list of rotations
  function StudentGroupCard({ g }: { g: { student: { _id?: string; name?: string; idNumber?: string }; rotations: Rotation[] } }) {
    const [open, setOpen] = useState(false);
    const student = g.student;
    const [postingGroups, setPostingGroups] = useState<Record<string, { groupName?: string; supervisorName?: string }>>({});
    const [loadingPostingGroups, setLoadingPostingGroups] = useState(false);
    useEffect(() => {
      let cancelled = false;
      const loadGroups = async () => {
        if (!open) return;
        setLoadingPostingGroups(true);
        try {
          // single call to fetch this student's assignments across schedules
          const { data } = await api.get('/rotation-schedules/student-assignments', { params: { studentId: student._id } });
          const map: Record<string, { groupName?: string; supervisorName?: string }> = {};
          const assignments = data?.assignments || {};
          for (const [postingName, info] of Object.entries(assignments)) {
            if (!info) continue;
            map[postingName] = { groupName: (info as any).groupName, supervisorName: (info as any).supervisorName };
          }
          if (!cancelled) setPostingGroups(map);
        } catch (e) {
          console.error('Failed to load student assignments', e);
        } finally {
          if (!cancelled) setLoadingPostingGroups(false);
        }
      };
      void loadGroups();
      return () => { cancelled = true; };
    }, [open]);
    // precompute sections JSX to avoid complex inline IIFE in JSX
    const sectionsJsx = (() => {
      const now = new Date();
      const byStatus: Record<string, Rotation[]> = { active: [], upcoming: [], completed: [] };
      for (const r of g.rotations) {
        const start = new Date(r.rotationStartDate);
        const end = new Date(r.rotationEndDate);
        const status = (start <= now && end >= now) ? 'active' : (start > now ? 'upcoming' : 'completed');
        byStatus[status].push(r);
      }
      const sections: Array<{ title: string; key: keyof typeof byStatus }> = [ { title: 'Active', key: 'active' }, { title: 'Upcoming', key: 'upcoming' }, { title: 'Completed', key: 'completed' } ];
      return sections.map((sec) => (
        <div key={sec.key} className="space-y-2">
          <div className="text-sm font-medium">{sec.title} ({byStatus[sec.key].length})</div>
          {byStatus[sec.key].length === 0 ? (
            <div className="text-xs text-muted-foreground">No {sec.title.toLowerCase()} rotations</div>
          ) : (
            byStatus[sec.key].map((rot) => {
              const pg = postingGroups[rot.rotationName] || {};
              return (
                <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between bg-white/5">
                  <div>
                    <p className="font-medium">{rot.rotationName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                    <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit} • Supervisor: {pg.supervisorName ?? rot.rotationSupervisor?.name ?? '—'}</p>
                    {pg.groupName && <p className="text-xs text-muted-foreground">Group: {pg.groupName}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Checkbox checked={selectedRotationIds.has(rot._id)} onCheckedChange={() => toggleRotationSelect(rot._id)} aria-label={`Select ${rot.rotationName}`} />
                    )}
                    <Badge className={`text-xs capitalize ${STATUS_COLORS[rot.rotationStatus]}`}>{rot.rotationStatus}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedRotation(rot); setShowNotesModal(true); }}>
                          View Notes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openGroupsForRotation(rot)}>
                          Groups
                        </DropdownMenuItem>
                        {(isAdmin || isTeacher || isConsultant || user?._id === rot.student?._id) && (
                          <>
                            <DropdownMenuItem onClick={() => openForm(rot)}>
                              <Pencil className="h-3 w-3 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(rot._id)} className="text-red-600">
                              <Trash2 className="h-3 w-3 mr-2" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ));
    })();

    return (
      <div className="border rounded-md p-4 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{student?.name || 'Unknown Student'}</div>
            <div className="text-xs text-muted-foreground">ID: {student?.idNumber || '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">{g.rotations.length} rotation{g.rotations.length !== 1 ? 's' : ''}</div>
            <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>{open ? 'Hide' : 'Show'}</Button>
          </div>
        </div>
        {open && (
          <div className="mt-3 space-y-3">
            {loadingPostingGroups && <div className="text-sm text-muted-foreground">Loading group assignments…</div>}
            {sectionsJsx}
          </div>
        )}
      </div>
    );
  }
  const studentRotationsElement = postingsLoading ? (
    <div className="p-4 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  ) : schedulePostings.length > 0 ? (
    <>
      <div>
        <h3 className="text-lg font-semibold">Active Rotations</h3>
        {activePostings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active rotations</p>
        ) : (
          <div className="grid gap-3">
              {/* Show student's personal active rotations first */}
              {personalActiveRotations.length > 0 ? personalActiveRotations.map((rot) => (
                <div key={`personal-${rot._id}`} className="border rounded-md p-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{rot.rotationName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                    <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit} • Supervisor: {rot.rotationSupervisor?.name ?? '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`text-xs capitalize ${STATUS_COLORS['active']}`}>active</Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                      <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                    </div>
                  </div>
                </div>
              )) : null}
              {activePostings.map((rot) => (
              <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit} • Supervisor: {rot.rotationSupervisor?.name ?? '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['active']}`}>active</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                    {rot.raw && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        setSelectedPostingSchedule(mapPostingEntryToSchedule(rot.raw));
                        userSelectedScheduleRef.current = true;
                        scheduleRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}>View Schedule</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">Upcoming Rotations</h3>
        {upcomingPostings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming rotations</p>
        ) : (
          <div className="grid gap-3">
            {/* Show student's personal upcoming rotations first */}
            {personalUpcomingRotations.length > 0 ? personalUpcomingRotations.map((rot) => (
              <div key={`personal-upcoming-${rot._id}`} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">Starts {format(new Date(rot.rotationStartDate), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['upcoming']}`}>upcoming</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                    {rot.raw && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        setSelectedPostingSchedule(mapPostingEntryToSchedule(rot.raw));
                        userSelectedScheduleRef.current = true;
                        scheduleRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}>View Schedule</Button>
                    )}
                  </div>
                </div>
              </div>
            )) : null}
            {upcomingPostings.map((rot) => (
              <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">Starts {format(new Date(rot.rotationStartDate), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['upcoming']}`}>upcoming</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                    {rot.raw && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        setSelectedPostingSchedule(mapPostingEntryToSchedule(rot.raw));
                        userSelectedScheduleRef.current = true;
                        scheduleRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}>View Schedule</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  ) : (
    <>
      <div>
        <h3 className="text-lg font-semibold">Active Rotations</h3>
        {activeRotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active rotations</p>
        ) : (
          <div className="grid gap-3">
            {activeRotations.map((rot) => (
              <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit} • Supervisor: {rot.rotationSupervisor?.name ?? '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['active']}`}>active</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">Upcoming Rotations</h3>
        {upcomingRotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming rotations</p>
        ) : (
          <div className="grid gap-3">
            {upcomingRotations.map((rot) => (
              <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium">{rot.rotationName}</p>
                  <p className="text-xs text-muted-foreground">Starts {format(new Date(rot.rotationStartDate), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">Unit: {rot.rotationUnit}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS['upcoming']}`}>upcoming</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                    <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
  const rotationsContent = loading ? (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  ) : (
    <div className="space-y-6">
      {schedulePostingSection}

      {rotations.length === 0 ? (
        schedulePostingSection ? null : (
          <div className="py-12 text-center text-muted-foreground">
            <Stethoscope className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No rotations found</p>
            <p className="text-xs mt-1">Create a new rotation to get started.</p>
          </div>
        )
      ) : user?.role === "student" ? (
        <div className="overflow-x-auto">
          <div className="p-4 border rounded-md bg-surface">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Class Rotation Schedule</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium">Active</h4>
                      {activeClassPostings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active rotations for your class.</p>
                      ) : (
                        <div className="space-y-3 mt-2">
                          {activeClassPostings.map((rot) => (
                            <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                              <div>
                                <p className="font-medium">{rot.rotationName}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(rot.rotationStartDate), 'MMM d')} – {format(new Date(rot.rotationEndDate), 'MMM d')}</p>
                                <p className="text-xs text-muted-foreground">Supervisor: {rot.rotationSupervisor?.name ?? '—'}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`text-xs capitalize ${STATUS_COLORS['active']}`}>active</Badge>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                                  <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-medium">Upcoming</h4>
                      {upcomingClassPostings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No upcoming rotations for your class.</p>
                      ) : (
                        <div className="space-y-3 mt-2">
                          {upcomingClassPostings.map((rot) => (
                            <div key={rot._id} className="border rounded-md p-3 flex items-start justify-between">
                              <div>
                                <p className="font-medium">{rot.rotationName}</p>
                                <p className="text-xs text-muted-foreground">Starts {format(new Date(rot.rotationStartDate), 'MMM d, yyyy')}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`text-xs capitalize ${STATUS_COLORS['upcoming']}`}>upcoming</Badge>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openGroupsForRotation(rot)}>Groups</Button>
                                  <Button size="sm" onClick={() => navigate(`/rotation-schedules?query=${encodeURIComponent(rot.rotationName)}`)}>View</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </div>
      ) : (
        <div className="space-y-4">
          {selectedRotationIds.size > 0 && isAdmin && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-sm font-medium">
                {selectedRotationIds.size} rotation{selectedRotationIds.size !== 1 ? 's' : ''} selected
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}

          {/* Build grouping */}
          {(() => {
            const groups = new Map<string, { student: { _id?: string; name?: string; idNumber?: string }; rotations: Rotation[] }>();
            for (const r of rotations) {
              const sid = r.student?._id || 'unknown';
              if (!groups.has(sid)) groups.set(sid, { student: { _id: r.student?._id, name: r.student?.name, idNumber: r.student?.idNumber }, rotations: [] });
              groups.get(sid)!.rotations.push(r);
            }
            const entries = Array.from(groups.entries());
            return entries.map(([sid, g]) => (
              <StudentGroupCard key={sid} g={g} />
            ));
          })()}
        </div>
      )}
    </div>
  );

  const confirmSignup = async () => {
    if (!signupRotation) return;
    try {
      const payload: Record<string, unknown> = {};
      if (selectedSupervisor) (payload as Record<string, unknown>).rotationSupervisor = selectedSupervisor;
      const { data } = await api.post(`/clinical-rotations/${signupRotation._id}/signup`, payload);
      toast.success('Signed up successfully');
      setAvailableRotations((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      setRotations((prev) => [data, ...prev]);
      setShowSignupDialog(false);
      setSignupRotation(null);
    } catch (e: unknown) {
      console.error('Signup failed', e);
      toast.error('Failed to sign up for rotation');
    }
  };

  // handleSignup is intentionally not used; prefer using signup dialog flows.

  const displayName = user?.name ?? (user as any)?.firstName ?? "User";
  const selectedClass = availableClasses.find((cls) => cls._id === selectedClassId) ?? null;
  const authStudentClass = (() => {
    if (user?.role !== "student") return null;
    if (user.studentClass && typeof user.studentClass === "object") return user.studentClass;
    if (typeof user.studentClasses === "string") {
      const matchById = availableClasses.find((cls) => cls._id === user.studentClasses);
      if (matchById) return matchById;
      const matchByName = availableClasses.find((cls) => cls.name === user.studentClasses);
      return matchByName ?? { _id: user.studentClasses, name: user.studentClasses } as any;
    }
    if (!Array.isArray(user?.studentClasses) && user?.studentClasses && typeof user?.studentClasses === "object") {
      return user.studentClasses as any;
    }
    return null;
  })();

  useEffect(() => {
    if (user?.role !== "student" || !authStudentClass?._id || selectedClassId) return;
    setSelectedClassId(authStudentClass._id);
  }, [user?.role, authStudentClass, selectedClassId]);

  const selectedClassPhasePlan = selectedClock?.classLevel
    ? getClassLevelPhasePlan(selectedClock.classLevel)
    : [];

  const getPostingOptionsForLevel = (level: string) => {
    if (selectedClock?.classLevel === level && selectedClock.phaseConfig) {
      return Object.entries(selectedClock.phaseConfig)
        .filter(([_, config]) => !!config?.name)
        .map(([id, config]) => ({
          id,
          label: `${config?.name ?? id}${config?.postingType ? ` (${config.postingType})` : ""}`.trim(),
        }));
    }
    return getClassLevelPhasePlan(level).map((phase) => ({
      id: phase.id,
      label: phase.name,
    }));
  };

  useEffect(() => {
    const sixthOptions = getPostingOptionsForLevel("sixth");
    const fourthOptions = getPostingOptionsForLevel("fourth");
    if (!selectedSixthPostingId && sixthOptions.length) setSelectedSixthPostingId(sixthOptions[0].id);
    if (!selectedFourthPostingId && fourthOptions.length) setSelectedFourthPostingId(fourthOptions[0].id);
  }, [selectedClock, selectedSixthPostingId, selectedFourthPostingId]);

  const postingOptions = selectedClock?.phaseConfig
    ? Object.entries(selectedClock.phaseConfig)
      .filter(([_, config]) => !!config?.name)
      .map(([id, config]) => ({
        id,
        label: `${config?.name ?? id}${config?.postingType ? ` (${config.postingType})` : ""}`.trim(),
      }))
    : selectedClassPhasePlan.map((phase) => ({
      id: phase.id,
      label: phase.name,
    })) ?? [];
  const isFiveHundredLevelClass = selectedClass?.name?.toLowerCase().includes("500") || selectedClass?.name?.toLowerCase().includes("fifth") || selectedClock?.classLevel === "fifth";
  const selectedPostingOption = postingOptions.find((option) => option.id === selectedPostingId) ?? null;
  const selectedPostingOptionId = selectedPostingOption?.id ?? "";
  const selectedPostingOptionLabel = selectedPostingOption?.label ?? "";
  const selectedSixthPostingOption = getPostingOptionsForLevel("sixth").find((option) => option.id === selectedSixthPostingId) ?? null;
  const selectedFourthPostingOption = getPostingOptionsForLevel("fourth").find((option) => option.id === selectedFourthPostingId) ?? null;
  const levelTokens = {
    fifth: ["500", "fifth"],
    sixth: ["600", "sixth"],
    fourth: ["400", "fourth"],
  } as const;
  const detectLevelFromName = (name?: string | null) => {
    if (!name) return null;
    const n = name.toLowerCase();
    if (levelTokens.fifth.some((t) => n.includes(t))) return "fifth";
    if (levelTokens.sixth.some((t) => n.includes(t))) return "sixth";
    if (levelTokens.fourth.some((t) => n.includes(t))) return "fourth";
    return null;
  };
  const currentSelectedLevel = detectLevelFromName(selectedClass?.name) ?? selectedClock?.classLevel ?? null;
  const supportsOgPedsJuniorPosting = currentSelectedLevel === "fifth";
  const supportsOgPedsSeniorPosting = currentSelectedLevel === "sixth";
  const currentPostingScheduleStorageKey = (() => {
    if (supportsOgPedsJuniorPosting) return "og-ped-junior";
    if (supportsOgPedsSeniorPosting) return "og-ped-senior";
    if (selectedPostingOption?.id) return selectedPostingOption.id;
    if (selectedSixthPostingOption?.id) return selectedSixthPostingOption.id;
    if (selectedFourthPostingOption?.id) return selectedFourthPostingOption.id;
    return "default";
  })();

  const availableLevels = {
    fifth: availableClasses.some((c) => c.name?.toLowerCase() && levelTokens.fifth.some((t) => c.name.toLowerCase().includes(t))),
    sixth: availableClasses.some((c) => c.name?.toLowerCase() && levelTokens.sixth.some((t) => c.name.toLowerCase().includes(t))),
    fourth: availableClasses.some((c) => c.name?.toLowerCase() && levelTokens.fourth.some((t) => c.name.toLowerCase().includes(t))),
  };
  const selectedGeneratePostingOption = postingGenerateLevel === "sixth"
    ? selectedSixthPostingOption
    : postingGenerateLevel === "fourth"
      ? selectedFourthPostingOption
      : selectedPostingOption;


  // Clear user-selected schedule lock whenever the posting selection changes
  useEffect(() => {
    userSelectedScheduleRef.current = false;
  }, [selectedPostingId, selectedSixthPostingId, selectedFourthPostingId]);

  useEffect(() => {
    if (!postingOptions.length) {
      setSelectedPostingId("");
      return;
    }
    if (!selectedPostingId || !postingOptions.some((option) => option.id === selectedPostingId)) {
      setSelectedPostingId(postingOptions[0].id);
    }
  }, [postingOptions, selectedPostingId]);

  useEffect(() => {
    if ((!supportsOgPedsJuniorPosting && !supportsOgPedsSeniorPosting) && !userSelectedScheduleRef.current) {
      setSelectedPostingSchedule(null);
    }
  }, [supportsOgPedsJuniorPosting, supportsOgPedsSeniorPosting]);

  useEffect(() => {
    if (!selectedClassId) {
      setSelectedPostingSchedule(null);
      userSelectedScheduleRef.current = false;
      return;
    }

    const persistedSchedule = loadPersistedPostingSchedule(selectedClassId, currentPostingScheduleStorageKey);
    if (persistedSchedule) {
      setSelectedPostingSchedule(persistedSchedule as any);
      userSelectedScheduleRef.current = true;
      return;
    }

    userSelectedScheduleRef.current = false;
    setSelectedPostingSchedule(null);
  }, [selectedClassId, currentPostingScheduleStorageKey]);

  const currentClockPhase = selectedClock
    ? selectedClock.clockPhase ?? (selectedClock.clockStartDate && selectedClassPhasePlan.length > 0
      ? getClockPhaseId(new Date(selectedClock.clockStartDate), new Date(), selectedClassPhasePlan)
      : null)
    : null;
  const currentPhaseConfig = selectedClock?.phaseConfig?.[currentClockPhase ?? ""] ?? null;
  const currentPhaseDefinition = currentClockPhase
    ? selectedClassPhasePlan.find((phase) => phase.id === currentClockPhase) ?? null
    : null;
  const currentPostingTitle = currentPhaseConfig?.name ?? currentPhaseDefinition?.name ?? (currentClockPhase ? `Phase ${currentClockPhase.replace("phase", "")}` : "No active posting");
  const currentPhaseDuration = currentPhaseConfig?.duration ?? currentPhaseDefinition?.durationMonths ?? 0;
  const postingComponents = currentPhaseDefinition?.subPostings ?? [];
  const currentPostingSubtitle = currentPhaseConfig?.postingType ?? currentPhaseDefinition?.subPostings?.join(", ") ?? "Clinical posting";
  const currentPhaseLabel = currentClockPhase ? currentClockPhase.replace("phase", "Phase ") : "No active phase";
  const isStudentView = user?.role === "student";
  const currentStudent = isStudentView
    ? selectedClassStudents.find((student) => {
        const authStudentId = (user as any)?._id ?? (user as any)?.id;
        return (
          student._id === authStudentId ||
          student.idNumber === (user as any)?.idNumber ||
          student.name === user?.name
        );
      }) ?? null
    : null;
  const studentPostingAssignment = (() => {
    if (!selectedPostingSchedule || !currentStudent || !selectedPostingSchedule.nestedSchedule) {
      return null;
    }

    const phaseKey = currentClockPhase === "phase2" ? "phase2" : "phase1";
    const phaseData = (selectedPostingSchedule.nestedSchedule as Record<string, any> | undefined)?.[phaseKey];
    if (!phaseData) {
      return null;
    }

    const match = Object.entries(phaseData).find(([, groupData]) => {
      const departmentStudents = Object.values((groupData?.units ?? {}) as Record<string, any>)
        .flatMap((unitMap: any) => Object.values(unitMap ?? {}).flatMap((unit: any) => unit.students ?? []));
      return departmentStudents.some((student: any) => {
        const studentId = student?._id;
        const studentNumber = student?.idNumber;
        return (
          studentId === currentStudent._id ||
          studentNumber === currentStudent.idNumber ||
          student.name === currentStudent.name
        );
      });
    });

    if (!match) {
      return null;
    }

    const [groupKey, groupData] = match;
    const departmentStudents = Object.values((groupData?.units ?? {}) as Record<string, any>)
      .flatMap((unitMap: any) => Object.values(unitMap ?? {}).flatMap((unit: any) => unit.students ?? []));

    return {
      phaseLabel: phaseKey === "phase2" ? "Phase 2" : "Phase 1",
      groupKey,
      posting: groupData.posting as string,
      departmentStudents,
    };
  })();
  const activePostingSchedule = {
    ...samplePostingSchedule,
    postingName: currentPostingTitle,
    postingType: currentPostingSubtitle,
    durationWeeks: currentPhaseDuration ? currentPhaseDuration * 4 : samplePostingSchedule.durationWeeks,
    phases: [currentPhaseLabel],
  };

  const allLevels: Array<{ level: string; title: string }> = [
    { level: "fifth", title: "500 Level" },
    { level: "sixth", title: "600 Level" },
    { level: "fourth", title: "400 Level" },
  ];
  const visibleLevels = allLevels.filter((l) => availableLevels[l.level as keyof typeof availableLevels] && currentSelectedLevel === l.level);
  const gridColsClass = visibleLevels.length === 1 ? "md:grid-cols-1" : visibleLevels.length === 2 ? "md:grid-cols-2" : "xl:grid-cols-3";

  if (isStudentView) {
    return (
      <div id="page-clinical-rotations" className="w-full max-w-full px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm">Student clinicals view</p>
                <h1 className="text-3xl font-semibold">Your current clinical posting</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-200">
                  Review your class academic clock, the active posting phase, and the department you are assigned to for the current posting schedule.
                </p>
              </div>
              <div className="w-full sm:w-72">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Class</p>
                  <p className="mt-2 text-lg font-semibold">
                    {selectedClass?.name ?? authStudentClass?.name ?? "Unassigned class"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Current posting</p>
              {clockLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">Loading posting data…</p>
              ) : (
                <>
                  <h2 className="mt-2 text-xl font-semibold">{currentPostingTitle}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {(selectedClass ?? authStudentClass)
                      ? `${(selectedClass ?? authStudentClass)?.name} • ${currentPhaseLabel}`
                      : "No class selected for this posting."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="bg-secondary text-secondary-foreground">{currentPhaseLabel}</Badge>
                    <Badge variant="outline">{currentPostingSubtitle}</Badge>
                  </div>
                </>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Your current posting (department)</p>
              {studentPostingAssignment ? (
                <>
                  <h2 className="mt-2 text-xl font-semibold">{studentPostingAssignment.posting}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {studentPostingAssignment.phaseLabel} • Group {studentPostingAssignment.groupKey === "groupA" ? "A" : "B"}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    This is your assigned department for the class’s active posting schedule.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-xl font-semibold">Posting assignment pending</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {currentStudent ? `No department assignment has been linked to ${currentStudent.name} yet.` : "Select a class and confirm your roster entry to view your posting group."}
                  </p>
                </>
              )}
            </div>
          </div>

          {selectedPostingSchedule && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current class posting schedule</p>
                  <h2 className="mt-1 text-xl font-semibold">{selectedPostingSchedule.postingName ?? "Saved posting schedule"}</h2>
                </div>
                <Badge className="bg-secondary text-secondary-foreground">Loaded from your class</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(Object.entries(selectedPostingSchedule.nestedSchedule ?? {}) as [string, any][]).map(([phaseKey, phaseData]) => (
                  <div key={phaseKey} className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold">{phaseKey === "phase1" ? "Phase 1" : "Phase 2"}</div>
                    <div className="mt-3 space-y-2">
                      {Object.entries(phaseData ?? {}).map(([groupKey, groupData]) => (
                        <div key={`${phaseKey}-${groupKey}`} className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">{groupKey === "groupA" ? "Group A" : "Group B"}</div>
                            <Badge variant="outline">{groupData.posting || "Department"}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {groupData.duration ? `${groupData.duration} month${groupData.duration === 1 ? "" : "s"}` : "Duration pending"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="page-clinical-rotations" className="w-full max-w-full px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm">Clinicals dashboard</p>
              <h1 className="text-3xl font-semibold">Welcome, {displayName} to the Clinicals Dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-200">
                A central place for clinical utilities, including rotation schedules, postings, and student workflow tools.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:w-56">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="border-white/20 bg-white/10 text-white placeholder:text-slate-300">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
                  View postings
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Open schedule
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Current posting</p>
            {clockLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">Loading posting data…</p>
            ) : (
              <>
                <h2 className="mt-2 text-xl font-semibold">{currentPostingTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedClass ? `${selectedClass.name} • ${currentPhaseLabel}` : "Select a class to view its current posting."}
                </p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Duration: {currentPhaseDuration} month{currentPhaseDuration === 1 ? "" : "s"}</p>
                  {postingComponents.length > 0 && (
                    <p>Components: {postingComponents.join(", ")}</p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Current phase</p>
            <h2 className="mt-2 text-xl font-semibold">{selectedClass ? selectedClass.name : "No class selected"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedClock ? `${currentPhaseLabel} • ${currentPostingSubtitle}` : "Class clock data will appear here once the selected class has a clock configured."}
            </p>
          </div>
        </div>

        

        <div className={`grid gap-4 ${visibleLevels.length ? gridColsClass : "md:grid-cols-1"}`}>
          {visibleLevels.map(({ level, title }) => {
            const options = getPostingOptionsForLevel(level);
            const isCurrentLevel = selectedClock?.classLevel === level;
            const selectedId = level === "fifth" ? selectedPostingId : level === "sixth" ? selectedSixthPostingId : selectedFourthPostingId;
            const setSelectedId = level === "fifth" ? setSelectedPostingId : level === "sixth" ? setSelectedSixthPostingId : setSelectedFourthPostingId;
            const selectedOption = level === "fifth" ? selectedPostingOption : level === "sixth" ? selectedSixthPostingOption : selectedFourthPostingOption;

            return (
              <div key={level} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-muted-foreground">{title} posting schedule</div>
                    <h2 className="mt-2 text-xl font-semibold">{selectedOption?.label ?? `${title} posting`}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isCurrentLevel && selectedClass ? selectedClass.name : `Review ${title} posting options`}
                    </p>
                  </div>
                  <Badge className="text-xs bg-secondary text-secondary-foreground">
                    {selectedOption ? "Draft" : "Pending"}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Select value={selectedId} onValueChange={setSelectedId} disabled={options.length === 0}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={options.length ? `Select ${title} posting` : "No postings available"} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full md:w-auto"
                    onClick={() => {
                      setPostingGenerateLevel(level);
                      setShowPostingGenerateDialog(true);
                    }}
                    disabled={options.length === 0 || !selectedId || (level === "fifth" && !supportsOgPedsJuniorPosting) || (level === "sixth" && !supportsOgPedsSeniorPosting)}
                  >
                    {level === "fifth" && !supportsOgPedsJuniorPosting
                      ? "Not configured"
                      : level === "sixth" && !supportsOgPedsSeniorPosting
                        ? "Not configured"
                        : "Generate posting"}
                  </Button>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {level === "fifth" && !supportsOgPedsJuniorPosting
                    ? "This class is not configured for the O&G/Pediatrics junior posting generator in its class clock data."
                    : level === "sixth" && !supportsOgPedsSeniorPosting
                      ? "This class is not configured for the O&G/Pediatrics senior posting generator in its class clock data."
                      : isCurrentLevel
                        ? level === "sixth"
                          ? "Generate and review the O&G/Pediatrics senior posting schedule for this class."
                          : "Generate and review the O&G/Pediatrics junior posting schedule for this class."
                        : `Preview posting flow for ${title} classes.`}
                </p>
              </div>
            );
          })}
        </div>

        {selectedPostingSchedule && (supportsOgPedsJuniorPosting || supportsOgPedsSeniorPosting) && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4 text-white shadow-sm" ref={scheduleRef}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedPostingSchedule?.scheduleVariant === "senior"
                    ? "Generated O&G/Pediatrics senior posting schedule"
                    : "Generated O&G/Pediatrics junior posting schedule"}
                </h3>
                <p className="text-sm text-slate-300">Departments are shown side by side for each phase.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-white/10 bg-white/10 text-white text-xs">Draft</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => setShowDeleteScheduleDialog(true)}
                >
                  Delete schedule
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Student roster source</p>
                    <p className="text-xs text-slate-300">
                      {classStudentsLoading
                        ? "Loading class students..."
                        : selectedClassStudents.length > 0
                          ? `${selectedClassStudents.length} students loaded from ${selectedClass?.name ?? "the selected class"}.`
                          : "Using fallback student roster because no class students were available."}
                    </p>
                  </div>
                  {selectedClassStudents.length > 0 && (
                    <Badge className="border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 text-xs">Class roster</Badge>
                  )}
                </div>
              </div>

              {(Object.entries(selectedPostingSchedule.nestedSchedule ?? {}) as [string, any][]).map(([phaseKey, phaseData]) => (
                <div key={phaseKey} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-white">{phaseKey === "phase1" ? "Phase 1" : "Phase 2"}</h4>
                      <p className="text-sm text-slate-300">
                        {phaseKey === "phase1" ? "First half of the posting" : "Second half with departments swapped"}
                      </p>
                    </div>
                    <Badge className="border border-white/10 bg-white/10 text-white text-xs">{Object.keys(phaseData ?? {}).length} departments</Badge>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {Object.entries(phaseData ?? {}).map(([groupKey, groupData]) => {
                      const departmentStudents = ((groupData?.units ?? {}) as Record<string, any>)
                        ? Object.values(groupData.units).flatMap((unitMap: any) => Object.values(unitMap ?? {}).flatMap((unit: any) => unit.students ?? []))
                        : [];
                      return (
                        <div key={groupKey} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-inner">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-white">{groupKey === "groupA" ? "Group A" : "Group B"}</p>
                              <p className="text-xs text-slate-400">{groupData.posting || "Department"}</p>
                            </div>
                            <Badge className="border border-white/10 bg-white/10 text-white text-xs">{departmentStudents.length} student{departmentStudents.length !== 1 ? "s" : ""}</Badge>
                          </div>
                          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-sm font-medium text-white">Department roster</p>
                              <p className="text-xs text-slate-400">{groupData.posting || "Department"}</p>
                            </div>
                            {departmentStudents.length > 0 ? (
                              <div className="grid gap-2 text-sm">
                                {departmentStudents.map((student: any) => (
                                  <div key={student?._id ?? student?.name ?? `${groupKey}-${student?.idNumber}`}
                                    className="rounded-lg border border-white/10 bg-white/10 p-2 text-slate-100"
                                  >
                                    <div>{student.name || "Unnamed student"}</div>
                                    {student.idNumber && <div className="text-[11px] text-slate-400">{student.idNumber}</div>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400">No students assigned.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Dialog open={showDeleteScheduleDialog} onOpenChange={setShowDeleteScheduleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete generated schedule?</DialogTitle>
              <DialogDescription>
                {selectedPostingSchedule?.scheduleVariant === "senior"
                  ? "This will remove the current O&G/Pediatrics senior posting preview from the page."
                  : "This will remove the current O&G/Pediatrics junior posting preview from the page."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteScheduleDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deletePersistedPostingSchedule(selectedClassId, currentPostingScheduleStorageKey);
                  setSelectedPostingSchedule(null);
                  userSelectedScheduleRef.current = false;
                  setShowDeleteScheduleDialog(false);
                  toast.success("Deleted generated schedule");
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPostingGenerateDialog} onOpenChange={setShowPostingGenerateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Posting Schedule</DialogTitle>
              <DialogDescription>
                Enter the required details to generate the selected posting for the chosen class.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {/* Basic Info Section */}
              <div>
                <label className="text-xs font-medium mb-1 block">Posting Name</label>
                <Input value={postingGenerateName} onChange={(e) => setPostingGenerateName(e.target.value)} placeholder="Enter posting name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Class</label>
                  <Input value={selectedClass?.name ?? ""} readOnly />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Posting Level</label>
                  <Input value={postingGenerateLevel === "fourth" ? "400 Level" : postingGenerateLevel ? `${postingGenerateLevel.toUpperCase()} Level` : "N/A"} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Start Date</label>
                  <Input type="date" value={postingGenerateStartDate} onChange={(e) => setPostingGenerateStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">End Date</label>
                  <Input type="date" value={postingGenerateEndDate} onChange={(e) => setPostingGenerateEndDate(e.target.value)} />
                </div>
              </div>

              {/* Department Selection Section */}
              <div className="border-t pt-4">
                <label className="text-xs font-medium mb-2 block">Select Departments</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                  {['Medicine', 'Surgery', 'Pediatrics', 'Obstetrics and Gynecology', 'Psychiatry', 'ENT', 'Radiology', 'Ophthalmology', 'Dermatology'].map(dept => (
                    <div key={dept} className="flex items-center gap-2">
                      <Checkbox
                        id={dept}
                        checked={selectedDepartments[dept] || false}
                        onCheckedChange={(checked) => {
                          const newSelected = { ...selectedDepartments, [dept]: !!checked };
                          setSelectedDepartments(newSelected);
                          // Initialize units and durations for new department
                          if (checked && !unitsByDept[dept]) {
                            setUnitsByDept(prev => ({ ...prev, [dept]: [`${dept}-Unit-1`] }));
                            setDepartmentDurationDays(prev => ({ ...prev, [dept]: 60 }));
                            setUnitDurationDays(prev => ({ ...prev, [dept]: 7 }));
                          }
                        }}
                      />
                      <label htmlFor={dept} className="text-sm font-medium cursor-pointer">{dept}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Configuration Section */}
              {Object.keys(selectedDepartments).filter(d => selectedDepartments[d]).map(dept => (
                <div key={dept} className="border rounded p-3 bg-muted/30">
                  <h4 className="text-sm font-semibold mb-3">{dept} Configuration</h4>
                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Active Units (comma-separated)</label>
                      <Input
                        value={(unitsByDept[dept] || []).join(', ')}
                        onChange={(e) => setUnitsByDept(prev => ({ ...prev, [dept]: e.target.value.split(',').map(u => u.trim()) }))}
                        placeholder={`e.g., ${dept}-Ward, ${dept}-ICU, ${dept}-OPD`}
                        className="text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Department Duration (days)</label>
                        <Input
                          type="number"
                          min="1"
                          value={departmentDurationDays[dept] || 60}
                          onChange={(e) => setDepartmentDurationDays(prev => ({ ...prev, [dept]: Math.max(1, parseInt(e.target.value) || 1) }))}
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Unit Duration (days)</label>
                        <Input
                          type="number"
                          min="1"
                          value={unitDurationDays[dept] || 7}
                          onChange={(e) => setUnitDurationDays(prev => ({ ...prev, [dept]: Math.max(1, parseInt(e.target.value) || 1) }))}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPostingGenerateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePostingGenerateSubmit}>
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function RotationForm({ rotation, onSubmit, onClose }: RotationFormProps) {
  const { year: currentYear } = useAuth();
  const [form, setForm] = useState({
    rotationName: rotation?.rotationName ?? "",
    rotationDescription: rotation?.rotationDescription ?? "",
    rotationType: rotation?.rotationType ?? "medicine",
    rotationStartDate: rotation?.rotationStartDate?.split("T")[0] ?? "",
    rotationEndDate: rotation?.rotationEndDate?.split("T")[0] ?? "",
    rotationUnit: rotation?.rotationUnit ?? "",
    rotationSupervisor: rotation?.rotationSupervisor?._id ?? "",
    rotationStatus: rotation?.rotationStatus ?? "upcoming",
    rotationNotes: rotation?.rotationNotes ?? "",
    rotationTutorialPersonal: rotation?.rotationTutorialPersonal ?? "",
    academicYear: rotation?.academicYear?._id ?? currentYear?._id ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [supervisors, setSupervisors] = useState<Array<{ _id: string; name: string }>>([]);
  const [academicYears, setAcademicYears] = useState<Array<{ _id: string; name: string }>>([]);

  useEffect(() => {
    api.get("/users?role=teacher&limit=100").then(({ data }) => {
      setSupervisors(data.users ?? []);
    });
    api.get("/academic-years").then(({ data }) => {
      const years = Array.isArray(data) ? data : (data?.years ?? []);
      setAcademicYears(years);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      ...form,
      rotationStartDate: new Date(form.rotationStartDate).toISOString(),
      rotationEndDate: new Date(form.rotationEndDate).toISOString(),
      academicYear: form.academicYear,
    });
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Rotation Name</label>
          <Input required placeholder="e.g., Internal Medicine Posting" value={form.rotationName} onChange={(e) => setForm({ ...form, rotationName: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Description</label>
          <Input placeholder="Brief description..." value={form.rotationDescription} onChange={(e) => setForm({ ...form, rotationDescription: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Type</label>
          <Select value={form.rotationType} onValueChange={(v) => setForm({ ...form, rotationType: v as RotationType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROTATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Unit</label>
          <Input required placeholder="e.g., Medicine" value={form.rotationUnit} onChange={(e) => setForm({ ...form, rotationUnit: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Start Date</label>
          <Input type="date" required value={form.rotationStartDate} onChange={(e) => setForm({ ...form, rotationStartDate: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">End Date</label>
          <Input type="date" required value={form.rotationEndDate} onChange={(e) => setForm({ ...form, rotationEndDate: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Supervisor / Consultant</label>
          <Select value={form.rotationSupervisor} onValueChange={(v) => setForm({ ...form, rotationSupervisor: v })}>
            <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
            <SelectContent>
              {supervisors.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Status</label>
          <Select value={form.rotationStatus} onValueChange={(v) => setForm({ ...form, rotationStatus: v as RotationStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Academic Year</label>
          <Select value={form.academicYear} onValueChange={(v) => setForm({ ...form, academicYear: v })}>
            <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => (
                <SelectItem key={y._id} value={y._id}>{y.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Personal Tutorial Note</label>
          <Input placeholder="Personal tutorial note..." value={form.rotationTutorialPersonal} onChange={(e) => setForm({ ...form, rotationTutorialPersonal: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : rotation ? "Update" : "Create"}</Button>
      </DialogFooter>
    </form>
  );
}
