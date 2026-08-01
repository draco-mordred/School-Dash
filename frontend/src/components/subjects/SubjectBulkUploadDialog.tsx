import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import * as XLSX from "xlsx";
import Modal from "@/components/global/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SubjectBulkUploadDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess?: () => void;
}

type CourseOption = {
  _id: string;
  name: string;
  code?: string;
  semester?: string | null;
  department?: { _id: string; name: string; code: string; departmentID: string } | null;
};

type TeacherOption = {
  _id: string;
  name: string;
  email?: string;
};

interface ParsedSubjectRow {
  id: string;
  rowIndex: number;
  name: string;
  code: string;
  lecturer: string;
  date: string;
  startTime: string;
  endTime: string;
  semester: string;
  subjectID: string;
  valid: boolean;
  issues: string[];
  lecturerIds: string[];
  createTeacher: boolean;
}

const MAX_ROWS = 250;

const SUBJECT_NAME_KEYS = [
  "Topic",
  "topic",
  "Subject",
  "subject",
  "Course Description",
  "course description",
  "Course Descritption",
  "course descritption",
  "Descripttion",
  "descripttion",
  "Description",
  "description",
  "Course Title",
  "course title",
  "Title",
  "title",
  "Topic Name",
  "topic name",
];

const SUBJECT_CODE_KEYS = [
  "Code",
  "code",
  "Subject Code",
  "subject code",
  "Course Code",
  "course code",
];

const LECTURER_KEYS = [
  "Lecturer",
  "lecturer",
  "Teacher",
  "teacher",
  "Instructor",
  "instructor",
];

const DATE_KEYS = ["Date", "date", "Session Date", "session date", "Schedule Date", "schedule date"];

const TIME_RANGE_KEYS = [
  "Time Range",
  "time range",
  "Time",
  "time",
  "Session Time",
  "session time",
  "Class Time",
  "class time",
  "Period",
  "period",
  "Time Slot",
  "time slot",
];

const START_TIME_KEYS = [
  "Start Time",
  "start time",
  "Session Start",
  "session start",
  "Time Start",
  "time start",
  "Start",
  "start",
];

const END_TIME_KEYS = [
  "End Time",
  "end time",
  "Session End",
  "session end",
  "Time End",
  "time end",
  "End",
  "end",
];

const SEMESTER_KEYS = ["Semester", "semester", "Sem", "sem"];

const SUBJECT_ID_KEYS = ["Subject ID", "subject id", "subjectID", "subjectID"];

const parseValue = (row: Record<string, unknown>, keys: string[], preserveWhitespace = false) => {
  for (const key of keys) {
    const value = row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
    if (value === undefined || value === null) continue;
    const text = String(value);
    if (preserveWhitespace) {
      if (text !== "") return text;
    } else {
      const trimmed = text.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
};

const normalizeTimeString = (value: string): string | null => {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s+/g, " ")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+to\s+/g, "-")
    .replace(/\s+through\s+/g, "-");

  const simpleMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (simpleMatch) {
    let hour = Number(simpleMatch[1]);
    const minutes = Number(simpleMatch[2] ?? "0");
    const modifier = simpleMatch[3]?.toLowerCase();
    if (modifier === "pm" && hour < 12) hour += 12;
    if (modifier === "am" && hour === 12) hour = 0;
    const safeHour = String(hour).padStart(2, "0");
    const safeMinutes = String(minutes).padStart(2, "0");
    return `${safeHour}:${safeMinutes}`;
  }

  const rangeMatch = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (rangeMatch) {
    const start = normalizeTimeString(`${rangeMatch[1]}:${rangeMatch[2] ?? "00"} ${rangeMatch[3] ?? ""}`);
    const end = normalizeTimeString(`${rangeMatch[4]}:${rangeMatch[5] ?? "00"} ${rangeMatch[6] ?? ""}`);
    return start && end ? `${start}|${end}` : null;
  }

  if (/^\d{1,2}:\d{2}$/.test(normalized)) {
    const [hours, minutes] = normalized.split(":");
    return `${String(Number(hours)).padStart(2, "0")}:${String(Number(minutes)).padStart(2, "0")}`;
  }

  return null;
};

