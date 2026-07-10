import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import type { Language } from "@/lib/translations";

type StaffRole = "teacher" | "unitconsultant" | "unitresident";

type ClassDraft = {
  name: string;
  capacity: string;
};

type StaffDraft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: StaffRole;
  departmentName: string;
  unitName: string;
  idNumber: string;
};

type StudentDraft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  className: string;
  idNumber: string;
};

type InstitutionSearchSuggestion = {
  label: string;
  url?: string;
};

type SetupFormState = {
  institutionProfile: {
    name: string;
    shortName: string;
    type: string;
    country: string;
    state: string;
    city: string;
    academicCalendarType: string;
    timezone: string;
    logoUrl: string;
    backgroundImageUrl: string;
    facultiesInput: string;
  };
  academicStructure: {
    academicSession: string;
    academicYear: string;
    semesters: string[];
    classes: ClassDraft[];
  };
  attendanceConfiguration: {
    lectureAttendance: boolean;
    clinicalAttendance: boolean;
    seminarAttendance: boolean;
    minimumAttendancePercentage: number;
    gracePeriodMinutes: number;
    attendanceWindowMinutes: number;
  };
  assessmentConfiguration: {
    mcq: boolean;
    essay: boolean;
    osce: boolean;
    longCase: boolean;
    shortCase: boolean;
    continuousAssessment: boolean;
    passMark: number;
    gradingScale: string[];
  };
  brandingSettings: {
    primaryColor: string;
    accentColor: string;
  };
  administrator: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  applicationSettings: {
    defaultLanguage: string;
    timezone: string;
  };
  academicDepartmentsInput: string;
  clinicalDepartmentsInput: string;
  clinicalDepartmentUnits: Record<string, string[]>;
  staffUsers: StaffDraft[];
  students: StudentDraft[];
  studentBulkText: string;
};

const initialState: SetupFormState = {
  institutionProfile: {
    name: "",
    shortName: "",
    type: "",
    country: "",
    state: "",
    city: "",
    academicCalendarType: "",
    timezone: "",
    logoUrl: "",
    backgroundImageUrl: "",
    facultiesInput: "",
  },
  academicStructure: {
    academicSession: "",
    academicYear: "",
    semesters: [],
    classes: [{ name: "", capacity: "" }],
  },
  attendanceConfiguration: {
    lectureAttendance: true,
    clinicalAttendance: true,
    seminarAttendance: true,
    minimumAttendancePercentage: 75,
    gracePeriodMinutes: 15,
    attendanceWindowMinutes: 120,
  },
  assessmentConfiguration: {
    mcq: true,
    essay: true,
    osce: true,
    longCase: true,
    shortCase: true,
    continuousAssessment: true,
    passMark: 50,
    gradingScale: ["A", "B", "C", "D", "F"],
  },
  brandingSettings: {
    primaryColor: "#2563eb",
    accentColor: "#4f46e5",
  },
  administrator: {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  },
  applicationSettings: {
    defaultLanguage: "en",
    timezone: "",
  },
  academicDepartmentsInput: "",
  clinicalDepartmentsInput: "",
  clinicalDepartmentUnits: {},
  staffUsers: [
    {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "teacher",
      departmentName: "",
      unitName: "",
      idNumber: "",
    },
  ],
  students: [
    {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      className: "",
      idNumber: "",
    },
  ],
  studentBulkText: "",
};

const steps = [
  "Institution",
  "Academic Setup",
  "Attendance & Assessment",
  "Branding & Application",
  "Staff & Departments",
  "Students",
  "Review",
];

const departmentOptions = [
  "Medicine",
  "Pediatrics",
  "Obstetrics and Gynecology",
  "Surgery",
  "Psychiatry",
  "ENT",
  "Anaesthesiology",
  "Radiology",
  "Ophthalmology",
  "Dermatology",
  "Community Medicine",
  "Hematology and Blood Transfusion",
  "Microbiology",
  "Chemical Pathology",
  "Clinical Pharmacology and Therapeutics",
  "Anatomic Pathology",
  "Family Medicine",
  "Orthopaedics",
  "Forensic Medicine",
];

const facultyOptions = [
  "Clinical Sciences",
  "Dental Sciences",
  "Health Sciences",
  "Basic Medical Sciences",
  "Pharmacy",
  "Nursing",
  "Public Health",
  "Allied Health Sciences",
];

const departmentProgramOptions = [
  "MBBS",
  "BDS",
  "Nursing",
  "Pharmacy",
  "Medical Laboratory Science",
  "Physiotherapy",
  "Public Health",
  "Anatomy",
  "Physiology",
  "Biochemistry",
];

const departmentUnitTemplates: Record<string, string[]> = {
  Medicine: ["Internal Medicine", "Family Medicine", "Emergency Medicine", "Cardiology"],
  Pediatrics: ["Neonatal Unit", "Pediatric ICU", "Pediatric Emergency", "Child Wellness"],
  "Obstetrics and Gynecology": ["Labor Ward", "Antenatal Clinic", "Postnatal Care", "Gynecology Clinic"],
  Surgery: ["General Surgery", "Orthopedics", "Neurosurgery", "Trauma and Acute Care"],
  Psychiatry: ["Adult Psychiatry", "Child & Adolescent Psychiatry", "Consultation-Liaison", "Psychotherapy Unit"],
  ENT: ["Outpatient ENT", "Audiology", "Head and Neck Clinic"],
  Anaesthesiology: ["Pre-op Assessment", "Post-op Recovery", "Pain Management"],
  Radiology: ["X-ray", "Ultrasound", "CT Scan", "MRI"],
  Ophthalmology: ["Vision Screening", "Ophthalmic Surgery", "Optometry"],
  Dermatology: ["Skin Clinic", "Dermatosurgery", "Patch Testing"],
  "Community Medicine": ["Health Promotion", "Epidemiology", "Outreach Clinic"],
  Hematology: ["Blood Bank", "Coagulation Clinic", "Transfusion Service"],
  Microbiology: ["Diagnostic Microbiology", "Infection Control", "Culture Lab"],
  Pharmacy: ["Inpatient Pharmacy", "Outpatient Pharmacy", "Clinical Pharmacists"],
  "Medical Laboratory Science": ["Clinical Chemistry", "Haematology", "Microbiology Lab"],
  Physiotherapy: ["Rehabilitation", "Orthopaedic Therapy", "Sports Therapy"],
  "Public Health": ["Community Outreach", "Health Education", "Disease Surveillance"],
  Anatomy: ["Dissection Lab", "Histology", "Anatomy Teaching Suite"],
  Physiology: ["Exercise Physiology", "Cardiorespiratory Lab", "Neurophysiology"],
  Biochemistry: ["Clinical Biochemistry", "Toxicology", "Molecular Diagnostics"],
};

// Confetti pieces generated on completion screen

