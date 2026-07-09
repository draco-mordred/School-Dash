import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
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
  };
  assessmentConfiguration: {
    mcq: boolean;
    essay: boolean;
    osce: boolean;
    longCase: boolean;
    shortCase: boolean;
    continuousAssessment: boolean;
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
  },
  assessmentConfiguration: {
    mcq: true,
    essay: true,
    osce: true,
    longCase: true,
    shortCase: true,
    continuousAssessment: true,
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
  "Ear, Nose, and Throat",
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

export default function InstitutionSetupWizard() {
  const navigate = useNavigate();
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
  const studentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedStudentClass, setSelectedStudentClass] = useState("");
  const [showInstitutionSuggestions, setShowInstitutionSuggestions] = useState(false);

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

    const departmentsProgress = Math.round(([
      clinicalDepartments.length > 0 ? "filled" : "",
      form.staffUsers.some((person) => person.firstName.trim() && person.lastName.trim() && person.email.trim() && person.password.trim() && person.idNumber.trim() && person.departmentName.trim()) ? "filled" : "",
    ].filter((value) => value.trim()).length / 2) * 100);

    const studentsProgress = Math.round(([
      form.studentBulkText.trim() ? "filled" : "",
      form.students.some((person) => person.firstName.trim() && person.lastName.trim() && person.email.trim() && person.password.trim() && person.className.trim() && person.idNumber.trim()) ? "filled" : "",
    ].filter((value) => value.trim()).length / 2) * 100);

    return [
      {
        title: "Institution profile & settings",
        description: "Institution details, admin account, and core setup values",
        progress: institutionProgress,
        complete: institutionProgress === 100,
      },
      {
        title: "Academic year, session, semesters & classes",
        description: "Academic calendar details and class setup",
        progress: academicProgress,
        complete: academicProgress === 100,
      },
      {
        title: "Departments & staff",
        description: "Departments added and staff accounts prepared",
        progress: departmentsProgress,
        complete: departmentsProgress === 100,
      },
      {
        title: "Students",
        description: "Student roster or bulk student entries",
        progress: studentsProgress,
        complete: studentsProgress === 100,
      },
    ];
  }, [academicDepartments, clinicalDepartments, faculties, form.academicStructure.academicSession, form.academicStructure.academicYear, form.academicStructure.classes, form.academicStructure.semesters.length, form.administrator.email, form.administrator.firstName, form.administrator.lastName, form.administrator.password, form.institutionProfile.academicCalendarType, form.institutionProfile.city, form.institutionProfile.country, form.institutionProfile.name, form.institutionProfile.shortName, form.institutionProfile.state, form.institutionProfile.timezone, form.institutionProfile.type, form.staffUsers, form.studentBulkText, form.students]);

  const updateInstitutionField = (field: keyof SetupFormState["institutionProfile"], value: string) => {
    setForm((prev) => ({
      ...prev,
      institutionProfile: {
        ...prev.institutionProfile,
        [field]: value,
      },
    }));
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
        password: password?.trim() || "Student@123",
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
          const password = normalizedRow[5] || "Student@123";

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
          defaultUnits: [],
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
        setStatus("Setup completed successfully. Redirecting to the application home page...");
        setTimeout(() => navigate("/", { replace: true }), 1200);
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

  const nextStep = () => setStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Initial system setup wizard
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Configure your institution</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Create the institution profile, academic calendar, departments, staff, classes, student rosters, and academic clocks from a single guided flow.
              </p>
            </div>
            <div className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
              Step {step + 1} of {steps.length}: {steps[step]}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>{steps[step]}</CardTitle>
              <CardDescription>
                {step === 0 && "Set up the institution identity and basic schedule settings."}
                {step === 1 && "Define the academic session, semester structure, and class levels."}
                {step === 2 && "Create clinical departments and add teaching staff who will oversee classes."}
                {step === 3 && "Import or add the student roster for each class."}
                {step === 4 && "Review everything before generating the initial setup."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Institution name</Label>
                    <div className="relative">
                      <Input
                        placeholder="Start typing an institution name"
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
                    <Label>Short name</Label>
                    <Input placeholder="e.g. SOM" value={form.institutionProfile.shortName} onChange={(event) => updateInstitutionField("shortName", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input placeholder="e.g. University" value={form.institutionProfile.type} onChange={(event) => updateInstitutionField("type", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input placeholder="Enter country" value={form.institutionProfile.country} onChange={(event) => updateInstitutionField("country", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input placeholder="Enter state" value={form.institutionProfile.state} onChange={(event) => updateInstitutionField("state", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input placeholder="Enter city" value={form.institutionProfile.city} onChange={(event) => updateInstitutionField("city", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Academic calendar type</Label>
                    <Input placeholder="e.g. semester" value={form.institutionProfile.academicCalendarType} onChange={(event) => updateInstitutionField("academicCalendarType", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Input placeholder="e.g. Africa/Lagos" value={form.institutionProfile.timezone} onChange={(event) => updateInstitutionField("timezone", event.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Faculties</Label>
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
                        <span key={department} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                          {department}
                        </span>
                      )) : (
                        <p className="text-sm text-muted-foreground">No departments added yet.</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">These clinical departments are for staff assignments and hospital-academic roles.</p>
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

              {step === 3 && (
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

              {step === 4 && (
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
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>What this setup creates</CardTitle>
              <CardDescription>Each submission will provision the main initial records for the school.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {progressSections.map((section) => (
                <div key={section.title} className="rounded-xl border border-border/70 p-3">
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
                </div>
              ))}
              {status && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-primary">
                  {status}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={prevStep} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={nextStep}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Finish setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