const parseTimeRange = (value: unknown): { startTime: string; endTime: string } => {
  if (value === undefined || value === null) return { startTime: "", endTime: "" };
  const raw = String(value).trim();
  if (!raw) return { startTime: "", endTime: "" };

  const range = normalizeTimeString(raw);
  if (!range) return { startTime: "", endTime: "" };

  if (range.includes("|")) {
    const [startTime, endTime] = range.split("|");
    return { startTime, endTime };
  }

  return { startTime: range, endTime: "" };
};

const parsePotentialDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  let raw = String(value).trim();
  if (!raw) return null;

  const weekdayPrefix = raw.match(/^([A-Za-z]{3,9})\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})$/);
  if (weekdayPrefix) {
    raw = weekdayPrefix[2];
  }

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, part1, part2, part3] = slashMatch;
    const dayFirst = Number(part1);
    const monthFirst = Number(part2);
    let year = Number(part3);
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }

    const dateDayFirst = new Date(year, monthFirst - 1, dayFirst);
    const dateMonthFirst = new Date(year, dayFirst - 1, monthFirst);
    const dayFirstValid = !Number.isNaN(dateDayFirst.getTime()) && dateDayFirst.getDate() === dayFirst;
    const monthFirstValid = !Number.isNaN(dateMonthFirst.getTime()) && dateMonthFirst.getMonth() === monthFirst - 1;

    if (dayFirstValid && !monthFirstValid) return dateDayFirst;
    if (!dayFirstValid && monthFirstValid) return dateMonthFirst;
    if (dayFirstValid && monthFirstValid) {
      if (dayFirst > 12) return dateDayFirst;
      if (monthFirst > 12) return dateMonthFirst;
      const locale = navigator.language || "en-US";
      return locale.startsWith("en-US") ? dateMonthFirst : dateDayFirst;
    }
  }

  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate;
  }

  return null;
};

const formatDateForDisplay = (value: unknown) => {
  const date = parsePotentialDate(value);
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
};