export default function InstitutionSetupWizard() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>("en");
  const { t } = useLanguage(language);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<SetupFormState>(initialState);
  const [departmentSelection, setDepartmentSelection] = useState("");
  const [manualDepartmentName, setManualDepartmentName] = useState("");
  const [facultySelection, setFacultySelection] = useState("");
  const [manualFacultyName, setManualFacultyName] = useState("");
  const [institutionDepartmentSelection, setInstitutionDepartmentSelection] = useState("");
  const [manualInstitutionDepartmentName, setManualInstitutionDepartmentName] = useState("");
  const [institutionSearchSuggestions, setInstitutionSearchSuggestions] = useState<InstitutionSearchSuggestion[]>([]);
  const [isSearchingInstitution, setIsSearchingInstitution] = useState(false);
  const [clinicalUnitInput, setClinicalUnitInput] = useState("");
  const [unitSelection, setUnitSelection] = useState("");
  const [selectedClinicalDepartmentTab, setSelectedClinicalDepartmentTab] = useState("");
  const studentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedStudentClass, setSelectedStudentClass] = useState("");
  const [showInstitutionSuggestions, setShowInstitutionSuggestions] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [stepAnimationClass, setStepAnimationClass] = useState("translate-x-0 opacity-100");

  useEffect(() => {
    const query = form.institutionProfile.name.trim();

    if (query.length < 3) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearchingInstitution(true);
        const response = await fetch(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({
          action: "opensearch",
          format: "json",
          origin: "*",
          search: `${query} institution`,
          limit: "6",
        })}`);
        const data = await response.json();
        const titles = Array.isArray(data?.[1]) ? data[1] : [];
        const suggestions: InstitutionSearchSuggestion[] = titles
          .filter((title: unknown): title is string => typeof title === "string" && title.trim().length > 0)
          .map((title: string) => ({ label: title.trim() }))
          .filter((suggestion: InstitutionSearchSuggestion) => suggestion.label.toLowerCase() !== query.toLowerCase())
          .slice(0, 6);

        setInstitutionSearchSuggestions(suggestions);
        setShowInstitutionSuggestions(suggestions.length > 0);
      } catch {
        setInstitutionSearchSuggestions([]);
        setShowInstitutionSuggestions(false);
      } finally {
        setIsSearchingInstitution(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [form.institutionProfile.name]);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await api.get("/setup/status");
        if (response.data?.configured) {
          navigate("/", { replace: true });
        }
      } catch {
        // ignore and continue
      }
    };

    void checkSetup();
  }, [navigate]);

  const academicDepartments = useMemo(() =>
    form.academicDepartmentsInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean), [form.academicDepartmentsInput]);

  const clinicalDepartments = useMemo(() =>
    form.clinicalDepartmentsInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean), [form.clinicalDepartmentsInput]);

  const availableClasses = useMemo(() =>
    form.academicStructure.classes
      .map((item) => item.name.trim())
      .filter(Boolean), [form.academicStructure.classes]);

  const faculties = useMemo(() =>
    form.institutionProfile.facultiesInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean), [form.institutionProfile.facultiesInput]);



  const progressSections = useMemo(() => {
    const institutionProgress = Math.round(([
      form.institutionProfile.name,
      form.institutionProfile.shortName,
      form.institutionProfile.type,
      form.institutionProfile.country,
      form.institutionProfile.state,
      form.institutionProfile.city,
      form.institutionProfile.academicCalendarType,
      form.institutionProfile.timezone,
      faculties.length > 0 ? "filled" : "",
      academicDepartments.length > 0 ? "filled" : "",
      form.administrator.firstName,
      form.administrator.lastName,
      form.administrator.email,
      form.administrator.password,
    ].filter((value) => value.trim()).length / 14) * 100);

    const academicProgress = Math.round(([
      form.academicStructure.academicSession,
      form.academicStructure.academicYear,
      form.academicStructure.semesters.length > 0 ? "filled" : "",
      form.academicStructure.classes.some((classItem) => classItem.name.trim() && classItem.capacity.trim()) ? "filled" : "",
    ].filter((value) => value.trim()).length / 4) * 100);

    const attendanceProgress = Math.round(([
      form.attendanceConfiguration.lectureAttendance ? "filled" : "",
      form.attendanceConfiguration.clinicalAttendance ? "filled" : "",
      form.attendanceConfiguration.seminarAttendance ? "filled" : "",
      form.assessmentConfiguration.passMark > 0 ? "filled" : "",
    ].filter((value) => value.trim()).length / 4) * 100);

    const brandingProgress = Math.round(([
      form.brandingSettings.primaryColor,
      form.brandingSettings.accentColor,
      form.applicationSettings.defaultLanguage,
      form.applicationSettings.timezone,
    ].filter((value) => value.trim()).length / 4) * 100);

    const departmentsProgress = Math.round(([
      clinicalDepartments.length > 0 ? "filled" : "",
      Object.values(form.clinicalDepartmentUnits).flat().length > 0 ? "filled" : "",
      form.staffUsers.some((person) => person.firstName.trim() && person.lastName.trim() && person.email.trim() && person.password.trim() && person.idNumber.trim() && person.departmentName.trim()) ? "filled" : "",
    ].filter((value) => value.trim()).length / 3) * 100);

    const studentsProgress = Math.round(([
      form.studentBulkText.trim() ? "filled" : "",
      form.students.some((person) => person.firstName.trim() && person.lastName.trim() && person.email.trim() && person.password.trim() && person.className.trim() && person.idNumber.trim()) ? "filled" : "",
    ].filter((value) => value.trim()).length / 2) * 100);

    return [
      {
        index: 0,
        title: "Institution",
        description: "Institution details, admin account, faculties, and programmes",
        progress: institutionProgress,
        complete: institutionProgress === 100,
      },
      {
        index: 1,
        title: "Academic Setup",
        description: "Academic session, semesters and classes",
        progress: academicProgress,
        complete: academicProgress === 100,
      },
      {
        index: 2,
        title: "Attendance & Assessment",
        description: "Attendance policy and grading configuration",
        progress: attendanceProgress,
        complete: attendanceProgress === 100,
      },
      {
        index: 3,
        title: "Branding & Application",
        description: "Branding colors and app-level preferences",
        progress: brandingProgress,
        complete: brandingProgress === 100,
      },
      {
        index: 4,
        title: "Staff & Departments",
        description: "Clinical departments, units, and staff accounts",
        progress: departmentsProgress,
        complete: departmentsProgress === 100,
      },
      {
        index: 5,
        title: "Students",
        description: "Student roster or bulk upload records",
        progress: studentsProgress,
        complete: studentsProgress === 100,
      },
    ];
  }, [academicDepartments, clinicalDepartments, faculties, form.academicStructure.academicSession, form.academicStructure.academicYear, form.academicStructure.classes, form.academicStructure.semesters.length, form.attendanceConfiguration.clinicalAttendance, form.attendanceConfiguration.lectureAttendance, form.attendanceConfiguration.seminarAttendance, form.assessmentConfiguration.passMark, form.brandingSettings.accentColor, form.brandingSettings.primaryColor, form.applicationSettings.defaultLanguage, form.applicationSettings.timezone, form.administrator.email, form.administrator.firstName, form.administrator.lastName, form.administrator.password, form.institutionProfile.academicCalendarType, form.institutionProfile.city, form.institutionProfile.country, form.institutionProfile.name, form.institutionProfile.shortName, form.institutionProfile.state, form.institutionProfile.timezone, form.institutionProfile.type, form.staffUsers, form.clinicalDepartmentUnits, form.studentBulkText, form.students]);

  const currentStepSummary = useMemo(() => {
    switch (step) {
      case 0:
        return [
          `Institution: ${form.institutionProfile.name || "Not set"}`,
          `Admin email: ${form.administrator.email || "Pending"}`,
          `Faculties: ${faculties.length}`,
          `Programmes: ${academicDepartments.length}`,
        ];
      case 1:
        return [
          `Academic session: ${form.academicStructure.academicSession || "Pending"}`,
          `Academic year: ${form.academicStructure.academicYear || "Pending"}`,
          `Semesters: ${form.academicStructure.semesters.length}`,
          `Classes: ${form.academicStructure.classes.filter((item) => item.name.trim()).length}`,
        ];
      case 2:
        return [
          `Lecture attendance: ${form.attendanceConfiguration.lectureAttendance ? "enabled" : "disabled"}`,
          `Clinical attendance: ${form.attendanceConfiguration.clinicalAttendance ? "enabled" : "disabled"}`,
          `Seminar attendance: ${form.attendanceConfiguration.seminarAttendance ? "enabled" : "disabled"}`,
          `Pass mark: ${form.assessmentConfiguration.passMark}%`,
        ];
      case 3:
        return [
          `Primary color: ${form.brandingSettings.primaryColor}`,
          `Accent color: ${form.brandingSettings.accentColor}`,
          `Language: ${form.applicationSettings.defaultLanguage}`,
          `Timezone: ${form.applicationSettings.timezone || "Pending"}`,
        ];
      case 4:
        return [
          `Clinical departments: ${clinicalDepartments.length}`,
          `Units defined: ${Object.values(form.clinicalDepartmentUnits).flat().length}`,
          `Staff entries: ${form.staffUsers.filter((person) => person.email.trim()).length}`,
        ];
      case 5:
        return [
          `Students ready: ${form.students.filter((person) => person.email.trim()).length}`,
          `Bulk upload: ${form.studentBulkText.trim() ? "Ready" : "None"}`,
          `Suggested class: ${selectedStudentClass || "Not selected"}`,
        ];
      default:
        return [
          "Review all entries before submission.",
          "Confirm departments, units, staff, students, and institution settings.",
        ];
    }
  }, [step, form, faculties.length, academicDepartments.length, clinicalDepartments.length, selectedStudentClass]);

  const updateInstitutionField = (field: keyof SetupFormState["institutionProfile"], value: string) => {
    setForm((prev) => ({
      ...prev,
      institutionProfile: {
        ...prev.institutionProfile,
        [field]: value,
      },
    }));
  };

  const handleInstitutionImageSelect = async (field: "logoUrl" | "backgroundImageUrl", event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDimension = 1400;
            const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));

            const context = canvas.getContext("2d");
            if (!context) {
              reject(new Error("Unable to prepare image preview."));
              return;
            }

            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
            resolve(canvas.toDataURL(outputType, 0.8));
          };
          image.onerror = () => reject(new Error("Unable to read image file."));
          image.src = typeof reader.result === "string" ? reader.result : "";
        };
        reader.onerror = () => reject(new Error("Unable to read image file."));
        reader.readAsDataURL(file);
      });

      updateInstitutionField(field, dataUrl);
    } catch {
      toast.error("We could not process that image. Please try another file.");
    }
  };

  const updateAcademicField = (field: keyof SetupFormState["academicStructure"], value: string | string[]) => {
    setForm((prev) => ({
      ...prev,
      academicStructure: {
        ...prev.academicStructure,
        [field]: value,
      },
    }));
  };

  const updateClass = (index: number, field: keyof ClassDraft, value: string) => {
    setForm((prev) => ({
      ...prev,
      academicStructure: {
        ...prev.academicStructure,
        classes: prev.academicStructure.classes.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const addClass = () => {
    setForm((prev) => ({
      ...prev,
      academicStructure: {
        ...prev.academicStructure,
        classes: [...prev.academicStructure.classes, { name: "", capacity: "" }],
      },
    }));
  };

  const updateSemesterCount = (count: number) => {
    const normalizedCount = Math.min(3, Math.max(1, count));
    const defaultSemesters = ["First Semester", "Second Semester", "Third Semester"].slice(0, normalizedCount);

    setForm((prev) => ({
      ...prev,
      academicStructure: {
        ...prev.academicStructure,
        semesters: defaultSemesters,
      },
    }));
  };

  const addFacultyToSelection = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const nextFaculties = Array.from(new Set([...faculties, trimmedName]));
    setForm((prev) => ({
      ...prev,
      institutionProfile: {
        ...prev.institutionProfile,
        facultiesInput: nextFaculties.join(", "),
      },
    }));
  };

  const addAcademicDepartmentToSelection = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const nextDepartments = Array.from(new Set([...academicDepartments, trimmedName]));
    setForm((prev) => ({ ...prev, academicDepartmentsInput: nextDepartments.join(", ") }));
  };

  const addClinicalDepartmentToSelection = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const nextDepartments = Array.from(new Set([...clinicalDepartments, trimmedName]));
    setForm((prev) => ({ ...prev, clinicalDepartmentsInput: nextDepartments.join(", ") }));
    setSelectedClinicalDepartmentTab(trimmedName);
  };

  const addClinicalUnitToDepartment = (department: string, unit: string) => {
    const trimmedUnit = unit.trim();
    if (!department || !trimmedUnit) return;

    setForm((prev) => {
      const existingUnits = prev.clinicalDepartmentUnits[department] ?? [];
      const nextUnits = Array.from(new Set([...existingUnits, trimmedUnit]));

      return {
        ...prev,
        clinicalDepartmentUnits: {
          ...prev.clinicalDepartmentUnits,
          [department]: nextUnits,
        },
      };
    });
    setClinicalUnitInput("");
  };

  const removeClinicalUnitFromDepartment = (department: string, unit: string) => {
    setForm((prev) => {
      const existingUnits = prev.clinicalDepartmentUnits[department] ?? [];
      const nextUnits = existingUnits.filter((item) => item !== unit);

      return {
        ...prev,
        clinicalDepartmentUnits: {
          ...prev.clinicalDepartmentUnits,
          [department]: nextUnits,
        },
      };
    });
  };

  const updateStaff = (index: number, field: keyof StaffDraft, value: string) => {
    setForm((prev) => ({
      ...prev,
      staffUsers: prev.staffUsers.map((person, personIndex) =>
        personIndex === index ? { ...person, [field]: value } : person
      ),
    }));
  };

  const addStaff = () => {
    setForm((prev) => ({
      ...prev,
      staffUsers: [
        ...prev.staffUsers,
        {
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          role: "teacher",
          departmentName: clinicalDepartments[0] || "",
          unitName: "",
          idNumber: "",
        },
      ],
    }));
  };

  const updateStudent = (index: number, field: keyof StudentDraft, value: string) => {
    setForm((prev) => ({
      ...prev,
      students: prev.students.map((person, personIndex) =>
        personIndex === index ? { ...person, [field]: value } : person
      ),
    }));
  };

  const addStudent = () => {
    setForm((prev) => ({
      ...prev,
      students: [
        ...prev.students,
        {
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          className: selectedStudentClass || prev.academicStructure.classes[0]?.name || "",
          idNumber: "",
        },
      ],
    }));
  };

  const parseBulkStudents = () => {
    const rows = form.studentBulkText
      .split(/\n+/)
      .map((row) => row.trim())
      .filter(Boolean);

    const parsed = rows.map((row) => {
      const [firstName, lastName, email, className, idNumber, password] = row.split(",");
      return {
        firstName: firstName?.trim() || "",
        lastName: lastName?.trim() || "",
        email: email?.trim() || "",
        password: password?.trim() || "password",
        className: className?.trim() || selectedStudentClass || form.academicStructure.classes[0]?.name || "500 Level",
        idNumber: idNumber?.trim() || "",
      } as StudentDraft;
    });

    setForm((prev) => ({ ...prev, students: parsed }));
    setStatus("Student roster parsed from the bulk upload text.");
  };

  const handleStudentBulkUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const parseStudentRows = (rows: string[][]) => {
      const hasHeaderRow = rows[0]?.some((cell) => /first|last|email|password|class|matric|id|number/.test(String(cell).toLowerCase()));
      const dataRows = hasHeaderRow ? rows.slice(1) : rows;

      return dataRows
        .map((row) => {
          const normalizedRow = row.map((value) => String(value ?? "").trim());
          const firstName = normalizedRow[0] || "";
          const lastName = normalizedRow[1] || "";
          const email = normalizedRow[2] || "";
          const className = normalizedRow[3] || "";
          const idNumber = normalizedRow[4] || "";
          const password = normalizedRow[5] || "password";

          return {
            firstName,
            lastName,
            email,
            password,
            className: className || selectedStudentClass || form.academicStructure.classes[0]?.name || "",
            idNumber: idNumber || "",
          } as StudentDraft;
        })
        .filter((person) => person.firstName || person.lastName || person.email || person.idNumber);
    };

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((row) => row.split(",").map((value) => value.trim()))
        .filter((row) => row.some((value) => value));
      const parsed = parseStudentRows(rows);
      setForm((prev) => ({ ...prev, students: parsed }));
      setStatus(`Imported ${parsed.length} student${parsed.length === 1 ? "" : "s"} from the CSV file.`);
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean | null | undefined>>;
    const parsed = parseStudentRows(rows.map((row) => row.map((value) => String(value ?? "").trim())));
    setForm((prev) => ({ ...prev, students: parsed }));
    setStatus(`Imported ${parsed.length} student${parsed.length === 1 ? "" : "s"} from the spreadsheet.`);
  };

  const handleStaffBulkUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((row) => row.split(",").map((value) => value.trim()))
        .filter((row) => row.some((value) => value));
      const parsed = parseStaffRows(rows);
      setForm((prev) => ({ ...prev, staffUsers: parsed }));
      setStatus(`Imported ${parsed.length} staff member${parsed.length === 1 ? "" : "s"} from the CSV file.`);
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean | null | undefined>>;
    const parsed = parseStaffRows(rows.map((row) => row.map((value) => String(value ?? "").trim())));
    setForm((prev) => ({ ...prev, staffUsers: parsed }));
    setStatus(`Imported ${parsed.length} staff member${parsed.length === 1 ? "" : "s"} from the spreadsheet.`);
  };

  const parseStaffRows = (rows: string[][]) => {
    const hasHeaderRow = rows[0]?.some((cell) => /first|last|email|id|password|role|department/.test(cell.toLowerCase()));
    const dataRows = hasHeaderRow ? rows.slice(1) : rows;

    return dataRows
      .map((row) => {
        const normalizedRow = row.map((value) => value.trim());
        const firstName = normalizedRow[0] || "";
        const lastName = normalizedRow[1] || "";
        const email = normalizedRow[2] || "";
        const idNumber = normalizedRow[3] || "";
        const password = normalizedRow[4] || "";
        const role = (normalizedRow[5] || "teacher") as StaffRole;
        const departmentName = normalizedRow[6] || clinicalDepartments[0] || "";

        return {
          firstName,
          lastName,
          email,
          password,
          role,
          departmentName,
          unitName: "",
          idNumber,
        } as StaffDraft;
      })
      .filter((person) => person.firstName || person.lastName || person.email || person.idNumber || person.departmentName);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus("Creating your institution, classes, users, and academic clocks...");

    try {
      const payload = {
        institutionProfile: {
          ...form.institutionProfile,
          academicDepartments: academicDepartments,
        },
        academicStructure: {
          ...form.academicStructure,
          semesters: form.academicStructure.semesters,
          classes: form.academicStructure.classes.filter((classItem) => classItem.name.trim()),
        },
        clinicalStructure: {
          defaultDepartments: clinicalDepartments,
          defaultUnits: Object.entries(form.clinicalDepartmentUnits).map(([department, units]) => ({ department, units })),
          defaultFaculties: faculties,
        },
        attendanceConfiguration: form.attendanceConfiguration,
        assessmentConfiguration: form.assessmentConfiguration,
        brandingSettings: form.brandingSettings,
        administrator: form.administrator,
        applicationSettings: form.applicationSettings,
        staffUsers: form.staffUsers.filter((person) => person.email.trim() || person.idNumber.trim()),
        students: form.students.filter((person) => person.email.trim()),
      };

      const response = await api.post("/setup", payload);
      if (response.status >= 200 && response.status < 300) {
        setStatus(null);
        setShowCompletion(true);
      }
    } catch (error: unknown) {
      console.error(error);
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setStatus(message || "The setup could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setStepAnimationClass("translate-x-full opacity-0");
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.requestAnimationFrame(() => setStepAnimationClass("translate-x-0 opacity-100"));
  };

  const prevStep = () => {
    setStepAnimationClass("-translate-x-full opacity-0");
    setStep((prev) => Math.max(prev - 1, 0));
    window.requestAnimationFrame(() => setStepAnimationClass("translate-x-0 opacity-100"));
  };

  // Calculate progress percentage
  const progressPercentage = ((step + 1) / steps.length) * 100;

  // Generate confetti data on mount
  const confettiPieces = useMemo(() => {
    return [...Array(50)].map((_, i) => ({
      left: (i * 2) % 100,
      duration: 2 + (i % 2),
      delay: (i % 5) * 0.1,
      emoji: i % 2 === 0 ? "🎉" : "✨",
    }));
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      {showCompletion && (
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-8 py-20">
          {/* Confetti animation */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {confettiPieces.map((piece, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${piece.left}%`,
                  top: "-10px",
                  animation: `fall ${piece.duration}s linear infinite`,
                  animationDelay: `${piece.delay}s`,
                }}
              >
                {piece.emoji}
              </div>
            ))}
          </div>
          
          <style>{`
            @keyframes fall {
              to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>

          <div className="relative z-10 text-center">
            <div className="mb-6 text-6xl">🎉</div>
            <h1 className="text-4xl font-bold mb-2">Institution Setup Complete!</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Welcome, {form.institutionProfile.name}! Your institution is all set up and ready to go.
            </p>
            
            <div className="rounded-lg border border-border/70 bg-muted/30 p-6 mb-8 text-left">
              <h2 className="font-semibold mb-4">What's next?</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Institution profile configured</li>
                <li>✓ Academic structure set up</li>
                <li>✓ Attendance and assessment policies configured</li>
                <li>✓ Branding customized</li>
                <li>✓ Staff and departments created</li>
                <li>✓ Student roster imported</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => navigate("/", { replace: true })}
                className="flex-1"
              >
                Go to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin", { replace: true })}
                className="flex-1"
              >
                Go to Admin Login
              </Button>
            </div>
          </div>
        </div>
      )}

      {!showCompletion && (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex w-full flex-col gap-3 rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Initial system setup wizard
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold">Configure your institution</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Create the institution profile, academic calendar, departments, staff, classes, student rosters, and academic clocks from a single guided flow.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
              <div className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                Step {step + 1} of {steps.length}: {steps[step]}
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/70">
                  {form.institutionProfile.logoUrl ? (
                    <img src={form.institutionProfile.logoUrl} alt="Institution logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Logo</span>
                  )}
                </div>
                <div className="min-w-[180px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Preview</p>
                  <p className="truncate text-sm font-semibold">
                    {form.institutionProfile.name || "Your institution"}
                  </p>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ 
                        width: `${progressPercentage}%`, 
                        background: `linear-gradient(90deg, ${form.brandingSettings.primaryColor}, ${form.brandingSettings.accentColor})`
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>{[t("step.0"), t("step.1"), t("step.2"), t("step.3"), t("step.4"), t("step.5"), t("step.6")][step]}</CardTitle>
              <CardDescription>
                {step === 0 && t("step.0.desc")}
                {step === 1 && t("step.1.desc")}
                {step === 2 && t("step.2.desc")}
                {step === 3 && t("step.3.desc")}
                {step === 4 && t("step.4.desc")}
                {step === 5 && t("step.5.desc")}
                {step === 6 && t("step.6.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className={`overflow-hidden transition-all duration-500 ease-out ${stepAnimationClass}`}>
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("label.institutionName")}</Label>
                    <div className="relative">
                      <Input
                        placeholder={t("placeholder.institutionName")}
                        value={form.institutionProfile.name}
                        onChange={(event) => {
                          updateInstitutionField("name", event.target.value);
                          setInstitutionSearchSuggestions([]);
                          setShowInstitutionSuggestions(false);
                        }}
                        onFocus={() => setShowInstitutionSuggestions(institutionSearchSuggestions.length > 0)}
                      />
                      {isSearchingInstitution && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          Searching…
                        </div>
                      )}
                      {showInstitutionSuggestions && institutionSearchSuggestions.length > 0 && (
                        <div className="absolute z-20 mt-2 w-full rounded-xl border border-border/70 bg-card/95 p-2 shadow-lg backdrop-blur">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Suggested institutions
                          </div>
                          <div className="space-y-1">
                            {institutionSearchSuggestions.map((suggestion) => (
                              <button
                                key={`${suggestion.label}-${suggestion.url || "search"}`}
                                type="button"
                                className="flex w-full items-start rounded-lg px-2 py-2 text-left text-sm transition hover:bg-muted/70"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  updateInstitutionField("name", suggestion.label);
                                  setShowInstitutionSuggestions(false);
                                }}
                              >
                                <span className="font-medium">{suggestion.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Type at least 3 characters and choose the best match from the web-backed suggestions.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.shortName")}</Label>
                    <Input placeholder={t("placeholder.shortName")} value={form.institutionProfile.shortName} onChange={(event) => updateInstitutionField("shortName", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.type")}</Label>
                    <Input placeholder={t("placeholder.type")} value={form.institutionProfile.type} onChange={(event) => updateInstitutionField("type", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.country")}</Label>
                    <Input placeholder={t("placeholder.country")} value={form.institutionProfile.country} onChange={(event) => updateInstitutionField("country", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.state")}</Label>
                    <Input placeholder={t("placeholder.state")} value={form.institutionProfile.state} onChange={(event) => updateInstitutionField("state", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.city")}</Label>
                    <Input placeholder={t("placeholder.city")} value={form.institutionProfile.city} onChange={(event) => updateInstitutionField("city", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.academicCalendar")}</Label>
                    <Input placeholder={t("placeholder.academicCalendar")} value={form.institutionProfile.academicCalendarType} onChange={(event) => updateInstitutionField("academicCalendarType", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.timezone")}</Label>
                    <Input placeholder={t("placeholder.timezone")} value={form.institutionProfile.timezone} onChange={(event) => updateInstitutionField("timezone", event.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("label.faculties")}</Label>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <Select
                        value={facultySelection}
                        onValueChange={(value) => {
                          addFacultyToSelection(value);
                          setFacultySelection("");
                        }}
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="Choose a faculty" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                          {facultyOptions.map((faculty) => (
                            <SelectItem key={faculty} value={faculty} className="rounded-lg">
                              {faculty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={() => {
                        addFacultyToSelection(manualFacultyName);
                        setManualFacultyName("");
                      }}>
                        Add faculty
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Or enter a faculty manually"
                        value={manualFacultyName}
                        onChange={(event) => setManualFacultyName(event.target.value)}
                      />
                      <Button type="button" variant="outline" onClick={() => {
                        addFacultyToSelection(manualFacultyName);
                        setManualFacultyName("");
                      }}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {faculties.length > 0 ? faculties.map((faculty) => (
                        <span key={faculty} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                          {faculty}
                        </span>
                      )) : (
                        <p className="text-sm text-muted-foreground">No faculty added yet.</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Academic departments / programmes</Label>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <Select
                        value={institutionDepartmentSelection}
                        onValueChange={(value) => {
                          addAcademicDepartmentToSelection(value);
                          setInstitutionDepartmentSelection("");
                        }}
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="Choose a department or programme" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                          {departmentProgramOptions.map((department) => (
                            <SelectItem key={department} value={department} className="rounded-lg">
                              {department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={() => {
                        addAcademicDepartmentToSelection(manualInstitutionDepartmentName);
                        setManualInstitutionDepartmentName("");
                      }}>
                        Add department
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Or enter a department or programme manually"
                        value={manualInstitutionDepartmentName}
                        onChange={(event) => setManualInstitutionDepartmentName(event.target.value)}
                      />
                      <Button type="button" variant="outline" onClick={() => {
                        addAcademicDepartmentToSelection(manualInstitutionDepartmentName);
                        setManualInstitutionDepartmentName("");
                      }}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {academicDepartments.length > 0 ? academicDepartments.map((department) => (
                        <span key={department} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                          {department}
                        </span>
                      )) : (
                        <p className="text-sm text-muted-foreground">No departments or programmes added yet.</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Administrator first name</Label>
                    <Input placeholder="Enter first name" value={form.administrator.firstName} onChange={(event) => setForm((prev) => ({ ...prev, administrator: { ...prev.administrator, firstName: event.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Administrator last name</Label>
                    <Input placeholder="Enter last name" value={form.administrator.lastName} onChange={(event) => setForm((prev) => ({ ...prev, administrator: { ...prev.administrator, lastName: event.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Administrator email</Label>
                    <Input type="email" placeholder="admin@example.com" value={form.administrator.email} onChange={(event) => setForm((prev) => ({ ...prev, administrator: { ...prev.administrator, email: event.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Administrator password</Label>
                    <Input type="password" placeholder="Create a password" value={form.administrator.password} onChange={(event) => setForm((prev) => ({ ...prev, administrator: { ...prev.administrator, password: event.target.value } }))} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Academic session</Label>
                      <Input placeholder="e.g. 2025/2026" value={form.academicStructure.academicSession} onChange={(event) => updateAcademicField("academicSession", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Academic year</Label>
                      <Input placeholder="e.g. 2025/2026" value={form.academicStructure.academicYear} onChange={(event) => updateAcademicField("academicYear", event.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Semesters per session</Label>
                    <Select
                      value={String(form.academicStructure.semesters.length || 1)}
                      onValueChange={(value) => updateSemesterCount(Number(value))}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select semester count" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                        <SelectItem value="1" className="rounded-lg">1 semester</SelectItem>
                        <SelectItem value="2" className="rounded-lg">2 semesters</SelectItem>
                        <SelectItem value="3" className="rounded-lg">3 semesters</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">The wizard will default the session to the selected number of semesters.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Classes</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addClass}>Add class</Button>
                    </div>
                    {form.academicStructure.classes.map((classItem, index) => (
                      <div key={`class-${index}`} className="grid gap-3 rounded-xl border border-border/70 p-3 md:grid-cols-[1.3fr_0.7fr]">
                        <div className="space-y-2">
                          <Label>Class name</Label>
                          <Input placeholder="e.g. 500 Level" value={classItem.name} onChange={(event) => updateClass(index, "name", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Capacity</Label>
                          <Input placeholder="e.g. 120" value={classItem.capacity} onChange={(event) => updateClass(index, "capacity", event.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="rounded-lg border border-border/70 p-4 bg-muted/30">
                    <h3 className="font-semibold mb-4">{t("section.attendanceSettings")}</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="lectureAttendance"
                          checked={form.attendanceConfiguration.lectureAttendance}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            attendanceConfiguration: {
                              ...prev.attendanceConfiguration,
                              lectureAttendance: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="lectureAttendance" className="font-normal cursor-pointer">{t("attendance.lectureAttendance")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="clinicalAttendance"
                          checked={form.attendanceConfiguration.clinicalAttendance}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            attendanceConfiguration: {
                              ...prev.attendanceConfiguration,
                              clinicalAttendance: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="clinicalAttendance" className="font-normal cursor-pointer">{t("attendance.clinicalAttendance")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="seminarAttendance"
                          checked={form.attendanceConfiguration.seminarAttendance}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            attendanceConfiguration: {
                              ...prev.attendanceConfiguration,
                              seminarAttendance: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="seminarAttendance" className="font-normal cursor-pointer">{t("attendance.seminarAttendance")}</Label>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3 mt-4">
                      <div className="space-y-2">
                        <Label>{t("attendance.minPercentage")}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            attendanceConfiguration: {
                              ...prev.attendanceConfiguration,
                              minimumAttendancePercentage: Number(e.target.value)
                            }
                          }))}
                          placeholder="75"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("attendance.gracePeriod")}</Label>
                        <Input
                          type="number"
                          min="0"
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            attendanceConfiguration: {
                              ...prev.attendanceConfiguration,
                              gracePeriodMinutes: Number(e.target.value)
                            }
                          }))}
                          placeholder="15"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("attendance.window")}</Label>
                        <Input
                          type="number"
                          min="0"
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            attendanceConfiguration: {
                              ...prev.attendanceConfiguration,
                              attendanceWindowMinutes: Number(e.target.value)
                            }
                          }))}
                          placeholder="120"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 p-4 bg-muted/30">
                    <h3 className="font-semibold mb-4">{t("section.assessmentSettings")}</h3>
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="mcq"
                          checked={form.assessmentConfiguration.mcq}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            assessmentConfiguration: {
                              ...prev.assessmentConfiguration,
                              mcq: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="mcq" className="font-normal cursor-pointer">{t("assessment.mcq")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="essay"
                          checked={form.assessmentConfiguration.essay}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            assessmentConfiguration: {
                              ...prev.assessmentConfiguration,
                              essay: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="essay" className="font-normal cursor-pointer">{t("assessment.essay")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="osce"
                          checked={form.assessmentConfiguration.osce}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            assessmentConfiguration: {
                              ...prev.assessmentConfiguration,
                              osce: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="osce" className="font-normal cursor-pointer">{t("assessment.osce")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="longCase"
                          checked={form.assessmentConfiguration.longCase}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            assessmentConfiguration: {
                              ...prev.assessmentConfiguration,
                              longCase: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="longCase" className="font-normal cursor-pointer">{t("assessment.longCase")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="shortCase"
                          checked={form.assessmentConfiguration.shortCase}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            assessmentConfiguration: {
                              ...prev.assessmentConfiguration,
                              shortCase: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="shortCase" className="font-normal cursor-pointer">{t("assessment.shortCase")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="continuousAssessment"
                          checked={form.assessmentConfiguration.continuousAssessment}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            assessmentConfiguration: {
                              ...prev.assessmentConfiguration,
                              continuousAssessment: e.target.checked
                            }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="continuousAssessment" className="font-normal cursor-pointer">{t("assessment.continuous")}</Label>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("assessment.passMark")}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            assessmentConfiguration: {
                              ...prev.assessmentConfiguration,
                              passMark: Number(e.target.value)
                            }
                          }))}
                          placeholder="50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("assessment.gradingScale")}</Label>
                        <Input
                          placeholder="e.g. A, B, C, D, F"
                          value={form.assessmentConfiguration.gradingScale?.join(", ") || ""}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            assessmentConfiguration: {
                              ...prev.assessmentConfiguration,
                              gradingScale: e.target.value.split(",").map(g => g.trim())
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="rounded-lg border border-border/70 p-4 bg-muted/30">
                    <h3 className="font-semibold mb-4">{t("section.brandingSettings")}</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("label.primaryColor")}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={form.brandingSettings.primaryColor}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              brandingSettings: {
                                ...prev.brandingSettings,
                                primaryColor: e.target.value
                              }
                            }))}
                            className="h-10 w-20"
                          />
                          <Input
                            type="text"
                            value={form.brandingSettings.primaryColor}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              brandingSettings: {
                                ...prev.brandingSettings,
                                primaryColor: e.target.value
                              }
                            }))}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("label.accentColor")}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={form.brandingSettings.accentColor}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              brandingSettings: {
                                ...prev.brandingSettings,
                                accentColor: e.target.value
                              }
                            }))}
                            className="h-10 w-20"
                          />
                          <Input
                            type="text"
                            value={form.brandingSettings.accentColor}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              brandingSettings: {
                                ...prev.brandingSettings,
                                accentColor: e.target.value
                              }
                            }))}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-lg border border-border/70 bg-background">
                      <p className="text-xs text-muted-foreground mb-2">{t("desc.preview")}</p>
                      <div className="flex gap-2">
                        <div 
                          className="h-10 w-20 rounded-lg border border-border/70" 
                          style={{backgroundColor: form.brandingSettings.primaryColor}}
                        />
                        <div 
                          className="h-10 w-20 rounded-lg border border-border/70" 
                          style={{backgroundColor: form.brandingSettings.accentColor}}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 p-4 bg-muted/30">
                    <h3 className="font-semibold mb-4">{t("section.applicationSettings")}</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("label.languages")}</Label>
                        <Select
                          value={form.applicationSettings.defaultLanguage}
                          onValueChange={(value) => {
                            setForm(prev => ({
                              ...prev,
                              applicationSettings: {
                                ...prev.applicationSettings,
                                defaultLanguage: value
                              }
                            }));
                            setLanguage(value as Language);
                          }}
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                            <SelectItem value="en" className="rounded-lg">English</SelectItem>
                            <SelectItem value="fr" className="rounded-lg">Français</SelectItem>
                            <SelectItem value="es" className="rounded-lg">Español</SelectItem>
                            <SelectItem value="yo" className="rounded-lg">Yorùbá</SelectItem>
                            <SelectItem value="ha" className="rounded-lg">Hausa</SelectItem>
                            <SelectItem value="ig" className="rounded-lg">Igbo</SelectItem>
                            <SelectItem value="de" className="rounded-lg">Deutsch</SelectItem>
                            <SelectItem value="ar" className="rounded-lg">العربية</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Select
                          value={form.applicationSettings.timezone}
                          onValueChange={(value) => setForm(prev => ({
                            ...prev,
                            applicationSettings: {
                              ...prev.applicationSettings,
                              timezone: value
                            }
                          }))}
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                            <SelectItem value="UTC" className="rounded-lg">UTC</SelectItem>
                            <SelectItem value="GMT" className="rounded-lg">GMT</SelectItem>
                            <SelectItem value="EST" className="rounded-lg">EST</SelectItem>
                            <SelectItem value="CST" className="rounded-lg">CST</SelectItem>
                            <SelectItem value="MST" className="rounded-lg">MST</SelectItem>
                            <SelectItem value="PST" className="rounded-lg">PST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 p-4 bg-muted/30">
                    <h3 className="font-semibold mb-4">{t("section.institutionAssets")}</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("label.logo")}</Label>
                        <label className="group flex h-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/40 text-center transition hover:border-primary hover:bg-muted/70">
                          <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleInstitutionImageSelect("logoUrl", event)} />
                          {form.institutionProfile.logoUrl ? (
                            <img src={form.institutionProfile.logoUrl} alt="Institution logo preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className="space-y-1 px-4">
                              <p className="text-sm font-medium text-foreground">{t("button.uploadLogo")}</p>
                              <p className="text-xs text-muted-foreground">Click to upload</p>
                            </div>
                          )}
                        </label>
                        <p className="text-xs text-muted-foreground">{t("desc.logoUpload")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("label.background")}</Label>
                        <label className="group flex h-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/40 text-center transition hover:border-primary hover:bg-muted/70">
                          <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleInstitutionImageSelect("backgroundImageUrl", event)} />
                          {form.institutionProfile.backgroundImageUrl ? (
                            <img src={form.institutionProfile.backgroundImageUrl} alt="Institution background preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className="space-y-1 px-4">
                              <p className="text-sm font-medium text-foreground">{t("button.uploadBackground")}</p>
                              <p className="text-xs text-muted-foreground">Click to upload</p>
                            </div>
                          )}
                        </label>
                        <p className="text-xs text-muted-foreground">{t("desc.backgroundUpload")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Clinical departments</Label>
                    <div className="grid gap-2">
                      <Select
                        value={departmentSelection}
                        onValueChange={(value) => {
                          addClinicalDepartmentToSelection(value);
                          setDepartmentSelection("");
                        }}
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="Choose a department" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                          {departmentOptions.map((department) => (
                            <SelectItem key={department} value={department} className="rounded-lg">
                              {department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Or enter a department manually"
                        value={manualDepartmentName}
                        onChange={(event) => setManualDepartmentName(event.target.value)}
                      />
                      <Button type="button" variant="outline" onClick={() => {
                        addClinicalDepartmentToSelection(manualDepartmentName);
                        setManualDepartmentName("");
                      }}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {clinicalDepartments.length > 0 ? clinicalDepartments.map((department) => (
                        <Button
                          key={department}
                          type="button"
                          variant={selectedClinicalDepartmentTab === department ? "secondary" : "outline"}
                          onClick={() => setSelectedClinicalDepartmentTab(department)}
                          className="rounded-full px-3 py-1 text-xs"
                        >
                          {department}
                        </Button>
                      )) : (
                        <p className="text-sm text-muted-foreground">No departments added yet.</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">These clinical departments are for staff assignments and hospital-academic roles.</p>
                  </div>

                  <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Label>Units for {selectedClinicalDepartmentTab || "selected department"}</Label>
                          <p className="text-sm text-muted-foreground">
                            Choose from the department templates or add a new unit for the selected department.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Select
                            value={unitSelection}
                            onValueChange={(value) => {
                              if (!selectedClinicalDepartmentTab) return;
                              addClinicalUnitToDepartment(selectedClinicalDepartmentTab, value);
                              setUnitSelection("");
                            }}
                            disabled={!selectedClinicalDepartmentTab || (departmentUnitTemplates[selectedClinicalDepartmentTab] ?? []).length === 0}
                          >
                            <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                              <SelectValue placeholder={selectedClinicalDepartmentTab ? "Select a template unit" : "Select a department first"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-72 rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                              {(departmentUnitTemplates[selectedClinicalDepartmentTab] ?? []).map((unit) => (
                                <SelectItem key={unit} value={unit} className="rounded-lg">
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (!selectedClinicalDepartmentTab) return;
                              addClinicalUnitToDepartment(selectedClinicalDepartmentTab, clinicalUnitInput);
                              setClinicalUnitInput("");
                            }}
                          >
                            Add unit
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <Input
                          placeholder="Enter a custom unit"
                          value={clinicalUnitInput}
                          onChange={(event) => setClinicalUnitInput(event.target.value)}
                        />
                        {selectedClinicalDepartmentTab && (departmentUnitTemplates[selectedClinicalDepartmentTab] ?? []).length > 0 && (
                          <p className="text-xs text-muted-foreground md:ml-2">
                            Template units available for {selectedClinicalDepartmentTab}.
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedClinicalDepartmentTab ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {(form.clinicalDepartmentUnits[selectedClinicalDepartmentTab] ?? []).map((unit) => (
                            <span key={unit} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
                              {unit}
                              <button
                                type="button"
                                className="rounded-full border border-border/70 px-1 text-xs text-muted-foreground transition hover:bg-destructive/10"
                                onClick={() => removeClinicalUnitFromDepartment(selectedClinicalDepartmentTab, unit)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        {(form.clinicalDepartmentUnits[selectedClinicalDepartmentTab] ?? []).length === 0 && (
                          <p className="text-sm text-muted-foreground">No units added for this department yet.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select a department tab to add or manage units.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Staff users</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addStaff}>Add staff</Button>
                    </div>
                    <div className="space-y-2 rounded-xl border border-dashed border-border/70 p-3">
                      <Label>Bulk upload staff</Label>
                      <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleStaffBulkUpload} />
                      <p className="text-xs text-muted-foreground">Upload a CSV or Excel file with columns such as firstName, lastName, email, idNumber, password, role, department.</p>
                    </div>
                    {form.staffUsers.map((person, index) => (
                      <div key={`staff-${index}`} className="grid gap-3 rounded-xl border border-border/70 p-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>First name</Label>
                          <Input placeholder="Enter first name" value={person.firstName} onChange={(event) => updateStaff(index, "firstName", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Last name</Label>
                          <Input placeholder="Enter last name" value={person.lastName} onChange={(event) => updateStaff(index, "lastName", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" placeholder="staff@example.com" value={person.email} onChange={(event) => updateStaff(index, "email", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input type="password" placeholder="Create a password" value={person.password} onChange={(event) => updateStaff(index, "password", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Staff ID / File number</Label>
                          <Input placeholder="Enter staff ID or file number" value={person.idNumber} onChange={(event) => updateStaff(index, "idNumber", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={person.role} onValueChange={(value) => updateStaff(index, "role", value as StaffRole)}>
                            <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                              <SelectItem value="teacher" className="rounded-lg">Teacher</SelectItem>
                              <SelectItem value="unitconsultant" className="rounded-lg">Unit consultant</SelectItem>
                              <SelectItem value="unitresident" className="rounded-lg">Unit resident</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Department</Label>
                          <Input placeholder="e.g. Medicine" value={person.departmentName} onChange={(event) => updateStaff(index, "departmentName", event.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Unit (optional)</Label>
                          <Input placeholder="Enter unit" value={person.unitName} onChange={(event) => updateStaff(index, "unitName", event.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/80 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Selected class for students</Label>
                        <Select value={selectedStudentClass} onValueChange={setSelectedStudentClass}>
                          <SelectTrigger className="h-10 w-full rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Choose a class" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-border/70 bg-card/80 p-1 shadow-lg backdrop-blur-xl">
                            {availableClasses.length > 0 ? availableClasses.map((className) => (
                              <SelectItem key={className} value={className} className="rounded-lg">
                                {className}
                              </SelectItem>
                            )) : (
                              <SelectItem value="" className="rounded-lg">No classes defined yet</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Bulk upload students</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" onClick={() => studentFileInputRef.current?.click()}>
                            Upload student file
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={parseBulkStudents}>
                            Parse bulk roster text
                          </Button>
                        </div>
                        <input
                          ref={studentFileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={handleStudentBulkUpload}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a student spreadsheet or CSV and assign missing records to the selected class. You can also add students manually one after the other below.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bulk student upload</Label>
                    <Textarea value={form.studentBulkText} onChange={(event) => setForm((prev) => ({ ...prev, studentBulkText: event.target.value }))} placeholder="First Name,Last Name,Email,Class,MatricNumber,Password" />
                    <Button type="button" variant="outline" size="sm" onClick={parseBulkStudents}>Parse bulk roster</Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Student roster</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addStudent}>Add student</Button>
                    </div>
                    {form.students.map((person, index) => (
                      <div key={`student-${index}`} className="grid gap-3 rounded-xl border border-border/70 p-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>First name</Label>
                          <Input placeholder="Enter first name" value={person.firstName} onChange={(event) => updateStudent(index, "firstName", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Last name</Label>
                          <Input placeholder="Enter last name" value={person.lastName} onChange={(event) => updateStudent(index, "lastName", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" placeholder="student@example.com" value={person.email} onChange={(event) => updateStudent(index, "email", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input type="password" placeholder="Create a password" value={person.password} onChange={(event) => updateStudent(index, "password", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Class</Label>
                          <Input placeholder="e.g. 500 Level" value={person.className} onChange={(event) => updateStudent(index, "className", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Matriculation number</Label>
                          <Input placeholder="Enter matric number" value={person.idNumber} onChange={(event) => updateStudent(index, "idNumber", event.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
                    <h3 className="font-semibold">Setup summary</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                      <li>Institution: {form.institutionProfile.name}</li>
                      <li>Academic session: {form.academicStructure.academicSession}</li>
                      <li>Classes: {form.academicStructure.classes.map((item) => item.name).join(", ")}</li>
                      <li>Academic departments: {academicDepartments.join(", ")}</li>
                      <li>Clinical departments: {clinicalDepartments.join(", ")}</li>
                      <li>Staff users: {form.staffUsers.length}</li>
                      <li>Students: {form.students.length}</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
                    <h3 className="font-semibold">Administrator</h3>
                    <p className="mt-2 text-muted-foreground">{form.administrator.firstName} {form.administrator.lastName} &lt;{form.administrator.email}&gt;</p>
                  </div>
                </div>
              )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>{t("section.whatCreates")}</CardTitle>
              <CardDescription>Each step prepares a different part of your institution setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {progressSections.map((section) => (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => setStep(section.index)}
                  className={`w-full rounded-xl border p-3 text-left transition ${section.index === step ? "border-primary bg-primary/5" : "border-border/70 bg-card/80 hover:border-primary/90 hover:bg-muted/60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        {section.complete ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-dashed border-border" />
                        )}
                        <span>{section.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {section.complete ? "Complete" : `${section.progress}%`}
                    </span>
                  </div>
                  <Progress value={section.progress} className="mt-3" />
                </button>
              ))}

              <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                <h3 className="font-semibold">{t("section.stepOverview")}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {currentStepSummary.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              {status && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                  {status}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={prevStep} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("button.back")}
          </Button>
          {step < 6 ? (
            <Button type="button" onClick={nextStep}>
              {t("button.next")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {t("button.submit")}
            </Button>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
