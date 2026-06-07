import { useEffect, useRef, useState } from "react";
import Modal from "@/components/global/Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  FileText,
  Image,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import type { UserRole } from "@/types";
import * as XLSX from "xlsx";

/** Raw row extracted from any file type */
interface RawRow {
  name: string;
  email: string;
  idNumber: string;
  rowIndex: number;
}

/** User entry in the review list — all fields editable */
interface ReviewUser {
  id: string;
  name: string;
  email: string;
  idNumber: string;
  valid: boolean;
  issues: string[];
}

interface BulkUploadDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  role: UserRole;
  onSuccess?: () => void;
}

type Step = "upload" | "review";

const ACCEPTED_SPREADSHEET = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/tab-separated-values",
  "application/octet-stream",
];

const ACCEPTED_DOC = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_ROWS = 500;

export default function BulkUploadDialog({
  open,
  setOpen,
  role,
  onSuccess,
}: BulkUploadDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [classId, setClassId] = useState<string>("");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string>("");
  const [reviewUsers, setReviewUsers] = useState<ReviewUser[]>([]);
  const [classes, setClasses] = useState<{ _id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ _id: string; name: string; code: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setReviewUsers([]);
      setExtractError("");
      setClassId("");
      setCourseIds([]);
      return;
    }
    const fetchData = async () => {
      try {
        const [clsRes, crsRes] = await Promise.all([
          api.get("/classes?limit=500"),
          api.get("/courses?limit=500"),
        ]);
        setClasses((clsRes.data?.classes ?? []) as { _id: string; name: string }[]);
        setCourses((crsRes.data?.courses ?? []) as { _id: string; name: string; code: string }[]);
      } catch {
        // silent fail
      }
    };
    void fetchData();
  }, [open]);

  // ── File extraction ───────────────────────────────────────────────────────────

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const parseSpreadsheet = (buffer: ArrayBuffer): RawRow[] => {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const rows: RawRow[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      data.forEach((row, idx) => {
        const rawName =
          (row["Name"] ?? row["FullName"] ?? row["name"] ?? row["Full Name"] ?? row["Student Name"] ?? row["Teacher Name"] ?? "") as string;
        const rawEmail =
          (row["Email"] ?? row["email"] ?? row["Email Address"] ?? row["EmailAddress"] ?? "") as string;
        const rawId =
          (row["IdNumber"] ?? row["IDNumber"] ?? row["idNumber"] ?? row["ID"] ?? row["Id"] ?? row["ID Number"] ?? row["Staff ID"] ?? row["Matric No"] ?? "") as string;

        rows.push({
          name: String(rawName).trim(),
          email: String(rawEmail).trim(),
          idNumber: String(rawId).trim(),
          rowIndex: idx + 1,
        });
      });
    }
    return rows;
  };

  const buildReviewUsers = (rawRows: RawRow[]): ReviewUser[] => {
    return rawRows.slice(0, MAX_ROWS).map((r, i) => {
      const issues: string[] = [];
      if (!r.name) issues.push("Missing name");
      return {
        id: `row-${i}`,
        name: r.name,
        email: r.email,
        idNumber: r.idNumber,
        valid: issues.length === 0,
        issues,
      };
    });
  };

  const extractUsersFromFile = async (file: File) => {
    setExtractError("");
    setIsExtracting(true);

    try {
      // Spreadsheet files
      if (ACCEPTED_SPREADSHEET.includes(file.type) || file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const rawRows = parseSpreadsheet(buffer);
        if (rawRows.length === 0) {
          setExtractError("No data found in the spreadsheet.");
          return;
        }
        const users = buildReviewUsers(rawRows);
        setReviewUsers(users);
        setStep("review");
        return;
      }

      // PDF files
      if (ACCEPTED_DOC.includes(file.type) || file.name.endsWith(".pdf")) {
        const base64Data = await fileToBase64(file);
        const { data } = await api.post("/users/bulk-upload/extract-pdf", {
          base64Data,
          mimeType: file.type,
        });
        const rows = (data.rows ?? []) as RawRow[];
        if (rows.length === 0) {
          setExtractError("No user data could be extracted from the PDF. Please use a spreadsheet instead.");
          return;
        }
        setReviewUsers(buildReviewUsers(rows));
        setStep("review");
        return;
      }

      // Image files — send to backend OCR
      if (file.type.startsWith("image/")) {
        const base64Data = await fileToBase64(file);
        const { data } = await api.post("/users/bulk-upload/extract-image", {
          base64Data,
          mimeType: file.type,
        });
        const rows = (data.rows ?? []) as RawRow[];
        if (rows.length === 0) {
          setExtractError("No user data could be extracted from the image. Please use a spreadsheet instead.");
          return;
        }
        setReviewUsers(buildReviewUsers(rows));
        setStep("review");
        return;
      }

      setExtractError(`Unsupported file type: ${file.type}. Please upload a spreadsheet (.csv, .xlsx), PDF, or image.`);
    } catch (err: any) {
      setExtractError(err?.response?.data?.message ?? "Failed to extract data from file.");
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Drag and drop ─────────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void extractUsersFromFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void extractUsersFromFile(file);
  };

  // ── Review step helpers ───────────────────────────────────────────────────────

  const updateReviewUser = (id: string, field: "name" | "email" | "idNumber", value: string) => {
    setReviewUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, [field]: value };
        const issues: string[] = [];
        if (!updated.name) issues.push("Missing name");
        updated.issues = issues;
        updated.valid = issues.length === 0;
        return updated;
      })
    );
  };

  const validCount = reviewUsers.filter((u) => u.valid).length;
  const invalidCount = reviewUsers.length - validCount;

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const validUsers = reviewUsers.filter((u) => u.valid);
    if (validUsers.length === 0) {
      toast.error("At least one user with a name is required.");
      return;
    }
    setIsUploading(true);
    try {
      await api.post("/users/bulk-upload", {
        users: validUsers.map((u) => {
          const name = u.name.trim();
          const idNumber = u.idNumber.trim();
          // Auto-generate email from name if not provided: "John Doe" → "john.doe@school.edu"
          const email = u.email.trim()
            || u.name.toLowerCase().replace(/\s+/g, ".") + "@school.edu";
          return { name, email, idNumber, role };
        }),
        classId: role === "student" ? classId : undefined,
        courseIds: role === "teacher" ? courseIds : undefined,
      });
      toast.success(`${validUsers.length} user(s) created successfully.`);
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Bulk upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (step === "upload") {
    return (
      <Modal
        title="Bulk Upload Users"
        description={`Upload a spreadsheet (CSV/Excel), PDF, or image containing ${role} records.`}
        open={open}
        setOpen={setOpen}
      >
        <div className="space-y-4 py-2">
          {role === "student" && (
            <div className="space-y-1">
              <Label htmlFor="class-select">Assign to Class</Label>
              <select
                id="class-select"
                className="w-full border rounded px-2 py-1.5 text-sm"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">— Select a class —</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {role === "teacher" && (
            <div className="space-y-1">
              <Label>Assign to Subjects</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                {courses.map((c) => (
                  <label key={c._id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courseIds.includes(c._id)}
                      onChange={(e) => {
                        if (e.target.checked) setCourseIds((p) => [...p, c._id]);
                        else setCourseIds((p) => p.filter((id) => id !== c._id));
                      }}
                    />
                    {c.name} <span className="text-muted-foreground text-xs">({c.code})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div
            ref={dropRef}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <span className="text-xs text-muted-foreground">Spreadsheet</span>
                  <span className="text-xs text-muted-foreground">.csv .xlsx</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <FileText className="h-8 w-8 text-red-600" />
                  <span className="text-xs text-muted-foreground">PDF</span>
                  <span className="text-xs text-muted-foreground">.pdf</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Image className="h-8 w-8 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Image</span>
                  <span className="text-xs text-muted-foreground">.jpg .png</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Click or drag & drop a file here</p>
              <p className="text-xs text-muted-foreground">Spreadsheet columns should include: Name, ID Number (Email is optional — auto-generated if missing)</p>
            </div>
          </div>

          {extractError && (
            <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{extractError}</span>
            </div>
          )}

          {isExtracting && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Extracting data…
            </div>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Review User Data"
      description={`Found ${reviewUsers.length} row(s). Verify the data below, then click Upload. Rows missing a name are skipped.`}
      open={open}
      setOpen={setOpen}
    >
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            {validCount} ready to upload
          </span>
        </div>

        <div className="border rounded overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium w-8">#</th>
                <th className="px-2 py-1.5 text-left font-medium">Name</th>
                <th className="px-2 py-1.5 text-left font-medium">Email <span className="font-normal text-muted-foreground">(optional)</span></th>
                <th className="px-2 py-1.5 text-left font-medium">ID Number</th>
                <th className="px-2 py-1.5 text-left font-medium w-16">Status</th>
              </tr>
            </thead>
            <tbody>
              {reviewUsers.map((u, i) => (
                <tr key={u.id} className={`border-t ${!u.valid ? "bg-red-50/50" : ""}`}>
                  <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`w-full border rounded px-1.5 py-0.5 text-xs ${u.issues.includes("Missing name") ? "border-red-400 bg-red-50" : ""}`}
                      value={u.name}
                      onChange={(e) => updateReviewUser(u.id, "name", e.target.value)}
                      placeholder="Name *"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="w-full border rounded px-1.5 py-0.5 text-xs text-muted-foreground"
                      value={u.email}
                      onChange={(e) => updateReviewUser(u.id, "email", e.target.value)}
                      placeholder="Auto-generated if blank"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="w-full border rounded px-1.5 py-0.5 text-xs"
                      value={u.idNumber}
                      onChange={(e) => updateReviewUser(u.id, "idNumber", e.target.value)}
                      placeholder="ID Number"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {u.valid ? (
                      <span className="text-green-600 flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> OK
                      </span>
                    ) : (
                      <span className="text-red-500 text-xs flex items-center gap-0.5" title={u.issues.join(", ")}>
                        <AlertCircle className="h-3 w-3 shrink-0" /> {u.issues[0]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isUploading || validCount === 0}
            >
              {isUploading ? "Creating…" : `Upload ${validCount} User${validCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