const mapPdfColumnKey = (label: string) => {
  const normalized = String(label).trim().toLowerCase();
  if (SUBJECT_NAME_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "name";
  if (SUBJECT_CODE_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "code";
  if (LECTURER_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "lecturer";
  if (DATE_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "date";
  if (TIME_RANGE_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "timeRange";
  if (START_TIME_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "startTime";
  if (END_TIME_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "endTime";
  if (SEMESTER_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "semester";
  if (SUBJECT_ID_KEYS.some((key) => normalized.includes(key.toLowerCase()))) return "subjectID";
  return "";
};

const parsePdfText = (rawText: string): ParsedSubjectRow[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const headerIndex = lines.findIndex((line) =>
    SUBJECT_NAME_KEYS.some((key) => line.toLowerCase().includes(key.toLowerCase())) &&
    SUBJECT_CODE_KEYS.some((key) => line.toLowerCase().includes(key.toLowerCase()))
  );

  if (headerIndex === -1) {
    return [];
  }

  const headerLine = lines[headerIndex];
  const separator = headerLine.includes("|")
    ? /\s*\|\s*/
    : headerLine.includes("\t")
    ? /\t+/
    : /\s{2,}/;

  const headers = headerLine.split(separator).map((header) => header.trim()).filter(Boolean);
  const columnKeys = headers.map(mapPdfColumnKey);

  const parsed: ParsedSubjectRow[] = [];
  for (let rowIndex = headerIndex + 1; rowIndex < lines.length && parsed.length < MAX_ROWS; rowIndex += 1) {
    const line = lines[rowIndex];
    if (!line) continue;
    const cells = line.split(separator).map((cell) => cell.trim()).filter(Boolean);
    if (cells.length === 0) continue;

    const row: ParsedSubjectRow = {
      id: `pdf-row-${rowIndex}`,
      rowIndex: rowIndex - headerIndex,
      name: "",
      code: "",
      lecturer: "",
      date: "",
      startTime: "",
      endTime: "",
      semester: "",
      subjectID: "",
      valid: false,
      issues: [],
      lecturerIds: [],
      createTeacher: false,
    };

    cells.forEach((cell, index) => {
      const content = normalizeSubjectText(cell);
      const key = columnKeys[index] || "";
      const timeRange = parseTimeRange(key === "timeRange" ? content : "");
      if (key === "name") row.name = content;
      else if (key === "code") row.code = content;
      else if (key === "lecturer") row.lecturer = content;
      else if (key === "date") row.date = formatDateForDisplay(content);
      else if (key === "timeRange") {
        row.startTime = timeRange.startTime;
        row.endTime = timeRange.endTime;
      } else if (key === "startTime") row.startTime = normalizeTimeString(content) ?? "";
      else if (key === "endTime") row.endTime = normalizeTimeString(content) ?? "";
      else if (key === "semester") row.semester = content;
      else if (key === "subjectID") row.subjectID = content;
      else if (!row.name) row.name = content;
      else if (!row.code) row.code = content;
      else if (!row.lecturer) row.lecturer = content;
      else if (!row.date) row.date = formatDateForDisplay(content);
      else if (!row.startTime && !row.endTime) {
        const parsedTimeRange = parseTimeRange(content);
        row.startTime = parsedTimeRange.startTime;
        row.endTime = parsedTimeRange.endTime;
      } else if (!row.semester) row.semester = content;
      else if (!row.subjectID) row.subjectID = content;
    });

    parsed.push(row);
  }

  return parsed;
};

const parsePdfFile = async (buffer: ArrayBuffer): Promise<ParsedSubjectRow[]> => {
  let pdf;
  try {
    // PDFJS typings do not expose disableWorker on this package version.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdf = await getDocument({ data: buffer, disableWorker: true } as any).promise;
  } catch (error: unknown) {
    console.error("PDF load failed", error);
    throw new Error(
      "Unable to load the PDF. Please confirm the file is a valid text-based PDF and not an image scan."
    );
  }

  let text = "";
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => {
        if (item && typeof item === "object" && "str" in item) {
          return String((item as { str?: unknown }).str ?? "");
        }
        return "";
      })
      .join(" ");
    text += `${pageText}\n`;
  }

  if (!text.trim()) {
    throw new Error(
      "The PDF appears to contain no extractable text. Use a text-based PDF or convert the data to Excel/CSV."
    );
  }

  const parsed = parsePdfText(text);
  if (parsed.length === 0) {
    throw new Error(
      "Text was extracted from the PDF, but no subject rows were detected. Ensure the PDF includes a table with headers like Subject, Code, Lecturer, or Date."
    );
  }

  return parsed;
};

const normalizeLecturerString = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/[,;]+/g, ",");

const normalizeSubjectText = (value: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  return raw
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|–|—/g, "-")
    .replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|“|”/g, '"')
    .replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|‘|’/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const generateSubjectCode = (name: string, index: number, courseCode?: string) => {
  const courseCodeText = String(courseCode ?? "").trim().replace(/\s+/g, " ");
  if (courseCodeText) {
    const match = courseCodeText.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1].trim();
      const baseNumber = Number(match[2]);
      return `${prefix} ${String(baseNumber + index + 1).padStart(3, "0")}`.trim();
    }
    return `${courseCodeText} ${String(index + 1).padStart(3, "0")}`;
  }

  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let prefix;
  if (words.length === 0) {
    prefix = "SUBJ";
  } else if (words.length === 1) {
    prefix = words[0].slice(0, 4);
  } else {
    prefix = words.slice(0, 3).map((word) => word[0]).join("");
  }
  return `${prefix.toUpperCase()}${String(index + 1).padStart(3, "0")}`;
};

const buildTeacherLookup = (teachers: TeacherOption[]) => {
  const map = new Map<string, string>();
  for (const teacher of teachers) {
    const normalizedName = normalizeLecturerString(teacher.name);
    if (normalizedName) map.set(normalizedName, teacher._id);
    if (teacher.email) map.set(teacher.email.trim().toLowerCase(), teacher._id);
  }
  return map;
};

export default function SubjectBulkUploadDialog({ open, setOpen, onSuccess }: SubjectBulkUploadDialogProps) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [reviewRows, setReviewRows] = useState<ParsedSubjectRow[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractError, setExtractError] = useState<string>("");
  const [autoGenerateCodes, setAutoGenerateCodes] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    // Reset dialog state on open without triggering render warnings.
    setTimeout(() => {
      setStep("upload");
      setSelectedCourseId("");
      setReviewRows([]);
      setExtractError("");
      setAutoGenerateCodes(true);
    }, 0);

    const fetchOptions = async () => {
      try {
        const [coursesRes, teachersRes] = await Promise.all([
          api.get("/courses?topLevel=true&limit=500"),
          api.get("/users?role=teacher&limit=500"),
        ]);
        setCourses(Array.isArray(coursesRes.data?.courses) ? coursesRes.data.courses : []);
        setTeachers(Array.isArray(teachersRes.data?.users) ? teachersRes.data.users : []);
      } catch (error) {
        console.warn("Failed to load bulk upload options", error);
      }
    };

    void fetchOptions();
  }, [open]);

  const supportedUploadFile = (file: File) => {
    const acceptedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/pdf",
      "application/octet-stream",
    ];
    return (
      acceptedTypes.includes(file.type) || /\.(xlsx|xls|csv|pdf)$/i.test(file.name)
    );
  };

  const parseSpreadsheetFile = (buffer: ArrayBuffer): ParsedSubjectRow[] => {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const parsed: ParsedSubjectRow[] = [];
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      rows.forEach((row, rowIndex) => {
        const name = normalizeSubjectText(parseValue(row, SUBJECT_NAME_KEYS, true));
        const code = normalizeSubjectText(parseValue(row, SUBJECT_CODE_KEYS));
        const lecturer = normalizeSubjectText(parseValue(row, LECTURER_KEYS));
        const date = formatDateForDisplay(parseValue(row, DATE_KEYS));
        const timeRange = parseTimeRange(parseValue(row, TIME_RANGE_KEYS));
        const startTime = parseValue(row, START_TIME_KEYS) || timeRange.startTime;
        const endTime = parseValue(row, END_TIME_KEYS) || timeRange.endTime;
        const semester = parseValue(row, SEMESTER_KEYS);
        const subjectID = normalizeSubjectText(parseValue(row, SUBJECT_ID_KEYS));
        parsed.push({
          id: `row-${sheetName}-${rowIndex}`,
          rowIndex: rowIndex + 1,
          name,
          code,
          lecturer,
          date,
          startTime,
          endTime,
          semester,
          subjectID,
          valid: false,
          issues: [],
          lecturerIds: [],
          createTeacher: false,
        });
      });
    });
    return parsed;
  };

  const isValidTimeString = (value: string) => Boolean(normalizeTimeString(value));
const toMinutes = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const buildReviewRows = (rows: ParsedSubjectRow[]) => {
    const teacherMap = buildTeacherLookup(teachers);
    return rows.slice(0, MAX_ROWS).map((row, index) => {
      const issues: string[] = [];
      if (!row.name) {
        issues.push("Missing topic / subject name");
      }
      const hasLecturer = Boolean(row.lecturer?.trim());
      const lecturerMatched = hasLecturer && normalizeLecturerString(row.lecturer).split(",").some((value) => teacherMap.has(value));
      if (hasLecturer && !lecturerMatched && !row.createTeacher) {
        issues.push("Lecturer name not matched to a teacher account");
      }

      if (row.startTime && !isValidTimeString(row.startTime)) {
        issues.push("Invalid start time format");
      }
      if (row.endTime && !isValidTimeString(row.endTime)) {
        issues.push("Invalid end time format");
      }

      const startMinutes = row.startTime ? toMinutes(row.startTime) : null;
      const endMinutes = row.endTime ? toMinutes(row.endTime) : null;
      if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
        issues.push("Start time must be before end time");
      }

      const lecturerIds = row.lecturer
        ? normalizeLecturerString(row.lecturer)
            .split(",")
            .map((part) => part.trim())
            .map((value) => teacherMap.get(value))
            .filter((id): id is string => Boolean(id))
        : [];

      return {
        ...row,
        code:
          row.code ||
          (autoGenerateCodes && row.name ? generateSubjectCode(row.name, index, selectedCourse?.code) : ""),
        semester: row.semester || selectedCourse?.semester || "",
        valid: issues.length === 0,
        issues,
        lecturerIds,
      };
    });
  };

  const handleFile = async (file: File) => {
    setExtractError("");
    setIsExtracting(true);
    try {
      if (!supportedUploadFile(file)) {
        setExtractError("Unsupported file type. Please upload an Excel, CSV, or PDF file.");
        return;
      }
      const buffer = await file.arrayBuffer();
      const parsed = /\.pdf$/i.test(file.name) || file.type === "application/pdf"
        ? await parsePdfFile(buffer)
        : parseSpreadsheetFile(buffer);
      const orderedRows = [...parsed].sort((a, b) => a.rowIndex - b.rowIndex);
      setReviewRows(buildReviewRows(orderedRows));
      setStep("review");
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : undefined;
      setExtractError(message ||
        (/\.pdf$/i.test(file.name) || file.type === "application/pdf"
          ? "Unable to read the PDF. Please confirm it is a valid PDF with extractable text."
          : "Unable to read the spreadsheet. Please confirm it is valid and try again.")
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await handleFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) await handleFile(file);
  };

  const updateRow = (id: string, field: keyof ParsedSubjectRow, value: string | boolean) => {
    setReviewRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value } as ParsedSubjectRow;
        const issues: string[] = [];
        const hasLecturer = Boolean(updated.lecturer?.trim());
        const lecturerMatched = hasLecturer && normalizeLecturerString(updated.lecturer)
          .split(",")
          .some((value) => buildTeacherLookup(teachers).has(value));

        if (!updated.name) issues.push("Missing topic / subject name");
        if (hasLecturer && !lecturerMatched && !updated.createTeacher) {
          issues.push("Lecturer name not matched to a teacher account");
        }

        if (updated.startTime && !isValidTimeString(updated.startTime)) {
          issues.push("Invalid start time format");
        }
        if (updated.endTime && !isValidTimeString(updated.endTime)) {
          issues.push("Invalid end time format");
        }
        const startMinutes = updated.startTime ? toMinutes(updated.startTime) : null;
        const endMinutes = updated.endTime ? toMinutes(updated.endTime) : null;
        if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
          issues.push("Start time must be before end time");
        }

        updated.lecturerIds = updated.lecturer
          ? normalizeLecturerString(updated.lecturer)
              .split(",")
              .map((part) => part.trim())
              .map((value) => buildTeacherLookup(teachers).get(value))
              .filter((id): id is string => Boolean(id))
          : [];
        updated.valid = issues.length === 0;
        updated.issues = issues;
        return updated;
      })
    );
  };

  const selectedCourse = courses.find((course) => course._id === selectedCourseId);

  const handleSubmit = async () => {
    if (!selectedCourseId) {
      toast.error("Please choose a target course group before importing subjects.");
      return;
    }

    const validRows = reviewRows.filter((row) => row.valid);
    if (validRows.length === 0) {
      toast.error("Please fix at least one row before importing subjects.");
      return;
    }

    const departmentIdentifier =
      typeof selectedCourse?.department === "object" && selectedCourse.department?.departmentID
        ? selectedCourse.department.departmentID
        : "";

    setIsSubmitting(true);
    try {
      let generatedCodeCount = 0;
      const payload = {
        subjects: validRows.map((row) => {
          const code = row.code || (autoGenerateCodes && selectedCourse?.code
            ? (() => {
                const generatedIndex = generatedCodeCount;
                generatedCodeCount += 1;
                return generateSubjectCode(row.name, generatedIndex, selectedCourse.code);
              })()
            : null);

          return {
            name: normalizeSubjectText(row.name),
            code,
            subjectID: row.subjectID || departmentIdentifier,
            lecturer: row.lecturerIds,
            semester: row.semester || null,
            date: row.date || null,
            startTime: row.startTime || null,
            endTime: row.endTime || null,
            createTeacher: row.createTeacher,
            lecturerName: row.lecturer,
            isActive: true,
          };
        }),
      };
      const { data } = await api.post(
        `/courses/${selectedCourseId}/subjects/bulk-upload`,
        payload,
        { timeout: 120000 },
      );
      const results = data?.results;
      const replaced = results?.replaced ?? 0;
      toast.success(
        `Imported ${results?.created ?? 0} subject(s). Replaced ${replaced} duplicate subject(s). Skipped ${results?.skipped ?? 0} invalid row(s).`
      );
      setOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      const isAxiosError = (value: unknown): value is { response?: { data?: { message?: string } } } => {
        return (
          typeof value === "object" &&
          value !== null &&
          "response" in value &&
          typeof (value as { response?: unknown }).response === "object" &&
          (value as { response?: { data?: unknown } }).response !== null
        );
      };

      const message =
        error instanceof Error
          ? error.message
          : isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : undefined;
      toast.error(message ?? "Bulk subject import failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setReviewRows([]);
    setExtractError("");
    setSelectedCourseId("");
  };

  const reviewedCount = reviewRows.length;
  const validCount = reviewRows.filter((row) => row.valid).length;
  const invalidCount = reviewedCount - validCount;

  return (
    <Modal
      title="Bulk Upload Subjects"
      description="Import subjects from a spreadsheet in one step. Choose a target course, upload your file, and review extracted rows before creating them."
      open={open}
      setOpen={setOpen}
    >
      <div className="space-y-6 py-2">
        {step === "upload" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center transition hover:border-slate-400">
              <div
                className="flex h-56 flex-col items-center justify-center gap-3"
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
              >
                <p className="text-lg font-semibold">Drop your file here</p>
                <p className="text-sm text-muted-foreground">
                  Accepts .xlsx, .xls, .csv, or text-based .pdf files. Image-only PDFs are not supported.
                </p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isExtracting}>
                  {isExtracting ? "Extracting…" : "Choose a file"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="course-select">Target Course</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger id="course-select" className="w-full">
                    <SelectValue placeholder="Select course group" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.name} {course.code ? `(${course.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Subjects will be imported into the selected course group and department.
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="generate-codes">Auto-generate missing codes</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="generate-codes"
                    checked={autoGenerateCodes}
                    onCheckedChange={(value) => setAutoGenerateCodes(Boolean(value))}
                  />
                  <span className="text-sm text-muted-foreground">Fill missing subject codes automatically.</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can still adjust any extracted code in the review step.
                </p>
              </div>
            </div>
            {extractError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {extractError}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Review extracted subjects</p>
                  <p className="text-sm">
                    {validCount} valid, {invalidCount} invalid of {reviewedCount} row(s).
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Target course: {selectedCourse?.name ?? "N/A"}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card p-2 shadow-sm max-h-[520px]">
              <div className="max-h-[480px] overflow-y-auto">
                <div className="grid grid-cols-[48px_minmax(180px,1fr)_140px_180px_120px_120px_120px_120px] gap-3 border-b px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>#</span>
                  <span>Topic</span>
                  <span>Code</span>
                  <span>Lecturer</span>
                  <span>Start</span>
                  <span>End</span>
                  <span>Date</span>
                  <span>Status</span>
                </div>
                {reviewRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[48px_minmax(180px,1fr)_140px_180px_120px_120px_120px_120px] gap-3 items-start border-b border-border px-3 py-3 last:border-b-0 bg-background/80 hover:bg-background">
                    <div className="text-sm text-muted-foreground">{row.rowIndex}</div>
                    <Input
                      value={row.name}
                      onChange={(event) => updateRow(row.id, "name", event.target.value)}
                      placeholder="Topic or subject name"
                      className="w-full"
                    />
                    <Input
                      value={row.code}
                      onChange={(event) => updateRow(row.id, "code", event.target.value)}
                      placeholder="Optional code"
                      className="w-full"
                    />
                    <div className="space-y-2">
                      <Input
                        value={row.lecturer}
                        onChange={(event) => updateRow(row.id, "lecturer", event.target.value)}
                        placeholder="Lecturer name"
                        className="w-full"
                      />
                      {row.lecturer && row.lecturerIds.length === 0 ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted p-2 text-xs text-muted-foreground">
                          <span>Unmatched lecturer</span>
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={row.createTeacher}
                              onChange={(event) => updateRow(row.id, "createTeacher", event.target.checked)}
                              className="h-4 w-4 rounded border-border text-primary"
                            />
                            Create teacher
                          </label>
                        </div>
                      ) : null}
                    </div>
                    <Input
                      type="time"
                      value={row.startTime}
                      onChange={(event) => updateRow(row.id, "startTime", event.target.value)}
                      placeholder="HH:MM"
                      className="w-full"
                    />
                    <Input
                      type="time"
                      value={row.endTime}
                      onChange={(event) => updateRow(row.id, "endTime", event.target.value)}
                      placeholder="HH:MM"
                      className="w-full"
                    />
                    <Input
                      value={row.date}
                      onChange={(event) => updateRow(row.id, "date", event.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full"
                    />
                    <div>
                      {row.valid ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          Ready
                        </span>
                      ) : (
                        <div className="space-y-1 text-xs text-rose-600">
                          {row.issues.map((issue) => (
                            <div key={issue}>{issue}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleReset} disabled={isSubmitting}>
                  Upload a different file
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || validCount === 0}>
                  {isSubmitting ? "Importing…" : "Import Subjects"}
                </Button>
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
                If a row has a blank code, auto-generated values will be applied when importing.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
